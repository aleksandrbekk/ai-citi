// Carousel Styles Configuration
// Auto-generated from ПРИМЕРЫ КАРУСЕЛИ/*.json

// =============================================================================
// TYPES
// =============================================================================

export type StyleId =
    | 'APPLE_GLASSMORPHISM'
    | 'AESTHETIC_BEIGE'
    | 'SOFT_PINK_EDITORIAL'
    | 'MINIMALIST_LINE_ART'
    | 'GRADIENT_MESH_3D'

export interface StyleMeta {
    id: StyleId
    name: string
    emoji: string
    audience: 'universal' | 'female'
    previewColor: string
    description: string
}

export interface StyleConfig {
    id: string
    name: string
    description: string
    audience: string
    colors: Record<string, string>
    typography: Record<string, string>
    cards: Record<string, string>
    person: Record<string, string>
    decorations: Record<string, string>
    prompt_blocks: Record<string, string>
    slide_templates: Record<string, string>
}

// =============================================================================
// STYLES INDEX (for UI selector)
// =============================================================================

export const STYLES_INDEX: StyleMeta[] = [
    {
        id: 'APPLE_GLASSMORPHISM',
        name: 'Apple Glassmorphism',
        emoji: '🍎',
        audience: 'universal',
        previewColor: '#FF5A1F',
        description: 'Универсальный премиум стиль'
    },
    {
        id: 'AESTHETIC_BEIGE',
        name: 'Aesthetic Beige',
        emoji: '🤎',
        audience: 'female',
        previewColor: '#D2B48C',
        description: 'Тёплый уютный стиль'
    },
    {
        id: 'SOFT_PINK_EDITORIAL',
        name: 'Soft Pink Editorial',
        emoji: '🌸',
        audience: 'female',
        previewColor: '#FFC0CB',
        description: 'Нежный журнальный стиль'
    },
    {
        id: 'MINIMALIST_LINE_ART',
        name: 'Minimalist Line Art',
        emoji: '✏️',
        audience: 'universal',
        previewColor: '#1A1A1A',
        description: 'Экстремальный минимализм'
    },
    {
        id: 'GRADIENT_MESH_3D',
        name: 'Gradient Mesh 3D',
        emoji: '🌈',
        audience: 'universal',
        previewColor: '#667EEA',
        description: 'Футуристичный яркий стиль'
    }
]

// =============================================================================
// STYLE CONFIGS (full JSON for each style)
// =============================================================================

