import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const ADMIN_CHAT_ID = 643763835

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lesson_id, user_telegram_id, answer_text, quiz_answers } = await req.json()

    if (!lesson_id) {
      return new Response(
        JSON.stringify({ ok: false, error: 'lesson_id required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Получаем урок и модуль
    const { data: lesson } = await supabase
      .from('course_lessons')
      .select('title, module_id')
      .eq('id', lesson_id)
      .single()

    let moduleName = ''
    if (lesson?.module_id) {
      const { data: mod } = await supabase
        .from('course_modules')
        .select('title')
        .eq('id', lesson.module_id)
        .single()
      moduleName = mod?.title || ''
    }

    // Получаем имя ученика
    let studentName = `ID: ${user_telegram_id}`
    if (user_telegram_id) {
      const { data: user } = await supabase
        .from('users')
        .select('first_name, last_name, username')
        .eq('telegram_id', user_telegram_id)
        .single()

      if (user) {
        const parts = [user.first_name, user.last_name].filter(Boolean)
        studentName = parts.join(' ') || user.username || studentName
        if (user.username) {
          studentName += ` (@${user.username})`
        }
      }
    }

    const now = new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Формируем ответ
    let answerPart = ''
    if (answer_text) {
      answerPart = `\n📝 <b>Ответ:</b>\n${answer_text}`
    }

    // Квиз-ответы
    if (quiz_answers && Object.keys(quiz_answers).length > 0) {
      const quizParts = Object.entries(quiz_answers).map(([q, a]) => {
        const answers = Array.isArray(a) ? (a as string[]).join(', ') : String(a)
        return `• ${answers}`
      })
      answerPart += `\n📋 <b>Тест:</b>\n${quizParts.join('\n')}`
    }

    const text = `📚 <b>Новое домашнее задание!</b>\n\n` +
      `👤 <b>Ученик:</b> ${studentName}\n` +
      (moduleName ? `📁 <b>Модуль:</b> ${moduleName}\n` : '') +
      `📖 <b>Урок:</b> ${lesson?.title || 'Неизвестный'}` +
      answerPart +
      `\n\n🕐 ${now} МСК`

    // Отправляем уведомление админу
    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
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
