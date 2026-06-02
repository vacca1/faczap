/**
 * OpenWA REST API client.
 *
 * OpenWA is a self-hosted WhatsApp Web bridge that exposes a REST API.
 * All functions accept named parameters (same pattern as the old meta-api.ts)
 * to prevent argument-order bugs.
 *
 * Base URL defaults to OPENWA_BASE_URL env var or http://localhost:2785/api.
 * Auth uses the X-Api-Key header.
 */

function getBaseUrl(override?: string): string {
  return override ?? process.env.OPENWA_BASE_URL ?? 'http://localhost:2785/api'
}

export interface OpenWASendResult {
  messageId: string
}

export type MediaKind = 'image' | 'video' | 'document' | 'audio'

interface OpenWAErrorResponse {
  message?: string
  error?: string
}

async function throwOpenWAError(response: Response, fallback: string): Promise<never> {
  let message = fallback
  try {
    const data = (await response.json()) as OpenWAErrorResponse
    if (data.message || data.error) message = data.message ?? data.error ?? fallback
  } catch {
    // response body wasn't JSON — keep the fallback
  }
  throw new Error(message)
}

function buildHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': apiKey,
  }
}

/**
 * Convert a digits-only phone number to OpenWA chatId format.
 * e.g. "5511999999999" → "5511999999999@c.us"
 */
export function phoneToOpenWAChatId(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return `${digits}@c.us`
}

/**
 * Extract a plain phone number from an OpenWA chatId.
 * e.g. "5511999999999@c.us" → "5511999999999"
 */
export function chatIdToPhone(chatId: string): string {
  return chatId.replace(/@.*$/, '')
}

// ============================================================
// Text messages
// ============================================================

export interface SendTextMessageArgs {
  sessionId: string
  apiKey: string
  baseUrl?: string
  to: string
  text: string
  /** OpenWA message id of the message being replied to. */
  quotedMessageId?: string
}

export async function sendTextMessage(args: SendTextMessageArgs): Promise<OpenWASendResult> {
  const { sessionId, apiKey, baseUrl, to, text, quotedMessageId } = args
  const url = `${getBaseUrl(baseUrl)}/sessions/${sessionId}/messages/send-text`
  const body: Record<string, unknown> = {
    chatId: phoneToOpenWAChatId(to),
    text,
  }
  if (quotedMessageId) body.quotedMessageId = quotedMessageId

  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    await throwOpenWAError(response, `OpenWA API error: ${response.status}`)
  }
  const data = await response.json()
  return { messageId: data.messageId }
}

// ============================================================
// Media messages
// ============================================================

export interface SendMediaMessageArgs {
  sessionId: string
  apiKey: string
  baseUrl?: string
  to: string
  kind: MediaKind
  /** Public URL OpenWA fetches at send time. */
  url: string
  caption?: string
  /** Document-only. Shown as the file name in the chat. */
  filename?: string
  quotedMessageId?: string
}

export async function sendMediaMessage(args: SendMediaMessageArgs): Promise<OpenWASendResult> {
  const { sessionId, apiKey, baseUrl, to, kind, url: mediaUrl, caption, filename, quotedMessageId } = args
  if (!mediaUrl) throw new Error('sendMediaMessage requires a url.')

  const endpointMap: Record<MediaKind, string> = {
    image: 'send-image',
    video: 'send-video',
    audio: 'send-audio',
    document: 'send-document',
  }

  const apiUrl = `${getBaseUrl(baseUrl)}/sessions/${sessionId}/messages/${endpointMap[kind]}`
  const body: Record<string, unknown> = {
    chatId: phoneToOpenWAChatId(to),
    url: mediaUrl,
  }
  if (caption) body.caption = caption
  if (filename) body.filename = filename
  if (quotedMessageId) body.quotedMessageId = quotedMessageId

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    await throwOpenWAError(response, `OpenWA API error: ${response.status}`)
  }
  const data = await response.json()
  return { messageId: data.messageId }
}

// ============================================================
// Interactive messages
//
// OpenWA / WhatsApp Web does not support Meta's native button-reply
// and list-reply interactive message types. We approximate them as
// numbered text lists so the customer can reply with the number.
// The Flows engine already handles numeric replies via the
// interactive_reply_id matching.
// ============================================================

export interface InteractiveButton {
  id: string
  title: string
}

export interface SendInteractiveButtonsArgs {
  sessionId: string
  apiKey: string
  baseUrl?: string
  to: string
  bodyText: string
  buttons: InteractiveButton[]
  headerText?: string
  footerText?: string
  quotedMessageId?: string
}