export const STYLE_CONFIGS: Record<StyleId, StyleConfig> = {
    APPLE_GLASSMORPHISM: {
        id: "APPLE_GLASSMORPHISM",
        name: "Apple Glassmorphism",
        description: "Универсальный премиум стиль. Белый фон, стеклянные карточки, оранжевые акценты.",
        audience: "universal",
        colors: {
            background_primary: "#FFFFFF",
            background_gradient: "linear-gradient(180deg, #FFFFFF 0%, #F5F5F7 100%)",
            accent_primary: "#FF5A1F",
            accent_gradient: "linear-gradient(135deg, #FF8A3D 0%, #FF5A1F 100%)",
            text_primary: "#1A1A1A",
            text_secondary: "#666666",
            card_background: "rgba(255, 255, 255, 0.7)",
            card_border: "rgba(255, 255, 255, 0.5)"
        },
        typography: {
            style: "bold modern sans-serif (SF Pro Display style)",
            headline: "bold, black #1A1A1A, clean edges",
            body: "medium weight, #1A1A1A",
            accent_text: "bold, white on orange gradient"
        },
        cards: {
            style: "glassmorphism",
            blur: "20px backdrop blur",
            border: "1px solid rgba(255,255,255,0.5)",
            shadow: "soft drop shadow, 0 8px 32px rgba(0,0,0,0.1)",
            border_radius: "24px"
        },
        person: {
            scale: "85% of frame width — LARGE, fills most of the frame",
            position: "RIGHT or LEFT 40% of frame, chest up to waist visible",
            lighting: "studio lighting, soft shadows, Apple product photography style, cinematic",
            aesthetic: "clean, professional, confident, modern 2026"
        },
        decorations: {
            elements: "subtle orange glow effects, floating glass particles, soft light rays",
            "3d_objects": "glossy 3D icons with orange accents (#FF5A1F), floating elements with soft shadows",
            particles: "subtle sparkles, light dust particles, energy trails"
        },
        prompt_blocks: {
            format_prefix: "Create a vertical portrait image, taller than wide.",
            background: "WHITE background, clean and bright. Premium minimal Apple-style aesthetic. Subtle light gradient from top. Modern 2026 design.",
            cards_content: "Glassmorphism cards: frosted glass effect with 20px blur, white tint, subtle white border, soft drop shadow. Border radius 24px. Clean modern look.",
            cards_headline: "White paper STICKER tilted 3-7° with torn ripped edges, strong drop shadow. Bold black text. Below: vibrant orange gradient badge with white bold text.",
            person_hook: "Generate person EXACTLY as shown in reference photo provided. Match ALL facial features with photographic precision. The reference image is the ONLY source for appearance. Framing: chest up to waist, LARGE SCALE — fills 85% of frame width. Pose: [POSE]. Expression: [EMOTION], theatrical, exaggerated for social media. Outfit: [OUTFIT_BY_TOPIC]. Props around person: [PROPS]. Lighting: studio quality, soft shadows, cinematic. CRITICAL: Do NOT invent or change any facial features.",
            person_cta: "Generate person EXACTLY as shown in reference photo provided. Match ALL facial features with photographic precision. Framing: chest up, LARGE SCALE — fills 85% of frame width. Pose: open palm gesture pointing toward CTA card, inviting. Expression: warm, friendly, genuine smile, approachable. Outfit: [OUTFIT_CTA] — DIFFERENT from slide 1. Lighting: warm golden hour feel, soft and inviting. CRITICAL: Do NOT invent facial features.",
            decorations_hook: "Visual elements: [PROPS] — 3D objects floating around person with vibrant orange glow. Subtle particles and sparkles. Soft shadows under all elements. Energy trails and light effects.",
            cta_card: "Large frosted glass card with strong vibrant orange glow effect. Top line (black bold): 'ПИШИ:'. Main line (HUGE, vibrant orange, neon glow effect): '[PRODUCT_CODE]'. Sparkles and light particles around the code. Glassmorphism style with blur.",
            viral_elements: "3D paper airplane with orange motion trail flying. Share icons (Telegram, WhatsApp style) floating with glow. Energy lines and particles. Button-style element: '💾 СОХРАНИ'.",
            style_footer: "Photorealistic, NOT illustration. Cinematic lighting, studio quality. Premium minimal aesthetic. Vibrant orange accents. 8K resolution. CRITICAL: DO NOT add ANY text that is not explicitly specified. No technical labels (aspect ratio, resolution, color codes), no watermarks, no copyright, no style names, no metadata."
        },
        slide_templates: {
            HOOK: "Create a vertical portrait image, taller than wide.\n\nWHITE background, clean and bright.\n\nHEADLINE (TOP LEFT AREA):\nWhite paper STICKER tilted 3-7° with torn ripped edges, strong drop shadow.\nBold black text: \"{HEADLINE_1}\"\nBelow: Vibrant orange gradient badge with white text: \"{HEADLINE_2}\"\n\nPERSON:\nPosition: RIGHT 40% of frame\nFraming: chest up to waist, LARGE SCALE — fills 85% of frame width\nGenerate person EXACTLY as shown in reference photo. Match ALL facial features precisely.\nOutfit: [OUTFIT_BY_TOPIC]\nPose: [POSE]\nExpression: [EMOTION], theatrical, exaggerated for social media\nProps: [PROPS] — floating 3D objects with orange glow around person\n\nBOTTOM AREA:\nGlassmorphism frosted card with text: \"{BOTTOM_TEXT}\"\nCorner indicator bottom right: \"Листай →\"\n\nPhotorealistic, NOT illustration. Cinematic lighting, studio quality. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            CONTENT: "Create a vertical portrait image, taller than wide.\n\nWHITE background. Premium minimal aesthetic.\n\nHEADLINE (TOP LEFT):\nVibrant orange gradient badge: \"{HEADLINE}\"\n\nMAIN CONTENT (CENTER):\nLayout: [CONTENT_LAYOUT]\nGlassmorphism cards: frosted glass effect with 20px blur, white tint, soft drop shadow.\nText: Black, vibrant orange accents\n[CONTENT_DETAILS]\n\nBOTTOM:\nTransition text: \"{TRANSITION}\"\n\nNo person. Clean infographic style. 8K quality. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            CTA: "Create a vertical portrait image, taller than wide.\n\nWHITE background, clean and bright.\n\nTOP LEFT:\nVibrant orange gradient banner with white bold text: \"{CTA_HEADLINE}\"\n\nPERSON:\nPosition: LEFT 40% of frame\nFraming: chest up, LARGE SCALE — fills 85% of frame width\nGenerate person EXACTLY as shown in reference photo. Match ALL facial features precisely.\nOutfit: [OUTFIT_CTA] — DIFFERENT from slide 1, more relaxed/inviting\nPose: open palm gesture pointing toward CTA card\nExpression: warm, inviting, friendly genuine smile\n\nMAIN CTA CARD (CENTER-RIGHT):\nLarge frosted glass card with vibrant orange glow effect\nTop line (black bold): \"ПИШИ:\"\nMain line (HUGE, vibrant orange, neon glow): \"[PRODUCT_CODE]\"\nSparkles and light particles around\n\nBOTTOM:\nSmaller glassmorphism card: \"{BENEFIT_TEXT}\"\n\nPhotorealistic. Warm inviting lighting. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            VIRAL: "Create a vertical portrait image, taller than wide.\n\nBackground: White to light peach gradient, energetic shareable feel.\n\nCENTER:\nLarge glassmorphism frosted card (prominent, centered)\nTop line (HUGE, bold black): \"ОТПРАВЬ ЭТО\"\nBottom line (large, vibrant orange): \"{VIRAL_TARGET}\"\n\nVISUAL ELEMENTS:\n3D paper airplane with orange motion trail flying\nShare icons (Telegram, WhatsApp style) floating with glow\nEnergy particles, light streaks\n\nBOTTOM:\nButton-style element: \"💾 СОХРАНИ\"\n\nNo person. Bright, viral, shareable aesthetic. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names."
        }
    },

    AESTHETIC_BEIGE: {
        id: "AESTHETIC_BEIGE",
        name: "Aesthetic Beige",
        description: "Тёплый уютный стиль. Бежевые градиенты, золотые акценты.",
        audience: "female",
        colors: {
            background_primary: "#F5F0E8",
            background_gradient: "linear-gradient(180deg, #F5F0E8 0%, #E8DDD0 50%, #D2B48C 100%)",
            accent_primary: "#D4AF37",
            accent_secondary: "#8B7355",
            text_primary: "#5D4037",
            text_secondary: "#8B7355",
            card_background: "rgba(255, 253, 250, 0.6)",
            card_border: "rgba(212, 175, 55, 0.3)"
        },
        typography: {
            style: "elegant serif (Playfair Display / Didot style)",
            headline: "elegant serif, chocolate brown #5D4037, refined",
            body: "light serif or sans-serif, warm brown tones",
            accent_text: "gold #D4AF37 or cream on brown"
        },
        cards: {
            style: "soft glassmorphism with warmth",
            blur: "15px backdrop blur",
            border: "1px solid rgba(212,175,55,0.3) gold tint",
            shadow: "warm soft shadow, 0 8px 32px rgba(93,64,55,0.1)",
            border_radius: "20px"
        },
        person: {
            scale: "85% of frame width — LARGE, fills most of the frame",
            position: "RIGHT or LEFT 40% of frame, chest up to waist visible",
            lighting: "warm natural window light, golden hour, soft diffused, cozy",
            aesthetic: "soft editorial portrait, cozy luxury, warm inviting, modern 2026"
        },
        decorations: {
            elements: "dried pampas grass, neutral ceramic vases, woven textures, soft fabrics",
            "3d_objects": "gold geometric shapes, cream colored 3D elements with warm glow",
            particles: "soft golden dust, warm light particles, floating sparkles"
        },
        prompt_blocks: {
            format_prefix: "Create a vertical portrait image, taller than wide.",
            background: "Background: warm beige gradient, flowing from soft cream at top through warm tan to rich camel beige at bottom. Soft diffused natural lighting. Cozy luxury aesthetic. Modern 2026 design.",
            cards_content: "Frosted glass cards with warm cream tint. Subtle warm gold border. Soft warm shadow. Elegant rounded corners 20px. Clean typography.",
            cards_headline: "Cream colored elegant banner with rich chocolate brown text. Elegant serif typography. Warm gold accent elements. Soft drop shadow.",
            person_hook: "Generate person EXACTLY as shown in reference photo provided. Match ALL facial features with photographic precision. Framing: chest up to waist, LARGE SCALE — fills 85% of frame width. Pose: [POSE]. Expression: [EMOTION], warm and engaging. Outfit: [OUTFIT_BY_TOPIC] in warm beige/cream/camel tones. Props: [PROPS] with warm gold treatment. Lighting: warm window light, golden hour glow. CRITICAL: Do NOT invent facial features.",
            person_cta: "Generate person EXACTLY as shown in reference photo provided. Match ALL facial features with photographic precision. Framing: chest up, LARGE SCALE — fills 85% of frame width. Pose: graceful open palm gesture toward CTA card. Expression: warm, genuine inviting smile. Outfit: [OUTFIT_CTA] in cream/beige — DIFFERENT from slide 1. Lighting: soft golden glow. CRITICAL: Do NOT invent facial features.",
            decorations_hook: "Decorative elements: dried pampas grass arrangement, neutral ceramic vase. [PROPS] with warm beige/gold treatment. Soft golden particles floating. Cozy luxury feel.",
            cta_card: "Elegant frosted cream card with warm gold border. Top line (rich chocolate brown): 'ПИШИ:'. Main line (LARGE, warm gold, subtle glow): '[PRODUCT_CODE]'. Soft gold sparkles around.",
            viral_elements: "Elegant paper airplane in cream/gold tones. Share icons in muted warm tones with gold accents. Button with gold border: '💾 СОХРАНИ'.",
            style_footer: "Photorealistic, editorial quality. Warm natural lighting, golden hour. Cozy luxury aesthetic. Warm gold accents. 8K resolution. CRITICAL: DO NOT add ANY text that is not explicitly specified. No technical labels (aspect ratio, resolution, color codes), no watermarks, no copyright, no style names, no metadata."
        },
        slide_templates: {
            HOOK: "Create a vertical portrait image, taller than wide.\n\nBackground: warm beige gradient from soft cream through warm tan to rich camel beige.\n\nHEADLINE (TOP LEFT):\nCream elegant banner with rich chocolate brown text\nMain: \"{HEADLINE_1}\"\nSub (warm gold color): \"{HEADLINE_2}\"\n\nPERSON:\nPosition: RIGHT 40% of frame\nFraming: chest up to waist, LARGE SCALE — fills 85% of frame width\nGenerate person EXACTLY as shown in reference photo. Match ALL facial features.\nOutfit: [OUTFIT_BY_TOPIC] in warm beige/cream tones\nPose: [POSE]\nExpression: [EMOTION], warm and engaging\nProps: [PROPS] with gold treatment, pampas grass, ceramic elements\n\nBOTTOM:\nWarm frosted glass card: \"{BOTTOM_TEXT}\"\n\"Листай →\" bottom right\n\nPhotorealistic. Warm golden hour lighting. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            CONTENT: "Create a vertical portrait image, taller than wide.\n\nBackground: warm beige gradient from soft cream to rich camel beige. Cozy aesthetic.\n\nHEADLINE:\nElegant cream banner with warm gold accent: \"{HEADLINE}\"\n\nCONTENT:\nLayout: [CONTENT_LAYOUT]\nFrosted cream glass cards with gold borders\nText: rich chocolate brown, warm gold accents\n[CONTENT_DETAILS]\n\nBOTTOM:\n\"{TRANSITION}\"\n\nNo person. Elegant infographic style. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            CTA: "Create a vertical portrait image, taller than wide.\n\nBackground: warm beige gradient, soft golden lighting.\n\nTOP:\nElegant cream banner: \"{CTA_HEADLINE}\"\n\nPERSON:\nPosition: LEFT 40% of frame\nFraming: chest up, LARGE SCALE — fills 85% of frame width\nGenerate person EXACTLY as shown in reference photo.\nOutfit: [OUTFIT_CTA] cream/beige — DIFFERENT from slide 1\nPose: graceful gesture toward CTA card\nExpression: warm, genuine inviting smile\n\nCTA CARD:\nElegant frosted cream card with warm gold border\n\"ПИШИ:\" (rich chocolate brown)\n\"[PRODUCT_CODE]\" (LARGE, warm gold, glow)\nGold sparkles\n\nBOTTOM:\n\"{BENEFIT_TEXT}\"\n\nPhotorealistic. Warm lighting. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            VIRAL: "Create a vertical portrait image, taller than wide.\n\nBackground: Soft beige to warm cream gradient, uplifting feel.\n\nCENTER:\nElegant frosted card with warm gold border\nTop (HUGE, rich chocolate brown): \"ОТПРАВЬ ЭТО\"\nBottom (warm gold): \"{VIRAL_TARGET}\"\n\nVISUAL ELEMENTS:\nElegant paper airplane in cream/gold\nShare icons in warm tones with gold\nSoft golden particles\n\nBOTTOM:\nButton: \"💾 СОХРАНИ\"\n\nNo person. Warm shareable aesthetic. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names."
        }
    },

    SOFT_PINK_EDITORIAL: {
        id: "SOFT_PINK_EDITORIAL",
        name: "Soft Pink Editorial",
        description: "Нежный розовый стиль в эстетике модного журнала.",
        audience: "female",
        colors: {
            background_primary: "#FFF5F5",
            background_gradient: "linear-gradient(180deg, #FFF5F5 0%, #FFE4E1 50%, #FFC0CB 100%)",
            accent_primary: "#B76E79",
            accent_secondary: "#E8B4BC",
            accent_rose_gold: "#D4A5A5",
            text_primary: "#4A3540",
            text_secondary: "#7D5A6A",
            card_background: "rgba(255, 245, 245, 0.7)",
            card_border: "rgba(183, 110, 121, 0.2)"
        },
        typography: {
            style: "elegant high-fashion serif (Didot / Bodoni style)",
            headline: "thin elegant serif, deep mauve #4A3540",
            body: "light elegant serif, sophisticated",
            accent_text: "rose gold or white on dusty rose"
        },
        cards: {
            style: "soft blush glassmorphism",
            blur: "18px backdrop blur",
            border: "1px solid rgba(183,110,121,0.2)",
            shadow: "soft pink shadow, 0 8px 32px rgba(183,110,121,0.1)",
            border_radius: "16px"
        },
        person: {
            scale: "85% of frame width — LARGE, fills most of the frame",
            position: "RIGHT or LEFT 40% of frame, chest up to waist visible",
            lighting: "soft diffused pink-tinted light, editorial beauty lighting, flattering",
            aesthetic: "high-fashion editorial, Vogue-style portrait, modern 2026"
        },
        decorations: {
            elements: "dried roses, soft fabric draping, rose petals, silk textures",
            "3d_objects": "rose gold geometric shapes, pink-tinted glass elements with soft glow",
            particles: "soft pink petals floating, rose gold dust, delicate sparkles"
        },
        prompt_blocks: {
            format_prefix: "Create a vertical portrait image, taller than wide.",
            background: "Background: soft blush pink gradient, flowing from pale pink through blush to soft rose. Soft diffused editorial lighting. High-fashion aesthetic. Modern 2026 design.",
            cards_content: "Frosted glass cards with soft pink tint. Subtle dusty rose border. Elegant rounded corners 16px. Soft pink shadow.",
            cards_headline: "Elegant editorial banner, thin serif typography. Deep mauve text. Rose gold accent elements. Fashion magazine style.",
            person_hook: "Generate person EXACTLY as shown in reference photo provided. Match ALL facial features with photographic precision. Framing: chest up to waist, LARGE SCALE — fills 85% of frame width. Pose: [POSE], editorial fashion pose. Expression: [EMOTION], editorial beauty. Outfit: [OUTFIT_BY_TOPIC] in dusty rose/blush/cream tones, elegant fabrics. Props: [PROPS] with rose gold treatment. Lighting: soft beauty lighting, pink-tinted. CRITICAL: Do NOT invent facial features.",
            person_cta: "Generate person EXACTLY as shown in reference photo provided. Match ALL facial features with photographic precision. Framing: chest up, LARGE SCALE — fills 85% of frame width. Pose: elegant graceful gesture toward CTA card. Expression: warm, inviting smile, approachable beauty. Outfit: [OUTFIT_CTA] cream or white elegant — DIFFERENT from slide 1, rose gold jewelry. Lighting: soft flattering light. CRITICAL: Do NOT invent facial features.",
            decorations_hook: "Decorative elements: dried roses, delicate silk fabric draping. [PROPS] with rose/pink/rose gold treatment. Soft pink petals floating. Rose gold sparkles.",
            cta_card: "Elegant frosted pink card with rose gold border. Top line (deep mauve): 'ПИШИ:'. Main line (LARGE, rose gold, soft glow): '[PRODUCT_CODE]'. Rose petals and sparkles around.",
            viral_elements: "Elegant paper airplane in rose gold tones. Share icons in soft rose/pink with rose gold accents. Floating petals. Button: '💾 СОХРАНИ'.",
            style_footer: "Photorealistic, high-fashion editorial. Vogue magazine aesthetic. Soft beauty lighting. Rose gold accents. 8K resolution. CRITICAL: DO NOT add ANY text that is not explicitly specified. No technical labels (aspect ratio, resolution, color codes), no watermarks, no copyright, no style names, no metadata."
        },
        slide_templates: {
            HOOK: "Create a vertical portrait image, taller than wide.\n\nBackground: soft blush pink gradient from pale pink through blush to soft rose.\n\nHEADLINE (TOP LEFT):\nElegant editorial banner, thin serif typography\nMain (deep mauve color): \"{HEADLINE_1}\"\nSub (rose gold color): \"{HEADLINE_2}\"\n\nPERSON:\nPosition: RIGHT 40% of frame\nFraming: chest up to waist, LARGE SCALE — fills 85% of frame width\nGenerate person EXACTLY as shown in reference photo. Match ALL facial features.\nOutfit: [OUTFIT_BY_TOPIC] in dusty rose/blush tones, elegant\nPose: [POSE], fashion editorial\nExpression: [EMOTION], editorial beauty\nProps: [PROPS] with rose gold treatment, dried roses, petals\n\nBOTTOM:\nSoft pink frosted card: \"{BOTTOM_TEXT}\"\n\"Листай →\" bottom right\n\nPhotorealistic. Soft beauty lighting. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            CONTENT: "Create a vertical portrait image, taller than wide.\n\nBackground: soft blush pink gradient from pale pink to soft rose. Editorial aesthetic.\n\nHEADLINE:\nElegant banner (deep mauve): \"{HEADLINE}\"\nRose gold accent element\n\nCONTENT:\nLayout: [CONTENT_LAYOUT]\nFrosted pink glass cards with rose borders\nText: deep mauve, rose gold accents\n[CONTENT_DETAILS]\n\nBOTTOM:\n\"{TRANSITION}\"\n\nNo person. Elegant fashion infographic. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            CTA: "Create a vertical portrait image, taller than wide.\n\nBackground: soft blush pink gradient, flattering beauty lighting.\n\nTOP:\nElegant rose banner: \"{CTA_HEADLINE}\"\n\nPERSON:\nPosition: LEFT 40% of frame\nFraming: chest up, LARGE SCALE — fills 85% of frame width\nGenerate person EXACTLY as shown in reference photo.\nOutfit: [OUTFIT_CTA] cream/white elegant — DIFFERENT from slide 1\nPose: graceful gesture toward CTA card\nExpression: warm, inviting smile\n\nCTA CARD:\nElegant frosted pink card with rose gold border\n\"ПИШИ:\" (deep mauve)\n\"[PRODUCT_CODE]\" (LARGE, rose gold, glow)\nRose petals and sparkles\n\nBOTTOM:\n\"{BENEFIT_TEXT}\"\n\nPhotorealistic. Soft beauty lighting. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            VIRAL: "Create a vertical portrait image, taller than wide.\n\nBackground: Soft pink to blush gradient, uplifting feminine feel.\n\nCENTER:\nElegant frosted pink card with rose gold border\nTop (HUGE, deep mauve): \"ОТПРАВЬ ЭТО\"\nBottom (rose gold): \"{VIRAL_TARGET}\"\n\nVISUAL ELEMENTS:\nElegant paper airplane in rose gold\nShare icons in soft pink/rose tones\nFloating petals and sparkles\n\nBOTTOM:\nButton: \"💾 СОХРАНИ\"\n\nNo person. Elegant shareable aesthetic. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names."
        }
    },

    MINIMALIST_LINE_ART: {
        id: "MINIMALIST_LINE_ART",
        name: "Minimalist Line Art",
        description: "Экстремальный минимализм. Белый фон, тонкие чёрные линии, один оранжевый акцент.",
        audience: "universal",
        colors: {
            background_primary: "#FFFFFF",
            background_gradient: "solid #FFFFFF (no gradient)",
            accent_primary: "#FF5A1F",
            accent_secondary: "#FF8A3D",
            text_primary: "#1A1A1A",
            text_secondary: "#666666",
            line_art: "#1A1A1A",
            card_background: "rgba(255, 255, 255, 0.95)",
            card_border: "#1A1A1A 1px solid"
        },
        typography: {
            style: "clean modern sans-serif, thin to medium weight",
            headline: "medium weight sans-serif, black #1A1A1A",
            body: "light weight, generous letter spacing",
            accent_text: "medium weight, orange #FF5A1F"
        },
        cards: {
            style: "minimal with thin black border",
            blur: "none or very subtle",
            border: "1px solid #1A1A1A, clean thin line",
            shadow: "minimal or none",
            border_radius: "8px (subtle) or 0px (sharp)"
        },
        person: {
            scale: "70-80% of frame width — leave breathing room and white space",
            position: "CENTER or RIGHT, with generous negative space around",
            lighting: "flat, even lighting, minimal shadows, bright, clean",
            aesthetic: "clean editorial portrait, maximum negative space, modern 2026"
        },
        decorations: {
            elements: "thin black continuous line drawings (1-2px only), single orange accent element",
            "3d_objects": "simple line-art icons, ONE orange element only, no complex shapes",
            particles: "none or minimal thin lines, extreme restraint"
        },
        prompt_blocks: {
            format_prefix: "Create a vertical portrait image, taller than wide.",
            background: "Background: PURE WHITE. No gradients. Extreme minimalism. Generous white space (at least 30% of frame empty). Clean and bright. Modern 2026 design.",
            cards_content: "Minimal cards with thin black border (1px). No shadow or very subtle. Sharp corners 8px or 0px. White background. Clean sans-serif typography.",
            cards_headline: "Simple black text on white background. Clean modern sans-serif. ONE vibrant orange accent element only. Extreme restraint.",
            person_hook: "Generate person EXACTLY as shown in reference photo provided. Match ALL facial features with photographic precision. Framing: chest up to waist, LARGE but with breathing room — 75-80% of frame width, generous white space around. Pose: [POSE], understated. Expression: [EMOTION], natural, not exaggerated. Outfit: [OUTFIT_BY_TOPIC] in white/neutral minimalist style. Props: [PROPS] as thin line art illustrations (1-2px). ONE vibrant orange accent. Lighting: flat even lighting, minimal shadows. CRITICAL: Do NOT invent facial features.",
            person_cta: "Generate person EXACTLY as shown in reference photo provided. Match ALL facial features with photographic precision. Framing: chest up, 75-80% of frame width, white space around. Pose: simple clean gesture toward CTA. Expression: genuine understated smile. Outfit: [OUTFIT_CTA] clean white/neutral — DIFFERENT from slide 1. Lighting: bright, flat, clean. CRITICAL: Do NOT invent facial features.",
            decorations_hook: "Line art elements: thin black continuous line drawings (1-2px only). [PROPS] as simple line illustrations. ONE vibrant orange accent element. Maximum white space. Extreme minimalism.",
            cta_card: "Minimal card with thin black border (1px). Pure white background. Top: 'ПИШИ:' (black). Main: '[PRODUCT_CODE]' (vibrant orange, clean). Small orange dot accent. No glow or effects.",
            viral_elements: "Simple line art paper airplane (thin black lines). Minimal share icons (line art). ONE orange accent only. Button outline only: '💾 СОХРАНИ'.",
            style_footer: "Photorealistic person, minimalist design. Maximum white space. Thin black lines only. ONE vibrant orange accent. 8K resolution. CRITICAL: DO NOT add ANY text that is not explicitly specified. No technical labels (aspect ratio, resolution, color codes), no watermarks, no copyright, no style names, no metadata."
        },
        slide_templates: {
            HOOK: "Create a vertical portrait image, taller than wide.\n\nBackground: PURE WHITE. No gradients. Extreme minimalism.\n\nHEADLINE (TOP LEFT):\nSimple black text on white, clean sans-serif\nMain (pure black): \"{HEADLINE_1}\"\nSub (ONE word in vibrant orange): \"{HEADLINE_2}\"\n\nPERSON:\nPosition: CENTER or RIGHT with generous white space\nFraming: chest up to waist, 75-80% of frame width, breathing room around\nGenerate person EXACTLY as shown in reference photo. Match ALL facial features.\nOutfit: [OUTFIT_BY_TOPIC] in white/neutral minimalist style\nPose: [POSE], understated\nExpression: [EMOTION], natural\nProps: [PROPS] as thin line art (1-2px), ONE vibrant orange accent\n\nBOTTOM:\nSimple text: \"{BOTTOM_TEXT}\" →\n\nPhotorealistic person. Maximum white space. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            CONTENT: "Create a vertical portrait image, taller than wide.\n\nBackground: PURE WHITE. No gradients.\n\nHEADLINE:\nClean sans-serif: \"{HEADLINE}\" (one word in vibrant orange)\n\nCONTENT:\nLayout: [CONTENT_LAYOUT]\nMinimal cards with thin black borders (1px)\nText: pure black, ONE vibrant orange accent\nThin line art decorations\n[CONTENT_DETAILS]\n\nBOTTOM:\n\"{TRANSITION}\"\n\nNo person. Extreme minimalism. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            CTA: "Create a vertical portrait image, taller than wide.\n\nBackground: PURE WHITE. Clean bright.\n\nTOP:\nSimple black text: \"{CTA_HEADLINE}\"\n\nPERSON:\nPosition: LEFT with lots of white space\nFraming: chest up, 75-80% width, breathing room\nGenerate person EXACTLY as shown in reference photo.\nOutfit: [OUTFIT_CTA] clean white/neutral — DIFFERENT from slide 1\nPose: simple gesture toward CTA\nExpression: genuine understated smile\n\nCTA CARD:\nMinimal card, thin black border\n\"ПИШИ:\" (black)\n\"[PRODUCT_CODE]\" (vibrant orange)\nSmall orange dot\n\nBOTTOM:\n\"{BENEFIT_TEXT}\"\n\nPhotorealistic. Flat lighting. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            VIRAL: "Create a vertical portrait image, taller than wide.\n\nBackground: PURE WHITE.\n\nCENTER:\nMinimal card with thin black border\nTop (pure black): \"ОТПРАВЬ ЭТО\"\nBottom (vibrant orange): \"{VIRAL_TARGET}\"\n\nVISUAL ELEMENTS:\nSimple line art paper airplane\nMinimal share icons (line art)\nONE orange accent only\n\nBOTTOM:\nButton outline: \"💾 СОХРАНИ\"\n\nNo person. Maximum white space. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names."
        }
    },

    GRADIENT_MESH_3D: {
        id: "GRADIENT_MESH_3D",
        name: "Gradient Mesh 3D",
        description: "Футуристичный яркий стиль. Градиентные меши, 3D элементы.",
        audience: "universal",
        colors: {
            background_primary: "#1A1A2E",
            background_gradient: "mesh gradient: purple #667EEA, coral #F093FB, blue #4FACFE, pink #F5576C",
            accent_primary: "#F093FB",
            accent_secondary: "#4FACFE",
            accent_tertiary: "#667EEA",
            text_primary: "#FFFFFF",
            text_secondary: "rgba(255,255,255,0.8)",
            card_background: "rgba(255, 255, 255, 0.1)",
            card_border: "rgba(255, 255, 255, 0.2)"
        },
        typography: {
            style: "modern geometric sans-serif, bold",
            headline: "bold sans-serif, white #FFFFFF or gradient",
            body: "medium weight, white with opacity",
            accent_text: "gradient text (purple to pink) or white with glow"
        },
        cards: {
            style: "dark glassmorphism with colorful glow",
            blur: "25px backdrop blur",
            border: "1px solid rgba(255,255,255,0.2)",
            shadow: "colorful glow, 0 8px 32px rgba(102,126,234,0.3)",
            border_radius: "24px"
        },
        person: {
            scale: "85% of frame width — LARGE, fills most of the frame",
            position: "RIGHT or LEFT 40% of frame, chest up to waist visible",
            lighting: "dramatic colored rim lighting in purple/blue/pink, cinematic, futuristic",
            aesthetic: "futuristic editorial, cyberpunk-lite, tech visionary, modern 2026"
        },
        decorations: {
            elements: "flowing gradient mesh blobs, 3D geometric shapes, floating orbs with glow",
            "3d_objects": "glossy 3D spheres, cubes, abstract shapes with gradient materials, holographic",
            particles: "glowing orbs, light trails, colorful bokeh, energy particles"
        },
        prompt_blocks: {
            format_prefix: "Create a vertical portrait image, taller than wide.",
            background: "Background: deep dark blue-black base with flowing gradient mesh blobs. Colors: electric purple, coral pink, bright blue, magenta. Futuristic, vibrant, dynamic. Modern 2026 design.",
            cards_content: "Dark glassmorphism cards with 25px backdrop blur. Subtle white border. Colorful glow behind cards. White text. Rounded corners 24px.",
            cards_headline: "Bold white text on gradient mesh background. OR gradient text (purple to pink). Subtle glowing effect. Futuristic typography.",
            person_hook: "Generate person EXACTLY as shown in reference photo provided. Match ALL facial features with photographic precision. Framing: chest up to waist, LARGE SCALE — fills 85% of frame width. Pose: [POSE], confident futuristic. Expression: [EMOTION], confident, visionary. Outfit: [OUTFIT_BY_TOPIC] in dark modern/futuristic style, tech-wear, sleek. Props: [PROPS] with holographic/gradient treatment, floating 3D elements. Lighting: dramatic colored rim lights (purple, blue, pink tones). CRITICAL: Do NOT invent facial features.",
            person_cta: "Generate person EXACTLY as shown in reference photo provided. Match ALL facial features with photographic precision. Framing: chest up, LARGE SCALE — fills 85% of frame width. Pose: confident gesture pointing toward CTA card. Expression: confident inviting smile, tech visionary vibe. Outfit: [OUTFIT_CTA] sleek dark modern — DIFFERENT from slide 1. Lighting: colorful rim lights. CRITICAL: Do NOT invent facial features.",
            decorations_hook: "3D elements: glossy spheres with gradient materials (purple, coral pink, bright blue), floating geometric shapes, glowing orbs. [PROPS] with futuristic/holographic treatment. Gradient mesh blobs flowing. Energy particles.",
            cta_card: "Dark glass card with colorful gradient glow border (coral pink, bright blue). White border. Top (white): 'ПИШИ:'. Main (HUGE, gradient purple-to-pink or white with glow): '[PRODUCT_CODE]'. Holographic feel, floating sparkles.",
            viral_elements: "3D paper airplane with gradient material and glow trail. Share icons as 3D glowing objects (purple, pink, blue). Floating orbs. Energy particles. Button with gradient border: '💾 СОХРАНИ'.",
            style_footer: "Photorealistic person, futuristic design. Vibrant gradient mesh. Dramatic colored rim lighting. 8K resolution. CRITICAL: DO NOT add ANY text that is not explicitly specified. No technical labels (aspect ratio, resolution, color codes), no watermarks, no copyright, no style names, no metadata."
        },
        slide_templates: {
            HOOK: "Create a vertical portrait image, taller than wide.\n\nBackground: deep dark blue-black with flowing gradient mesh blobs (electric purple, coral pink, bright blue, magenta).\n\nHEADLINE (TOP LEFT):\nBold white or gradient text, glowing effect\nMain: \"{HEADLINE_1}\"\nSub (gradient/glowing): \"{HEADLINE_2}\"\n\nPERSON:\nPosition: RIGHT 40% of frame\nFraming: chest up to waist, LARGE SCALE — fills 85% of frame width\nGenerate person EXACTLY as shown in reference photo. Match ALL facial features.\nOutfit: [OUTFIT_BY_TOPIC] dark modern futuristic, tech-wear\nPose: [POSE], confident\nExpression: [EMOTION], visionary\nProps: [PROPS] with holographic treatment, 3D elements\nLighting: dramatic colored rim lights (purple, blue, pink)\n\nBOTTOM:\nDark glass card with glow: \"{BOTTOM_TEXT}\"\n\"Листай →\" (glowing)\n\nPhotorealistic. Futuristic. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            CONTENT: "Create a vertical portrait image, taller than wide.\n\nBackground: deep dark blue-black with gradient mesh blobs (purple, coral, blue, pink).\n\nHEADLINE:\nGradient or glowing white: \"{HEADLINE}\"\n\nCONTENT:\nLayout: [CONTENT_LAYOUT]\nDark glassmorphism cards with 25px blur, white borders, colorful glow\nText: white, gradient accents\n3D floating elements, orbs\n[CONTENT_DETAILS]\n\nBOTTOM:\n\"{TRANSITION}\" (glowing)\n\nNo person. Futuristic infographic. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            CTA: "Create a vertical portrait image, taller than wide.\n\nBackground: deep dark blue-black with gradient mesh, vibrant colors.\n\nTOP:\nGradient banner: \"{CTA_HEADLINE}\"\n\nPERSON:\nPosition: LEFT 40% of frame\nFraming: chest up, LARGE SCALE — fills 85% of frame width\nGenerate person EXACTLY as shown in reference photo.\nOutfit: [OUTFIT_CTA] sleek dark modern — DIFFERENT from slide 1\nPose: confident gesture toward CTA\nExpression: confident inviting smile\nLighting: colorful rim lights\n\nCTA CARD:\nDark glass card with gradient glow border\n\"ПИШИ:\" (white)\n\"[PRODUCT_CODE]\" (HUGE, gradient/white glow)\nHolographic sparkles\n\nBOTTOM:\n\"{BENEFIT_TEXT}\"\n\nPhotorealistic. Futuristic. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names.",
            VIRAL: "Create a vertical portrait image, taller than wide.\n\nBackground: deep dark blue-black with vibrant gradient mesh, energetic.\n\nCENTER:\nLarge dark glass card with gradient glow border\nTop (HUGE, bold white): \"ОТПРАВЬ ЭТО\"\nBottom (gradient purple-to-pink): \"{VIRAL_TARGET}\"\n\nVISUAL ELEMENTS:\n3D paper airplane with gradient material and glow trail\nShare icons as 3D glowing objects\nFloating orbs, energy particles\n\nBOTTOM:\nButton with gradient border: \"💾 СОХРАНИ\"\n\nNo person. Futuristic viral aesthetic. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified in the prompt. No technical labels, no aspect ratios, no color codes, no watermarks, no copyright, no style names."
        }
    }
}

