import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCarouselStore } from '@/store/carouselStore'
import { getFirstUserPhoto } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

export default function CarouselContent() {
  const navigate = useNavigate()
  const { selectedTemplate, variables, setVariable, setStatus, userPhoto, setUserPhoto, ctaText, setCtaText, ctaQuestion, setCtaQuestion, ctaBenefits, setCtaBenefits, style, audience, customAudience } = useCarouselStore()

  // Загружаем первое фото пользователя из галереи при загрузке страницы
  useEffect(() => {
    const loadUserPhoto = async () => {
      const telegramUser = getTelegramUser()
      if (telegramUser?.id) {
        const photoFromDb = await getFirstUserPhoto(telegramUser.id)
        if (photoFromDb) {
          setUserPhoto(photoFromDb)
        }
      }
    }
    loadUserPhoto()
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

        <button
          onClick={handleGenerate}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 rounded-xl font-semibold text-lg"
        >
          🎨 Создать карусель
        </button>
      </div>
    </div>
  )
}

