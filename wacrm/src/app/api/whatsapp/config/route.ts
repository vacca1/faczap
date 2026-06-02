import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { getSessionStatus } from '@/lib/whatsapp/openwa-api'

async function resolveAccountId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data?.account_id) return null
  return data.account_id as string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminClient: any = null
function supabaseAdmin() {
  if (!_adminClient) {
    _adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return _adminClient
}

/**
 * GET /api/whatsapp/config
 * Check whether the saved OpenWA session is connected.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json(
        { connected: false, reason: 'no_account', message: 'Perfil não vinculado a uma conta.' },
        { status: 200 },
      )
    }

    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('session_id, api_key, openwa_base_url, status')
      .eq('account_id', accountId)
      .maybeSingle()

    if (configError) {
      return NextResponse.json(
        { connected: false, reason: 'db_error', message: 'Falha ao buscar configuração' },
        { status: 200 },
      )
    }

    if (!config || !config.session_id || !config.api_key) {
      return NextResponse.json(
        {
          connected: false,
          reason: 'no_config',
          message: 'Nenhuma configuração do OpenWA salva ainda. Preencha o formulário e clique em Salvar.',
        },
        { status: 200 },
      )
    }

    // Ping OpenWA to get session status
    try {
      const sessionStatus = await getSessionStatus({
        sessionId: config.session_id,
        apiKey: config.api_key,
        baseUrl: config.openwa_base_url ?? undefined,
      })
      const connected = sessionStatus.status === 'CONNECTED'
      return NextResponse.json({
        connected,
        session_status: sessionStatus.status,
        session_me: sessionStatus.me ?? null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      return NextResponse.json(
        {
          connected: false,
          reason: 'openwa_error',
          message: `Não foi possível conectar ao OpenWA: ${message}`,
        },
        { status: 200 },
      )
    }
  } catch (error) {
    console.error('[whatsapp/config GET] error:', error)
    return NextResponse.json(
      { connected: false, reason: 'unknown', message: 'Erro interno' },
      { status: 500 },
    )
  }
}

/**
 * POST /api/whatsapp/config
 * Save or update OpenWA session credentials.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json({ error: 'Perfil não vinculado a uma conta.' }, { status: 403 })
    }

    const body = await request.json()
    const { session_id, api_key, openwa_base_url } = body

    if (!session_id || !api_key) {
      return NextResponse.json(
        { error: 'session_id e api_key são obrigatórios' },
        { status: 400 },
      )
    }

    // Check no other account already uses this session_id
    const { data: claimed } = await supabaseAdmin()
      .from('whatsapp_config')
      .select('account_id')
      .eq('session_id', session_id)
      .neq('account_id', accountId)
      .maybeSingle()

    if (claimed) {
      return NextResponse.json(
        { error: 'Este session_id já está vinculado a outra conta.' },
        { status: 409 },
      )
    }

    // Verify credentials against OpenWA
    let sessionStatus
    try {
      sessionStatus = await getSessionStatus({
        sessionId: session_id,
        apiKey: api_key,
        baseUrl: openwa_base_url ?? undefined,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      return NextResponse.json(
        { error: `Não foi possível verificar a sessão OpenWA: ${message}` },
        { status: 400 },
      )
    }

    const isConnected = sessionStatus.status === 'CONNECTED'

    const { data: existing } = await supabase
      .from('whatsapp_config')
      .select('id')
      .eq('account_id', accountId)
      .maybeSingle()

    const row = {
      session_id,
      api_key,
      openwa_base_url: openwa_base_url || 'http://openwa:2785/api',
      status: isConnected ? 'connected' : 'disconnected',
      connected_at: isConnected ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('whatsapp_config')
        .update(row)
        .eq('account_id', accountId)

      if (updateError) {
        console.error('[whatsapp/config POST] update error:', updateError)
        return NextResponse.json({ error: 'Falha ao atualizar configuração' }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase
        .from('whatsapp_config')
        .insert({ account_id: accountId, user_id: user.id, ...row })

      if (insertError) {
        console.error('[whatsapp/config POST] insert error:', insertError)
        return NextResponse.json({ error: 'Falha ao salvar configuração' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      session_status: sessionStatus.status,
      session_me: sessionStatus.me ?? null,
    })
  } catch (error) {
    console.error('[whatsapp/config POST] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/whatsapp/config
 * Remove the WhatsApp configuration for this account.
 */
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json({ error: 'Perfil não vinculado a uma conta.' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('whatsapp_config')
      .delete()
      .eq('account_id', accountId)

    if (deleteError) {
      console.error('[whatsapp/config DELETE] error:', deleteError)
      return NextResponse.json({ error: 'Falha ao remover configuração' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[whatsapp/config DELETE] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
