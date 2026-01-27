#!/bin/bash
# Скрипт для деплоя Edge Function character-greeting
# Требует SUPABASE_ACCESS_TOKEN в переменных окружения

set -e

PROJECT_REF="debcwvxlvozjlqkhnauy"
FUNCTION_NAME="character-greeting"
FUNCTION_PATH="supabase/functions/character-greeting"

echo "🚀 Деплой Edge Function: $FUNCTION_NAME"
echo "📦 Проект: $PROJECT_REF"

# Проверка наличия токена
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "❌ SUPABASE_ACCESS_TOKEN не найден!"
  echo ""
  echo "💡 Варианты решения:"
  echo "1. Установить токен: export SUPABASE_ACCESS_TOKEN=your_token"
  echo "2. Или выполнить: supabase login"
  echo ""
  echo "📖 Как получить токен:"
  echo "   - Зайти в Supabase Dashboard: https://supabase.com/dashboard"
  echo "   - Settings → Access Tokens → Generate new token"
  exit 1
fi

# Проверка наличия функции
if [ ! -d "$FUNCTION_PATH" ]; then
  echo "❌ Функция не найдена: $FUNCTION_PATH"
  exit 1
fi

# Деплой через CLI
echo "📤 Загружаю функцию..."
supabase functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_REF"

echo ""
echo "✅ Деплой завершен!"
echo "🔗 Проверь функцию: https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/$FUNCTION_NAME"
