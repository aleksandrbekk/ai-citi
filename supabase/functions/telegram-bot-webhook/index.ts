import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const BOT_USERNAME = 'Neirociti_bot'
const APP_SHORT_NAME = 'app' // Имя Mini App в BotFather

// URL картинки приветствия (хостится на Vercel)
const WELCOME_IMAGE_URL = 'https://aiciti.pro/images/welcome-neuro-city.png'

interface TelegramUpdate {
    update_id: number
    message?: {
        message_id: number
        from: {
            id: number
            first_name: string
            username?: string
        }
        chat: {
            id: number
            type: string
        }
        text?: string
    }
}

async function sendMessage(chatId: number, text: string, replyMarkup?: object) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`

    const body: any = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
    }

    if (replyMarkup) {
        body.reply_markup = replyMarkup
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

    return response.json()
}

async function sendPhoto(chatId: number, photoUrl: string, caption: string, replyMarkup?: object) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`

    const body: any = {
        chat_id: chatId,
        photo: photoUrl,
        caption,
        parse_mode: 'HTML',
    }

    if (replyMarkup) {
        body.reply_markup = replyMarkup
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    })

    return response.json()
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const update: TelegramUpdate = await req.json()
        console.log('Received update:', JSON.stringify(update))

        // Обрабатываем только текстовые сообщения
        if (!update.message?.text) {
            return new Response('ok', { headers: corsHeaders })
        }

        const text = update.message.text
        const chatId = update.message.chat.id
        const firstName = update.message.from.first_name

        // Проверяем команду /start с параметром (промокод)
        if (text.startsWith('/start')) {
            const parts = text.split(' ')
            const promoCode = parts.length > 1 ? parts[1] : null

            // Inline кнопка
            const getKeyboard = (buttonText: string, startapp?: string) => ({
                inline_keyboard: [[
                    {
                        text: buttonText,
                        url: startapp
                            ? `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=${startapp}`
                            : `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}`
                    }
                ]]
            })

            // Единый текст приветствия для всех случаев
            const welcomeText = `🏙 <b>Ты в Нейро Городе, ${firstName}!</b>\n\n` +
                `Твоя команда роботов уже на месте:\n` +
                `☕️ Один варит кофе и пишет посты\n` +
                `🎨 Другой рисует карусели\n` +
                `🧠 Третий качает твой бизнес-мозг\n\n` +
                `Никаких промптов. Никаких инструкций.\n` +
                `Всё уже настроено — просто нажимай кнопки.\n\n` +
                `🏗 Город растёт — каждую неделю появляются новые возможности.\n\n` +
                `📌 Закрепи чат, чтобы первым получать новые функции`

            if (promoCode && !promoCode.startsWith('ref_')) {
                // Промокод — кнопка "Получить бонус"
                await sendPhoto(chatId, WELCOME_IMAGE_URL, welcomeText, getKeyboard('🎁 Получить бонус', promoCode))

            } else if (promoCode && promoCode.startsWith('ref_')) {
                // Реферальная ссылка — кнопка "Войти в город"
                await sendPhoto(chatId, WELCOME_IMAGE_URL, welcomeText, getKeyboard('🚀 Войти в город', promoCode))

                // Сохраняем реферальный код в pending_referrals
                // чтобы реферал сработал даже если пользователь откроет мини-апп из меню (без кнопки)
                try {
                    const supabase = createClient(
                        Deno.env.get('SUPABASE_URL')!,
                        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
                    )
                    // Сохраняем полный promoCode (ref_CODE_src_TAG) для парсинга UTM в auth-telegram
                    await supabase
                        .from('pending_referrals')
                        .upsert({ telegram_id: chatId, referral_code: promoCode }, { onConflict: 'telegram_id' })
                    console.log('Saved pending referral:', chatId, '->', promoCode)
                } catch (e) {
                    console.error('Failed to save pending referral:', e)
                }

            } else {
                // Обычный /start — кнопка "Войти в город"
                await sendPhoto(chatId, WELCOME_IMAGE_URL, welcomeText, getKeyboard('🚀 Войти в город'))
            }
        }

        return new Response('ok', { headers: corsHeaders })

    } catch (error) {
        console.error('Webhook error:', error)
        return new Response('ok', { headers: corsHeaders })
    }
})

