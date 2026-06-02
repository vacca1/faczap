import {
  sendTextMessage,
  sendMediaMessage,
  sendInteractiveButtons,
  sendInteractiveList,
  type InteractiveButton,
  type InteractiveListSection,
  type MediaKind,
} from '@/lib/whatsapp/openwa-api'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { supabaseAdmin } from './admin-client'

// Flows-side OpenWA sender (text + media + interactive variants).
// All functions use the service-role client and are account-scoped.

interface BaseEngineArgs {
  accountId: string
  userId: string
  conversationId: string
  contactId: string
}

async function loadContactAndConfig(accountId: string, contactId: string) {
  const db = supabaseAdmin()

  const { data: contact, error: contactErr } = await db
    .from('contacts')
    .select('id, phone')
    .eq('id', contactId)
    .eq('account_id', accountId)
    .maybeSingle()
  if (contactErr || !contact?.phone) throw new Error('contact not found for this account')

  const phone = normalizePhone(contact.phone)
  if (!phone) throw new Error(`contact phone invalid: ${contact.phone}`)

  const { data: config, error: configErr } = await db
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', accountId)
    .single()
  if (configErr || !config || !config.session_id || !config.api_key) {
    throw new Error('WhatsApp não configurado para esta conta')
  }

  return { contact, phone, config, db }
}

async function persistMessage(
  db: ReturnType<typeof supabaseAdmin>,
  conversationId: string,
  contentType: string,
  contentText: string | null,
  waMessageId: string,
) {
  const { error: msgErr } = await db.from('messages').insert({
    conversation_id: conversationId,
    sender_type: 'bot',
    content_type: contentType,
    content_text: contentText,
    message_id: waMessageId,
    status: 'sent',
  })
  if (msgErr) throw new Error(`sent to OpenWA but DB insert failed: ${msgErr.message}`)

  await db
    .from('conversations')
    .update({
      last_message_text: contentText || `[${contentType}]`,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
}

// ============================================================

interface SendTextEngineArgs extends BaseEngineArgs {
  text: string
}

export async function engineSendText(args: SendTextEngineArgs): Promise<{ whatsapp_message_id: string }> {
  const { contact: _c, phone, config, db } = await loadContactAndConfig(args.accountId, args.contactId)
  const result = await sendTextMessage({
    sessionId: config.session_id,
    apiKey: config.api_key,
    baseUrl: config.openwa_base_url ?? undefined,
    to: phone,
    text: args.text,
  })
  await persistMessage(db, args.conversationId, 'text', args.text, result.messageId)
  return { whatsapp_message_id: result.messageId }
}

interface SendMediaEngineArgs extends BaseEngineArgs {
  kind: MediaKind
  url: string
  caption?: string
  filename?: string
}

export async function engineSendMedia(args: SendMediaEngineArgs): Promise<{ whatsapp_message_id: string }> {
  const { phone, config, db } = await loadContactAndConfig(args.accountId, args.contactId)
  const result = await sendMediaMessage({
    sessionId: config.session_id,
    apiKey: config.api_key,
    baseUrl: config.openwa_base_url ?? undefined,
    to: phone,
    kind: args.kind,
    url: args.url,
    caption: args.caption,
    filename: args.filename,
  })
  const preview = args.caption?.trim() || `[${args.kind}]`
  await persistMessage(db, args.conversationId, args.kind, args.caption ?? null, result.messageId)
  void preview
  return { whatsapp_message_id: result.messageId }
}

interface SendInteractiveButtonsEngineArgs extends BaseEngineArgs {
  bodyText: string
  buttons: InteractiveButton[]
  headerText?: string
  footerText?: string
}

export async function engineSendInteractiveButtons(
  args: SendInteractiveButtonsEngineArgs,
): Promise<{ whatsapp_message_id: string }> {
  const { phone, config, db } = await loadContactAndConfig(args.accountId, args.contactId)
  const result = await sendInteractiveButtons({
    sessionId: config.session_id,
    apiKey: config.api_key,
    baseUrl: config.openwa_base_url ?? undefined,
    to: phone,
    bodyText: args.bodyText,
    buttons: args.buttons,
    headerText: args.headerText,
    footerText: args.footerText,
  })
  await persistMessage(db, args.conversationId, 'interactive', args.bodyText, result.messageId)
  return { whatsapp_message_id: result.messageId }
}

interface SendInteractiveListEngineArgs extends BaseEngineArgs {
  bodyText: string
  buttonLabel: string
  sections: InteractiveListSection[]
  headerText?: string
  footerText?: string
}

export async function engineSendInteractiveList(
  args: SendInteractiveListEngineArgs,
): Promise<{ whatsapp_message_id: string }> {
  const { phone, config, db } = await loadContactAndConfig(args.accountId, args.contactId)
  const result = await sendInteractiveList({
    sessionId: config.session_id,
    apiKey: config.api_key,
    baseUrl: config.openwa_base_url ?? undefined,
    to: phone,
    bodyText: args.bodyText,
    buttonLabel: args.buttonLabel,
    sections: args.sections,
    headerText: args.headerText,
    footerText: args.footerText,
  })
  await persistMessage(db, args.conversationId, 'interactive', args.bodyText, result.messageId)
  return { whatsapp_message_id: result.messageId }
}
