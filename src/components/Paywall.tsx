import { useNavigate } from 'react-router-dom'
import { Lock, Crown, Sparkles } from 'lucide-react'

interface PaywallProps {
  title?: string
  description?: string
  feature?: string
}

export default function Paywall({
  title = 'Доступ по подписке',
  description = 'Эта функция доступна только с активной подпиской',
  feature
}: PaywallProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-orange-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>

        {/* Description */}
        <p className="text-gray-500 mb-6">{description}</p>

        {/* Feature highlight */}
        {feature && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-orange-600">
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">{feature}</span>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-5 h-5 text-orange-500" />
            <span className="font-semibold text-gray-900">С подпиской вы получите:</span>
          </div>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              Безлимитный AI-ассистент
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              AI-Коуч для личного развития
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              Генерация каруселей
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
              Доступ к обучающим материалам
            </li>
          </ul>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/shop')}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-transform"
        >
          Получить подписку
        </button>

        {/* Back link */}
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-gray-500 text-sm hover:text-gray-700"
        >
          Вернуться назад
        </button>
      </div>
    </div>
  )
}
