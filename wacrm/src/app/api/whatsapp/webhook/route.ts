import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chatIdToPhone } from '@/lib/whatsapp/openwa-api'
import { normalizePhone, phonesMatch } from '@/lib/whatsapp/phone-utils'
import { runAutomationsForTrigger } from '@/lib/automations/engine'
import { dispatchInboundToFlows } from '@/lib/flows/engine'

// Lazy-initialized service-role client
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

// ============================================================
// OpenWA webhook payload types
// ============================================================

interface OpenWAMessageData {
  id: string
  from: string        // e.g. "5511999999999@c.us"
  fromMe: boolean
  to: string
  body: string
  type: string        // "chat", "image", "video", "document", "audio", "sticker", "location", "reaction"
  timestamp: number   // epoch seconds
  hasMedia: boolean
  mediaData?: {
    url?: string
    mimetype?: string
    caption?: string
    filename?: string
  }
  location?: {
    latitude: number
    longitude: number
    description?: string
  }
  reaction?: {
    msgId: string
    text: string      // emoji, empty string = removal
  }
  quotedMsg?: {
    id: string
  }
  _serialized?: string
}

interface OpenWAAckData {
  id: string
  ack: number         // 1=sent, 2=delivered, 3=read
  to: string
}

interface OpenWAWebhookPayload {
  event: string
  deliveryId?: string
  idempotencyKey?: string
  session?: { id: string }
  data: OpenWAMessageData | OpenWAAckData
}

