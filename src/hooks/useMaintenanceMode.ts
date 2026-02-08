import { useState, useEffect, useCallback } from 'react'
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

    const fetchSettings = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('site_settings')
                .select('key, value')
                .in('key', ['maintenance_mode', 'maintenance_message'])

            if (error) {
                console.error('[Maintenance] fetch error:', error)
                return
            }

            if (data) {
                const mode = data.find(r => r.key === 'maintenance_mode')
                const msg = data.find(r => r.key === 'maintenance_message')
                setState({
                    enabled: mode?.value === true,
                    message: (msg?.value as string) || 'Технические работы. Скоро всё заработает!'
                })
            }
        } catch (e) {
            console.error('[Maintenance] unexpected error:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSettings()

        const channel = supabase
            .channel('maintenance-' + Date.now())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
                fetchSettings()
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [fetchSettings])

    return {
        isMaintenanceMode: state.enabled && !isAdmin,
        isMaintenanceEnabled: state.enabled,
        message: state.message,
        isAdmin,
        loading,
        refetch: fetchSettings
    }
}

export async function toggleMaintenanceMode(enabled: boolean): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('site_settings')
            .update({ value: enabled, updated_at: new Date().toISOString() })
            .eq('key', 'maintenance_mode')

        if (error) {
            console.error('[Maintenance] toggle error:', error)
            alert('Ошибка переключения: ' + error.message)
            return false
        }
        return true
    } catch (e) {
        console.error('[Maintenance] toggle error:', e)
        alert('Ошибка переключения')
        return false
    }
}

export async function updateMaintenanceMessage(message: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('site_settings')
            .update({ value: message, updated_at: new Date().toISOString() })
            .eq('key', 'maintenance_message')

        if (error) {
            console.error('[Maintenance] message update error:', error)
            alert('Ошибка сохранения: ' + error.message)
            return false
        }
        return true
    } catch (e) {
        console.error('[Maintenance] message update error:', e)
        return false
    }
}
