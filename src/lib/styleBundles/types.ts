// Style Bundles Type Definitions

import type { StyleMeta, StyleConfig } from '../carouselStyles'

/**
 * StyleBundle - набор стилей объединённых по тематике
 * Например: Фитнес, Крипто, Бьюти и т.д.
 */
export interface StyleBundle {
  /** Уникальный идентификатор набора */
  id: BundleId
  /** Название набора для отображения */
  name: string
  /** Эмодзи для визуализации */
  emoji: string
  /** Описание набора */
  description: string
  /** Доступен ли набор (false = "Скоро") */
  available: boolean
  /** Массив метаданных стилей в наборе */
  styles: StyleMeta[]
  /** Конфиги для генерации промптов */
  configs: Record<string, StyleConfig>
}

/**
 * BundleId - идентификаторы доступных наборов
 * 'base' - всегда доступен, базовые 5 стилей
 */
export type BundleId = 'base' | 'fitness' | 'crypto' | 'beauty'

/**
 * BundleInfo - краткая информация для UI списка
 */
export interface BundleInfo {
  id: BundleId
  name: string
  emoji: string
  description: string
  stylesCount: number
  available: boolean
}
