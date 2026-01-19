import { useEffect, useState } from 'react'
import { getTelegramWebApp, getInitData, getTelegramUser, getStartParam } from '@/lib/telegram'
import { supabase } from '@/lib/supabase'

export default function DebugReferral() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [edgeFunctionResult, setEdgeFunctionResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const webApp = getTelegramWebApp()
    const initData = getInitData()
    const telegramUser = getTelegramUser()
    const startParam = getStartParam()

    const info = {
      // Telegram WebApp
      hasWebApp: !!webApp,
      platform: (webApp as any)?.platform,
      version: (webApp as any)?.version,

      // Init Data
      hasInitData: !!initData,
      initDataLength: initData?.length || 0,
      initDataPreview: initData?.substring(0, 100),

      // User
      hasTelegramUser: !!telegramUser,
      telegramUserId: telegramUser?.id,
      telegramUserName: telegramUser?.first_name,

      // Start Param (КРИТИЧНО!)
      startParam: startParam,
      startParamFromInitDataUnsafe: (webApp as any)?.initDataUnsafe?.start_param,

      // Проверяем initData напрямую
      startParamFromInitData: initData ? new URLSearchParams(initData).get('start_param') : null,

      // URL параметры
      urlSearchParams: window.location.search,
      urlHashParams: window.location.hash,

      // localStorage
      hasAuthCache: !!localStorage.getItem('auth-storage'),
      authCachePreview: localStorage.getItem('auth-storage')?.substring(0, 200)
    }

    setDebugInfo(info)
  }, [])

  const testEdgeFunction = async () => {
    setIsLoading(true)
    const initData = getInitData()
    const startParam = getStartParam()

    try {
      const { data, error } = await supabase.functions.invoke('auth-telegram', {
        body: { initData, startParam }
      })

      setEdgeFunctionResult({ data, error: error?.message })
    } catch (e: any) {
      setEdgeFunctionResult({ error: e.message })
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">🔍 Referral Debug</h1>

        {debugInfo && (
          <div className="space-y-4">
            {/* Start Param - САМОЕ ВАЖНОЕ */}
            <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
              <h2 className="text-xl font-bold mb-2 text-red-300">❗ Start Param (КРИТИЧНО)</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">getStartParam():</span>
                  <span className="ml-2 font-mono text-yellow-300">
                    {debugInfo.startParam || 'NULL ❌'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">initDataUnsafe.start_param:</span>
                  <span className="ml-2 font-mono text-yellow-300">
                    {debugInfo.startParamFromInitDataUnsafe || 'NULL ❌'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">initData parse (start_param):</span>
                  <span className="ml-2 font-mono text-yellow-300">
                    {debugInfo.startParamFromInitData || 'NULL ❌'}
                  </span>
                </div>
              </div>
            </div>

            {/* Telegram WebApp */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-bold mb-2">Telegram WebApp</h2>
              <div className="space-y-1 text-sm">
                <div>hasWebApp: {debugInfo.hasWebApp ? '✅' : '❌'}</div>
                <div>platform: {debugInfo.platform || 'N/A'}</div>
                <div>version: {debugInfo.version || 'N/A'}</div>
              </div>
            </div>

            {/* Init Data */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-bold mb-2">Init Data</h2>
              <div className="space-y-1 text-sm">
                <div>hasInitData: {debugInfo.hasInitData ? '✅' : '❌'}</div>
                <div>length: {debugInfo.initDataLength}</div>
                <div className="text-xs text-gray-400 break-all">
                  preview: {debugInfo.initDataPreview}
                </div>
              </div>
            </div>

            {/* User */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-bold mb-2">User</h2>
              <div className="space-y-1 text-sm">
                <div>hasTelegramUser: {debugInfo.hasTelegramUser ? '✅' : '❌'}</div>
                <div>telegram_id: {debugInfo.telegramUserId || 'N/A'}</div>
                <div>first_name: {debugInfo.telegramUserName || 'N/A'}</div>
              </div>
            </div>

            {/* URL */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-bold mb-2">URL</h2>
              <div className="space-y-1 text-sm break-all">
                <div>search: {debugInfo.urlSearchParams || 'N/A'}</div>
                <div>hash: {debugInfo.urlHashParams || 'N/A'}</div>
              </div>
            </div>

            {/* localStorage Cache */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-bold mb-2">localStorage Cache</h2>
              <div className="space-y-1 text-sm">
                <div>hasAuthCache: {debugInfo.hasAuthCache ? '✅' : '❌'}</div>
                <div className="text-xs text-gray-400 break-all">
                  preview: {debugInfo.authCachePreview || 'N/A'}
                </div>
              </div>
            </div>

            {/* Test Edge Function */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-bold mb-2">Test Edge Function</h2>
              <button
                onClick={testEdgeFunction}
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold"
              >
                {isLoading ? 'Loading...' : 'Вызвать Edge Function'}
              </button>
              {edgeFunctionResult && (
                <div className="mt-4 p-3 bg-gray-900 rounded text-xs font-mono break-all">
                  <pre>{JSON.stringify(edgeFunctionResult, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
