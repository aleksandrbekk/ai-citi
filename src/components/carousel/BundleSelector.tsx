import { useCarouselStore, type BundleId } from '@/store/carouselStore'
import { BUNDLE_LIST } from '@/lib/styleBundles'
import { Check, Lock } from 'lucide-react'

export function BundleSelector() {
  const { enabledBundles, toggleBundle } = useCarouselStore()

  return (
    <div className="space-y-2">
      {BUNDLE_LIST.map((bundle) => {
        const isEnabled = enabledBundles.includes(bundle.id)
        const isAvailable = bundle.available

        return (
          <label
            key={bundle.id}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors border ${
              !isAvailable
                ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60'
                : isEnabled
                  ? 'bg-orange-50 border-orange-200 cursor-pointer'
                  : 'bg-white border-gray-200 hover:border-orange-200 hover:bg-orange-50/50 cursor-pointer'
            }`}
          >
            <input
              type="checkbox"
              checked={isEnabled}
              disabled={!isAvailable}
              onChange={() => isAvailable && toggleBundle(bundle.id as BundleId)}
              className="sr-only"
            />

            {/* Checkbox визуал */}
            <div
              className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                !isAvailable
                  ? 'border-gray-300 bg-gray-100'
                  : isEnabled
                    ? 'border-orange-500 bg-orange-500'
                    : 'border-gray-300 bg-white'
              }`}
            >
              {isEnabled && isAvailable && <Check className="w-3 h-3 text-white" />}
              {!isAvailable && <Lock className="w-3 h-3 text-gray-400" />}
            </div>

            {/* Emoji + Info */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-lg">{bundle.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-gray-900 text-sm font-medium">{bundle.name}</span>
                  {bundle.stylesCount > 0 && (
                    <span className="text-xs text-gray-400">({bundle.stylesCount})</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{bundle.description}</p>
              </div>
            </div>

            {/* Скоро badge */}
            {!isAvailable && (
              <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-medium">
                Скоро
              </span>
            )}
          </label>
        )
      })}
    </div>
  )
}
