import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface TransferCoinsResult {
  success: boolean
  error?: string
  amount?: number
  sender_new_balance?: number
  receiver_telegram_id?: number
  current_balance?: number
  required?: number
}

export function useTransferCoins() {
  const [isLoading, setIsLoading] = useState(false)

  const transferToPartner = async (
    senderTelegramId: number,
    receiverTelegramId: number,
    amount: number
  ): Promise<TransferCoinsResult> => {
    setIsLoading(true)

    try {
      const { data, error } = await supabase.rpc('transfer_coins_to_partner', {
        p_sender_telegram_id: senderTelegramId,
        p_receiver_telegram_id: receiverTelegramId,
        p_amount: amount
      })

      if (error) {
        console.error('Transfer coins error:', error)
        return { success: false, error: error.message }
      }

      return data as TransferCoinsResult
    } catch (err) {
      console.error('Transfer coins exception:', err)
      return { success: false, error: 'Ошибка соединения' }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    transferToPartner,
    isLoading
  }
}
