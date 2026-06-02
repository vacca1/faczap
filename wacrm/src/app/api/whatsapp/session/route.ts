import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createSession,
  getSession,
  startSession,
  stopSession,
  ensureWebhook,
  isConnected,
  getOpenWAEnv,
} from '@/lib/whatsapp/openwa-server'

async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()
  return (data?.account_id as string) ?? null
}

interface ConfigRow {
  id: string
  session_id: string | null
  status: string | null
  phone: string | null
  push_name: string | null
}

async function loadConfig(
  supabase: Awaited<ReturnType<typeof createClient>>,
  accountId: string,
): Promise<ConfigRow | null> {
  const { data } = await supabase
    .from('whatsapp_config')
    .select('id, session_id, status, phone, push_name')
    .eq('account_id', accountId)
    .maybeSingle()
  return (data as ConfigRow) ?? null
}

/**
 * GET /api/whatsapp/session — current connection status for this account.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountId = await resolveAccountId(supabase, user.id)
  if (!accountId) return NextResponse.json({ configured: false, connected: false })

  const config = await loadConfig(supabase, accountId)
  if (!config?.session_id) {
    return NextResponse.json({ configured: false, connected: false })
  }

  try {
    const session = await getSession(config.session_id)
    if (!session) {
      return NextResponse.json({ configured: false, connected: false, status: 'missing' })
    }
    const connected = isConnected(session.status)
    await supabase
      .from('whatsapp_config')
      .update({
        status: connected ? 'connected' : 'disconnected',
        phone: session.phone,
        push_name: session.pushName,
        connected_at: connected ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id)
    return NextResponse.json({
      configured: true,
      connected,
      status: session.status,
      phone: session.phone,
      pushName: session.pushName,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ configured: true, connected: false, error: message })
  }
}

/**
 * POST /api/whatsapp/session — ensure a session exists, register the webhook
 * and start it. Auto-creates the session on first call. No user input needed.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountId = await resolveAccountId(supabase, user.id)
  if (!accountId) {
    return NextResponse.json({ error: 'Perfil não vinculado a uma conta.' }, { status: 403 })
  }

  let env
  try {
    env = getOpenWAEnv()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OpenWA não configurado'
    return NextResponse.json({ error: message }, { status: 500 })
  }

  try {
    const config = await loadConfig(supabase, accountId)
    let sessionId = config?.session_id ?? null

    // Validate existing session still exists in OpenWA; otherwise recreate.
    if (sessionId) {
      const existing = await getSession(sessionId)
      if (!existing) sessionId = null
    }

    if (!sessionId) {
      // OpenWA session names allow only [a-zA-Z0-9-] (no underscore), max 50.
      // accountId is a 36-char UUID → "fz-" + 36 = 39 chars, within limits.
      const created = await createSession(`fz-${accountId}`)
      sessionId = created.id
      const row = {
        account_id: accountId,
        user_id: user.id,
        session_id: sessionId,
        api_key: env.apiKey,
        openwa_base_url: env.baseUrl,
        status: 'disconnected',
        updated_at: new Date().toISOString(),
      }
      if (config) {
        await supabase.from('whatsapp_config').update(row).eq('id', config.id)
      } else {
        await supabase.from('whatsapp_config').insert(row)
      }
    }

    // Register inbound webhook (idempotent) and start the session.
    const webhookUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/whatsapp/webhook`
    await ensureWebhook(sessionId, webhookUrl, process.env.OPENWA_WEBHOOK_SECRET || undefined)
    await startSession(sessionId)

    return NextResponse.json({ ok: true, session_id: sessionId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}

/**
 * DELETE /api/whatsapp/session — stop / disconnect the session.
 */
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountId = await resolveAccountId(supabase, user.id)
  if (!accountId) return NextResponse.json({ error: 'Sem conta.' }, { status: 403 })

  const config = await loadConfig(supabase, accountId)
  if (config?.session_id) {
    try {
      await stopSession(config.session_id)
    } catch {
      // best effort
    }
    await supabase
      .from('whatsapp_config')
      .update({ status: 'disconnected', phone: null, push_name: null, updated_at: new Date().toISOString() })
      .eq('id', config.id)
  }
  return NextResponse.json({ ok: true })
}
