import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useCarouselStore } from '@/store/carouselStore'
import type { TemplateId } from '@/store/carouselStore'

// Конфигурация полей для каждого шаблона
const TEMPLATE_FIELDS: Record<TemplateId, Array<{ key: string; label: string; placeholder: string }>> = {
  mistakes: [
    { key: 'topic', label: 'Тема карусели', placeholder: 'Например: 5 ошибок новичков в МЛМ' },
    { key: 'error_1', label: 'Ошибка 1', placeholder: 'Первая ошибка...' },
    { key: 'error_2', label: 'Ошибка 2', placeholder: 'Вторая ошибка...' },
    { key: 'error_3', label: 'Ошибка 3', placeholder: 'Третья ошибка...' },
    { key: 'error_4', label: 'Ошибка 4', placeholder: 'Четвертая ошибка...' },
    { key: 'error_5', label: 'Ошибка 5', placeholder: 'Пятая ошибка...' },
    { key: 'cta_text', label: 'Призыв к действию', placeholder: 'Например: Напиши мне в личку' },
    { key: 'viral_target', label: 'Кому отправить', placeholder: 'Кому отправить карусель' },
  ],
  myths: [
    { key: 'topic', label: 'Тема карусели', placeholder: 'Например: Мифы о заработке в МЛМ' },
    { key: 'myth_1', label: 'Миф 1', placeholder: 'Первый миф...' },
    { key: 'reality_1', label: 'Реальность 1', placeholder: 'Реальность...' },
    { key: 'myth_2', label: 'Миф 2', placeholder: 'Второй миф...' },
    { key: 'reality_2', label: 'Реальность 2', placeholder: 'Реальность...' },
    { key: 'myth_3', label: 'Миф 3', placeholder: 'Третий миф...' },
    { key: 'reality_3', label: 'Реальность 3', placeholder: 'Реальность...' },
    { key: 'cta_text', label: 'Призыв к действию', placeholder: 'Например: Напиши мне в личку' },
    { key: 'viral_target', label: 'Кому отправить', placeholder: 'Кому отправить карусель' },
  ],
  steps: [
    { key: 'topic', label: 'Тема карусели', placeholder: 'Например: 5 шагов к успеху' },
    { key: 'step_1', label: 'Шаг 1', placeholder: 'Первый шаг...' },
    { key: 'step_2', label: 'Шаг 2', placeholder: 'Второй шаг...' },
    { key: 'step_3', label: 'Шаг 3', placeholder: 'Третий шаг...' },
    { key: 'step_4', label: 'Шаг 4', placeholder: 'Четвертый шаг...' },
    { key: 'step_5', label: 'Шаг 5', placeholder: 'Пятый шаг...' },
    { key: 'cta_text', label: 'Призыв к действию', placeholder: 'Например: Напиши мне в личку' },
    { key: 'viral_target', label: 'Кому отправить', placeholder: 'Кому отправить карусель' },
  ],
  'before-after': [
    { key: 'topic', label: 'Тема карусели', placeholder: 'Например: До и после' },
    { key: 'before_1', label: 'До 1', placeholder: 'Первое "до"...' },
    { key: 'after_1', label: 'После 1', placeholder: 'Первое "после"...' },
    { key: 'before_2', label: 'До 2', placeholder: 'Второе "до"...' },
    { key: 'after_2', label: 'После 2', placeholder: 'Второе "после"...' },
    { key: 'result', label: 'Результат', placeholder: 'Итоговый результат...' },
    { key: 'cta_text', label: 'Призыв к действию', placeholder: 'Например: Напиши мне в личку' },
    { key: 'viral_target', label: 'Кому отправить', placeholder: 'Кому отправить карусель' },
  ],
  checklist: [
    { key: 'topic', label: 'Тема карусели', placeholder: 'Например: Чеклист для новичка' },
    { key: 'item_1', label: 'Пункт 1', placeholder: 'Первый пункт...' },
    { key: 'item_2', label: 'Пункт 2', placeholder: 'Второй пункт...' },
    { key: 'item_3', label: 'Пункт 3', placeholder: 'Третий пункт...' },
    { key: 'item_4', label: 'Пункт 4', placeholder: 'Четвертый пункт...' },
    { key: 'item_5', label: 'Пункт 5', placeholder: 'Пятый пункт...' },
    { key: 'cta_text', label: 'Призыв к действию', placeholder: 'Например: Напиши мне в личку' },
    { key: 'viral_target', label: 'Кому отправить', placeholder: 'Кому отправить карусель' },
  ],
  custom: [
    { key: 'topic', label: 'Тема карусели', placeholder: 'Тема...' },
    { key: 'content', label: 'Контент', placeholder: 'Опишите контент для карусели...' },
    { key: 'cta_text', label: 'Призыв к действию', placeholder: 'Например: Напиши мне в личку' },
    { key: 'viral_target', label: 'Кому отправить', placeholder: 'Кому отправить карусель' },
  ],
}

