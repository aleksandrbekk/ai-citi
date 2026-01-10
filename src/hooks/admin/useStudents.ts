import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export interface Student {
  id: string
  telegram_id: number
  first_name: string | null
  last_name: string | null
  username: string | null
  avatar_url: string | null
  created_at?: string
  updated_at?: string
}

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadStudents = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      setStudents(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Error loading students:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  const updateStudent = async (id: string, updates: Partial<Student>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
      
      if (updateError) throw updateError
      await loadStudents()
      return true
    } catch (err) {
      console.error('Error updating student:', err)
      return false
    }
  }

  const deleteStudent = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      await loadStudents()
      return true
    } catch (err) {
      console.error('Error deleting student:', err)
      return false
    }
  }

  return {
    students,
    isLoading,
    error,
    updateStudent,
    deleteStudent,
    reload: loadStudents
  }
}
