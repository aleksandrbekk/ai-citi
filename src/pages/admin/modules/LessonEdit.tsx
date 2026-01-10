import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLesson, useUpdateLesson, useCreateLesson } from '../../../hooks/admin/useLessons'
import { useMaterials, useCreateMaterial, useDeleteMaterial, useUpdateMaterial } from '../../../hooks/admin/useMaterials'
import { useLessonVideos, useAddVideo, useUpdateVideo, useDeleteVideo } from '../../../hooks/admin/useLessonVideos'
import { useLessonQuizzes, useAddQuiz, useDeleteQuiz, useUpdateQuiz, useAddOption, useUpdateOption, useDeleteOption } from '../../../hooks/admin/useLessonQuizzes'
import { supabase } from '../../../lib/supabase'
import { ArrowLeft, Trash2, Loader2, Link } from 'lucide-react'

export function LessonEdit() {
  const { lessonId, moduleId } = useParams<{ lessonId: string; moduleId: string }>()
  const navigate = useNavigate()
  const isNew = lessonId === 'new'

  const { data: lesson, isLoading } = useLesson(lessonId || '', { enabled: !isNew })
  const { data: materials, isLoading: materialsLoading } = useMaterials(lessonId || '')
  const { data: videos } = useLessonVideos(lessonId || '')
  const updateLesson = useUpdateLesson()
  const createLesson = useCreateLesson()
  const createMaterial = useCreateMaterial()
  const deleteMaterial = useDeleteMaterial()
  const updateMaterial = useUpdateMaterial()
  const addVideo = useAddVideo()
  const updateVideo = useUpdateVideo()
  const deleteVideo = useDeleteVideo()
  const { data: quizzes } = useLessonQuizzes(lessonId || '')
  const addQuiz = useAddQuiz()
  const deleteQuiz = useDeleteQuiz()
  const updateQuiz = useUpdateQuiz()
  const addOption = useAddOption()
  const updateOption = useUpdateOption()
  const deleteOption = useDeleteOption()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [orderIndex, setOrderIndex] = useState(0)
  const [videoUrl, setVideoUrl] = useState('')
  const [hasHomework, setHasHomework] = useState(false)
  const [homeworkDescription, setHomeworkDescription] = useState('')

  // Форма добавления материала
  const [materialTitle, setMaterialTitle] = useState('')
  const [materialType, setMaterialType] = useState<'file' | 'link'>('link')
  const [materialUrl, setMaterialUrl] = useState('')
  const [materialFile, setMaterialFile] = useState<File | null>(null)
  const [isAddingMaterial, setIsAddingMaterial] = useState(false)

  // Форма добавления видео
  const [newVideoUrl, setNewVideoUrl] = useState('')

  // Форма добавления вопроса
  const [newQuestion, setNewQuestion] = useState('')
  const [newQuestionType, setNewQuestionType] = useState('single')

  // Полноэкранный редактор описания
  const [fullscreenEditor, setFullscreenEditor] = useState(false)
  const [fullscreenHomework, setFullscreenHomework] = useState(false)

  useEffect(() => {
    if (lesson && !isNew) {
      setTitle(lesson.title)
      setDescription(lesson.description || '')
      setOrderIndex(lesson.order_index)
      setVideoUrl(lesson.video_url || '')
      setHasHomework(lesson.has_homework)
      setHomeworkDescription(lesson.homework_description || '')
    } else if (isNew && moduleId) {
      // Для нового урока устанавливаем порядок по умолчанию
      setOrderIndex(1)
    }
  }, [lesson, isNew, moduleId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const lessonData = {
      module_id: moduleId!,
      title,
      description: description || null,
      order_index: orderIndex,
      video_url: videoUrl || null,
      has_homework: hasHomework,
      homework_description: hasHomework ? (homeworkDescription || null) : null,
    }

    try {
      if (isNew) {
        const created = await createLesson.mutateAsync(lessonData)
        navigate(`/admin/mlm/modules/${moduleId}/lessons/${created.id}`)
      } else {
        await updateLesson.mutateAsync({ id: lessonId!, data: lessonData })
      }
    } catch (error) {
      console.error('Ошибка сохранения урока:', error)
    }
  }

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!materialTitle.trim()) return
    if (materialType === 'link' && !materialUrl.trim()) return
    if (materialType === 'file' && !materialFile) return

    if (!lessonId || isNew) {
      alert('Сначала сохраните урок')
      return
    }

    setIsAddingMaterial(true)
    try {
      console.log('Добавляем материал:', {
        lessonId,
        title: materialTitle,
        type: materialType,
        url: materialType === 'link' ? materialUrl : undefined,
        hasFile: materialType === 'file' ? !!materialFile : false,
      })

      if (!lessonId) {
        throw new Error('lessonId не определен')
      }

      await createMaterial.mutateAsync({
        lessonId,
        title: materialTitle,
        type: materialType,
        url: materialType === 'link' ? materialUrl : undefined,
        file: materialType === 'file' ? materialFile! : undefined,
      })

      // Сброс формы
      setMaterialTitle('')
      setMaterialUrl('')
      setMaterialFile(null)
      setMaterialType('link')
    } catch (error: any) {
      console.error('Ошибка добавления материала:', error)
      console.error('Детали ошибки:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error,
      })
      alert('Ошибка добавления материала: ' + (error?.message || error?.code || JSON.stringify(error)))
    } finally {
      setIsAddingMaterial(false)
    }
  }

  if (isLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Загрузка...</div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate(`/admin/mlm/modules/${moduleId}`)}
        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Назад к модулю
      </button>

      <h1 className="text-2xl font-bold mb-6 text-white">
        {isNew ? 'Создать урок' : 'Редактировать урок'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-zinc-800 rounded-xl p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Название</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            {/* Кнопка развернуть */}
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-zinc-400">Описание</label>
              <button 
                type="button"
                onClick={() => setFullscreenEditor(true)}
                className="text-sm text-orange-500 hover:underline"
              >
                Развернуть
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full min-h-[300px] p-4 bg-zinc-800 rounded-xl text-white resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Описание урока..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Порядок</label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
                min={0}
                className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">URL видео</label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>
          </div>

          {!isNew && lessonId && (
            <div className="border-t border-zinc-700 pt-6 mt-6">
              <h3 className="text-lg font-medium mb-4 text-white">Дополнительные видео</h3>
              
              {/* Список существующих видео */}
              {videos?.map((video: any, index: number) => (
                <div key={video.id} className="bg-zinc-800 rounded-xl p-4 mb-4">
                  {/* Название видео */}
                  <input
                    type="text"
                    defaultValue={video.title || ''}
                    onBlur={(e) => {
                      if (e.target.value !== video.title) {
                        updateVideo.mutate({ id: video.id, title: e.target.value })
                      }
                    }}
                    placeholder="Название видео (необязательно)"
                    className="w-full mb-3 px-3 py-2 bg-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  
                  {/* URL видео */}
                  <div className="flex gap-2">
                    <span className="text-zinc-500 py-2">#{index + 2}</span>
                    <input
                      type="text"
                      value={video.video_url}
                      readOnly
                      className="flex-1 px-4 py-2 bg-zinc-800 rounded-lg text-white"
                    />
                    <button
                      type="button"
                      onClick={() => deleteVideo.mutate(video.id)}
                      className="px-3 py-2 bg-red-600 rounded-lg hover:bg-red-700 text-white"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Добавить новый URL */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="URL видео (Kinescope)"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="flex-1 px-4 py-2 bg-zinc-800 rounded-lg text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newVideoUrl.trim()) {
                      addVideo.mutate({ 
                        lessonId: lessonId!, 
                        title: '', 
                        videoUrl: newVideoUrl, 
                        orderIndex: (videos?.length || 0) + 1 
                      })
                      setNewVideoUrl('')
                    }
                  }}
                  className="px-4 py-2 bg-orange-500 rounded-lg hover:bg-orange-600 text-white"
                >
                  + Добавить
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="hasHomework"
              checked={hasHomework}
              onChange={(e) => setHasHomework(e.target.checked)}
              className="w-4 h-4 text-blue-500 bg-zinc-700 border-zinc-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="hasHomework" className="text-sm text-zinc-400">
              Есть домашнее задание
            </label>
          </div>

          {hasHomework && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-zinc-400">Описание домашнего задания</label>
                <button 
                  type="button"
                  onClick={() => setFullscreenHomework(true)}
                  className="text-sm text-orange-500 hover:underline"
                >
                  Развернуть
                </button>
              </div>
              <textarea
                value={homeworkDescription}
                onChange={(e) => setHomeworkDescription(e.target.value)}
                className="w-full min-h-[150px] p-4 bg-zinc-800 rounded-xl text-white resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Опишите домашнее задание..."
              />

              {/* Тесты */}
              {!isNew && lessonId && (
                <div className="border-t border-zinc-700 pt-6 mt-6">
                  <h3 className="text-lg font-medium mb-4 text-white">📝 Тесты</h3>
                  
                  {/* Список вопросов */}
                  {quizzes?.map((quiz: any, qIndex: number) => (
                    <div key={quiz.id} className="bg-zinc-800 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-zinc-500 text-sm">Вопрос {qIndex + 1}</span>
                          <span className="ml-2 text-xs px-2 py-1 rounded bg-zinc-700 text-white">
                            {quiz.question_type === 'single' ? 'Один ответ' : quiz.question_type === 'multiple' ? 'Несколько ответов' : 'С картинками'}
                          </span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            if (confirm(`Удалить вопрос "${quiz.question}"?`)) {
                              deleteQuiz.mutate(quiz.id)
                            }
                          }} 
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <input
                        type="text"
                        defaultValue={quiz.question}
                        onBlur={(e) => {
                          if (e.target.value !== quiz.question) {
                            updateQuiz.mutate({ id: quiz.id, question: e.target.value })
                          }
                        }}
                        className="w-full bg-transparent text-white text-lg font-medium border-b border-zinc-700 focus:border-orange-500 focus:outline-none pb-1 mb-3"
                        placeholder="Введите вопрос..."
                      />
                      
                      {/* Варианты ответов */}
                      <div className="space-y-2 ml-4">
                        {quiz.quiz_options?.map((opt: any, _oIndex: number) => (
                          <div key={opt.id} className="flex items-center gap-2 p-2 bg-zinc-700 rounded">
                            <input
                              type="checkbox"
                              checked={opt.is_correct}
                              onChange={(e) => updateOption.mutate({ id: opt.id, isCorrect: e.target.checked })}
                              className="w-4 h-4"
                            />
                            
                            {quiz.question_type === 'image' ? (
                              <div className="flex items-center gap-3 flex-1">
                                {opt.image_url ? (
                                  <img src={opt.image_url} alt="" className="w-20 h-20 object-cover rounded" />
                                ) : (
                                  <div className="w-20 h-20 bg-zinc-600 rounded flex items-center justify-center text-zinc-400 text-xs">
                                    Нет фото
                                  </div>
                                )}
                                <label className="cursor-pointer bg-orange-500 px-3 py-1 rounded text-sm hover:bg-orange-600 text-white">
                                  Загрузить
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        // Генерируем безопасное имя без кириллицы
                                        const ext = file.name.split('.').pop() || 'jpg'
                                        const fileName = `quiz-images/${quiz.id}/${Date.now()}.${ext}`
                                        
                                        const { error: uploadError } = await supabase.storage
                                          .from('quiz-images')
                                          .upload(fileName, file)
                                        
                                        if (uploadError) {
                                          console.error('Upload error:', uploadError)
                                          alert('Ошибка загрузки: ' + uploadError.message)
                                        } else {
                                          const { data: urlData } = supabase.storage
                                            .from('quiz-images')
                                            .getPublicUrl(fileName)
                                          updateOption.mutate({ id: opt.id, imageUrl: urlData.publicUrl })
                                        }
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            ) : (
                              <input
                                type="text"
                                defaultValue={opt.option_text || ''}
                                placeholder="Текст ответа"
                                onBlur={(e) => updateOption.mutate({ id: opt.id, optionText: e.target.value })}
                                className="flex-1 bg-zinc-600 px-2 py-1 rounded text-sm text-white"
                              />
                            )}
                            
                            <button 
                              type="button"
                              onClick={() => deleteOption.mutate(opt.id)} 
                              className="text-red-500 hover:text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        
                        {/* Добавить вариант */}
                        <button
                          type="button"
                          onClick={() => addOption.mutate({ 
                            quizId: quiz.id, 
                            optionText: '', 
                            isCorrect: false, 
                            orderIndex: (quiz.quiz_options?.length || 0) 
                          })}
                          className="text-orange-500 text-sm hover:underline"
                        >
                          + Добавить вариант
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* Добавить вопрос */}
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="flex gap-2 mb-3">
                      <select
                        value={newQuestionType}
                        onChange={(e) => setNewQuestionType(e.target.value)}
                        className="bg-zinc-700 px-3 py-2 rounded text-white"
                      >
                        <option value="single">Один ответ</option>
                        <option value="multiple">Несколько ответов</option>
                        <option value="image">С картинками</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newQuestion}
                        onChange={(e) => setNewQuestion(e.target.value)}
                        placeholder="Текст вопроса"
                        className="flex-1 bg-zinc-700 px-3 py-2 rounded text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newQuestion.trim() && lessonId) {
                            addQuiz.mutate({
                              lessonId: lessonId,
                              question: newQuestion,
                              questionType: newQuestionType,
                              orderIndex: quizzes?.length || 0
                            })
                            setNewQuestion('')
                          }
                        }}
                        className="px-4 py-2 bg-orange-500 rounded hover:bg-orange-600 text-white"
                      >
                        + Добавить
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={updateLesson.isPending || createLesson.isPending}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {updateLesson.isPending || createLesson.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/admin/mlm/modules/${moduleId}`)}
              className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </form>

      {!isNew && lessonId && (
        <>
          {/* Материалы */}
          <div className="bg-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold mb-6 text-white">Материалы</h2>

          {/* Список материалов */}
          {materialsLoading ? (
            <div className="text-center py-8 text-zinc-400">Загрузка материалов...</div>
          ) : materials && materials.length > 0 ? (
            <div className="space-y-3 mb-6">
              {materials.map((material) => (
                <div key={material.id} className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
                  <Link className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                  <input
                    type="text"
                    defaultValue={material.title || ''}
                    placeholder="Введите название"
                    onBlur={(e) => {
                      if (e.target.value !== material.title) {
                        updateMaterial.mutate({ id: material.id, title: e.target.value })
                      }
                    }}
                    className="flex-1 bg-zinc-700 px-3 py-1 rounded text-white outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {material.url && (
                    <a href={material.url} target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:underline text-sm flex-shrink-0">
                      Открыть
                    </a>
                  )}
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirm(`Удалить материал "${material.title}"?`)) {
                        deleteMaterial.mutate(material)
                      }
                    }} 
                    className="text-red-500 hover:text-red-400 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-400 mb-6">
              Материалы не добавлены
            </div>
          )}

          {/* Форма добавления материала */}
          <form onSubmit={handleAddMaterial} className="border-t border-zinc-700 pt-6">
            <h3 className="text-lg font-semibold mb-4 text-white">Добавить материал</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Название</label>
                <input
                  type="text"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Название материала"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Тип</label>
                <select
                  value={materialType}
                  onChange={(e) => {
                    setMaterialType(e.target.value as 'file' | 'link')
                    setMaterialUrl('')
                    setMaterialFile(null)
                  }}
                  className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="link">Ссылка</option>
                  <option value="file">Файл</option>
                </select>
              </div>

              {materialType === 'link' ? (
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">URL</label>
                  <input
                    type="url"
                    value={materialUrl}
                    onChange={(e) => setMaterialUrl(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Файл</label>
                  <input
                    type="file"
                    onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                    required
                    className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                  />
                  {materialFile && (
                    <div className="mt-2 text-sm text-zinc-400">
                      Выбран: {materialFile.name} ({(materialFile.size / 1024).toFixed(2)} KB)
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={isAddingMaterial || createMaterial.isPending}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isAddingMaterial || createMaterial.isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {createMaterial.isPending ? 'Загрузка файла...' : 'Добавление...'}
                  </>
                ) : (
                  'Добавить материал'
                )}
              </button>
            </div>
          </form>
        </div>
        </>
      )}

      {/* Модалка полноэкранного редактора описания */}
      {fullscreenEditor && (
        <div className="fixed inset-0 z-50 bg-zinc-900 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Описание урока</h2>
            <button 
              type="button"
              onClick={() => setFullscreenEditor(false)}
              className="px-4 py-2 bg-orange-500 rounded-lg hover:bg-orange-600 text-white"
            >
              Готово
            </button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="flex-1 w-full p-4 bg-zinc-800 rounded-xl text-white text-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Описание урока..."
            autoFocus
          />
        </div>
      )}

      {/* Модалка полноэкранного редактора для домашки */}
      {fullscreenHomework && (
        <div className="fixed inset-0 z-50 bg-zinc-900 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Домашнее задание</h2>
            <button 
              type="button"
              onClick={() => setFullscreenHomework(false)}
              className="px-4 py-2 bg-orange-500 rounded-lg hover:bg-orange-600 text-white"
            >
              Готово
            </button>
          </div>
          <textarea
            value={homeworkDescription}
            onChange={(e) => setHomeworkDescription(e.target.value)}
            className="flex-1 w-full p-4 bg-zinc-800 rounded-xl text-white text-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Опишите домашнее задание..."
            autoFocus
          />
        </div>
      )}
    </div>
  )
}
