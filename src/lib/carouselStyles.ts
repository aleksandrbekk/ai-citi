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
            outfit_hook: "black hoodie OR dark blazer (depends on topic)",
            outfit_cta: "crisp white shirt, top button open, relaxed professional",
            lighting: "studio lighting, soft shadows, Apple product photography style",
            aesthetic: "clean, professional, confident"
        },
        decorations: {
            elements: "subtle orange glow effects, floating glass particles, soft light rays",
            "3d_objects": "glossy 3D icons with orange accents, floating elements",
            particles: "subtle sparkles, light dust particles"
        },
        prompt_blocks: {
            background: "WHITE background #FFFFFF, clean and bright. Premium minimal Apple-style aesthetic. Subtle light gradient from top.",
            cards_content: "Glassmorphism cards: frosted glass effect with 20px blur, white tint rgba(255,255,255,0.7), subtle white border, soft drop shadow. Border radius 24px. Clean modern look.",
            cards_headline: "White paper STICKER tilted 3-7° with torn ripped edges, strong drop shadow. Bold black text. Below: orange gradient badge (#FF8A3D to #FF5A1F) with white text.",
            person_hook: "Generate person EXACTLY as shown in reference photo. Match all facial features precisely. Outfit: black hoodie or dark blazer. Pose: [POSE]. Expression: [EMOTION], theatrical, exaggerated. Lighting: studio quality, soft shadows. CRITICAL: Do NOT invent facial features.",
            person_cta: "Generate person EXACTLY as shown in reference photo. Match all facial features precisely. Outfit: crisp white shirt, top button open, relaxed professional. Pose: open palm gesture toward CTA card. Expression: warm, inviting, friendly genuine smile. Lighting: warm golden hour feel. CRITICAL: Do NOT invent facial features.",
            decorations_hook: "Visual elements: [PROPS]. Floating 3D elements with orange glow (#FF5A1F). Subtle particles and sparkles. Soft shadows under all elements.",
            cta_card: "Large frosted glass card with strong orange glow (#FF5A1F). Top line (black): 'ПИШИ:'. Main line (HUGE, orange #FF5A1F, neon glow effect): '[PRODUCT_CODE]'. Sparkles and light particles around the code.",
            viral_elements: "3D paper airplane with orange motion trail. Share icons (Telegram, WhatsApp style) floating. Energy lines and particles. Button: '💾 СОХРАНИ'.",
            style_footer: "STYLE: Photorealistic, NOT illustration. Cinematic lighting, studio quality. Premium minimal aesthetic. 8K resolution."
        },
        slide_templates: {
            HOOK: "Instagram carousel slide, 3:4 aspect ratio (1080x1440px generation at 1024x1365).\n\n{background}\n\nHEADLINE (TOP LEFT AREA):\n{cards_headline}\nMain text: \"{HEADLINE_1}\"\nSub text: \"{HEADLINE_2}\"\n\nPERSON:\n{person_hook}\nPosition: RIGHT 40% of frame\nFraming: chest up, LARGE SCALE — 80% of frame width\n\n{decorations_hook}\n\nBOTTOM AREA:\nGlassmorphism card with text: \"{BOTTOM_TEXT}\"\nCorner indicator: \"Листай →\" (small, bottom right)\n\n{style_footer}",
            CONTENT: "Instagram carousel slide, 3:4 aspect ratio (1080x1440px).\n\n{background}\n\nHEADLINE (TOP LEFT):\nOrange gradient badge: \"{HEADLINE}\"\n\nMAIN CONTENT (CENTER):\n{cards_content}\n[CONTENT_LAYOUT]\n\nBOTTOM:\nTransition text: \"{TRANSITION}\"\n\nNo person. Clean infographic style.\n\n{style_footer}",
            CTA: "Instagram carousel slide, 3:4 aspect ratio (1080x1440px).\n\n{background}\n\nTOP LEFT: Orange gradient banner with white text: \"{CTA_HEADLINE}\"\n\nPERSON:\n{person_cta}\nPosition: LEFT 40% of frame\nFraming: chest up, confident pose\n\nMAIN CTA CARD (CENTER-RIGHT):\n{cta_card}\n\nBOTTOM:\nSmaller glassmorphism card: \"{BENEFIT_TEXT}\"\n\n{style_footer}",
            VIRAL: "Instagram carousel slide, 3:4 aspect ratio (1080x1440px).\n\nBackground: White to light orange gradient (#FFFFFF → #FFF5F0), energetic uplifting feel.\n\nCENTER:\nLarge glassmorphism card (prominent, centered)\nTop line (HUGE, bold black): \"ОТПРАВЬ ЭТО\"\nBottom line (large, orange #FF5A1F): \"{VIRAL_TARGET}\"\n\n{viral_elements}\n\nNo person. Bright, shareable, viral aesthetic.\n\n{style_footer}"
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
            outfit_hook: "camel cashmere sweater OR cream knit cardigan",
            outfit_cta: "cream silk blouse OR soft beige blazer",
            lighting: "warm natural window light, golden hour, soft diffused",
            aesthetic: "soft editorial portrait, cozy luxury"
        },
        decorations: {
            elements: "dried pampas grass, neutral ceramic vases, woven textures",
            "3d_objects": "gold geometric shapes, cream colored 3D elements",
            particles: "soft golden dust, warm light particles"
        },
        prompt_blocks: {
            background: "Background: warm beige gradient, flowing from soft cream #F5F0E8 at top through warm tan #E8DDD0 to rich beige #D2B48C at bottom. Soft diffused natural lighting. Cozy luxury interior design aesthetic.",
            cards_content: "Frosted glass cards with warm cream tint rgba(255,253,250,0.6). Subtle gold border rgba(212,175,55,0.3). Soft warm shadow. Elegant rounded corners 20px.",
            cards_headline: "Cream colored elegant banner with chocolate brown text (#5D4037). Elegant serif typography. Gold accent elements.",
            person_hook: "Generate person EXACTLY as shown in reference photo. Match all facial features precisely. Outfit: camel cashmere sweater, cream knit. Pose: [POSE]. Expression: [EMOTION]. Lighting: warm window light, golden hour glow. CRITICAL: Do NOT invent facial features.",
            person_cta: "Generate person EXACTLY as shown in reference photo. Match all facial features precisely. Outfit: cream silk blouse or soft beige blazer. Pose: graceful gesture toward CTA card. Expression: warm, genuine smile. Lighting: soft golden glow. CRITICAL: Do NOT invent facial features.",
            decorations_hook: "Decorative elements: dried pampas grass arrangement, neutral ceramic vase. Soft golden particles floating. [PROPS] with warm beige/gold treatment.",
            cta_card: "Elegant frosted cream card with gold border. Top line (brown #5D4037): 'ПИШИ:'. Main line (LARGE, gold #D4AF37): '[PRODUCT_CODE]'. Subtle gold sparkles.",
            viral_elements: "Elegant paper airplane in cream/gold. Share icons in muted warm tones. Button with gold border: '💾 СОХРАНИ'.",
            style_footer: "STYLE: Photorealistic, editorial quality. Warm natural lighting. Cozy luxury aesthetic. 8K resolution."
        },
        slide_templates: {
            HOOK: "Instagram carousel slide, 3:4 aspect ratio.\n\n{background}\n\nHEADLINE (TOP LEFT):\n{cards_headline}\nMain: \"{HEADLINE_1}\"\nSub: \"{HEADLINE_2}\"\n\nPERSON:\n{person_hook}\nPosition: RIGHT 40%\n\n{decorations_hook}\n\nBOTTOM:\nWarm frosted glass card: \"{BOTTOM_TEXT}\"\n\n{style_footer}",
            CONTENT: "Instagram carousel slide, 3:4 aspect ratio.\n\n{background}\n\nHEADLINE:\nElegant cream banner: \"{HEADLINE}\"\n\nCONTENT:\n{cards_content}\n[CONTENT_LAYOUT]\n\nBOTTOM:\n\"{TRANSITION}\"\n\nNo person.\n\n{style_footer}",
            CTA: "Instagram carousel slide, 3:4 aspect ratio.\n\n{background}\n\nTOP: Elegant cream banner: \"{CTA_HEADLINE}\"\n\nPERSON:\n{person_cta}\nPosition: LEFT 40%\n\nCTA CARD:\n{cta_card}\n\nBOTTOM:\n\"{BENEFIT_TEXT}\"\n\n{style_footer}",
            VIRAL: "Instagram carousel slide, 3:4 aspect ratio.\n\nBackground: Soft beige to warm cream gradient.\n\nCENTER:\nElegant card with gold border\n\"ОТПРАВЬ ЭТО\"\n\"{VIRAL_TARGET}\"\n\n{viral_elements}\n\nNo person.\n\n{style_footer}"
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
            outfit_hook: "dusty rose silk blouse OR soft pink cashmere",
            outfit_cta: "cream or white elegant top, rose gold jewelry",
            lighting: "soft diffused pink-tinted light, editorial beauty lighting",
            aesthetic: "high-fashion editorial, Vogue-style portrait"
        },
        decorations: {
            elements: "dried roses, soft fabric draping, rose petals",
            "3d_objects": "rose gold geometric shapes, pink-tinted glass",
            particles: "soft pink petals floating, rose gold dust"
        },
        prompt_blocks: {
            background: "Background: soft blush pink gradient, flowing from pale pink #FFF5F5 through blush #FFE4E1 to soft rose #FFC0CB. Editorial lighting.",
            cards_content: "Frosted glass cards with soft pink tint rgba(255,245,245,0.7). Subtle rose border. Elegant corners 16px.",
            cards_headline: "Elegant editorial banner, thin serif typography. Deep mauve text #4A3540. Rose gold accent.",
            person_hook: "Generate person EXACTLY as shown in reference photo. Outfit: dusty rose silk blouse. Pose: [POSE]. Expression: [EMOTION], editorial. Lighting: soft beauty lighting. CRITICAL: Do NOT invent facial features.",
            person_cta: "Generate person EXACTLY as shown in reference photo. Outfit: cream or white elegant top. Pose: elegant gesture toward CTA. Expression: warm, inviting smile. CRITICAL: Do NOT invent facial features.",
            decorations_hook: "Decorative elements: dried roses, delicate fabric. [PROPS] with rose/pink treatment. Soft pink particles.",
            cta_card: "Elegant frosted pink card with rose gold border. Top line (mauve #4A3540): 'ПИШИ:'. Main line (rose gold #B76E79): '[PRODUCT_CODE]'. Rose petals around.",
            viral_elements: "Elegant paper airplane in rose gold. Share icons in rose tones. Button: '💾 СОХРАНИ'.",
            style_footer: "STYLE: Photorealistic, high-fashion editorial. Vogue magazine aesthetic. 8K resolution."
        },
        slide_templates: {
            HOOK: "Instagram carousel slide, 3:4 aspect ratio.\n\n{background}\n\nHEADLINE:\n{cards_headline}\n\"{HEADLINE_1}\"\n\"{HEADLINE_2}\"\n\nPERSON:\n{person_hook}\nPosition: RIGHT 40%\n\n{decorations_hook}\n\nBOTTOM:\n\"{BOTTOM_TEXT}\"\n\n{style_footer}",
            CONTENT: "Instagram carousel slide.\n\n{background}\n\nHEADLINE:\n\"{HEADLINE}\"\n\nCONTENT:\n{cards_content}\n[CONTENT_LAYOUT]\n\nBOTTOM:\n\"{TRANSITION}\"\n\nNo person.\n\n{style_footer}",
            CTA: "Instagram carousel slide.\n\n{background}\n\nTOP:\n\"{CTA_HEADLINE}\"\n\nPERSON:\n{person_cta}\nPosition: LEFT 40%\n\nCTA:\n{cta_card}\n\nBOTTOM:\n\"{BENEFIT_TEXT}\"\n\n{style_footer}",
            VIRAL: "Instagram carousel slide.\n\nBackground: Soft pink gradient.\n\nCENTER:\nElegant card\n\"ОТПРАВЬ ЭТО\"\n\"{VIRAL_TARGET}\"\n\n{viral_elements}\n\nNo person.\n\n{style_footer}"
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
            outfit_hook: "simple white t-shirt OR white minimalist clothing",
            outfit_cta: "clean white shirt OR simple white top",
            lighting: "flat, even lighting, minimal shadows, bright",
            aesthetic: "clean editorial portrait, lots of negative space"
        },
        decorations: {
            elements: "thin black continuous line drawings (1-2px), single orange accent element",
            "3d_objects": "simple line-art icons, ONE orange element only",
            particles: "none or minimal thin lines"
        },
        prompt_blocks: {
            background: "Background: PURE WHITE #FFFFFF. No gradients. Extreme minimalism. Generous white space (at least 30% empty).",
            cards_content: "Minimal cards with thin black border (1px solid #1A1A1A). No shadow. Sharp corners. White background. Clean typography.",
            cards_headline: "Simple black text on white. Clean sans-serif. ONE orange accent element only (#FF5A1F).",
            person_hook: "Generate person EXACTLY as shown in reference photo. Outfit: simple white t-shirt. Pose: [POSE]. Expression: [EMOTION], natural, understated. Lighting: flat even lighting. Lots of white space. CRITICAL: Do NOT invent facial features.",
            person_cta: "Generate person EXACTLY as shown in reference photo. Outfit: clean white shirt. Pose: simple gesture toward CTA. Expression: genuine smile. Lighting: bright, flat. CRITICAL: Do NOT invent facial features.",
            decorations_hook: "Line art elements: thin black continuous line drawings (1-2px). [PROPS] as simple line illustrations. ONE orange accent (#FF5A1F). Generous white space.",
            cta_card: "Minimal card with thin black border. White background. Top: 'ПИШИ:'. Main: '[PRODUCT_CODE]' (orange #FF5A1F). Small orange dot accent.",
            viral_elements: "Simple line art paper airplane. Minimal share icons. ONE orange accent. Button outline: '💾 СОХРАНИ'.",
            style_footer: "STYLE: Photorealistic person, minimalist design. Maximum white space. Thin lines only. 8K resolution."
        },
        slide_templates: {
            HOOK: "Instagram carousel slide, 3:4 aspect ratio.\n\n{background}\n\nHEADLINE:\n{cards_headline}\n\"{HEADLINE_1}\"\n\"{HEADLINE_2}\"\n\nPERSON:\n{person_hook}\nPosition: CENTER or RIGHT\nScale: 60-70% (leave breathing room)\n\n{decorations_hook}\n\nBOTTOM:\n\"{BOTTOM_TEXT}\" →\n\n{style_footer}",
            CONTENT: "Instagram carousel slide.\n\n{background}\n\nHEADLINE:\n\"{HEADLINE}\" (one orange word)\n\nCONTENT:\n{cards_content}\n[CONTENT_LAYOUT]\nThin line art decorations\n\nBOTTOM:\n\"{TRANSITION}\"\n\nNo person.\n\n{style_footer}",
            CTA: "Instagram carousel slide.\n\n{background}\n\nTOP:\n\"{CTA_HEADLINE}\"\n\nPERSON:\n{person_cta}\nPosition: LEFT\nLots of white space\n\nCTA:\n{cta_card}\n\nBOTTOM:\n\"{BENEFIT_TEXT}\"\n\n{style_footer}",
            VIRAL: "Instagram carousel slide.\n\n{background}\n\nCENTER:\nMinimal card, thin black border\n\"ОТПРАВЬ ЭТО\"\n\"{VIRAL_TARGET}\" (orange)\n\n{viral_elements}\n\nMaximum white space.\n\n{style_footer}"
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
            headline: "bold sans-serif, white #FFFFFF",
            body: "medium weight, white with opacity",
            accent_text: "gradient text (purple to pink) or white on gradient"
        },
        cards: {
            style: "dark glassmorphism with colorful glow",
            blur: "25px backdrop blur",
            border: "1px solid rgba(255,255,255,0.2)",
            shadow: "colorful glow, 0 8px 32px rgba(102,126,234,0.3)",
            border_radius: "24px"
        },
        person: {
            outfit_hook: "modern minimalist dark clothing, tech/futuristic vibe",
            outfit_cta: "sleek dark jacket OR modern minimalist top",
            lighting: "dramatic colored lighting, rim lights in purple/blue/pink",
            aesthetic: "futuristic editorial, cyberpunk-lite"
        },
        decorations: {
            elements: "flowing gradient mesh blobs, 3D geometric shapes, floating orbs",
            "3d_objects": "glossy 3D spheres, cubes, abstract shapes with gradient materials",
            particles: "glowing orbs, light trails, colorful bokeh"
        },
        prompt_blocks: {
            background: "Background: dark base #1A1A2E with flowing gradient mesh. Colors: purple #667EEA, coral #F093FB, blue #4FACFE, magenta #F5576C. Futuristic, vibrant.",
            cards_content: "Dark glassmorphism cards: rgba(255,255,255,0.1) with 25px blur. White border. Colorful glow behind cards. White text.",
            cards_headline: "Bold white text on gradient mesh. OR gradient text (purple to pink). Glowing effect.",
            person_hook: "Generate person EXACTLY as shown in reference photo. Outfit: modern dark clothing, futuristic. Pose: [POSE]. Expression: [EMOTION], confident. Lighting: dramatic colored rim lighting (purple, blue, pink). CRITICAL: Do NOT invent facial features.",
            person_cta: "Generate person EXACTLY as shown in reference photo. Outfit: sleek dark jacket. Pose: confident gesture toward CTA. Expression: confident smile. Lighting: colorful rim lights. CRITICAL: Do NOT invent facial features.",
            decorations_hook: "3D elements: glossy spheres with gradient materials, floating geometric shapes, glowing orbs. [PROPS] with futuristic/holographic treatment. Gradient mesh blobs.",
            cta_card: "Dark glass card with colorful gradient glow. White border. Top: 'ПИШИ:'. Main: '[PRODUCT_CODE]' (gradient or white with glow). Holographic feel.",
            viral_elements: "3D paper airplane with gradient material. Share icons as 3D glowing objects. Floating orbs. Button with gradient border: '💾 СОХРАНИ'.",
            style_footer: "STYLE: Photorealistic person, futuristic design. Vibrant gradient mesh. Colored lighting. 8K resolution."
        },
        slide_templates: {
            HOOK: "Instagram carousel slide, 3:4 aspect ratio.\n\n{background}\n\nHEADLINE:\n{cards_headline}\n\"{HEADLINE_1}\" (bold white or gradient)\n\"{HEADLINE_2}\" (glowing)\n\nPERSON:\n{person_hook}\nPosition: RIGHT 40%\nRim lighting in purple/blue/pink\n\n{decorations_hook}\n\nBOTTOM:\nDark glass card: \"{BOTTOM_TEXT}\"\n\"Листай →\" (glowing)\n\n{style_footer}",
            CONTENT: "Instagram carousel slide.\n\n{background}\n\nHEADLINE:\nGradient or glowing: \"{HEADLINE}\"\n\nCONTENT:\n{cards_content}\n[CONTENT_LAYOUT]\n3D floating elements\n\nBOTTOM:\n\"{TRANSITION}\" (glowing)\n\nNo person.\n\n{style_footer}",
            CTA: "Instagram carousel slide.\n\n{background}\n\nTOP:\nGradient banner: \"{CTA_HEADLINE}\"\n\nPERSON:\n{person_cta}\nPosition: LEFT 40%\nColorful rim lighting\n\nCTA:\n{cta_card}\n\nBOTTOM:\n\"{BENEFIT_TEXT}\"\n\n{style_footer}",
            VIRAL: "Instagram carousel slide.\n\n{background}\n\nCENTER:\nLarge dark glass card with gradient glow\n\"ОТПРАВЬ ЭТО\" (bold white)\n\"{VIRAL_TARGET}\" (gradient)\n\n{viral_elements}\n\n3D orbs floating.\n\n{style_footer}"
        }
    }
}

