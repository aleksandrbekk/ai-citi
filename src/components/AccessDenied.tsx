export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-6">
      <div className="text-center glass-card p-8">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Доступ закрыт</h1>
        <p className="text-gray-500">У вас нет доступа к платформе.</p>
        <p className="text-gray-400 text-sm mt-4">Обратитесь к администратору для получения доступа.</p>
      </div>
    </div>
  )
}
