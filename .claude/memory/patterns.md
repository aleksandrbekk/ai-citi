# Patterns

> Паттерны кода в этом проекте. Следуй им для консистентности.

## Загрузка данных

```tsx
// Используй React Query
export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*, post_media(*)')
      if (error) throw error
      return data
    }
  })
}

// В компоненте
function PostList() {
  const { data: posts, isLoading, error } = usePosts()

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />

  return posts.map(post => <PostCard key={post.id} post={post} />)
}
```

## Мутации

```tsx
export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', postId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Пост удалён')
    },
    onError: (error) => {
      toast.error('Ошибка удаления')
      console.error(error)
    }
  })
}
```

## Формы

```tsx
// Zod + React Hook Form
const schema = z.object({
  caption: z.string().min(1, 'Введите текст'),
  scheduledAt: z.date()
})

function PostForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data) => {
    // ...
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* ... */}
      </form>
    </Form>
  )
}
```

## Карточки

```tsx
<Card className="bg-white/10 backdrop-blur-md border-white/20 rounded-xl">
  <CardHeader>
    <CardTitle>Заголовок</CardTitle>
  </CardHeader>
  <CardContent>
    Контент
  </CardContent>
</Card>
```

## Кнопки

```tsx
// Primary
<Button className="bg-primary hover:bg-primary/90">
  Действие
</Button>

// Outline
<Button variant="outline">
  Отмена
</Button>

// Destructive
<Button variant="destructive">
  Удалить
</Button>

// С иконкой
<Button>
  <Plus className="w-4 h-4 mr-2" />
  Добавить
</Button>
```

## Loading состояния

```tsx
// Кнопка
<Button disabled={isLoading}>
  {isLoading ? <Loader2 className="animate-spin" /> : 'Сохранить'}
</Button>

// Skeleton
<div className="space-y-4">
  <Skeleton className="h-20 w-full" />
  <Skeleton className="h-20 w-full" />
</div>
```

## Уведомления

```tsx
import { toast } from 'sonner'

// Успех
toast.success('Пост создан')

// Ошибка
toast.error('Не удалось сохранить')

// С описанием
toast.success('Пост опубликован', {
  description: 'Он появится в Instagram через минуту'
})
```

## Проверка админа

```tsx
const ADMIN_IDS = [643763835, 190202791]

function isAdmin(telegramId: number): boolean {
  return ADMIN_IDS.includes(telegramId)
}

// В компоненте
const { user } = useAuthStore()
if (!isAdmin(user?.telegram_id)) return <Navigate to="/" />
```

## Telegram WebApp

```tsx
import WebApp from '@twa-dev/sdk'

// Данные пользователя
const user = WebApp.initDataUnsafe.user

// Закрыть приложение
WebApp.close()

// Haptic feedback
WebApp.HapticFeedback.impactOccurred('medium')

// Expand
WebApp.expand()
```

---

*Обновляй когда добавляешь новые паттерны*
