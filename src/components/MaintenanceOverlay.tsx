import { useMaintenanceMode } from '@/hooks/useMaintenanceMode'

export default function MaintenanceOverlay() {
    const { isMaintenanceMode, message, loading } = useMaintenanceMode()

    if (loading || !isMaintenanceMode) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-b from-[#FFF8F5] via-white to-white">
            <div className="text-center px-8 max-w-md">
                {/* Animated gear icon */}
                <div className="mb-6 flex justify-center">
                    <div className="relative">
                        <svg
                            width="72" height="72" viewBox="0 0 24 24" fill="none"
                            stroke="#FF5A1F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            className="animate-[spin_4s_linear_infinite]"
                        >
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-xl font-bold text-gray-900 mb-3">
                    Технические работы
                </h1>

                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    {message}
                </p>

                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                    Обновление в процессе
                </div>

                {/* Support contacts */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">Остались вопросы?</p>
                    <div className="flex gap-3 justify-center">
                        <a
                            href="https://t.me/dmbekk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-orange-500 transition-colors"
                        >
                            @dmbekk
                        </a>
                        <a
                            href="https://t.me/aleksandrbekk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-500 hover:text-orange-500 transition-colors"
                        >
                            @aleksandrbekk
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