export default function CarouselContent() {
  const navigate = useNavigate()
  const { selectedTemplate, variables, setVariable, setStatus, userPhoto, mode, ctaText, setCtaText } = useCarouselStore()

  if (!selectedTemplate) {
    navigate('/agents/carousel')
    return null
  }

  const allFields = TEMPLATE_FIELDS[selectedTemplate] || []
  
  // В AI режиме показываем topic и cta_text, в ручном - все поля
  const fields = mode === 'ai' 
    ? allFields.filter(f => f.key === 'topic' || f.key === 'cta_text')
    : allFields

  const handleGenerate = async () => {
    // Проверка заполненности обязательных полей
    if (mode === 'ai') {
      // В AI режиме проверяем topic и ctaText
      if (!variables.topic?.trim()) {
        alert('Заполните тему карусели')
        return
      }
      if (!ctaText?.trim()) {
        alert('Заполните призыв к действию')
        return
      }
    } else {
      // В ручном режиме проверяем все обязательные поля
      const requiredFields = allFields.filter(f => f.key !== 'viral_target')
      const missingFields = requiredFields.filter(f => !variables[f.key]?.trim())
      
      if (missingFields.length > 0) {
        alert(`Заполните все поля: ${missingFields.map(f => f.label).join(', ')}`)
        return
      }
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

    // Подготовка данных для отправки
    const requestData = {
      chatId: chatId, // ОБЯЗАТЕЛЬНО число, telegram user id
      templateId: selectedTemplate === 'custom' ? 'custom' : selectedTemplate,
      userPhoto: userPhoto || '',
      mode: mode, // 'ai' или 'manual'
      topic: variables.topic || '',
      cta_text: mode === 'ai' ? ctaText : (variables.cta_text || ''),
      variables: mode === 'manual' ? variables : {},
    }

    // Логирование перед отправкой
    console.log('Sending carousel request:', {
      chatId,
      templateId: requestData.templateId,
      mode: requestData.mode,
      topic: requestData.topic,
      cta_text: requestData.cta_text,
      hasUserPhoto: !!userPhoto,
      variablesCount: mode === 'manual' ? Object.keys(variables).length : 0,
    })

    setStatus('generating')
    navigate('/agents/carousel/generating')

    // Отправка в n8n
    try {
      const response = await fetch('https://n8n.iferma.pro/webhook/client-carousel', {
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
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/agents/carousel/settings')}
          className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Контент</h1>
      </div>

      <div className="p-4 space-y-4">
        {fields.map((field) => {
          // В AI режиме для cta_text используем отдельное поле ctaText
          const isCtaField = mode === 'ai' && field.key === 'cta_text'
          const fieldValue = isCtaField ? ctaText : (variables[field.key] || '')
          const handleChange = isCtaField 
            ? (e: React.ChangeEvent<HTMLTextAreaElement>) => setCtaText(e.target.value)
            : (e: React.ChangeEvent<HTMLTextAreaElement>) => setVariable(field.key, e.target.value)
          
          return (
            <div key={field.key} className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">{field.label}</label>
              <textarea
                value={fieldValue}
                onChange={handleChange}
                placeholder={isCtaField ? 'Например: Напиши ХОЧУ в директ' : field.placeholder}
                className="w-full p-3 bg-white/5 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 resize-none"
                rows={field.key === 'topic' || field.key === 'content' ? 3 : 2}
              />
              {isCtaField && (
                <p className="text-xs text-zinc-500">Это будет на последнем слайде карусели</p>
              )}
            </div>
          )
        })}

        <button
          onClick={handleGenerate}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-lg"
        >
          🎨 Создать карусель
        </button>
      </div>
    </div>
  )
}

