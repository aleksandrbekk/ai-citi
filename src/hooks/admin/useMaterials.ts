import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export interface Material {
  id: string
  lesson_id: string
  type: 'pdf' | 'sheet' | 'link' | 'file'
  title: string | null
  url: string
  order_index: number
  created_at?: string
  updated_at?: string
}

// Legacy хук для обратной совместимости
export function useMaterialsLegacy(lessonId?: string) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadMaterials = async () => {
    setIsLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('lesson_materials')
        .select('*')
        .order('order_index')
      
      if (lessonId) {
        query = query.eq('lesson_id', lessonId)
      }
      
      const { data, error: fetchError } = await query
      
      if (fetchError) throw fetchError
      setMaterials(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Error loading materials:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMaterials()
  }, [lessonId])

  const createMaterial = async (materialData: Partial<Material>): Promise<Material | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('lesson_materials')
        .insert(materialData)
        .select()
        .single()
      
      if (createError) throw createError
      await loadMaterials()
      return data
    } catch (err) {
      console.error('Error creating material:', err)
      return null
    }
  }

  const updateMaterial = async (id: string, updates: Partial<Material>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('lesson_materials')
        .update(updates)
        .eq('id', id)
      
      if (updateError) throw updateError
      await loadMaterials()
      return true
    } catch (err) {
      console.error('Error updating material:', err)
      return false
    }
  }

  const deleteMaterial = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('lesson_materials')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      await loadMaterials()
      return true
    } catch (err) {
      console.error('Error deleting material:', err)
      return false
    }
  }

  return {
    materials,
    isLoading,
    error,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    reload: loadMaterials
  }
}

// React Query хуки для админки
export interface LessonMaterial {
  id: string
  lesson_id: string
  title: string
  type: 'file' | 'link'
  url: string | null
  order_index: number
  created_at: string
}

export function useMaterials(lessonId: string) {
  return useQuery({
    queryKey: ['materials', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_materials')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index', { ascending: true })

      if (error) throw error
      return data as LessonMaterial[]
    },
    enabled: !!lessonId,
  })
}

export function useCreateMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      lessonId,
      title,
      type,
      url,
      file,
    }: {
      lessonId: string
      title: string
      type: 'file' | 'link'
      url?: string
      file?: File
    }) => {
      console.log('useCreateMaterial: Начало создания материала', { lessonId, title, type })
      
      if (!lessonId) {
        throw new Error('lesson_id обязателен')
      }

      let fileUrl: string | null = null

      // Если это файл, загружаем в Storage
      if (type === 'file' && file) {
        console.log('Загрузка файла в Storage...', { fileName: file.name, size: file.size })
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePathStorage = `${lessonId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('lesson-materials')
          .upload(filePathStorage, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Ошибка загрузки файла в Storage:', uploadError)
          throw uploadError
        }

        // Получаем публичный URL
        const { data: urlData } = supabase.storage
          .from('lesson-materials')
          .getPublicUrl(filePathStorage)

        fileUrl = urlData.publicUrl
        console.log('Файл загружен:', { fileUrl })
      } else if (type === 'link' && url) {
        fileUrl = url
        console.log('Используется URL:', url)
      }

      // Получаем максимальный order_index для этого урока
      console.log('Получение order_index для урока:', lessonId)
      const { data: existingMaterials, error: selectError } = await supabase
        .from('lesson_materials')
        .select('order_index')
        .eq('lesson_id', lessonId)
        .order('order_index', { ascending: false })
        .limit(1)

      if (selectError) {
        console.error('Ошибка получения order_index:', selectError)
        throw selectError
      }

      const orderIndex = existingMaterials && existingMaterials.length > 0
        ? existingMaterials[0].order_index + 1
        : 0

      console.log('Создание записи в БД:', {
        lesson_id: lessonId,
        title,
        type,
        url: fileUrl,
        order_index: orderIndex,
      })

      // Создаем запись в БД
      const { data: created, error } = await supabase
        .from('lesson_materials')
        .insert({
          lesson_id: lessonId,
          title,
          type,
          url: fileUrl,
          order_index: orderIndex,
        })
        .select()
        .single()

      if (error) {
        console.error('Ошибка создания записи в БД:', error)
        console.error('Детали ошибки:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        throw error
      }

      console.log('Материал успешно создан:', created)
      return created as LessonMaterial
    },
    onSuccess: (created) => {
      console.log('onSuccess: Материал создан, инвалидация кэша', created)
      queryClient.invalidateQueries({ queryKey: ['materials', created.lesson_id] })
      queryClient.invalidateQueries({ queryKey: ['lesson', created.lesson_id] })
    },
    onError: (error: any) => {
      console.error('onError: Ошибка в useCreateMaterial:', error)
      console.error('Детали ошибки:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error,
      })
    },
  })
}

export function useUpdateMaterial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, title }: { id: string, title: string }) => {
      const { data, error } = await supabase
        .from('lesson_materials')
        .update({ title })
        .eq('id', id)
        .select('lesson_id')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data) {
        qc.invalidateQueries({ queryKey: ['materials', data.lesson_id] })
      } else {
        qc.invalidateQueries({ queryKey: ['materials'] })
      }
    }
  })
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (material: LessonMaterial) => {
      // Удаляем запись из БД
      const { error } = await supabase
        .from('lesson_materials')
        .delete()
        .eq('id', material.id)

      if (error) throw error
      return material
    },
    onSuccess: (deleted) => {
      queryClient.invalidateQueries({ queryKey: ['materials', deleted.lesson_id] })
      queryClient.invalidateQueries({ queryKey: ['lesson', deleted.lesson_id] })
    },
  })
}
