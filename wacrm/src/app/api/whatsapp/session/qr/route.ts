import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQr, isConnected } from '@/lib/whatsapp/openwa-server'

/**
 * GET /api/whatsapp/session/qr — return the QR code for this account's
 * session (proxied server-side; the browser never talks to OpenWA directly).
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', user.id)
    .maybeSingle()
  const accountId = profile?.account_id as string | undefined
  if (!accountId) return NextResponse.json({ error: 'Sem conta.' }, { status: 403 })

  const { data: config } = await supabase
    .from('whatsapp_config')
    .select('session_id')
    .eq('account_id', accountId)
    .maybeSingle()

  if (!config?.session_id) {
    return NextResponse.json({ error: 'Sessão não inicializada.' }, { status: 409 })
  }

  try {
    const qr = await getQr(config.session_id)
    return NextResponse.json({
      qrCode: qr.qrCode,
      status: qr.status,
      connected: isConnected(qr.status),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
