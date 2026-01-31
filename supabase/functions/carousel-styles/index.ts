import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Админы проекта
const ADMIN_IDS = [643763835, 190202791]

// SQL для создания таблицы
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS carousel_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🎨',
  description TEXT,
  audience TEXT DEFAULT 'universal' CHECK (audience IN ('universal', 'female', 'male')),
  preview_color TEXT DEFAULT '#FF5A1F',
  preview_image TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  example_images TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by BIGINT,
  updated_by BIGINT
);

CREATE INDEX IF NOT EXISTS idx_carousel_styles_style_id ON carousel_styles(style_id);
CREATE INDEX IF NOT EXISTS idx_carousel_styles_is_active ON carousel_styles(is_active);
`

// Дефолтные стили
const DEFAULT_STYLES = [
  {
    style_id: 'APPLE_GLASSMORPHISM',
    name: 'Apple Glassmorphism',
    emoji: '🍎',
    description: 'Универсальный премиум стиль',
    audience: 'universal',
    preview_color: '#FF5A1F',
    preview_image: '/styles/apple.jpg',
    is_active: true,
    sort_order: 1,
    config: {
      id: "APPLE_GLASSMORPHISM",
      name: "Apple Glassmorphism",
      description: "Универсальный премиум стиль. Белый фон, стеклянные карточки, оранжевые акценты.",
      audience: "universal",
      colors: { background_primary: "#FFFFFF", accent_primary: "#FF5A1F", text_primary: "#1A1A1A" },
      prompt_blocks: {
        style_core: "Apple-inspired glassmorphism design, premium minimalist aesthetic, frosted glass effect cards on clean white background, subtle shadows and depth",
        color_palette: "Pure white (#FFFFFF) background, vibrant orange (#FF5A1F) accent elements, dark charcoal (#1A1A1A) text",
        layout_rules: "Clean asymmetric layouts, generous white space, floating glass cards with blur effect"
      }
    },
    example_images: Array.from({length: 9}, (_, i) => `/styles/APPLE_GLASSMORPHISM/example_${i+1}.jpeg`)
  },
  {
    style_id: 'AESTHETIC_BEIGE',
    name: 'Aesthetic Beige',
    emoji: '🤎',
    description: 'Тёплый уютный стиль',
    audience: 'female',
    preview_color: '#D2B48C',
    preview_image: '/styles/beige.jpg',
    is_active: true,
    sort_order: 2,
    config: {
      id: "AESTHETIC_BEIGE",
      name: "Aesthetic Beige",
      description: "Тёплый уютный стиль для женской аудитории.",
      audience: "female",
      colors: { background_primary: "#F5F0E8", accent_primary: "#D2B48C", text_primary: "#4A4A4A" },
      prompt_blocks: {
        style_core: "Warm aesthetic beige tones, cozy organic textures, natural materials feel, soft feminine energy",
        color_palette: "Warm beige (#F5F0E8) background, tan/caramel (#D2B48C) accents, warm gray text",
        layout_rules: "Organic flowing shapes, soft rounded corners, natural asymmetry"
      }
    },
    example_images: Array.from({length: 9}, (_, i) => `/styles/AESTHETIC_BEIGE/example_${i+1}.jpeg`)
  },
  {
    style_id: 'SOFT_PINK_EDITORIAL',
    name: 'Soft Pink Editorial',
    emoji: '🌸',
    description: 'Нежный журнальный стиль',
    audience: 'female',
    preview_color: '#FFC0CB',
    preview_image: '/styles/pink.jpg',
    is_active: true,
    sort_order: 3,
    config: {
      id: "SOFT_PINK_EDITORIAL",
      name: "Soft Pink Editorial",
      description: "Нежный журнальный стиль для женской аудитории.",
      audience: "female",
      colors: { background_primary: "#FFF5F7", accent_primary: "#FF69B4", text_primary: "#333333" },
      prompt_blocks: {
        style_core: "Soft pink editorial magazine aesthetic, feminine and elegant, fashion-forward design",
        color_palette: "Blush pink (#FFF5F7) background, hot pink (#FF69B4) accents, dark text for contrast",
        layout_rules: "Magazine-style layouts, editorial typography, fashion photography feel"
      }
    },
    example_images: Array.from({length: 7}, (_, i) => `/styles/SOFT_PINK_EDITORIAL/example_${i+1}.jpeg`)
  },
  {
    style_id: 'MINIMALIST_LINE_ART',
    name: 'Minimalist Line Art',
    emoji: '✏️',
    description: 'Экстремальный минимализм',
    audience: 'universal',
    preview_color: '#1A1A1A',
    preview_image: '/styles/minimal.jpg',
    is_active: true,
    sort_order: 4,
    config: {
      id: "MINIMALIST_LINE_ART",
      name: "Minimalist Line Art",
      description: "Экстремальный минимализм, черно-белая графика.",
      audience: "universal",
      colors: { background_primary: "#FFFFFF", accent_primary: "#000000", text_primary: "#000000" },
      prompt_blocks: {
        style_core: "Extreme minimalism, clean line art illustrations, black and white only, lots of white space",
        color_palette: "Pure white background, black lines and text only, no color",
        layout_rules: "Maximum white space, single focal elements, minimal text"
      }
    },
    example_images: Array.from({length: 9}, (_, i) => `/styles/MINIMALIST_LINE_ART/example_${i+1}.jpeg`)
  },
  {
    style_id: 'GRADIENT_MESH_3D',
    name: 'Gradient Mesh 3D',
    emoji: '🌈',
    description: 'Футуристичный яркий стиль',
    audience: 'universal',
    preview_color: '#667EEA',
    preview_image: '/styles/gradient.jpg',
    is_active: true,
    sort_order: 5,
    config: {
      id: "GRADIENT_MESH_3D",
      name: "Gradient Mesh 3D",
      description: "Футуристичный яркий стиль с 3D элементами.",
      audience: "universal",
      colors: { background_primary: "#0F0F1A", accent_primary: "#667EEA", text_primary: "#FFFFFF" },
      prompt_blocks: {
        style_core: "Futuristic gradient mesh design, vibrant 3D elements, bold colorful gradients, modern tech aesthetic",
        color_palette: "Dark background (#0F0F1A), purple-blue gradient (#667EEA to #764BA2), white text",
        layout_rules: "Dynamic 3D shapes, floating gradient orbs, bold geometric compositions"
      }
    },
    example_images: Array.from({length: 9}, (_, i) => `/styles/GRADIENT_MESH_3D/example_${i+1}.jpeg`)
  }
]

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabase client с service_role для полного доступа
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const styleId = pathParts[pathParts.length - 1] !== 'carousel-styles'
      ? pathParts[pathParts.length - 1]
      : null

    // Специальный action=init для инициализации таблицы
    const action = url.searchParams.get('action')
    if (action === 'init') {
      try {
        // Создаём таблицу через RPC (если есть) или проверяем существование
        const { data: existingStyles, error: checkError } = await supabase
          .from('carousel_styles')
          .select('id')
          .limit(1)

        // Если ошибка - таблица не существует, создаём
        if (checkError && checkError.message.includes('does not exist')) {
          // Попытка создать таблицу напрямую через SQL (может не работать без RPC)
          console.log('Table does not exist, need to create it')
          return new Response(
            JSON.stringify({
              error: 'Table does not exist',
              needsSetup: true,
              sql: CREATE_TABLE_SQL,
              message: 'Please run this SQL in Supabase Dashboard to create the table'
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Таблица существует, проверяем есть ли стили
        const { data: styles } = await supabase
          .from('carousel_styles')
          .select('id')

        if (!styles || styles.length === 0) {
          // Таблица пустая - добавляем дефолтные стили
          const { error: insertError } = await supabase
            .from('carousel_styles')
            .insert(DEFAULT_STYLES)

          if (insertError) {
            return new Response(
              JSON.stringify({ error: insertError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Initialized with default styles', count: DEFAULT_STYLES.length }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Already initialized', count: styles.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (initError) {
        return new Response(
          JSON.stringify({ error: initError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // GET - получить стили
    if (req.method === 'GET') {
      // Если есть ID в пути - получить конкретный стиль
      if (styleId && styleId !== 'carousel-styles') {
        const { data, error } = await supabase
          .from('carousel_styles')
          .select('*')
          .eq('id', styleId)
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Параметр all=true для получения всех стилей (включая неактивные)
      const all = url.searchParams.get('all') === 'true'

      let query = supabase
        .from('carousel_styles')
        .select('*')
        .order('sort_order', { ascending: true })

      if (!all) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST, PUT, DELETE - требуют проверки админа
    const telegramIdHeader = req.headers.get('x-telegram-id')
    const telegramId = telegramIdHeader ? parseInt(telegramIdHeader, 10) : null

    if (!telegramId || !ADMIN_IDS.includes(telegramId)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST - создать стиль
    if (req.method === 'POST') {
      const body = await req.json()

      const { data, error } = await supabase
        .from('carousel_styles')
        .insert({
          ...body,
          created_by: telegramId,
        })
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT - обновить стиль
    if (req.method === 'PUT') {
      if (!styleId) {
        return new Response(
          JSON.stringify({ error: 'Style ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json()

      const { data, error } = await supabase
        .from('carousel_styles')
        .update({
          ...body,
          updated_by: telegramId,
        })
        .eq('id', styleId)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE - удалить стиль (мягкое удаление)
    if (req.method === 'DELETE') {
      if (!styleId) {
        return new Response(
          JSON.stringify({ error: 'Style ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Мягкое удаление - деактивация
      const { error } = await supabase
        .from('carousel_styles')
        .update({ is_active: false, updated_by: telegramId })
        .eq('id', styleId)

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
