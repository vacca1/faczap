import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTextMessage, sendMediaMessage } from '@/lib/whatsapp/openwa-api'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { normalizePhone } from '@/lib/whatsapp/phone-utils'
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limit = checkRateLimit(`send:${user.id}`, RATE_LIMITS.send)
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
    const { conversation_id, message_type, content_text, media_url, reply_to_message_id } = body

    if (!conversation_id || !message_type) {
      return NextResponse.json(
        { error: 'conversation_id e message_type são obrigatórios' },
        { status: 400 },
      )
    }
    if (message_type === 'text' && !content_text) {
      return NextResponse.json({ error: 'content_text é obrigatório para mensagens de texto' }, { status: 400 })
    }

    // Fetch conversation + contact
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', conversation_id)
      .eq('account_id', accountId)
      .single()

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
    }

    const contact = conversation.contact
    if (!contact?.phone) {
      return NextResponse.json({ error: 'Número de telefone do contato não encontrado' }, { status: 400 })
    }

    const phone = normalizePhone(contact.phone)
    if (!phone) {
      return NextResponse.json({ error: 'Número de telefone inválido' }, { status: 400 })
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

    // Resolve reply-to context
    let quotedMessageId: string | undefined
    if (reply_to_message_id) {
      const { data: parent } = await supabase
        .from('messages')
        .select('message_id, conversation_id')
        .eq('id', reply_to_message_id)
        .eq('conversation_id', conversation_id)
        .maybeSingle()

      if (!parent) {
        return NextResponse.json(
          { error: 'reply_to_message_id não encontrado nesta conversa' },
          { status: 400 },
        )
      }
      quotedMessageId = parent.message_id ?? undefined
    }

    // Send via OpenWA
    let waMessageId = ''
    try {
      if (message_type === 'text') {
        const result = await sendTextMessage({
          sessionId: config.session_id,
          apiKey: config.api_key,
          baseUrl: config.openwa_base_url ?? undefined,
          to: phone,
          text: content_text,
          quotedMessageId,
        })
        waMessageId = result.messageId
      } else if (['image', 'video', 'document', 'audio'].includes(message_type)) {
        if (!media_url) {
          return NextResponse.json({ error: 'media_url é obrigatório para mensagens de mídia' }, { status: 400 })
        }
        const result = await sendMediaMessage({
          sessionId: config.session_id,
          apiKey: config.api_key,
          baseUrl: config.openwa_base_url ?? undefined,
          to: phone,
          kind: message_type,
          url: media_url,
          caption: content_text ?? undefined,
        })
        waMessageId = result.messageId
      } else {
        return NextResponse.json(
          { error: `Tipo de mensagem não suportado: ${message_type}` },
          { status: 400 },
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      console.error('[whatsapp/send] OpenWA error:', msg)
      return NextResponse.json({ error: `Erro ao enviar via OpenWA: ${msg}` }, { status: 502 })
    }

    // Persist to DB
    const { data: messageRecord, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        sender_type: 'agent',
        content_type: message_type,
        content_text: content_text || null,
        media_url: media_url || null,
        message_id: waMessageId,
        status: 'sent',
        reply_to_message_id: reply_to_message_id || null,
      })
      .select()
      .single()

    if (msgError) {
      console.error('[whatsapp/send] DB insert error:', msgError)
      return NextResponse.json(
        { error: `Mensagem enviada ao OpenWA mas falhou ao salvar: ${msgError.message}` },
        { status: 500 },
      )
    }

    await supabase
      .from('conversations')
      .update({
        last_message_text: content_text || `[${message_type}]`,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversation_id)

    // Pause any active Flow run for this contact
    try {
      await supabaseAdmin()
        .from('flow_runs')
        .update({
          status: 'paused_by_agent',
          ended_at: new Date().toISOString(),
          end_reason: 'agent_replied',
        })
        .eq('account_id', accountId)
        .eq('contact_id', contact.id)
        .eq('status', 'active')
    } catch (err) {
      console.error('[flows] pause-on-agent-send failed:', err instanceof Error ? err.message : err)
    }

    return NextResponse.json({
      success: true,
      message_id: messageRecord.id,
      whatsapp_message_id: waMessageId,
    })
  } catch (error) {
    console.error('[whatsapp/send] unexpected error:', error)
    return NextResponse.json({ error: 'Falha ao enviar mensagem' }, { status: 500 })
  }
}
