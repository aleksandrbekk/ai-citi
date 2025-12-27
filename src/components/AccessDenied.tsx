export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-white mb-2">Доступ закрыт</h1>
        <p className="text-zinc-400">У вас нет доступа к платформе.</p>
        <p className="text-zinc-500 text-sm mt-4">Обратитесь к администратору для получения доступа.</p>
      </div>
    </div>
  )
}