// POST - Receive events from OpenWA
export async function POST(request: Request) {
  // Read raw body FIRST for HMAC verification (before parsing JSON)
  const rawBody = await request.text()

  // Verify HMAC signature if a webhook secret is configured.
  // OpenWA sends the signature in X-OpenWA-Signature header.
  const secret = process.env.OPENWA_WEBHOOK_SECRET
  if (secret) {
    const signature = request.headers.get('x-openwa-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }
    const expectedSig = await computeHmac(secret, rawBody)
    if (!constantTimeEqual(signature, expectedSig)) {
      console.warn('[webhook/openwa] rejected request with invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  let payload: OpenWAWebhookPayload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Ack immediately; process async
  processWebhook(payload).catch((err) => {
    console.error('[webhook/openwa] processing error:', err)
  })

  return NextResponse.json({ status: 'received' }, { status: 200 })
}

async function computeHmac(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time string comparison using node:crypto */
function constantTimeEqual(a: string, b: string): boolean {
  const { timingSafeEqual: nodeTimingSafeEqual } = require('crypto')
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Pad shorter buffer to prevent length leak — still compare
    const padded = Buffer.alloc(bufA.length)
    bufB.copy(padded)
    nodeTimingSafeEqual(bufA, padded)
    return false
  }
  return nodeTimingSafeEqual(bufA, bufB)
}

async function processWebhook(payload: OpenWAWebhookPayload) {
  const { event, session } = payload

  if (!session?.id) {
    console.warn('[webhook/openwa] event without session id, skipping')
    return
  }

  // Look up WhatsApp config by session_id
  const { data: configRows, error: configError } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('*')
    .eq('session_id', session.id)

  if (configError || !configRows || configRows.length === 0) {
    console.error('[webhook/openwa] no config found for session_id:', session.id, configError?.message)
    return
  }

  if (configRows.length > 1) {
    console.error('[webhook/openwa] multiple configs for session_id:', session.id, '— event dropped')
    return
  }

  const config = configRows[0]

  if (event === 'message.ack') {
    await handleAck(payload.data as OpenWAAckData)
    return
  }

  if (event === 'message.received') {
    const msgData = payload.data as OpenWAMessageData
    // Skip messages sent by us
    if (msgData.fromMe) return
    await processInboundMessage(msgData, config)
    return
  }
}

// OpenWA ACK values: 1=sent, 2=delivered, 3=read
const ACK_STATUS_MAP: Record<number, string> = {
  1: 'sent',
  2: 'delivered',
  3: 'read',
}

const STATUS_LADDER = ['pending', 'sent', 'delivered', 'read', 'replied'] as const

function ladderLevel(s: string): number {
  return (STATUS_LADDER as readonly string[]).indexOf(s)
}

function isForwardTransition(current: string, incoming: string): boolean {
  if (incoming === 'failed') return current === 'pending' || current === 'sent'
  if (current === 'failed') return false
  const ci = ladderLevel(current)
  const ii = ladderLevel(incoming)
  if (ii < 0) return false
  if (ci < 0) return true
  return ii > ci
}

async function handleAck(data: OpenWAAckData) {
  const newStatus = ACK_STATUS_MAP[data.ack]
  if (!newStatus) return

  // Update messages table
  await supabaseAdmin()
    .from('messages')
    .update({ status: newStatus })
    .eq('message_id', data.id)

  // Update broadcast_recipients
  const { data: recipient } = await supabaseAdmin()
    .from('broadcast_recipients')
    .select('id, status')
    .eq('whatsapp_message_id', data.id)
    .maybeSingle()

  if (!recipient) return
  if (!isForwardTransition(recipient.status, newStatus)) return

  const tsIso = new Date().toISOString()
  const update: Record<string, unknown> = { status: newStatus }
  if (newStatus === 'sent') update.sent_at = tsIso
  if (newStatus === 'delivered') update.delivered_at = tsIso
  if (newStatus === 'read') update.read_at = tsIso

  await supabaseAdmin()
    .from('broadcast_recipients')
    .update(update)
    .eq('id', recipient.id)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processInboundMessage(msgData: OpenWAMessageData, config: any) {
  // chatId format: "5511999999999@c.us" → strip suffix for storage
  const senderPhone = normalizePhone(chatIdToPhone(msgData.from))

  // Derive sender name from chatId (OpenWA doesn't always provide it in the webhook)
  const contactName = senderPhone

  const contactOutcome = await findOrCreateContact(
    config.account_id,
    config.user_id,
    senderPhone,
    contactName,
  )
  if (!contactOutcome) return
  const contactRecord = contactOutcome.contact

  const conversation = await findOrCreateConversation(
    config.account_id,
    config.user_id,
    contactRecord.id,
  )
  if (!conversation) return

  // Handle reactions (not stored as messages)
  if (msgData.type === 'reaction') {
    await handleReaction(msgData, conversation.id, contactRecord.id)
    return
  }

  const { contentText, mediaUrl, interactiveReplyId } = parseMessageContent(msgData)

  // Resolve swipe-reply context
  let replyToInternalId: string | null = null
  if (msgData.quotedMsg?.id) {
    const { data: parent } = await supabaseAdmin()
      .from('messages')
      .select('id')
      .eq('message_id', msgData.quotedMsg.id)
      .eq('conversation_id', conversation.id)
      .maybeSingle()
    replyToInternalId = parent?.id ?? null
  }

  const ALLOWED_CONTENT_TYPES = new Set([
    'text', 'image', 'document', 'audio', 'video', 'location', 'template', 'interactive',
  ])
  const openwaTypeMap: Record<string, string> = {
    chat: 'text',
    sticker: 'image',
  }
  const mappedType = openwaTypeMap[msgData.type] ?? msgData.type
  const contentType = ALLOWED_CONTENT_TYPES.has(mappedType) ? mappedType : 'text'

  // Check if this is the first inbound message
  const { count: priorCount } = await supabaseAdmin()
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversation.id)
    .eq('sender_type', 'customer')
  const isFirstInboundMessage = (priorCount ?? 0) === 0

  const { error: msgError } = await supabaseAdmin().from('messages').insert({
    conversation_id: conversation.id,
    sender_type: 'customer',
    content_type: contentType,
    content_text: contentText,
    media_url: mediaUrl,
    message_id: msgData.id,
    status: 'delivered',
    created_at: new Date(msgData.timestamp * 1000).toISOString(),
    reply_to_message_id: replyToInternalId,
    interactive_reply_id: interactiveReplyId,
  })

  if (msgError) {
    console.error('[webhook/openwa] error inserting message:', msgError)
    return
  }

  await supabaseAdmin()
    .from('conversations')
    .update({
      last_message_text: contentText || `[${msgData.type}]`,
      last_message_at: new Date().toISOString(),
      unread_count: (conversation.unread_count || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversation.id)

  await flagBroadcastReplyIfAny(config.account_id, contactRecord.id)

  const flowResult = await dispatchInboundToFlows({
    accountId: config.account_id,
    userId: config.user_id,
    contactId: contactRecord.id,
    conversationId: conversation.id,
    message: interactiveReplyId
      ? {
          kind: 'interactive_reply',
          reply_id: interactiveReplyId,
          reply_title: contentText ?? '',
          meta_message_id: msgData.id,
        }
      : {
          kind: 'text',
          text: contentText ?? msgData.body ?? '',
          meta_message_id: msgData.id,
        },
    isFirstInboundMessage,
  })
  const flowConsumed = flowResult.consumed

  const inboundText = contentText ?? msgData.body ?? ''
  const automationTriggers: (
    | 'new_contact_created'
    | 'first_inbound_message'
    | 'new_message_received'
    | 'keyword_match'
  )[] = []
  if (!flowConsumed) automationTriggers.push('new_message_received', 'keyword_match')
  if (contactOutcome.wasCreated) automationTriggers.unshift('new_contact_created')
  if (isFirstInboundMessage) automationTriggers.unshift('first_inbound_message')

  for (const triggerType of automationTriggers) {
    runAutomationsForTrigger({
      accountId: config.account_id,
      triggerType,
      contactId: contactRecord.id,
      context: { message_text: inboundText, conversation_id: conversation.id },
    }).catch((err) => console.error('[automations] dispatch failed:', err))
  }
}

function parseMessageContent(msg: OpenWAMessageData): {
  contentText: string | null
  mediaUrl: string | null
  interactiveReplyId: string | null
} {
  const empty = { contentText: null, mediaUrl: null, interactiveReplyId: null }

  switch (msg.type) {
    case 'chat':
      return { ...empty, contentText: msg.body || null }

    case 'image':
    case 'video':
    case 'document':
    case 'audio':
    case 'sticker':
      return {
        ...empty,
        contentText: msg.mediaData?.caption || msg.mediaData?.filename || null,
        // OpenWA provides the media URL directly — no proxy needed
        mediaUrl: msg.mediaData?.url ?? null,
      }

    case 'location':
      if (msg.location) {
        const loc = msg.location
        const parts = [
          loc.description,
          `${loc.latitude},${loc.longitude}`,
        ].filter(Boolean)
        return { ...empty, contentText: parts.join(' - ') }
      }
      return empty

    case 'reaction':
      return { ...empty, contentText: msg.reaction?.text || null }

    default:
      return { ...empty, contentText: msg.body || `[${msg.type}]` }
  }
}

async function handleReaction(
  msg: OpenWAMessageData,
  conversationId: string,
  contactId: string,
) {
  if (!msg.reaction?.msgId) return

  const { data: parent } = await supabaseAdmin()
    .from('messages')
    .select('id')
    .eq('message_id', msg.reaction.msgId)
    .eq('conversation_id', conversationId)
    .maybeSingle()

  if (!parent) return

  if (!msg.reaction.text) {
    await supabaseAdmin()
      .from('message_reactions')
      .delete()
      .eq('message_id', parent.id)
      .eq('actor_type', 'customer')
      .eq('actor_id', contactId)
    return
  }

  await supabaseAdmin()
    .from('message_reactions')
    .upsert(
      {
        message_id: parent.id,
        conversation_id: conversationId,
        actor_type: 'customer',
        actor_id: contactId,
        emoji: msg.reaction.text,
      },
      { onConflict: 'message_id,actor_type,actor_id' },
    )
}

async function flagBroadcastReplyIfAny(accountId: string, contactId: string) {
  try {
    const { data: recs, error } = await supabaseAdmin()
      .from('broadcast_recipients')
      .select('id, status, broadcast_id, broadcasts!inner(account_id)')
      .eq('contact_id', contactId)
      .eq('broadcasts.account_id', accountId)
      .in('status', ['sent', 'delivered', 'read'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (error || !recs || recs.length === 0) return

    await supabaseAdmin()
      .from('broadcast_recipients')
      .update({ status: 'replied', replied_at: new Date().toISOString() })
      .eq('id', recs[0].id)
  } catch (err) {
    console.error('[webhook/openwa] flagBroadcastReplyIfAny failed:', err)
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContactRow = any

interface ContactOutcome {
  contact: ContactRow
  wasCreated: boolean
}

async function findOrCreateContact(
  accountId: string,
  configOwnerUserId: string,
  phone: string,
  name: string,
): Promise<ContactOutcome | null> {
  const normalizedSender = phone.replace(/\D/g, '')
  const phoneSuffix =
    normalizedSender.length >= 8 ? normalizedSender.slice(-8) : normalizedSender

  const { data: contacts, error: contactsError } = await supabaseAdmin()
    .from('contacts')
    .select('*')
    .eq('account_id', accountId)
    .like('phone', `%${phoneSuffix}`)

  if (contactsError) {
    console.error('[webhook/openwa] error fetching contacts:', contactsError)
    return null
  }

  const existingContact = contacts?.find((c: ContactRow) => phonesMatch(c.phone, phone))

  if (existingContact) {
    if (name && name !== existingContact.name && name !== phone) {
      await supabaseAdmin()
        .from('contacts')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', existingContact.id)
    }
    return { contact: existingContact, wasCreated: false }
  }

  const { data: newContact, error: createError } = await supabaseAdmin()
    .from('contacts')
    .insert({
      account_id: accountId,
      user_id: configOwnerUserId,
      phone,
      name: name || phone,
    })
    .select()
    .single()

  if (createError) {
    console.error('[webhook/openwa] error creating contact:', createError)
    return null
  }

  return { contact: newContact, wasCreated: true }
}

async function findOrCreateConversation(
  accountId: string,
  configOwnerUserId: string,
  contactId: string,
) {
  const { data: existing, error: findError } = await supabaseAdmin()
    .from('conversations')
    .select('*')
    .eq('account_id', accountId)
    .eq('contact_id', contactId)
    .single()

  if (!findError && existing) return existing

  const { data: newConv, error: createError } = await supabaseAdmin()
    .from('conversations')
    .insert({
      account_id: accountId,
      user_id: configOwnerUserId,
      contact_id: contactId,
    })
    .select()
    .single()

  if (createError) {
    console.error('[webhook/openwa] error creating conversation:', createError)
    return null
  }

  return newConv
}
