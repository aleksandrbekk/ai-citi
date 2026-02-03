import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Target, Megaphone, Gift } from 'lucide-react'
import { useCarouselStore } from '@/store/carouselStore'
import { STYLE_CONFIGS, VASIA_CORE } from '@/lib/carouselStyles'
import { getCarouselStyleByStyleId, getGlobalSystemPrompt } from '@/lib/carouselStylesApi'
import { getFirstUserPhoto, getCoinBalance, spendCoinsForGeneration, getUserTariffsById } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { toast } from 'sonner'
import { haptic } from '@/lib/haptic'

export default function CarouselContent() {
  const navigate = useNavigate()
  const { variables, setVariable, setStatus, userPhoto, setUserPhoto, ctaText, setCtaText, ctaQuestion, setCtaQuestion, ctaBenefits, setCtaBenefits, style, audience, customAudience, gender } = useCarouselStore()
  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Загружаем фото, баланс монет и подписку при загрузке страницы
  useEffect(() => {
    const loadData = async () => {
      const telegramUser = getTelegramUser()
      if (telegramUser?.id) {
        // Загружаем фото
        const photoFromDb = await getFirstUserPhoto(telegramUser.id)
        if (photoFromDb) {
          setUserPhoto(photoFromDb)
        }
        // Загружаем баланс монет
        const balance = await getCoinBalance(telegramUser.id)
        setCoinBalance(balance)
        // Проверяем подписку
        const tariffs = await getUserTariffsById(telegramUser.id)
        setHasSubscription(tariffs.length > 0)
      }
      setIsLoading(false)
    }
    loadData()
  }, [setUserPhoto])

  const handleGenerate = async () => {
    haptic.action() // Вибрация при генерации

    // Проверка заполненности обязательных полей
    if (!variables.topic?.trim()) {
      haptic.error()
      toast.error('Заполните тему карусели')
      return
    }

    // Получаем telegram_id из Telegram WebApp
    const tg = window.Telegram?.WebApp
    const chatId = tg?.initDataUnsafe?.user?.id

    // Проверка chatId
    if (!chatId || typeof chatId !== 'number') {
      toast.error('Не удалось определить Telegram ID. Откройте приложение через Telegram.')
      setStatus('error')
      navigate('/agents/carousel')
      return
    }

    // Списываем 30 монет за генерацию
    if (coinBalance < 30) {
      toast.error('Для генерации нужно 30 нейронов')
      navigate('/shop')
      return
    }

    const spendResult = await spendCoinsForGeneration(chatId, 30, `Генерация карусели: ${variables.topic}`, {
      style: style,
      audience: audience,
      topic: variables.topic
    })
    if (!spendResult.success) {
      toast.error(spendResult.error === 'Not enough coins'
        ? 'Недостаточно нейронов для генерации!'
        : 'Ошибка при списании нейронов. Попробуйте позже.')
      return
    }

    // Обновляем локальный баланс
    setCoinBalance(spendResult.new_balance || 0)
    const coinsSpent = 30

    // Фото уже загружено в useEffect
    const finalUserPhoto = userPhoto

    // Загружаем стиль из БД (с fallback на hardcoded)
    const currentStyleId = style || 'APPLE_GLASSMORPHISM'
    let styleConfig = STYLE_CONFIGS[currentStyleId as keyof typeof STYLE_CONFIGS]
    let stylePrompt = ''

    try {
      const dbStyle = await getCarouselStyleByStyleId(currentStyleId)

      if (dbStyle?.config) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config = dbStyle.config as any
        // Используем конфиг из БД (мёржим с hardcoded для fallback полей)
        styleConfig = { ...styleConfig, ...config }
        // Получаем визуальный промпт из БД (индивидуальный для каждого стиля)
        stylePrompt = config.style_prompt || ''
        console.log('Loaded style from DB:', currentStyleId, {
          hasStylePrompt: !!stylePrompt,
          stylePromptLength: stylePrompt.length,
          stylePromptPreview: stylePrompt.substring(0, 100),
          configKeys: Object.keys(config)
        })
      } else {
        console.log('Style not in DB, using hardcoded:', currentStyleId)
      }
    } catch (err) {
      console.warn('Failed to load style from DB, using hardcoded:', err)
    }

    // Получаем глобальный системный промпт (один на все стили)
    const globalSystemPrompt = await getGlobalSystemPrompt()
    console.log('Global system prompt length:', globalSystemPrompt.length)

    // Подготовка данных для отправки
    const requestData = {
      chatId: chatId, // ОБЯЗАТЕЛЬНО число, telegram user id
      templateId: 'custom', // Всегда custom режим
      userPhoto: finalUserPhoto || '',
      mode: 'ai', // Всегда AI режим
      topic: variables.topic || '',
      style: currentStyleId, // Стиль дизайна
      audience: audience || 'networkers', // Целевая аудитория
      customAudience: customAudience || '', // Своя ЦА
      gender: gender || 'male', // Пол для склонения текста (дефолт для обратной совместимости)
      cta: ctaText?.split(/[—\-]/)[0]?.trim() || 'МАГИЯ', // CTA код для Copywriter
      cta_text: ctaText,
      cta_question: ctaQuestion,
      cta_benefits: ctaBenefits,
      styleConfig: styleConfig,
      vasiaCore: VASIA_CORE,
      // Глобальный промпт для Копирайтера (один на все стили)
      globalSystemPrompt: globalSystemPrompt,
      // Визуальный промпт (индивидуальный для каждого стиля)
      stylePrompt: stylePrompt,
      variables: {},
    }

    // Логирование перед отправкой
    console.log('Sending carousel request:', {
      chatId,
      templateId: requestData.templateId,
      mode: requestData.mode,
      topic: requestData.topic,
      style: requestData.style,
      cta_text: requestData.cta_text,
      hasUserPhoto: !!finalUserPhoto,
      hasSubscription,
      coinsSpent,
      globalSystemPromptLength: requestData.globalSystemPrompt.length,
      stylePromptLength: requestData.stylePrompt.length,
      stylePromptPreview: requestData.stylePrompt.substring(0, 200),
    })

    setStatus('generating')
    navigate('/agents/carousel/generating')

    // Отправка в n8n
    try {
      const response = await fetch('https://n8n.iferma.pro/webhook/carousel-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        throw new Error('Ошибка отправки запроса')
      }

      // Результаты придут в Telegram, переходим на экран генерации
      // Там будет ожидание и проверка статуса
    } catch (error) {
      console.error('Error sending to n8n:', error)
      toast.error('Ошибка при отправке запроса')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Шаг 2 из 2</h1>
            <p className="text-sm text-gray-500">Контент карусели</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Поле "Тема карусели" */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-orange-500" />
            <label className="font-semibold text-gray-900">Тема карусели</label>
          </div>
          <textarea
            value={variables.topic || ''}
            onChange={(e) => setVariable('topic', e.target.value)}
            placeholder="Например: 5 способов увеличить продажи"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-300"
            rows={3}
          />
        </div>

        {/* Поле "Заголовок CTA" */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5 text-orange-500" />
            <label className="font-semibold text-gray-900">Заголовок CTA</label>
          </div>
          <input
            type="text"
            value={ctaQuestion}
            onChange={(e) => setCtaQuestion(e.target.value)}
            placeholder="Например: Хочешь так же?"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-300"
          />
        </div>

        {/* Поле "Призыв к действию" */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-5 h-5 text-orange-500" />
            <label className="font-semibold text-gray-900">Призыв к действию</label>
          </div>
          <textarea
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            placeholder="Например: НАПИШИ СЛОВО КОМПАНИЯ — ОТПРАВЛЮ ГАЙД"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-300"
            rows={3}
          />
        </div>

        {/* Поле "Что получит" */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-orange-500" />
            <label className="font-semibold text-gray-900">Что получит клиент</label>
          </div>
          <input
            type="text"
            value={ctaBenefits}
            onChange={(e) => setCtaBenefits(e.target.value)}
            placeholder="Бесплатный урок, Пошаговая инструкция, Поддержка"
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-300"
          />
          <p className="text-xs text-gray-400 mt-2">Перечислите через запятую</p>
        </div>

        {/* Баланс нейронов */}
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <img src="/neirocoin.png" alt="Нейро" className="w-7 h-7 object-contain drop-shadow-sm" />
            <span className="font-bold text-orange-600">
              {isLoading ? '...' : coinBalance} нейронов
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-500">
            <span className="text-sm">-30</span>
            <img src="/neirocoin.png" alt="" className="w-4 h-4 object-contain opacity-70" />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={coinBalance < 30 || isLoading || !variables.topic?.trim()}
          className="w-full py-4 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-transform hover:shadow-2xl flex items-center justify-center gap-2"
        >
          <span>
            {coinBalance < 30 && !isLoading
              ? 'Недостаточно нейронов'
              : 'Сгенерировать за 30'}
          </span>
          {coinBalance >= 30 && !isLoading && (
            <img src="/neirocoin.png" alt="Нейро" className="w-6 h-6 object-contain" />
          )}
        </button>
      </div>
    </div>
  )
}

