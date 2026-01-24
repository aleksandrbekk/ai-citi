# SKILLS.md — Технические навыки

> Этот файл для AI. Заказчику читать не нужно.

---

## 🎨 FRONTEND (React + TypeScript)

### Компоненты
```tsx
// Функциональные компоненты + хуки
export function PostCard({ post }: { post: Post }) {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      {post.caption}
    </Card>
  )
}
```

### Стили (только Tailwind)
```tsx
// ✅ Правильно
<button className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90">

// ❌ Неправильно
<button style={{ backgroundColor: 'orange' }}>
```

### Glassmorphism (стиль карточек)
```tsx
<div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
```

### Цвета
```css
--background: #0a0a0a;
--foreground: #ffffff;
--primary: #FF5A1F;       /* Оранжевый */
--card: rgba(255,255,255,0.1);
```

### Safe area для Telegram
```tsx
import { getContentSafeAreaTop } from '@/lib/telegram'

const safeTop = getContentSafeAreaTop()

<div style={{ paddingTop: `${safeTop}px` }}>
  {/* Контент под кнопками Telegram */}
</div>
```

### Именование
- Компоненты: `PascalCase` — `PostCard.tsx`
- Функции: `camelCase` — `getUserPosts()`
- Константы: `UPPER_SNAKE_CASE` — `MAX_POSTS`

---

## 🗄️ DATABASE (Supabase PostgreSQL)

### Именование таблиц
- `snake_case` множественное: `scheduled_posts`, `post_media`
- Всегда: `id`, `created_at`, `updated_at`

### RLS политики (ОБЯЗАТЕЛЬНО!)
```sql
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own posts" ON scheduled_posts
  FOR ALL USING (user_id = auth.uid());
```

### Миграции
- Файлы: `supabase/migrations/001_description.sql`
- Нумерация последовательная: 001, 002, 003...

### Запросы через клиент
```typescript
const { data, error } = await supabase
  .from('scheduled_posts')
  .select('*, post_media(*)')
  .order('scheduled_at', { ascending: true })

if (error) throw error
```

---

## ⚡ EDGE FUNCTIONS (Deno)

Расположение: `supabase/functions/`

```typescript
// supabase/functions/my-function/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { name } = await req.json()

  return new Response(
    JSON.stringify({ message: `Hello ${name}!` }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

Деплой:
```bash
supabase functions deploy function-name
```

---

## 🔄 STATE MANAGEMENT

### Zustand (глобальный стейт)
```typescript
// src/store/authStore.ts
import { create } from 'zustand'

interface AuthStore {
  user: User | null
  setUser: (user: User) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user })
}))
```

### React Query (серверный стейт)
```typescript
// src/hooks/usePosts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
      if (error) throw error
      return data
    }
  })
}

export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    }
  })
}
```

---

## 🔗 N8N WEBHOOKS

URL: `https://n8n.iferma.pro`

Существующие webhooks:
- `/webhook/neuroposter-publish` — публикация в Instagram
- `/webhook/client-carousel` — генерация каруселей

Подробнее: `docs/N8N_API.md`

---

## 📦 ЗАВИСИМОСТИ

```bash
# Основные
react-router-dom zustand @tanstack/react-query

# Supabase
@supabase/supabase-js

# UI
lucide-react class-variance-authority clsx tailwind-merge

# Формы
zod react-hook-form @hookform/resolvers

# Даты
date-fns react-day-picker
```

---

## 🧪 ПРОВЕРКИ

```bash
# TypeScript ошибки
npx tsc --noEmit

# Сборка
npm run build

# Линтинг
npm run lint

# Dev сервер
npm run dev
```

---

## 📝 ТИПЫ

```typescript
// src/types/index.ts

interface User {
  id: string
  telegram_id: number
  username?: string
  created_at: string
}

interface Post {
  id: string
  user_id: string
  caption: string
  scheduled_at: string
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  post_media?: PostMedia[]
}

interface PostMedia {
  id: string
  post_id: string
  url: string
  order: number
}
```

---

## 🚫 АНТИПАТТЕРНЫ

```typescript
// ❌ any
const data: any = response

// ✅ Типизация
const data: Post[] = response

// ❌ Классовые компоненты
class MyComponent extends React.Component {}

// ✅ Функциональные
function MyComponent() {}

// ❌ Inline styles
<div style={{ color: 'red' }}>

// ✅ Tailwind
<div className="text-red-500">

// ❌ CSS файлы
import './styles.css'

// ✅ Tailwind классы в компоненте
className="..."
```
