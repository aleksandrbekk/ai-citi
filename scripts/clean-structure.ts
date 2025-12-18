import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const data = JSON.parse(readFileSync(join(__dirname, 'kinoskop_structure.json'), 'utf-8'))

let totalBefore = 0
let totalAfter = 0

for (const module of data.modules) {
  totalBefore += module.lessons.length
  
  // Фильтруем уроки
  module.lessons = module.lessons.filter((lesson: any) => {
    const title = lesson.title.trim()
    // Убираем "Урок X" и "Копировать из другого курса"
    if (/^Урок \d+$/.test(title)) return false
    if (title.includes('Копировать из другого курса')) return false
    return true
  })
  
  // Пересчитываем order_index
  module.lessons.forEach((lesson: any, index: number) => {
    lesson.order_index = index
  })
  
  totalAfter += module.lessons.length
}

data.total_lessons = totalAfter

// Сохраняем очищенные данные
writeFileSync(join(__dirname, 'kinoskop_structure_clean.json'), JSON.stringify(data, null, 2), 'utf-8')

console.log('📊 Статистика очистки:')
console.log(`   До: ${totalBefore} уроков`)
console.log(`   После: ${totalAfter} уроков`)
console.log(`   Удалено: ${totalBefore - totalAfter} служебных`)
console.log('')
console.log('📋 Структура после очистки:')
for (const module of data.modules) {
  console.log(`   ${module.title}: ${module.lessons.length} уроков`)
}

console.log('')
console.log('✅ Сохранено в scripts/kinoskop_structure_clean.json')

