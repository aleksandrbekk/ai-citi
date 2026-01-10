import { useState, useEffect } from 'react'
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

export function useMaterials(lessonId?: string) {
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
