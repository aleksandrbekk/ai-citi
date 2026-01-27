import { useNavigate } from 'react-router-dom'
import { Gift, ChevronRight, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { haptic } from '@/lib/haptic'

export function ReferralCard() {
  const navigate = useNavigate()

  const handleClick = () => {
    haptic.tap()
    navigate('/profile/referrals')
  }

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.98 }}
      className="w-full px-4 py-3 rounded-2xl
        bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10
        border border-orange-200/50
        backdrop-blur-sm
        flex items-center gap-3
        hover:from-orange-500/15 hover:via-amber-500/15 hover:to-yellow-500/15
        transition-all duration-300
        cursor-pointer
        text-left"
    >
      {/* Иконка */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
        <Gift size={20} className="text-white" />
      </div>

      {/* Текст */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-orange-600" />
          <span className="text-sm font-semibold text-gray-800">
            Пригласи друга
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Получи <span className="font-bold text-orange-600">+6 монет</span> за каждого
        </p>
      </div>

      {/* Стрелка */}
      <ChevronRight size={18} className="text-orange-400 flex-shrink-0" />
    </motion.button>
  )
}

export default ReferralCard
