# Итоговое исправление workflow client-carousel

## ✅ Все исправления применены

### 1. Gemini Generate
- ✅ Тип: `@n8n/n8n-nodes-langchain.googleGemini`
- ✅ Модель: `models/imagen-4.0-generate-preview-06-06`
- ✅ Промпт: `={{ $json.prompt }}`
- ✅ Credentials: установлены

### 2. Prepare Gemini
- ✅ Возвращает простой `prompt` для Imagen 4
- ✅ НЕ добавляет `TEXT ON IMAGE` (текст уже в промпте)

### 3. Промпты в шаблонах
- ✅ Формат: 3:4 (1080x1440px)
- ✅ Структурированные секции (HEADLINE, PERSON, MAIN CONTENT)
- ✅ `USE REFERENCE IMAGE FACE EXACTLY`
- ✅ НЕТ `TOP RIGHT CORNER EMPTY`
- ✅ `Photorealistic, NOT illustration`

### 4. Связи
- ✅ Gemini Generate → напрямую → Cloudinary Upload
- ✅ Cloudinary Upload → Send Photo

### 5. Cloudinary Upload
- ✅ Использует бинарные данные: `$binary.data.data`

### 6. Send Photo
- ✅ Получает метаданные из `Prepare Gemini`

## 🔄 Цепочка выполнения

```
Webhook → Parse Request → Split Slides → Prepare Gemini → Gemini Generate → Cloudinary Upload → Send Photo
```

## 🧪 Тестирование

Workflow должен работать корректно. Если есть проблемы, проверьте:
1. Что промпты правильно формируются в Parse Request
2. Что Prepare Gemini возвращает `prompt`
3. Что Gemini Generate получает промпт
4. Что Cloudinary Upload получает бинарные данные

