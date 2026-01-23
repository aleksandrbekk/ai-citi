import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Coins } from 'lucide-react'
import { useCarouselStore } from '@/store/carouselStore'
import { getFirstUserPhoto, getCoinBalance, spendCoinsForGeneration, getUserTariffsById } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

export default function CarouselContent() {
  const navigate = useNavigate()
  const { selectedTemplate, variables, setVariable, setStatus, userPhoto, setUserPhoto, ctaText, setCtaText, ctaQuestion, setCtaQuestion, ctaBenefits, setCtaBenefits, style, audience, customAudience } = useCarouselStore()
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

  if (!selectedTemplate) {
    navigate('/agents/carousel')
    return null
  }

  const handleGenerate = async () => {
    // Проверка заполненности обязательных полей
    if (!variables.topic?.trim()) {
      alert('Заполните тему карусели')
      return
    }

    // Получаем telegram_id из Telegram WebApp
    const tg = window.Telegram?.WebApp
    const chatId = tg?.initDataUnsafe?.user?.id

    // Проверка chatId
    if (!chatId || typeof chatId !== 'number') {
      alert('Ошибка: Не удалось определить Telegram ID. Убедитесь, что вы открыли приложение через Telegram.')
      setStatus('error')
      navigate('/agents/carousel')
      return
    }

    // Проверяем доступ: подписка ИЛИ 30 монет
    let coinsSpent = 0

    if (hasSubscription) {
      // Есть подписка — генерация бесплатная
      console.log('User has subscription, free generation')
    } else {
      // Нет подписки — проверяем монеты
      if (coinBalance < 30) {
        alert('Для генерации нужна подписка или 30 монет. Пополните баланс в магазине.')
        navigate('/shop')
        return
      }

      // Списываем 30 монет
      const spendResult = await spendCoinsForGeneration(chatId, 30, `Генерация карусели: ${variables.topic}`)
      if (!spendResult.success) {
        alert(spendResult.error === 'Not enough coins'
          ? 'Недостаточно монет для генерации!'
          : 'Ошибка при списании монет. Попробуйте позже.')
        return
      }

      // Обновляем локальный баланс
      setCoinBalance(spendResult.new_balance || 0)
      coinsSpent = 30
    }

    // Фото уже загружено в useEffect
    const finalUserPhoto = userPhoto

    // Подготовка данных для отправки
    const requestData = {
      chatId: chatId, // ОБЯЗАТЕЛЬНО число, telegram user id
      templateId: selectedTemplate === 'custom' ? 'custom' : selectedTemplate,
      userPhoto: finalUserPhoto || '',
      mode: 'ai', // Всегда AI режим
      topic: variables.topic || '',
      style: style || 'ai-citi', // Стиль дизайна
      audience: audience || 'networkers', // Целевая аудитория
      customAudience: customAudience || '', // Своя ЦА
      cta_text: ctaText,
      cta_question: ctaQuestion,
      cta_benefits: ctaBenefits,
      variables: {},
    }

    // Логирование перед отправкой
    console.log('Sending carousel request:', {
      chatId,
      templateId: requestData.templateId,
      mode: requestData.mode,
      topic: requestData.topic,
      cta_text: requestData.cta_text,
      hasUserPhoto: !!finalUserPhoto,
      hasSubscription,
      coinsSpent,
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
      alert('Ошибка при отправке запроса')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-b from-white to-gray-50/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/agents/carousel/settings')}
          className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Контент</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Поле "Тема карусели" */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">Тема карусели</label>
          <textarea
            value={variables.topic || ''}
            onChange={(e) => setVariable('topic', e.target.value)}
            placeholder="Например: 5 ошибок новичков в МЛМ"
            className="w-full p-3 bg-white/5 border border-gray-200 rounded-xl text-gray-900 placeholder-zinc-500 resize-none caret-gray-800"
            rows={3}
          />
        </div>

        {/* Поле "Заголовок CTA" */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">🎯 Заголовок CTA</label>
          <input
            type="text"
            value={ctaQuestion}
            onChange={(e) => setCtaQuestion(e.target.value)}
            placeholder="Например: Хочешь так же?"
            className="w-full p-3 bg-white/5 border border-gray-200 rounded-xl text-gray-900 placeholder-zinc-500 caret-gray-800"
          />
        </div>

        {/* Поле "Призыв к действию" */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">📣 Призыв к действию</label>
          <textarea
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            placeholder="Например: НАПИШИ СЛОВО КОМПАНИЯ — ОТПРАВЛЮ ГАЙД"
            className="w-full p-3 bg-white/5 border border-gray-200 rounded-xl text-gray-900 placeholder-zinc-500 resize-none caret-gray-800"
            rows={3}
          />
        </div>

        {/* Поле "Что получит" */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-600">🎁 Что получит (через запятую)</label>
          <input
            type="text"
            value={ctaBenefits}
            onChange={(e) => setCtaBenefits(e.target.value)}
            placeholder="Бесплатный урок, Пошаговая инструкция, Поддержка"
            className="w-full p-3 bg-white/5 border border-gray-200 rounded-xl text-gray-900 placeholder-zinc-500 caret-gray-800"
          />
        </div>

        {/* Баланс / Подписка */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-xl">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-orange-500" />
            {hasSubscription ? (
              <span className="font-bold text-green-600">Подписка активна ✓</span>
            ) : (
              <>
                <span className="text-sm text-gray-600">Баланс:</span>
                <span className="font-bold text-gray-900">
                  {isLoading ? '...' : coinBalance} монет
                </span>
              </>
            )}
          </div>
          {!hasSubscription && <span className="text-xs text-gray-500">-30 за генерацию</span>}
        </div>

        <button
          onClick={handleGenerate}
          disabled={(!hasSubscription && coinBalance < 30) || isLoading}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!hasSubscription && coinBalance < 30 && !isLoading
            ? '⚠️ Нужна подписка или 30 монет'
            : '🎨 Создать карусель'}
        </button>
      </div>
    </div>
  )
}

