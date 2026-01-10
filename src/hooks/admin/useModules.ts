import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

// Старый хук для обратной совместимости
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

// React Query хуки для админки
export function useModule(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['module', id],
    queryFn: async () => {
      const { data: module, error: moduleError } = await supabase
        .from('course_modules')
        .select('*')
        .eq('id', id)
        .single()

      if (moduleError) throw moduleError

      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('module_id', id)
        .order('order_index', { ascending: true })

      if (lessonsError) throw lessonsError

      return {
        module,
        lessons: lessons || [],
      }
    },
    enabled: options?.enabled !== false && !!id,
  })
}

export function useUpdateModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Module> }) => {
      const { data: updated, error } = await supabase
        .from('course_modules')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return updated
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['modules'] })
      queryClient.invalidateQueries({ queryKey: ['module', variables.id] })
    },
  })
}

export function useCreateModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Module>) => {
      const { data: created, error } = await supabase
        .from('course_modules')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return created
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] })
    },
  })
}
