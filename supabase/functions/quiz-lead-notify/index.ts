import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { quiz_id, lead_name, lead_phone, lead_telegram, lead_email, lead_answers } = await req.json()

    if (!quiz_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'quiz_id required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Получаем квиз и telegram_id владельца
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('title, telegram_id')
      .eq('id', quiz_id)
      .single()

    if (quizError || !quiz?.telegram_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Quiz not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Формируем сообщение
    const contactParts: string[] = []
    if (lead_name) contactParts.push(`<b>Имя:</b> ${lead_name}`)
    if (lead_phone) contactParts.push(`<b>Телефон:</b> ${lead_phone}`)
    if (lead_telegram) contactParts.push(`<b>telegram:</b> ${lead_telegram}`)
    if (lead_email) contactParts.push(`<b>Email:</b> ${lead_email}`)

    // Вопросы и ответы
    let answersText = ''
    if (Array.isArray(lead_answers) && lead_answers.length > 0) {
      answersText = lead_answers.map((a: { question_text: string; answer_text: string }, i: number) => {
        return `<b>${i + 1}</b>  <b>${a.question_text}</b>\n${a.answer_text}`
      }).join('\n\n')
    }

    const now = new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const text = `🎯 <b>Новая заявка из квиза!</b>\n\n` +
      `📝 Квиз: <b>${quiz.title}</b>\n` +
      (contactParts.length > 0 ? `\n${contactParts.join('\n')}\n` : '') +
      (answersText ? `\n${answersText}\n` : '') +
      `\n🕐 ${now} МСК`

    // Отправляем уведомление
    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: quiz.telegram_id,
        text,
        parse_mode: 'HTML',
      }),
    })

    const tgResult = await tgResponse.json()

    return new Response(
      JSON.stringify({ ok: tgResult.ok }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ ok: false, error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
