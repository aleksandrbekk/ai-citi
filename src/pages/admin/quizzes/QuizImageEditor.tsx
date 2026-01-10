import { useParams } from 'react-router-dom'
import { ImageRowsEditor } from './ImageRowsEditor'

export function AdminQuizImageEditor() {
  const { id } = useParams<{ id: string }>()
  return <ImageRowsEditor quizId={id} />
}
