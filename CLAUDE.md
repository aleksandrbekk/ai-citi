# CLAUDE.md — Правила для AI-агентов

## 🎯 О ПРОЕКТЕ

**AI CITI | НЕЙРОГОРОД** — геймифицированная платформа для сетевиков.
Telegram Mini App + Web + Desktop (один код).

**Текущий модуль:** НЕЙРОПОСТЕР — планировщик публикаций Instagram.

---

## 🛠️ ТЕХНОЛОГИЧЕСКИЙ СТЕК (СТРОГО!)

```
Frontend:   React 18 + Vite + TypeScript
Стили:      TailwindCSS + shadcn/ui
Роутинг:    React Router 6
State:      Zustand
Backend:    Supabase Edge Functions (Deno)
База:       Supabase PostgreSQL + RLS
Storage:    Supabase Storage
Деплой:     Vercel
```

### ⛔ НЕ ИСПОЛЬЗОВАТЬ:
- Next.js
- Express / Node.js backend
- Другие UI библиотеки (только shadcn/ui)
- CSS файлы (только Tailwind классы)

---

## 👥 КОМАНДА АГЕНТОВ

| Агент | Зона | Файлы |
|-------|------|-------|
| **АНЯ** | База данных | `supabase/migrations/*.sql` |
| **БОРЯ** | Backend | `supabase/functions/*` |
| **ВАСЯ** | Frontend | `src/**/*.tsx`, `src/**/*.ts` |

### ⚠️ КРИТИЧЕСКОЕ ПРАВИЛО:
**Один файл = один агент. Агенты НЕ пересекаются!**

---

## 📁 СТРУКТУРА ПРОЕКТА

```
ai-citi/
├── src/
│   ├── pages/              # Страницы (роуты)
│   │   ├── Home.tsx
│   │   ├── Profile.tsx
│   │   └── tools/
│   │       └── poster/     # НЕЙРОПОСТЕР
│   ├── components/         # React компоненты
│   │   ├── ui/             # shadcn/ui
│   │   └── poster/         # Компоненты постера
│   ├── hooks/              # React хуки
│   ├── store/              # Zustand stores
│   ├── lib/                # Утилиты
│   │   ├── supabase.ts
│   │   └── telegram.ts
│   └── types/              # TypeScript типы
│
├── supabase/
│   ├── migrations/         # SQL миграции (АНЯ)
│   └── functions/          # Edge Functions (БОРЯ)
│
├── public/                 # Статика
├── docs/                   # Документация
└── .cursor/                # Настройки Cursor
```

---

## 🎨 СТИЛЬ КОДА

### TypeScript
```typescript
// ✅ Правильно
interface User {
  id: string
  telegramId: number
  username?: string
}

// ❌ Неправильно
type User = {
  id: any
  telegram_id: number
}
```

### React компоненты
```typescript
// ✅ Правильно — функциональные компоненты + хуки
export function PostCard({ post }: { post: Post }) {
  const [isLoading, setIsLoading] = useState(false)
  
  return (
    <div className="rounded-lg bg-white/10 p-4">
      {post.caption}
    </div>
  )
}

// ❌ Неправильно — классовые компоненты
class PostCard extends React.Component {}
```

### Tailwind классы
```tsx
// ✅ Правильно
<button className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90">

// ❌ Неправильно — inline styles
<button style={{ backgroundColor: 'orange' }}>
```

---

## 🗄️ БАЗА ДАННЫХ (Supabase)

### Именование таблиц
- snake_case: `scheduled_posts`, `post_media`
- Всегда `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Всегда `created_at TIMESTAMPTZ DEFAULT NOW()`

### RLS политики (ОБЯЗАТЕЛЬНО!)
```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own posts" ON posts
  FOR ALL USING (user_id = auth.uid());
```

---

## 🔐 ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ

### В .env.local (фронт)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
VITE_TELEGRAM_BOT_USERNAME=xxx
VITE_META_APP_ID=xxx
```

### В Supabase Secrets (секретные)
```bash
supabase secrets set TELEGRAM_BOT_TOKEN=xxx
supabase secrets set META_APP_SECRET=xxx
supabase secrets set INSTAGRAM_ACCESS_TOKEN=xxx
```

---

## ✅ ЧЕКЛИСТ ПЕРЕД КОММИТОМ

1. [ ] `npm run build` проходит без ошибок
2. [ ] TypeScript ошибок нет
3. [ ] Протестировано в браузере (Playwright)
4. [ ] Код соответствует стилю проекта
5. [ ] RLS политики настроены (для SQL)

---

## 🚀 КОМАНДЫ

```bash
# Разработка
npm run dev

# Сборка
npm run build

# Проверка типов
npm run typecheck

# Деплой Edge Functions
supabase functions deploy [function-name]

# Применить миграции
supabase db push
```

---

## 📚 ДОКУМЕНТАЦИЯ

- `/docs/ROADMAP.md` — дорожная карта
- `/docs/NEUROPOSTER_TZ.md` — ТЗ на Нейропостер
- `/docs/DATABASE.md` — схема базы данных

---

## 🎯 ТЕКУЩАЯ ЗАДАЧА

**Фаза 1: Инфраструктура НЕЙРОПОСТЕР**

1. Настроить Vite + React + TypeScript
2. Подключить Supabase
3. Создать таблицы для постов
4. Базовый UI планировщика
