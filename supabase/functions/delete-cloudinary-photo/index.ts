import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHash } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const CLOUDINARY_CLOUD = 'ds8ylsl2x'
const CLOUDINARY_API_KEY = '329318552456676'
const CLOUDINARY_API_SECRET = '1W-H9NYn1vOxwshd7S6iug3JcWk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function extractPublicId(url: string): string | null {
  // URL format: https://res.cloudinary.com/ds8ylsl2x/image/upload/v{version}/{public_id}.{ext}
  const match = url.match(/\/upload\/v\d+\/(.+)\.\w+$/)
  if (match) {
    return match[1]
  }
  // Try without version
  const match2 = url.match(/\/upload\/(.+)\.\w+$/)
  return match2 ? match2[1] : null
}

async function sha1(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { photoUrl, publicId } = await req.json()

    // Get public_id from URL or use provided one
    const id = publicId || extractPublicId(photoUrl)

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Could not extract public_id from URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate signature
    const timestamp = Math.floor(Date.now() / 1000)
    const signatureString = `public_id=${id}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`
    const signature = await sha1(signatureString)

    // Delete from Cloudinary
    const formData = new URLSearchParams()
    formData.append('public_id', id)
    formData.append('api_key', CLOUDINARY_API_KEY)
    formData.append('timestamp', timestamp.toString())
    formData.append('signature', signature)

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/destroy`,
      {
        method: 'POST',
        body: formData,
      }
    )

    const result = await response.json()

    return new Response(
      JSON.stringify({ success: result.result === 'ok', result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
