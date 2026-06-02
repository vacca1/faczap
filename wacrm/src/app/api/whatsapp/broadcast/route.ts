import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTextMessage } from '@/lib/whatsapp/openwa-api'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

interface BroadcastResult {
  phone: string
  status: 'sent' | 'failed'
  whatsapp_message_id?: string
  error?: string
}

interface Recipient {
  phone: string
  message?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limit = checkRateLimit(`broadcast:${user.id}`, RATE_LIMITS.broadcast)
    if (!limit.success) return rateLimitResponse(limit)

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id')
      .eq('user_id', user.id)
      .maybeSingle()
    const accountId = profile?.account_id as string | undefined
    if (!accountId) {
      return NextResponse.json(
        { error: 'Seu perfil não está vinculado a uma conta.' },
        { status: 403 },
      )
    }

    const body = await request.json()

    // Accept two shapes:
    //   { recipients: [{ phone, message }], default_message }
    //   { phone_numbers: string[], message }
    const { recipients: rawRecipients, phone_numbers, message: defaultMessage } = body

    let recipients: Recipient[]
    if (Array.isArray(rawRecipients) && rawRecipients.length > 0) {
      recipients = rawRecipients
    } else if (Array.isArray(phone_numbers) && phone_numbers.length > 0) {
      recipients = phone_numbers.map((phone: string) => ({ phone }))
    } else {
      return NextResponse.json(
        { error: '`recipients` ou `phone_numbers` são obrigatórios e devem ser arrays não vazios' },
        { status: 400 },
      )
    }

    if (!defaultMessage && recipients.every((r: Recipient) => !r.message)) {
      return NextResponse.json(
        { error: '`message` é obrigatório' },
        { status: 400 },
      )
    }

    // Fetch OpenWA config
    const { data: config, error: configError } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('account_id', accountId)
      .single()

    if (configError || !config || !config.session_id || !config.api_key) {
      return NextResponse.json(
        { error: 'WhatsApp não configurado. Configure a integração OpenWA nas Configurações.' },
        { status: 400 },
      )
    }

    const results: BroadcastResult[] = []
    let sentCount = 0
    let failedCount = 0

    for (const recipient of recipients) {
      const phone = normalizePhone(recipient.phone)
      if (!phone) {
        results.push({ phone: recipient.phone, status: 'failed', error: 'Número de telefone inválido' })
        failedCount++
        continue
      }

      const text = recipient.message ?? defaultMessage
      if (!text) {
        results.push({ phone: recipient.phone, status: 'failed', error: 'Mensagem não definida' })
        failedCount++
        continue
      }

      try {
        const result = await sendTextMessage({
          sessionId: config.session_id,
          apiKey: config.api_key,
          baseUrl: config.openwa_base_url ?? undefined,
          to: phone,
          text,
        })
        results.push({ phone: recipient.phone, status: 'sent', whatsapp_message_id: result.messageId })
        sentCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        console.error(`[broadcast] falha ao enviar para ${recipient.phone}:`, msg)
        results.push({ phone: recipient.phone, status: 'failed', error: msg })
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      total: recipients.length,
      sent: sentCount,
      failed: failedCount,
      results,
    })
  } catch (error) {
    console.error('[broadcast] unexpected error:', error)
    return NextResponse.json({ error: 'Falha ao processar transmissão' }, { status: 500 })
  }
}
