# Claude Skills для AI-CITI

Набор скиллов для Claude Code в облаке.

## Доступные скиллы

| Скилл | Описание |
|-------|----------|
| `mcp-builder` | Создание MCP серверов |
| `nextjs-supabase-auth` | Авторизация Next.js + Supabase |
| `onboarding-cro` | Паттерны onboarding и активации |
| `react-best-practices` | Лучшие практики React |
| `react-patterns` | Паттерны React компонентов |
| `telegram-bot-builder` | Создание Telegram ботов |
| `telegram-mini-app` | Telegram Mini Apps (TMA) |
| `ui-ux-pro-max` | UI/UX дизайн и паттерны |
| `api-design-principles` | Принципы проектирования API |

## Использование

Claude автоматически найдёт и применит эти скиллы при работе над релевантными задачами.

Для явного использования упомяните скилл:
```
Используй скилл telegram-mini-app для создания...
```

## Добавление новых скиллов

1. Скопируй папку скилла из `~/.agent/skills/skills/` сюда
2. Закоммить изменения
