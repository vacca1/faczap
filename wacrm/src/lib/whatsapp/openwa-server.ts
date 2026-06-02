/**
 * Server-only OpenWA client.
 *
 * Talks to the standalone OpenWA service using credentials from the
 * environment (OPENWA_BASE_URL + OPENWA_API_KEY). The admin key NEVER
 * reaches the browser — every call here runs server-side in API routes.
 *
 * One OpenWA session is created per FatorZap account; the session id is
 * persisted in the `whatsapp_config` table so the send/broadcast routes
 * (which read session_id/api_key/openwa_base_url) keep working.
 */

export interface OpenWAEnv {
  baseUrl: string
  apiKey: string
}

export function getOpenWAEnv(): OpenWAEnv {
  const baseUrl = process.env.OPENWA_BASE_URL
  const apiKey = process.env.OPENWA_API_KEY
  if (!baseUrl) throw new Error('OPENWA_BASE_URL não configurado no servidor.')
  if (!apiKey) throw new Error('OPENWA_API_KEY não configurado no servidor.')
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiKey }
}

async function owaFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const { baseUrl, apiKey } = getOpenWAEnv()
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
  let data: T | null = null
  try {
    data = (await res.json()) as T
  } catch {
    data = null
  }
  return { ok: res.ok, status: res.status, data }
}

// OpenWA SessionStatus string values: created | initializing | qr_ready |
// authenticating | ready | disconnected | failed. "ready" == connected.
export type OpenWASessionStatus =
  | 'created'
  | 'initializing'
  | 'qr_ready'
  | 'authenticating'
  | 'ready'
  | 'disconnected'
  | 'failed'

export interface OpenWASession {
  id: string
  name: string
  status: OpenWASessionStatus
  phone: string | null
  pushName: string | null
}

export function isConnected(status: string | null | undefined): boolean {
  return status === 'ready'
}

export async function createSession(name: string): Promise<OpenWASession> {
  const { ok, status, data } = await owaFetch<OpenWASession>('/sessions', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  if (!ok || !data?.id) {
    // Surface the OpenWA validation/error message when present.
    const raw = (data as { message?: string | string[] } | null)?.message
    const detail = Array.isArray(raw) ? raw.join('; ') : raw
    throw new Error(
      `Falha ao criar sessão OpenWA (HTTP ${status})${detail ? `: ${detail}` : ''}.`,
    )
  }
  return data
}

export async function getSession(id: string): Promise<OpenWASession | null> {
  const { ok, status, data } = await owaFetch<OpenWASession>(`/sessions/${id}`)
  if (status === 404) return null
  if (!ok) throw new Error(`Falha ao consultar sessão OpenWA (HTTP ${status}).`)
  return data
}

export async function startSession(id: string): Promise<void> {
  // Idempotent-ish: starting an already-started session may 4xx — ignore.
  await owaFetch(`/sessions/${id}/start`, { method: 'POST', body: '{}' })
}

export async function stopSession(id: string): Promise<void> {
  await owaFetch(`/sessions/${id}/stop`, { method: 'POST', body: '{}' })
}

export interface OpenWAQr {
  qrCode: string | null
  status: OpenWASessionStatus
}

export async function getQr(id: string): Promise<OpenWAQr> {
  const { ok, status, data } = await owaFetch<OpenWAQr>(`/sessions/${id}/qr`)
  if (!ok || !data) throw new Error(`Falha ao obter QR (HTTP ${status}).`)
  return data
}

interface OpenWAWebhook {
  id: string
  url: string
}

/**
 * Make sure the FatorZap webhook is registered on the session so inbound
 * messages reach the app. No-op if a webhook with the same URL exists.
 */
export async function ensureWebhook(sessionId: string, url: string, secret?: string): Promise<void> {
  const list = await owaFetch<OpenWAWebhook[]>(`/sessions/${sessionId}/webhooks`)
  const existing = Array.isArray(list.data)
    ? list.data.find((w) => w.url === url)
    : null
  if (existing) return
  const body: Record<string, unknown> = { url, events: ['*'] }
  if (secret) body.secret = secret
  await owaFetch(`/sessions/${sessionId}/webhooks`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
