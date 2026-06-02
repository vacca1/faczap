import { sendTextMessage } from '@/lib/whatsapp/openwa-api'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { supabaseAdmin } from './admin-client'

// Automation-side OpenWA sender.
// Uses the service-role client (engine has no cookies).
// Account-scoped tenancy — all lookups use account_id.

interface SendTextArgs {
  accountId: string
  userId: string
  conversationId: string
  contactId: string
  text: string
}

export async function engineSendText(args: SendTextArgs): Promise<{ whatsapp_message_id: string }> {
  const db = supabaseAdmin()

  const { data: contact, error: contactErr } = await db
    .from('contacts')
    .select('id, phone')
    .eq('id', args.contactId)
    .eq('account_id', args.accountId)
    .maybeSingle()
  if (contactErr || !contact?.phone) {
    throw new Error('contact not found for this account')
  }

  const phone = normalizePhone(contact.phone)
  if (!phone) throw new Error(`contact phone invalid: ${contact.phone}`)

  const { data: config, error: configErr } = await db
    .from('whatsapp_config')
    .select('*')
    .eq('account_id', args.accountId)
    .single()
  if (configErr || !config || !config.session_id || !config.api_key) {
    throw new Error('WhatsApp não configurado para esta conta')
  }

  const result = await sendTextMessage({
    sessionId: config.session_id,
    apiKey: config.api_key,
    baseUrl: config.openwa_base_url ?? undefined,
    to: phone,
    text: args.text,
  })
  const waMessageId = result.messageId

  const { error: msgErr } = await db.from('messages').insert({
    conversation_id: args.conversationId,
    sender_type: 'bot',
    content_type: 'text',
    content_text: args.text,
    message_id: waMessageId,
    status: 'sent',
  })
  if (msgErr) {
    throw new Error(`enviado ao OpenWA mas falhou ao salvar no DB: ${msgErr.message}`)
  }

  await db
    .from('conversations')
    .update({
      last_message_text: args.text,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.conversationId)

  return { whatsapp_message_id: waMessageId }
}

// engineSendTemplate is kept for backward compat — OpenWA has no Meta-style
// templates. The template content is approximated by joining params as text.
export async function engineSendTemplate(
  args: Omit<SendTextArgs, 'text'> & {
    text?: string
    templateName?: string
    language?: string
    params?: string[]
  },
): Promise<{ whatsapp_message_id: string }> {
  const text =
    args.text ??
    (args.params && args.params.length > 0
      ? args.params.join(' ')
      : `[template: ${args.templateName ?? 'unknown'}]`)
  return engineSendText({ ...args, text })
}
