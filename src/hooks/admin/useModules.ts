import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export interface Module {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  order_index: number
  min_tariff: string
  lessons_count: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export function useModules() {
  const [modules, setModules] = useState<Module[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadModules = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('course_modules')
        .select('*')
        .order('order_index')
      
      if (fetchError) throw fetchError
      setModules(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Error loading modules:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadModules()
  }, [])

  const createModule = async (moduleData: Partial<Module>): Promise<Module | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('course_modules')
        .insert(moduleData)
        .select()
        .single()
      
      if (createError) throw createError
      await loadModules()
      return data
    } catch (err) {
      console.error('Error creating module:', err)
      return null
    }
  }

  const updateModule = async (id: string, updates: Partial<Module>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('course_modules')
        .update(updates)
        .eq('id', id)
      
      if (updateError) throw updateError
      await loadModules()
      return true
    } catch (err) {
      console.error('Error updating module:', err)
      return false
    }
  }

  const deleteModule = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('course_modules')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      await loadModules()
      return true
    } catch (err) {
      console.error('Error deleting module:', err)
      return false
    }
  }

  return {
    modules,
    isLoading,
    error,
    createModule,
    updateModule,
    deleteModule,
    reload: loadModules
  }
}
