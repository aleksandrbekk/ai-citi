// COPYWRITER BODY v2 - поддержка stylePrompt для новых стилей
// Приоритет: 1) body.stylePrompt (новые стили) 2) prompt_blocks (старые) 3) fallback

const body = $json.body || $json;
const topic = body.topic || "Тестовая тема";
const cta = body.cta || "МАГИЯ";

// Получаем данные из входящего запроса
const styleConfig = body.styleConfig || null;
const vasiaCore = body.vasiaCore || null;
const formatConfig = body.formatConfig || null;

// НОВОЕ: stylePrompt приходит отдельным полем для новых стилей (CINEMATICOVERLOAD и др.)
const incomingStylePrompt = body.stylePrompt || (styleConfig && styleConfig.style_prompt) || null;

// Определяем визуальный промпт с приоритетом:
// 1. Новые стили: используем готовый stylePrompt (один промпт на весь стиль)
// 2. Старые стили: строим из prompt_blocks
// 3. Fallback: Apple Glassmorphism
let stylePrompt = '';

if (incomingStylePrompt) {
    // НОВЫЕ СТИЛИ: используем готовый промпт как есть
    stylePrompt = `
## ВИЗУАЛЬНЫЙ СТИЛЬ (из style_prompt)

${incomingStylePrompt}
`;
} else if (styleConfig && styleConfig.prompt_blocks) {
    // СТАРЫЕ СТИЛИ: строим из prompt_blocks
    const pb = styleConfig.prompt_blocks;
    stylePrompt = `
## ВИЗУАЛЬНЫЙ СТИЛЬ: ${styleConfig.name}

### ОПИСАНИЕ
${styleConfig.description}

### ЦВЕТА
${JSON.stringify(styleConfig.colors, null, 2)}

### ТИПОГРАФИКА
${JSON.stringify(styleConfig.typography, null, 2)}

### КАРТОЧКИ
${JSON.stringify(styleConfig.cards, null, 2)}

### ПЕРСОНАЖ
${JSON.stringify(styleConfig.person, null, 2)}

### ДЕКОРАЦИИ
${JSON.stringify(styleConfig.decorations, null, 2)}

### PROMPT BLOCKS (используй в visual_task)
- background: ${pb.background}
- cards_content: ${pb.cards_content}
- cards_headline: ${pb.cards_headline}
- person_hook: ${pb.person_hook}
- person_cta: ${pb.person_cta}
- decorations_hook: ${pb.decorations_hook}
- cta_card: ${pb.cta_card}
- viral_elements: ${pb.viral_elements}
- style_footer: ${pb.style_footer}
`;
} else {
    // FALLBACK - Apple Glassmorphism (дефолт)
    stylePrompt = `
## ВИЗУАЛЬНЫЙ СТИЛЬ: Apple Glassmorphism (дефолт)

- Фон: Белый #FFFFFF
- Акцент: Оранжевый #FF5A1F
- Карточки: Glassmorphism, frosted glass, 24px radius
- Персонаж: черный худи (hook), белая рубашка (cta)
`;
}

// Формат слайдов
let formatPrompt = '';
if (formatConfig && formatConfig.slides) {
    formatPrompt = `
## СТРУКТУРА КАРУСЕЛИ (${formatConfig.total_slides} слайдов)

${formatConfig.slides.map(s => `Слайд ${s.position}: ${s.type} (human_mode: ${s.human_mode}) — ${s.purpose}`).join('\n')}

### ПРАВИЛА
${Object.values(formatConfig.rules || {}).join('\n')}
`;
} else {
    formatPrompt = `
## СТРУКТУРА КАРУСЕЛИ (9 слайдов)
1. HOOK (FACE) — захват внимания
2-7. CONTENT (NONE) — контент
8. CTA (FACE) — призыв к действию
9. VIRAL (NONE) — отправь другу
`;
}

// Справочники поз и эмоций
let corePrompt = '';
if (vasiaCore) {
    const poses = Object.entries(vasiaCore.poses || {}).map(([k, v]) => `${k}: ${v.prompt}`).join('\n');
    const emotions = Object.entries(vasiaCore.emotions || {}).map(([k, v]) => `${k}: ${v.prompt}`).join('\n');
    corePrompt = `
## ПОЗЫ (выбери подходящую для HOOK)
${poses}

## ЭМОЦИИ (выбери подходящую)
${emotions}

## ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ
- Размер: ${vasiaCore.technical?.size_generation || '1024x1365'}
- Качество: ${vasiaCore.technical?.quality || '8K, photorealistic'}
`;
}

const systemPrompt = `# ГЕНЕРАТОР INSTAGRAM КАРУСЕЛЕЙ

## ТВОЯ ЗАДАЧА

Создай JSON карусели на 7-9 слайдов по теме: "${topic}"
CTA код: "${cta}"

${stylePrompt}

${formatPrompt}

${corePrompt}

## ФОРМАТ ОТВЕТА

Верни ТОЛЬКО JSON без markdown:

{
  "topic": "Тема",
  "product": "${cta}",
  "post_text": "Текст поста для Instagram...",
  "slides": [
    {
      "id": 1,
      "template": "HOOK_PERSON",
      "human_mode": "FACE",
      "visual_task": "Детальное описание слайда на АНГЛИЙСКОМ для Gemini Image...",
      "content": ["Заголовок", "Подзаголовок"]
    }
  ]
}

## КРИТИЧЕСКИ ВАЖНО

1. visual_task пиши НА АНГЛИЙСКОМ — это промпт для AI генерации
2. В visual_task НЕ указывай URL фото — workflow подставляет автоматически
3. human_mode: "FACE" только для слайдов 1 и 8 (или последнего)
4. Используй prompt_blocks из стиля для формирования visual_task
5. Весь ТЕКСТ на слайдах должен быть НА РУССКОМ
`;

return {
    contents: [
        {
            parts: [{ text: systemPrompt }]
        }
    ],
    generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 8000
    }
};
