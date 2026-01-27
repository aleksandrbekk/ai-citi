// Style Bundles Registry
// Система наборов стилей для карусели

import { STYLES_INDEX, STYLE_CONFIGS, type StyleMeta, type StyleConfig, type StyleId } from '../carouselStyles'
import type { StyleBundle, BundleId, BundleInfo } from './types'

// Re-export types
export type { StyleBundle, BundleId, BundleInfo } from './types'

// =============================================================================
// BASE BUNDLE (существующие 5 стилей)
// =============================================================================

const BASE_BUNDLE: StyleBundle = {
  id: 'base',
  name: 'Базовые',
  emoji: '🎨',
  description: 'Универсальные стили для любой ниши',
  available: true,
  styles: STYLES_INDEX,
  configs: STYLE_CONFIGS as Record<string, StyleConfig>,
}

// =============================================================================
// FUTURE BUNDLES (заглушки для "Скоро")
// =============================================================================

const FITNESS_BUNDLE: StyleBundle = {
  id: 'fitness',
  name: 'Фитнес',
  emoji: '💪',
  description: 'Стили для фитнес-контента',
  available: false, // Скоро
  styles: [],
  configs: {},
}

const CRYPTO_BUNDLE: StyleBundle = {
  id: 'crypto',
  name: 'Крипто',
  emoji: '₿',
  description: 'Стили для крипто-контента',
  available: false, // Скоро
  styles: [],
  configs: {},
}

const BEAUTY_BUNDLE: StyleBundle = {
  id: 'beauty',
  name: 'Бьюти',
  emoji: '💄',
  description: 'Стили для бьюти-контента',
  available: false, // Скоро
  styles: [],
  configs: {},
}

// =============================================================================
// REGISTRY
// =============================================================================

/**
 * Реестр всех наборов стилей
 */
export const STYLE_BUNDLES: Record<BundleId, StyleBundle> = {
  base: BASE_BUNDLE,
  fitness: FITNESS_BUNDLE,
  crypto: CRYPTO_BUNDLE,
  beauty: BEAUTY_BUNDLE,
}

/**
 * Список наборов для UI (с количеством стилей)
 */
export const BUNDLE_LIST: BundleInfo[] = Object.values(STYLE_BUNDLES).map((bundle) => ({
  id: bundle.id,
  name: bundle.name,
  emoji: bundle.emoji,
  description: bundle.description,
  stylesCount: bundle.styles.length,
  available: bundle.available,
}))

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Получить стили из включённых наборов
 * @param enabledBundles - массив ID включённых наборов
 * @returns массив StyleMeta из всех включённых наборов (без дубликатов по id)
 */
export function getStylesByBundles(enabledBundles: BundleId[]): StyleMeta[] {
  const stylesMap = new Map<string, StyleMeta>()

  for (const bundleId of enabledBundles) {
    const bundle = STYLE_BUNDLES[bundleId]
    if (bundle && bundle.available) {
      for (const style of bundle.styles) {
        // Используем Map чтобы избежать дубликатов
        if (!stylesMap.has(style.id)) {
          stylesMap.set(style.id, style)
        }
      }
    }
  }

  return Array.from(stylesMap.values())
}

/**
 * Получить конфиг стиля из включённых наборов
 * @param styleId - ID стиля
 * @param enabledBundles - массив ID включённых наборов
 * @returns StyleConfig или undefined если не найден
 */
export function getStyleConfig(styleId: StyleId, enabledBundles: BundleId[]): StyleConfig | undefined {
  for (const bundleId of enabledBundles) {
    const bundle = STYLE_BUNDLES[bundleId]
    if (bundle && bundle.available && bundle.configs[styleId]) {
      return bundle.configs[styleId]
    }
  }
  return undefined
}

/**
 * Проверить, включён ли стиль в активных наборах
 * @param styleId - ID стиля
 * @param enabledBundles - массив ID включённых наборов
 * @returns true если стиль доступен
 */
export function isStyleEnabled(styleId: StyleId, enabledBundles: BundleId[]): boolean {
  const styles = getStylesByBundles(enabledBundles)
  return styles.some((s) => s.id === styleId)
}

/**
 * Получить набор по ID
 */
export function getBundleById(bundleId: BundleId): StyleBundle | undefined {
  return STYLE_BUNDLES[bundleId]
}

/**
 * Получить только доступные наборы
 */
export function getAvailableBundles(): BundleInfo[] {
  return BUNDLE_LIST.filter((b) => b.available)
}

/**
 * Получить наборы "Скоро"
 */
export function getUpcomingBundles(): BundleInfo[] {
  return BUNDLE_LIST.filter((b) => !b.available)
}
