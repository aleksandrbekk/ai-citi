import { useMaintenanceMode } from '@/hooks/useMaintenanceMode'

export default function MaintenanceOverlay() {
    const { isMaintenanceMode, message, loading } = useMaintenanceMode()

    if (loading || !isMaintenanceMode) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-b from-orange-50 via-white to-white">
            <div className="text-center px-8 max-w-sm w-full">

                {/* Animated icon */}
                <div className="mb-8 flex justify-center">
                    <div className="relative w-24 h-24">
                        {/* Outer ring pulse */}
                        <div className="absolute inset-0 rounded-full bg-orange-100 animate-ping opacity-20" />
                        {/* Inner circle with gear */}
                        <div className="relative w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
                            <svg
                                width="40" height="40" viewBox="0 0 24 24" fill="none"
                                stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
                                className="animate-[spin_6s_linear_infinite]"
                            >
                                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                                <circle cx="12" cy="12" r="3" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
                    Обновляем платформу
                </h1>

                {/* Message */}
                <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-xs mx-auto">
                    {message}
                </p>

                {/* Status indicator */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-100 rounded-full mb-10">
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                    <span className="text-xs font-medium text-orange-600">Обновление в процессе</span>
                </div>

                {/* Support contacts */}
                <div className="pt-6 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Поддержка</p>
                    <div className="flex gap-3 justify-center">
                        <a
                            href="https://t.me/dmbekk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-orange-300 hover:bg-orange-50 active:bg-orange-100 transition-all shadow-sm"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            @dmbekk
                        </a>
                        <a
                            href="https://t.me/aleksandrbekk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-orange-300 hover:bg-orange-50 active:bg-orange-100 transition-all shadow-sm"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            @aleksandrbekk
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