export async function sendInteractiveButtons(
  args: SendInteractiveButtonsArgs,
): Promise<OpenWASendResult> {
  const { sessionId, apiKey, baseUrl, to, bodyText, buttons, headerText, footerText, quotedMessageId } = args
  const lines: string[] = []
  if (headerText) lines.push(`*${headerText}*`, '')
  lines.push(bodyText, '')
  buttons.forEach((btn, i) => lines.push(`${i + 1}. ${btn.title}`))
  if (footerText) lines.push('', `_${footerText}_`)
  return sendTextMessage({ sessionId, apiKey, baseUrl, to, text: lines.join('\n'), quotedMessageId })
}

export interface InteractiveListRow {
  id: string
  title: string
  description?: string
}

export interface InteractiveListSection {
  title?: string
  rows: InteractiveListRow[]
}

export interface SendInteractiveListArgs {
  sessionId: string
  apiKey: string
  baseUrl?: string
  to: string
  bodyText: string
  buttonLabel: string
  sections: InteractiveListSection[]
  headerText?: string
  footerText?: string
}

export async function sendInteractiveList(
  args: SendInteractiveListArgs,
): Promise<OpenWASendResult> {
  const { sessionId, apiKey, baseUrl, to, bodyText, sections, headerText, footerText } = args
  const lines: string[] = []
  if (headerText) lines.push(`*${headerText}*`, '')
  lines.push(bodyText, '')
  let idx = 1
  for (const section of sections) {
    if (section.title) lines.push(`*${section.title}*`)
    for (const row of section.rows) {
      const desc = row.description ? ` — ${row.description}` : ''
      lines.push(`${idx}. ${row.title}${desc}`)
      idx++
    }
  }
  if (footerText) lines.push('', `_${footerText}_`)
  return sendTextMessage({ sessionId, apiKey, baseUrl, to, text: lines.join('\n') })
}

// ============================================================
// Reactions
// ============================================================

export interface SendReactionArgs {
  sessionId: string
  apiKey: string
  baseUrl?: string
  targetMessageId: string
  emoji: string
}

export async function sendReactionMessage(args: SendReactionArgs): Promise<OpenWASendResult> {
  const { sessionId, apiKey, baseUrl, targetMessageId, emoji } = args
  const url = `${getBaseUrl(baseUrl)}/sessions/${sessionId}/messages/send-reaction`
  const response = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ messageId: targetMessageId, emoji }),
  })
  if (!response.ok) {
    await throwOpenWAError(response, `OpenWA API error: ${response.status}`)
  }
  const data = await response.json()
  return { messageId: data.messageId ?? targetMessageId }
}

// ============================================================
// Session management / verification
// ============================================================

export interface SessionStatus {
  id: string
  status: 'INITIALIZING' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'FAILED'
  me?: { id: string; pushname?: string }
}

export interface VerifySessionArgs {
  sessionId: string
  apiKey: string
  baseUrl?: string
}

export async function getSessionStatus(args: VerifySessionArgs): Promise<SessionStatus> {
  const { sessionId, apiKey, baseUrl } = args
  const response = await fetch(`${getBaseUrl(baseUrl)}/sessions/${sessionId}`, {
    headers: { 'X-Api-Key': apiKey },
  })
  if (!response.ok) {
    await throwOpenWAError(response, `OpenWA API error: ${response.status}`)
  }
  return response.json()
}

export async function getQRCode(args: VerifySessionArgs): Promise<{ qr: string }> {
  const { sessionId, apiKey, baseUrl } = args
  const response = await fetch(`${getBaseUrl(baseUrl)}/sessions/${sessionId}/qr`, {
    headers: { 'X-Api-Key': apiKey },
  })
  if (!response.ok) {
    await throwOpenWAError(response, `OpenWA API error: ${response.status}`)
  }
  return response.json()
}

export interface CreateSessionArgs {
  sessionId: string
  apiKey: string
  baseUrl?: string
  /** URL where OpenWA will push webhook events. */
  webhookUrl?: string
  /** HMAC secret for webhook signature verification. */
  webhookSecret?: string
}

export async function createAndStartSession(args: CreateSessionArgs): Promise<void> {
  const { sessionId, apiKey, baseUrl, webhookUrl, webhookSecret } = args
  const base = getBaseUrl(baseUrl)

  // Create session
  await fetch(`${base}/sessions`, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ id: sessionId }),
  })

  // Start session
  await fetch(`${base}/sessions/${sessionId}/start`, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({}),
  })

  // Register webhook if URL provided
  if (webhookUrl) {
    const webhookBody: Record<string, unknown> = {
      url: webhookUrl,
      events: ['message.received', 'message.ack', 'session.status'],
    }
    if (webhookSecret) webhookBody.secret = webhookSecret
    await fetch(`${base}/sessions/${sessionId}/webhooks`, {
      method: 'POST',
      headers: buildHeaders(apiKey),
      body: JSON.stringify(webhookBody),
    })
  }
}
