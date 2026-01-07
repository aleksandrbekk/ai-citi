# AI CITI | НЕЙРОГОРОД

Геймифицированная платформа для сетевиков в формате Telegram Mini App.

**Текущий модуль:** НЕЙРОПОСТЕР — планировщик публикаций Instagram с автопубликацией.

---

## 🚀 Быстрый старт

```bash
# Установка зависимостей
npm install

# Разработка
npm run dev

# Сборка
npm run build
```

---

## 👥 Работа в команде

### Синхронизация через Git

**Важно:** Мы работаем в двоем с одним аккаунтом Cursor. Для синхронизации используем Git.

**Перед началом работы:**
```bash
git pull  # Получить последние изменения
```

**После завершения работы:**
```bash
git add .
git commit -m "feat: описание изменений"
git push
```

**Проверка статуса команды:**
- Читай `/docs/TEAM_STATUS.md` — там текущие задачи и кто над чем работает
- Обновляй файл после каждого коммита

### Зоны ответственности

| Агент | Файлы |
|-------|-------|
| **АНЯ** | `supabase/migrations/*.sql` |
| **БОРЯ** | `supabase/functions/*` |
| **ВАСЯ** | `src/**/*.tsx`, `src/**/*.ts` |

**Правило:** Один файл = один агент. Не трогай файлы других без обсуждения!

---

## 📚 Документация

- `/docs/PROJECT_SUMMARY.md` — резюме проекта
- `/docs/ROADMAP.md` — дорожная карта
- `/docs/TEAM_STATUS.md` — статус команды (обновляй регулярно!)
- `/docs/NEUROPOSTER_TZ.md` — ТЗ на Нейропостер
- `/.cursor/rules/` — правила для AI-агентов

---

## 🛠️ Технологии

- **React 18** + TypeScript + Vite
- **TailwindCSS** + shadcn/ui
- **Supabase** (PostgreSQL + Edge Functions + Storage)
- **React Router 6** + Zustand + React Query
- **Vercel** (деплой)

---

## 📖 Оригинальный README Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
