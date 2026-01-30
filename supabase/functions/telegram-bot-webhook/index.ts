import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const BOT_USERNAME = 'Neirociti_bot'
const APP_SHORT_NAME = 'app' // Имя Mini App в BotFather

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

            if (promoCode && !promoCode.startsWith('ref_')) {
                // Это промокод! Отправляем приветствие с кнопкой
                const welcomeText = `🎁 <b>Привет, ${firstName}!</b>\n\n` +
                    `Ты получил промокод на бонусные монеты!\n\n` +
                    `Нажми кнопку ниже, чтобы войти в приложение и получить свой бонус 🪙`

                // Inline кнопка с передачей промокода в startapp
                const keyboard = {
                    inline_keyboard: [[
                        {
                            text: '🚀 Получить бонус',
                            url: `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=${promoCode}`
                        }
                    ]]
                }

                await sendMessage(chatId, welcomeText, keyboard)
            } else if (promoCode && promoCode.startsWith('ref_')) {
                // Это реферальная ссылка
                const welcomeText = `👋 <b>Привет, ${firstName}!</b>\n\n` +
                    `Добро пожаловать в AI-CITI — нейросетевую платформу для создания контента!\n\n` +
                    `Нажми кнопку ниже, чтобы начать ✨`

                const keyboard = {
                    inline_keyboard: [[
                        {
                            text: '🚀 Открыть приложение',
                            url: `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}?startapp=${promoCode}`
                        }
                    ]]
                }

                await sendMessage(chatId, welcomeText, keyboard)
            } else {
                // Обычный /start без параметров
                const welcomeText = `👋 <b>Привет, ${firstName}!</b>\n\n` +
                    `Добро пожаловать в <b>AI-CITI</b> — нейросетевую платформу для создания контента!\n\n` +
                    `🎨 Создавай карусели для Instagram\n` +
                    `🤖 Используй продвинутые AI-агенты\n` +
                    `💰 Зарабатывай и трать нейро-монеты\n\n` +
                    `Нажми кнопку ниже, чтобы начать ✨`

                const keyboard = {
                    inline_keyboard: [[
                        {
                            text: '🚀 Открыть AI-CITI',
                            url: `https://t.me/${BOT_USERNAME}/${APP_SHORT_NAME}`
                        }
                    ]]
                }

                await sendMessage(chatId, welcomeText, keyboard)
            }
        }

        return new Response('ok', { headers: corsHeaders })

    } catch (error) {
        console.error('Webhook error:', error)
        return new Response('ok', { headers: corsHeaders })
    }
})
