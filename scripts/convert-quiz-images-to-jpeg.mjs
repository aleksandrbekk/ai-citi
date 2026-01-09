/**
 * One-time (or repeatable) conversion: take quiz_images that currently point to
 * Storage PNG URLs and re-upload them as JPEG (optionally resized) to reduce weight.
 * Then update quiz_images.image_url to the new public JPEG URL.
 *
 * Usage:
 *   SUPABASE_URL="https://xxxx.supabase.co" \
 *   SUPABASE_ANON_KEY="..." \
 *   QUIZ_ID="..." \
 *   QUALITY=82 \
 *   MAX_SIZE=1024 \
 *   node scripts/convert-quiz-images-to-jpeg.mjs
 *
 * Notes:
 * - Requires Storage policy to allow INSERT into bucket "quiz-images"
 * - Updates only rows where image_url ends with .png and is not a data: URL
 * - Leaves old PNG objects in Storage (no delete policy by default)
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://debcwvxlvozjlqkhnauy.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const QUIZ_ID = process.env.QUIZ_ID
const BUCKET = process.env.BUCKET || 'quiz-images'
const QUALITY = Number(process.env.QUALITY || 82) // 0..100
const MAX_SIZE = process.env.MAX_SIZE ? Number(process.env.MAX_SIZE) : null
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 10)

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

function encodeStoragePath(p) {
  return p
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/')
}

function publicUrlFor(p) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p}`
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
  url.searchParams.set('select', 'id,row_index,image_index,image_url')
  url.searchParams.set('quiz_id', `eq.${QUIZ_ID}`)
  // Add id as a stable tie-breaker (row_index/image_index can repeat).
  url.searchParams.set('order', 'row_index.asc,image_index.asc,id.asc')
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

async function uploadToStorage(storagePath, bytes) {
  const encoded = encodeStoragePath(storagePath)
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encoded}`
  await fetchText(url, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': 'image/jpeg',
      'cache-control': 'max-age=31536000'
    }),
    body: bytes
  })
}

function execFileAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`${err.message}\n${stderr || ''}`.trim()))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

async function convertWithSips(inputPath, outputPath) {
  // sips options:
  // -Z <pixels> => max width/height (preserve aspect ratio)
  // -s format jpeg
  // -s formatOptions <quality 0-100>
  const args = []
  if (MAX_SIZE && Number.isFinite(MAX_SIZE)) {
    args.push('-Z', String(MAX_SIZE))
  }
  args.push('-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY), inputPath, '--out', outputPath)
  await execFileAsync('/usr/bin/sips', args)
}

async function main() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'quiz-jpeg-'))
  let offset = 0
  let converted = 0
  let skipped = 0

  console.log(
    `Converting quiz images to JPEG... quiz=${QUIZ_ID} quality=${QUALITY} maxSize=${MAX_SIZE ?? 'keep'} bucket=${BUCKET}`
  )

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = await fetchImagesBatch(offset, BATCH_SIZE)
    if (!rows || rows.length === 0) break

    for (const row of rows) {
      const { id, row_index, image_index, image_url } = row

      if (typeof image_url !== 'string') {
        skipped++
        continue
      }
      if (image_url.startsWith('data:')) {
        // base64 should have been migrated already
        skipped++
        continue
      }
      if (/\.(jpe?g)(\?.*)?$/i.test(image_url)) {
        skipped++
        continue
      }
      if (!/\.png(\?.*)?$/i.test(image_url)) {
        // Unknown format — skip
        skipped++
        continue
      }

      const inputFile = path.join(tmpDir, `${id}.png`)
      const outputFile = path.join(tmpDir, `${id}.jpg`)

      try {
        const res = await fetch(image_url)
        if (!res.ok) throw new Error(`Download failed ${res.status} ${res.statusText}`)
        const buf = Buffer.from(await res.arrayBuffer())
        await fs.writeFile(inputFile, buf)

        await convertWithSips(inputFile, outputFile)
        const outBuf = await fs.readFile(outputFile)

        const storagePath = `quiz-images/${QUIZ_ID}/row-${row_index}/${image_index}_${id}.jpg`
        await uploadToStorage(storagePath, outBuf)

        const newUrl = publicUrlFor(storagePath)
        await updateQuizImage(id, newUrl)

        converted++
        console.log(`OK ${converted}: ${id} -> ${storagePath}`)
      } catch (e) {
        console.error(`FAIL: ${id}`, e?.message || e)
      } finally {
        // best-effort cleanup
        await fs.rm(inputFile, { force: true }).catch(() => {})
        await fs.rm(outputFile, { force: true }).catch(() => {})
      }
    }

    offset += rows.length
  }

  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})

  console.log(`Done. converted=${converted} skipped=${skipped}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

