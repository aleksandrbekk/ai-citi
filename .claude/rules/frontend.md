# Frontend Rules

> Применяется к: `src/**/*.tsx`, `src/**/*.ts`

## Компоненты

```tsx
// Функциональные + хуки
export function PostCard({ post }: { post: Post }) {
  const [loading, setLoading] = useState(false)

  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20">
      {post.caption}
    </Card>
  )
}
```

## Именование

- Компоненты: `PascalCase` → `PostCard.tsx`
- Функции: `camelCase` → `getUserPosts()`
- Константы: `UPPER_SNAKE` → `MAX_POSTS`
- Типы: `PascalCase` → `interface Post {}`

## Стили

Только Tailwind классы:

```tsx
// ✅
<button className="rounded-lg bg-primary px-4 py-2 hover:bg-primary/90">

// ❌
<button style={{ backgroundColor: 'orange' }}>
```

## Glassmorphism

Стиль карточек:

```tsx
<div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4">
```

## Цвета

**ВАЖНО:** Всегда используй цвета из `.claude/rules/ai-citi-design-system.md`!

Основные цвета:
- **Primary**: `#FF5A1F` (оранжевый) — CTA кнопки, акценты
- **Secondary**: `#06B6D4` (бирюзовый) — вторичные элементы, иконки AI
- **Background**: `#FFFFFF` или `#FFF8F5` (белый/кремовый)
- **Text**: `#1A1A1A` (темно-серый)

**НЕ используй:** фиолетовый, розовый для основных элементов!

Подробности: `.claude/rules/ai-citi-design-system.md`

## Telegram Safe Area

В fullscreen режиме есть кнопки X и меню. Контент должен быть ПОД ними:

```tsx
import { getContentSafeAreaTop } from '@/lib/telegram'

<div style={{ paddingTop: `${getContentSafeAreaTop()}px` }}>
```

## State

**Zustand** — глобальный стейт:

```tsx
// src/store/authStore.ts
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user })
}))
```

**React Query** — серверные данные:

```tsx
// src/hooks/usePosts.ts
export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('scheduled_posts').select('*')
      if (error) throw error
      return data
    }
  })
}
```

## Импорты

```tsx
// Порядок:
import { useState } from 'react'           // 1. React
import { useQuery } from '@tanstack/...'   // 2. Внешние
import { Button } from '@/components/ui'   // 3. Компоненты
import { supabase } from '@/lib/supabase'  // 4. Локальные
import type { Post } from '@/types'        // 5. Типы
```

## Роутинг

React Router 6. Страницы в `src/pages/`.

```tsx
<Route path="/tools/poster" element={<PosterDashboard />} />
<Route path="/tools/poster/create" element={<CreatePost />} />
<Route path="/tools/poster/:id/edit" element={<EditPost />} />
```