// =============================================================================
// VASIA CORE (poses, emotions, props, formulas)
// =============================================================================

export const VASIA_CORE = {
    id: "VASIA_CORE",
    version: "6.0",
    description: "Справочники для генерации каруселей: позы, эмоции, реквизит, одежда, формулы заголовков",

    // =========================================================================
    // ДИНАМИЧНАЯ ОДЕЖДА ПОД ТЕМУ (v6.0)
    // =========================================================================
    outfit_by_topic: {
        ai_tech: {
            ru: "AI, технологии, автоматизация",
            hook: "Sleek futuristic jacket with subtle tech details, modern minimalist tech-wear style",
            cta: "Smart casual dark sweater, clean modern look"
        },
        money_business: {
            ru: "Деньги, доход, бизнес",
            hook: "Expensive dark blazer, luxury watch visible, confident businessman style",
            cta: "Crisp white shirt, relaxed professional, top button open"
        },
        mistakes_failures: {
            ru: "Ошибки, провалы, боль",
            hook: "Wrinkled shirt, loosened collar, slightly disheveled appearance showing stress",
            cta: "Clean fresh shirt, composed and recovered look"
        },
        system_order: {
            ru: "Система, порядок, план",
            hook: "Crisp white shirt, perfectly styled, organized professional appearance",
            cta: "Smart casual blazer over clean t-shirt"
        },
        energy_motivation: {
            ru: "Энергия, мотивация, старт",
            hook: "Bright athletic jacket or sporty hoodie, energetic dynamic look",
            cta: "Casual comfortable wear, approachable and ready"
        },
        lifestyle_freedom: {
            ru: "Lifestyle, свобода, результат",
            hook: "Light summer shirt, relaxed vacation style, linen fabric",
            cta: "Casual elegant, beach club smart casual"
        },
        expose_truth: {
            ru: "Разоблачение, правда, секреты",
            hook: "Black leather jacket, edgy rebellious look, dark mysterious",
            cta: "Dark turtleneck, insider expert vibe"
        },
        company_review: {
            ru: "Обзор компании, MLM",
            hook: "Smart casual blazer over t-shirt, approachable expert look",
            cta: "Professional but friendly, business casual"
        },
        default: {
            ru: "Универсальная тема",
            hook: "Modern dark blazer or quality hoodie, clean professional",
            cta: "Crisp white or light shirt, warm inviting appearance"
        }
    },

    // =========================================================================
    // ПОЗЫ И ЖЕСТЫ
    // =========================================================================
    poses: {
        SHOCK: { ru: "Руки у головы", prompt: "Hands on head, shocked expression, wide eyes, dramatic reaction" },
        EUREKA: { ru: "Палец вверх", prompt: "Pointing up with index finger, eureka moment, excited discovery" },
        QUESTION: { ru: "Руки разведены", prompt: "Arms spread wide, palms up, really?! expression, disbelief" },
        CONFIDENT: { ru: "Руки скрещены", prompt: "Arms crossed, confident smirk, powerful stance" },
        POINTING: { ru: "Указывает на что-то", prompt: "Pointing or gesturing toward card or element, directing attention" },
        DISAPPOINTED: { ru: "Держит голову", prompt: "Hand on forehead, disappointed look, frustration visible" },
        TIRED: { ru: "Потирает глаза", prompt: "Rubbing eyes, exhausted expression, burnout visible" },
        VICTORY: { ru: "Кулак вверх", prompt: "Fist pump, celebrating victory, triumphant" },
        SHRUG: { ru: "Пожимает плечами", prompt: "Shrugging, ironic smile, what can you do expression" },
        SECRET: { ru: "Палец у губ", prompt: "Finger on lips, I will tell you a secret, mysterious" },
        DENIAL: { ru: "Перечёркивает руками", prompt: "Crossing arms in X, no way gesture, stop sign" },
        PRESENTING: { ru: "Открытая ладонь", prompt: "Open palm gesture toward content, welcoming, inviting" },
        THINKING: { ru: "Рука у подбородка", prompt: "Hand on chin, thinking pose, analytical gaze, contemplating" }
    },

    // =========================================================================
    // ЭМОЦИИ
    // =========================================================================
    emotions: {
        HOOK_PROBLEM: { ru: "Шок / Возмущение", prompt: "Shocked, frustrated, are you serious?! theatrical for social media" },
        HOOK_PROVOKE: { ru: "Дерзость", prompt: "Confident smirk, raised eyebrow, challenging, provocative" },
        HOOK_ANALYZE: { ru: "Задумчивость", prompt: "Thoughtful, analytical, slight squint, examining" },
        EMPATHY: { ru: "Сочувствие", prompt: "Empathetic, understanding, slight concern, I feel you" },
        DISAPPOINTMENT: { ru: "Разочарование", prompt: "Disappointed, I have seen this too many times, tired of it" },
        CONFIDENCE: { ru: "Уверенность", prompt: "Confident, knowing smile, I got this, assured" },
        FRIENDLY: { ru: "Дружелюбие", prompt: "Warm smile, inviting, approachable, genuine friendly" },
        PROUD: { ru: "Гордость", prompt: "Proud, satisfied, accomplished, achieved" }
    },

    // =========================================================================
    // WOW-РЕКВИЗИТ ПО ТЕМАМ
    // =========================================================================
    props_by_topic: {
        no_leads: { ru: "Нет заявок", props: "Magnifying glass searching empty phone screen, tumbleweeds, desert emptiness", metaphor: "Искать нечего" },
        cold_spam: { ru: "Холодный спам", props: "Frozen phone covered in ice and frost, icicles, cold breath visible, winter hat", metaphor: "Тебя морозят" },
        burnout: { ru: "Выгорание", props: "Firefighter helmet, sparks and flames around, smoke, fire extinguisher", metaphor: "Горишь на работе" },
        team_leaves: { ru: "Команда уходит", props: "Empty chairs behind, abandoned desks, exit signs, footprints walking away", metaphor: "Все сбежали" },
        content_void: { ru: "Контент в пустоту", props: "Megaphone pointing into fog/void, echo waves disappearing, empty audience", metaphor: "Никто не слышит" },
        money_drain: { ru: "Деньги утекают", props: "Leaky bucket with coins and bills falling out, drain hole, money flying away", metaphor: "Слив бюджета" },
        ai_automation: { ru: "AI автоматизация", props: "Holographic control panels, floating screens, robot assistants, neural network visuals", metaphor: "Контроль над всем" },
        business_chaos: { ru: "Хаос в бизнесе", props: "Flying papers everywhere, scattered documents, tangled cables, alarm clocks", metaphor: "Нет системы" },
        analysis: { ru: "Разбор ошибок", props: "Detective magnifying glass, folder labeled CASE FILE, evidence board, red strings", metaphor: "Расследование" },
        time_running: { ru: "Время утекает", props: "Shattered hourglass, sand spilling, broken clocks, melting watches", metaphor: "Дедлайн горит" },
        secret_success: { ru: "Секрет успеха", props: "Safe door slightly open with golden glow inside, treasure chest, key", metaphor: "Ценная информация" },
        breakthrough: { ru: "Прорыв", props: "Brick wall with hole punched through, light streaming in, breaking chains", metaphor: "Пробил барьер" },
        fresh_start: { ru: "Старт с нуля", props: "Starting blocks on running track, launch pad, rocket taking off", metaphor: "Готов к забегу" },
        income_growth: { ru: "Рост дохода", props: "3D chart with glowing arrow going up, money stacks growing, green upward trend", metaphor: "Наглядный рост" },
        transformation: { ru: "До / После", props: "Two phones: old cracked vs new shiny, butterfly emerging, before/after split", metaphor: "Трансформация" }
    },

    headline_formulas: {
        number_fail: { formula: "[ЧИСЛО] + [НЕГАТИВ]", examples: ["47 ОТКАЗОВ ЗА ДЕНЬ", "0 ЗАЯВОК ЗА 30 ДНЕЙ", "НАПИСАЛ 500 — ОТВЕТИЛИ 3"] },
        action_shock: { formula: "[СДЕЛАЛ] — [ШОК]", examples: ["УДАЛИЛ ИНСТАГРАМ — ДОХОД ×3", "УВОЛИЛ КОМАНДУ — ВЫРОС В 2 РАЗА"] },
        provoke: { formula: "[СПОРНОЕ УТВЕРЖДЕНИЕ]?", examples: ["MLM — ПИРАМИДА?", "СЕТЕВОЙ МЁРТВ?"] },
        contrast: { formula: "[А] vs [Б]", examples: ["СПАМ vs ВОРОНКА", "ХАОС vs СИСТЕМА"] },
        confession: { formula: "Я [НЕГАТИВ] [ВРЕМЯ]", examples: ["Я ВРАЛ 3 ГОДА", "Я СЛИЛ 200К НА РЕКЛАМУ"] },
        secret: { formula: "[КТО] СКРЫВАЮТ [ЧТО]", examples: ["ЧТО СКРЫВАЮТ ТОПЫ", "СЕКРЕТ КОТОРЫЙ НЕ РАССКАЖУТ"] },
        ultimatum: { formula: "[СДЕЛАЙ] ИЛИ [ПОСЛЕДСТВИЕ]", examples: ["ВНЕДРИ ИЛИ СЛИВАЙ", "АВТОМАТИЗИРУЙ ИЛИ ВЫГОРИ"] }
    },

    viral_targets: {
        mistakes_newbie: "ТОМУ КТО СЛИВАЕТ КОМАНДУ",
        ai_automation: "КТО ЕЩЁ НЕ ИСПОЛЬЗУЕТ AI",
        content_struggle: "КТО МУЧАЕТСЯ С КОНТЕНТОМ",
        no_system: "КТО РАБОТАЕТ БЕЗ СИСТЕМЫ",
        burnout: "КТО ВЫГОРАЕТ НА РАБОТЕ",
        company_choice: "ТОМУ КТО ВЫБИРАЕТ КОМПАНИЮ",
        universal: "ПАРТНЁРУ ИЗ СЕТЕВОГО"
    },

    transition_phrases: [
        "И знаете что?",
        "Короче",
        "Давайте честно...",
        "По факту",
        "Простыми словами",
        "А теперь главное...",
        "Но это ещё не всё...",
        "Смотри дальше →"
    ],

    person_block_template: "Generate the person EXACTLY as shown in the reference photo provided. Match face, hair, skin tone, and all facial features with photographic precision. The reference image is the ONLY source for the person's appearance. CRITICAL: Do NOT invent or change any facial features.",

    technical: {
        aspect_ratio: "3:4",
        size_final: "1080x1440",
        size_generation: "1024x1365",
        quality: "8K resolution, photorealistic, NOT illustration"
    }
}

