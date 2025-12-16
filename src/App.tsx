import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function App() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            🏙️ AI CITI | НЕЙРОГОРОД
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-zinc-400 text-center">
            Проект успешно настроен!
          </p>
          <div className="flex gap-2 justify-center">
            <Button>Начать</Button>
            <Button variant="outline">Подробнее</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default App