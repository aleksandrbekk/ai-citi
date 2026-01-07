# Полная перезапись промптов в стиле ВАСЯ v5.1

## 🎯 Проблема

Промпты в шаблонах были плохого качества - слишком технические, не структурированные, использовали неправильный формат.

## ✅ Решение

Полностью переписаны все промпты в шаблонах, используя формат из **ВАСЯ v5.1**.

## 📋 Изменения

### 1. Формат изображения
- ❌ Было: `vertical format` (квадрат)
- ✅ Стало: `3:4 aspect ratio (1080x1440px generation at 1024x1365)`

### 2. Структура промпта
- ❌ Было: Плоский список инструкций
- ✅ Стало: Структурированные секции:
  - `HEADLINE (TOP LEFT AREA):`
  - `PERSON:`
  - `MAIN CONTENT (CENTER):`
  - `VISUAL ELEMENTS:`
  - `BOTTOM:`
  - `STYLE:`

### 3. Reference Photo
- ❌ Было: Длинная инструкция `CRITICAL REFERENCE PHOTO INSTRUCTION...`
- ✅ Стало: Короткая `IMPORTANT: USE REFERENCE IMAGE FACE EXACTLY: Aleksandr Bekk, European, short beard, blue eyes.`

### 4. Убраны проблемные инструкции
- ❌ Убрано: `TOP RIGHT CORNER EMPTY` (вызывало артефакты!)
- ❌ Убрано: `SAFE ZONE: TOP RIGHT CORNER EMPTY`
- ✅ Вместо этого: Просто размещаем элементы слева и в центре

### 5. Стиль
- ❌ Было: `Photorealistic. 8K.`
- ✅ Стало: `Photorealistic, NOT illustration. Cinematic lighting, studio quality. Orange accent color #FF5A1F. Soft shadows under elements. 8K resolution.`

### 6. Prepare Gemini
- ❌ Было: Добавлял `TEXT ON IMAGE:` отдельно
- ✅ Стало: Просто передает промпт из `visualTask` (текст уже включен в промпт)

## 📝 Примеры промптов

### HOOK_PERSON (Слайд 1)
```
Instagram carousel slide, 3:4 aspect ratio (1080x1440px generation at 1024x1365).

WHITE background #FFFFFF.

HEADLINE (TOP LEFT AREA):
- White paper STICKER tilted 5° with torn ripped edges, drop shadow
- Bold black text: "{{topic}}"
- Corner indicator: "Листай →" (small, bottom right)

PERSON:
- Position: CENTER of frame
- Framing: chest up to waist, LARGE SCALE — 85% of frame width
- Outfit: Black oversize t-shirt
- Pose: Expressive frustrated pose, theatrical, exaggerated
- Expression: Shocked, frustrated, "are you serious?!" emotion

IMPORTANT: USE REFERENCE IMAGE FACE EXACTLY: Aleksandr Bekk, European, short beard, blue eyes. Friendly confident emotion.

STYLE: Photorealistic, NOT illustration. Cinematic lighting, studio quality. Orange accent color #FF5A1F. Soft shadows under elements. 8K resolution.
```

### CONTENT (Слайды 2-7)
```
Instagram carousel slide, 3:4 aspect ratio (1080x1440px).

WHITE background #FFFFFF. Premium minimal aesthetic.

HEADLINE (TOP LEFT):
- Bold black text: "ОШИБКА #1"

MAIN CONTENT (CENTER):
- Large frosted glass card with glassmorphism effect
- Text: "{{error_1}}"
- Red X icon or warning symbol
- Style: Glassmorphism, soft shadows, clean typography
- Colors: Black text #1A1A1A, orange accents #FF5A1F

BOTTOM:
- Transition text: "Листай →" (small, bottom right)

No person. Clean infographic style. 8K quality.
```

### CTA_PERSON (Слайд 8)
```
Instagram carousel slide, 3:4 aspect ratio (1080x1440px).

WHITE background #FFFFFF, clean and bright.

TOP LEFT: Orange gradient banner with white text: "{{cta_question}}"

PERSON:
- Position: LEFT 40% of frame
- Framing: chest up, confident pose
- Outfit: Dark blazer / business casual
- Expression: warm, inviting, friendly smile
- Gesture: pointing or open palm toward the CTA card

MAIN CTA CARD (CENTER-RIGHT):
- Large frosted glass card with glow
- Top line (black): "ПИШИ:"
- Main line (HUGE, orange #FF5A1F, neon glow): "{{cta_text}}"
- Sparkles around the code
- BOTTOM: Smaller glass card: "{{cta_benefits}}"

IMPORTANT: USE REFERENCE IMAGE FACE EXACTLY: Aleksandr Bekk, European, short beard, blue eyes. Warm confident expression.

Photorealistic. Warm inviting lighting. 8K.
```

### VIRAL_CTA (Слайд 9)
```
Instagram carousel slide, 3:4 aspect ratio (1080x1440px).

Background: White to light orange gradient, energetic feel.

CENTER:
- Large glassmorphism card
- Top line (HUGE, bold black): "ОТПРАВЬ ЭТО"
- Bottom line (orange #FF5A1F): "{{viral_target}}"

VISUAL ELEMENTS:
- 3D paper airplane with orange motion trail
- Share/send icons floating (Telegram, WhatsApp style)
- Subtle particles, energy lines

BOTTOM:
- Button-style element: "💾 СОХРАНИ"

No person. Bright, shareable, viral aesthetic. 8K.
```

## 🎯 Результат

Все промпты теперь:
- ✅ Используют формат 3:4 (1080x1440px)
- ✅ Структурированы по секциям
- ✅ Используют `USE REFERENCE IMAGE FACE EXACTLY`
- ✅ НЕ содержат `TOP RIGHT CORNER EMPTY`
- ✅ Используют `Photorealistic, NOT illustration`
- ✅ Детальные инструкции о стиле и качестве

## 🧪 Тестирование

Попробуйте сгенерировать карусель сейчас - качество должно значительно улучшиться!

