import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { ADMIN_IDS } from '@/config/admins'

interface MaintenanceState {
    enabled: boolean
    message: string
}

export function useMaintenanceMode() {
    const [state, setState] = useState<MaintenanceState>({ enabled: false, message: '' })
    const [loading, setLoading] = useState(true)

    const telegramUser = getTelegramUser()
    const isAdmin = telegramUser?.id ? ADMIN_IDS.includes(telegramUser.id) : false

    useEffect(() => {
        const check = async () => {
            const { data } = await supabase
                .from('site_settings')
                .select('key, value')
                .in('key', ['maintenance_mode', 'maintenance_message'])

            if (data) {
                const mode = data.find(r => r.key === 'maintenance_mode')
                const msg = data.find(r => r.key === 'maintenance_message')
                setState({
                    enabled: mode?.value === true,
                    message: (msg?.value as string) || 'Технические работы. Скоро всё заработает!'
                })
            }
            setLoading(false)
        }
        check()

        // Подписка на изменения
        const channel = supabase
            .channel('maintenance')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
                check()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    return {
        isMaintenanceMode: state.enabled && !isAdmin,
        isMaintenanceEnabled: state.enabled,
        message: state.message,
        isAdmin,
        loading
    }
}

export async function toggleMaintenanceMode(enabled: boolean) {
    await supabase
        .from('site_settings')
        .update({ value: enabled, updated_at: new Date().toISOString() })
        .eq('key', 'maintenance_mode')
}

export async function updateMaintenanceMessage(message: string) {
    await supabase
        .from('site_settings')
        .update({ value: message, updated_at: new Date().toISOString() })
        .eq('key', 'maintenance_message')
}
