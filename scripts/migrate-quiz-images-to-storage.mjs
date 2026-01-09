/**
 * One-time migration: move base64 quiz images from Postgres (quiz_images.image_url)
 * to Supabase Storage and replace image_url with a public URL.
 *
 * Usage (example):
 *   SUPABASE_URL="https://xxxx.supabase.co" \
 *   SUPABASE_ANON_KEY="..." \
 *   QUIZ_ID="..." \
 *   node scripts/migrate-quiz-images-to-storage.mjs
 *
 * Notes:
 * - Requires Storage policy to allow INSERT into the target bucket (default: "quiz-images")
 * - Updates only rows where image_url starts with "data:"
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://debcwvxlvozjlqkhnauy.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const QUIZ_ID = process.env.QUIZ_ID
const BUCKET = process.env.BUCKET || 'quiz-images'

if (!SUPABASE_ANON_KEY) {
  console.error('Missing SUPABASE_ANON_KEY env var')
  process.exit(1)
}

if (!QUIZ_ID) {
  console.error('Missing QUIZ_ID env var')
  process.exit(1)
}

function authHeaders(extra = {}) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    ...extra
  }
}

function encodeStoragePath(path) {
  // Keep slashes, encode each segment.
  return path
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

function parseDataUrl(dataUrl) {
  // data:image/png;base64,AAAA...
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl)
  if (!match) return null
  const mime = match[1]
  const b64 = match[2]
  return { mime, b64 }
}

function extFromMime(mime) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/jpg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  return 'bin'
}

function publicUrlFor(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

async function fetchJson(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} ${text}`.trim())
  }
  return res.json()
}

async function fetchText(url, init) {
  const res = await fetch(url, init)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText} ${text}`.trim())
  }
  return res.text()
}

async function fetchImagesBatch(offset, limit) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/quiz_images`)
  url.searchParams.set('select', 'id,row_index,image_index,image_url,order_index')
  url.searchParams.set('quiz_id', `eq.${QUIZ_ID}`)
  url.searchParams.set('order', 'row_index.asc,image_index.asc')
  url.searchParams.set('offset', String(offset))
  url.searchParams.set('limit', String(limit))

  return fetchJson(url.toString(), { headers: authHeaders() })
}

async function updateQuizImage(id, newUrl) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/quiz_images`)
  url.searchParams.set('id', `eq.${id}`)

  await fetchText(url.toString(), {
    method: 'PATCH',
    headers: authHeaders({
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    }),
    body: JSON.stringify({ image_url: newUrl })
  })
}

async function uploadToStorage(path, bytes, mime) {
  const encoded = encodeStoragePath(path)
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encoded}`

  // Use POST (create). Path is unique, so no upsert needed.
  await fetchText(url, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': mime,
      'cache-control': 'max-age=31536000'
    }),
    body: bytes
  })
}

async function main() {
  const batchSize = Number(process.env.BATCH_SIZE || 3)
  let offset = 0
  let migrated = 0
  let skipped = 0

  console.log(`Migrating quiz images to Storage... quiz=${QUIZ_ID} bucket=${BUCKET}`)

  // Fetch until no more rows.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await fetchImagesBatch(offset, batchSize)
    if (!rows || rows.length === 0) break

    for (const row of rows) {
      const { id, row_index, image_index, image_url } = row

      if (typeof image_url !== 'string') {
        skipped++
        continue
      }

      if (!image_url.startsWith('data:')) {
        skipped++
        continue
      }

      const parsed = parseDataUrl(image_url)
      if (!parsed) {
        console.warn(`Skip: not a data URL (id=${id})`)
        skipped++
        continue
      }

      const ext = extFromMime(parsed.mime)
      const storagePath = `quiz-images/${QUIZ_ID}/row-${row_index}/${image_index}_${id}.${ext}`
      const bytes = Buffer.from(parsed.b64, 'base64')

      try {
        await uploadToStorage(storagePath, bytes, parsed.mime)
        const url = publicUrlFor(storagePath)
        await updateQuizImage(id, url)
        migrated++
        console.log(`OK ${migrated}: ${id} -> ${storagePath}`)
      } catch (e) {
        console.error(`FAIL: ${id}`, e?.message || e)
        // Continue; do not stop the whole migration on a single failure.
      }
    }

    offset += rows.length
  }

  console.log(`Done. migrated=${migrated} skipped=${skipped}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