// =============================================================================
// FORMAT UNIVERSAL (9-slide structure)
// =============================================================================

export const FORMAT_UNIVERSAL = {
    id: "UNIVERSAL",
    name: "Универсальный формат",
    description: "Стандартная структура карусели: HOOK → 6 контентных слайдов → CTA → VIRAL",
    total_slides: 9,

    cta_types: {
        PRODUCT: {
            description: "Продажа — пользователь указывает своё кодовое слово",
            cta_label: "ПИШИ:",
            cta_value: "{USER_KEYWORD}"
        },
        ENGAGEMENT: {
            description: "Охват — рост аудитории",
            variants: [
                { id: "SUBSCRIBE", cta_label: "ПОДПИШИСЬ", cta_value: "🔔" },
                { id: "COMMENT", cta_label: "НАПИШИ В КОММЕНТАХ", cta_value: "👇" },
                { id: "SAVE", cta_label: "СОХРАНИ", cta_value: "💾" }
            ]
        }
    },

    slides: [
        {
            position: 1,
            type: "HOOK",
            human_mode: "FACE",
            purpose: "Захват внимания. Мощный заголовок + персонаж + WOW-реквизит",
            layout: {
                headline: "TOP_LEFT",
                person: "RIGHT_40_PERCENT",
                props: "FLOATING_AROUND_PERSON",
                bottom_card: "BOTTOM_CENTER",
                navigation: "BOTTOM_RIGHT"
            }
        },
        { position: 2, type: "CONTENT", human_mode: "NONE", purpose: "Проблема / Статистика / Боль" },
        { position: 3, type: "CONTENT", human_mode: "NONE", purpose: "Углубление проблемы / Ошибки / Мифы" },
        { position: 4, type: "CONTENT", human_mode: "NONE", purpose: "Визуализация / Сравнение / Данные" },
        { position: 5, type: "CONTENT", human_mode: "NONE", purpose: "Причины / Инсайт / Почему так" },
        { position: 6, type: "CONTENT", human_mode: "NONE", purpose: "Решение / Система / Что делать" },
        { position: 7, type: "CONTENT", human_mode: "NONE", purpose: "Чеклист / Резюме / Быстрые шаги" },
        {
            position: 8,
            type: "CTA",
            human_mode: "FACE",
            purpose: "Призыв к действию + код продукта",
            layout: {
                headline: "TOP_LEFT",
                person: "LEFT_40_PERCENT",
                cta_card: "CENTER_RIGHT",
                benefit: "BOTTOM"
            }
        },
        { position: 9, type: "VIRAL", human_mode: "NONE", purpose: "Вирусное распространение — отправь другу" }
    ],

    rules: {
        no_repeat_layouts: "Не повторять один layout 2 раза подряд",
        variety: "Чередовать: список → схема → сравнение → чеклист",
        person_only_1_and_8: "Человек только на слайдах 1 и 8",
        different_outfit: "Одежда на слайде 1 и 8 должна отличаться",
        hook_must_grab: "Слайд 1 должен захватить за 1 секунду"
    }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getStyleById(id: StyleId): StyleConfig {
    return STYLE_CONFIGS[id]
}

export function getStyleMeta(id: StyleId): StyleMeta | undefined {
    return STYLES_INDEX.find(s => s.id === id)
}

export function getDefaultStyle(): StyleId {
    return 'APPLE_GLASSMORPHISM'
}
