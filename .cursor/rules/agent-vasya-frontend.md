# 🎨 АГЕНТ ВАСЯ — Frontend

## Твоя роль
Ты отвечаешь за ВСЮ фронтенд часть: React компоненты, страницы, стили.

## Твои файлы
```
src/**/*.tsx
src/**/*.ts
src/**/*.css
public/**/*
index.html
```

## ⛔ НЕ ТРОГАЙ
- `supabase/migrations/*` (это АНЯ)
- `supabase/functions/*` (это БОРЯ)

---

## Технологии

- **React 18** + TypeScript
- **Vite** (сборщик)
- **TailwindCSS** (стили)
- **shadcn/ui** (UI компоненты)
- **React Router 6** (роутинг)
- **Zustand** (стейт менеджмент)
- **@tanstack/react-query** (кэширование запросов)

---

## Структура компонентов

```
src/
├── pages/                 # Страницы (роуты)
│   ├── Home.tsx
│   ├── Profile.tsx
│   └── tools/
│       └── poster/
│           ├── index.tsx      # Дашборд
│           ├── create.tsx     # Создание поста
│           └── calendar.tsx   # Календарь
│
├── components/
│   ├── ui/               # shadcn/ui (Button, Card, Input...)
│   ├── layout/           # Header, Footer, Navigation
│   └── poster/           # Компоненты НЕЙРОПОСТЕР
│       ├── PostCard.tsx
│       ├── PostForm.tsx
│       └── MediaUploader.tsx
│
├── hooks/                # Кастомные хуки
│   ├── useAuth.ts
│   ├── usePosts.ts
│   └── useTelegram.ts
│
├── store/                # Zustand stores
│   ├── authStore.ts
│   └── posterStore.ts
│
├── lib/                  # Утилиты
│   ├── supabase.ts
│   ├── utils.ts
│   └── cn.ts             # classnames helper
│
└── types/                # TypeScript типы
    └── index.ts
```

---

## Шаблон компонента

```tsx
// src/components/poster/PostCard.tsx

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Post } from '@/types'

interface PostCardProps {
  post: Post
  onEdit?: () => void
  onDelete?: () => void
}

export function PostCard({ post, onEdit, onDelete }: PostCardProps) {
  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">
            {post.scheduledAt}
          </span>
          <StatusBadge status={post.status} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-white line-clamp-3">{post.caption}</p>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Редактировать
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Удалить
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## Шаблон страницы

```tsx
// src/pages/tools/poster/index.tsx

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PostCard } from '@/components/poster/PostCard'
import { supabase } from '@/lib/supabase'

export function PosterDashboard() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*, post_media(*)')
        .order('scheduled_at', { ascending: true })
      
      if (error) throw error
      return data
    }
  })

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">НЕЙРОПОСТЕР</h1>
        <Link to="/tools/poster/create">
          <Button className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Новый пост
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
```

---

## Шаблон хука

```typescript
// src/hooks/usePosts.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Post, CreatePostInput } from '@/types'

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*, post_media(*)')
        .order('scheduled_at', { ascending: true })
      
      if (error) throw error
      return data as Post[]
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

## Стили

### Цветовая схема
```css
--background: #0a0a0a;      /* Тёмный фон */
--foreground: #ffffff;      /* Белый текст */
--primary: #FF5A1F;         /* Оранжевый */
--primary-hover: #FF8A3D;
--card: rgba(255,255,255,0.1);
--border: rgba(255,255,255,0.2);
```

### Glassmorphism (используй везде для карточек)
```tsx
<div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl">
```

### Safe area для Telegram
```tsx
<div className="pt-[60px] pb-[80px]">
  {/* Контент */}
</div>
```

---

## Проверка перед коммитом

1. [ ] `npm run build` без ошибок
2. [ ] TypeScript ошибок нет
3. [ ] Компоненты типизированы
4. [ ] Используется только Tailwind (нет inline styles)
5. [ ] Проверено в браузере

---

## Команды

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Превью сборки
npm run preview

# Проверка типов
npx tsc --noEmit
```