// =============================================================================
// VASIA CORE (poses, emotions, props, formulas)
// =============================================================================

export const VASIA_CORE = {
    id: "VASIA_CORE",
    version: "1.0",
    description: "Справочники для генерации каруселей: позы, эмоции, реквизит, формулы заголовков",

    poses: {
        SHOCK: { ru: "Руки у головы", prompt: "Hands on head, shocked expression, wide eyes" },
        EUREKA: { ru: "Палец вверх", prompt: "Pointing up with index finger, eureka moment" },
        QUESTION: { ru: "Руки разведены", prompt: "Arms spread wide, palms up, really?! expression" },
        CONFIDENT: { ru: "Руки скрещены", prompt: "Arms crossed, confident smirk" },
        POINTING: { ru: "Указывает на что-то", prompt: "Pointing or gesturing toward card or element" },
        DISAPPOINTED: { ru: "Держит голову", prompt: "Hand on forehead, disappointed look" },
        TIRED: { ru: "Потирает глаза", prompt: "Rubbing eyes, exhausted expression" },
        VICTORY: { ru: "Кулак вверх", prompt: "Fist pump, celebrating" },
        SHRUG: { ru: "Пожимает плечами", prompt: "Shrugging, ironic smile" },
        SECRET: { ru: "Палец у губ", prompt: "Finger on lips, I will tell you a secret" },
        DENIAL: { ru: "Перечёркивает руками", prompt: "Crossing arms in X, no way gesture" },
        PRESENTING: { ru: "Открытая ладонь", prompt: "Open palm gesture toward content" },
        THINKING: { ru: "Рука у подбородка", prompt: "Hand on chin, thinking pose, analytical gaze" }
    },

    emotions: {
        HOOK_PROBLEM: { ru: "Шок / Возмущение", prompt: "Shocked, frustrated, are you serious?!" },
        HOOK_PROVOKE: { ru: "Дерзость", prompt: "Confident smirk, raised eyebrow, challenging" },
        HOOK_ANALYZE: { ru: "Задумчивость", prompt: "Thoughtful, analytical, slight squint" },
        EMPATHY: { ru: "Сочувствие", prompt: "Empathetic, understanding, slight concern" },
        DISAPPOINTMENT: { ru: "Разочарование", prompt: "Disappointed, I have seen this too many times" },
        CONFIDENCE: { ru: "Уверенность", prompt: "Confident, knowing smile, I got this" },
        FRIENDLY: { ru: "Дружелюбие", prompt: "Warm smile, inviting, approachable" },
        PROUD: { ru: "Гордость", prompt: "Proud, satisfied, accomplished" }
    },

    props_by_topic: {
        no_leads: { ru: "Нет заявок", props: "Magnifying glass + empty phone screen", metaphor: "Искать нечего" },
        cold_spam: { ru: "Холодный спам", props: "Ushanka hat, frost on beard, frozen phone covered in ice", metaphor: "Тебя морозят" },
        burnout: { ru: "Выгорание", props: "Firefighter helmet, smoke, flames", metaphor: "Горишь на работе" },
        team_leaves: { ru: "Команда уходит", props: "Empty chairs behind, abandoned desks", metaphor: "Все сбежали" },
        content_void: { ru: "Контент в пустоту", props: "Megaphone pointing to empty space", metaphor: "Никто не слышит" },
        money_drain: { ru: "Деньги утекают", props: "Leaky bucket with coins falling out", metaphor: "Слив бюджета" },
        ai_automation: { ru: "AI автоматизация", props: "Control panel, holographic screens, robot helpers", metaphor: "Контроль над всем" },
        business_chaos: { ru: "Хаос в бизнесе", props: "Flying papers, scattered documents, mess", metaphor: "Нет системы" },
        analysis: { ru: "Разбор ошибок", props: "Detective magnifying glass, folder labeled CASE FILE", metaphor: "Расследование" },
        time_running: { ru: "Время утекает", props: "Hourglass, broken clock", metaphor: "Дедлайн горит" },
        secret_success: { ru: "Секрет успеха", props: "Safe door slightly open, golden glow inside", metaphor: "Ценная информация" },
        breakthrough: { ru: "Прорыв", props: "Brick wall with hole punched through", metaphor: "Пробил барьер" },
        fresh_start: { ru: "Старт с нуля", props: "Starting blocks, running track", metaphor: "Готов к забегу" },
        income_growth: { ru: "Рост дохода", props: "3D chart with arrow going up", metaphor: "Наглядный рост" },
        transformation: { ru: "До / После", props: "Two phones: old cracked vs new shiny", metaphor: "Трансформация" }
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
