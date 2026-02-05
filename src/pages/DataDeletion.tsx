export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-white px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Удаление данных пользователей</h1>
      <p className="text-sm text-gray-500 mb-6">Последнее обновление: 5 февраля 2026 г.</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Как удалить свои данные</h2>
          <p>
            Вы можете запросить полное удаление всех ваших персональных данных из сервиса <strong>AI CITI</strong>.
            После удаления восстановление данных будет невозможно.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Способы запроса удаления</h2>

          <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Способ 1: По электронной почте</h3>
              <p className="mt-1">
                Отправьте запрос на удаление данных на адрес{' '}
                <a href="mailto:aleksandrbekk@bk.ru" className="text-orange-500 underline">aleksandrbekk@bk.ru</a>
              </p>
              <p className="mt-1 text-sm text-gray-500">
                В письме укажите ваш Telegram ID или username для идентификации аккаунта.
              </p>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-semibold text-gray-900">Способ 2: Через Telegram-бота</h3>
              <p className="mt-1">
                Напишите команду в бот{' '}
                <a href="https://t.me/Neirociti_bot" className="text-orange-500 underline">@Neirociti_bot</a>{' '}
                с просьбой удалить ваши данные.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Какие данные удаляются</h2>
          <p>При запросе на удаление будут удалены:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Профиль пользователя и персональные данные</li>
            <li>История генераций и созданный контент</li>
            <li>Данные о покупках и подписках</li>
            <li>Баланс нейронов (внутренней валюты)</li>
            <li>Все связанные записи в базе данных</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Сроки обработки</h2>
          <p>
            Запрос на удаление данных обрабатывается в течение <strong>30 дней</strong> с момента получения.
            Вы получите подтверждение удаления по указанному каналу связи.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Данные, которые могут быть сохранены</h2>
          <p>
            В соответствии с законодательством, мы можем сохранить некоторые данные после удаления аккаунта:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Записи о финансовых транзакциях (для бухгалтерского учёта)</li>
            <li>Данные, необходимые для исполнения юридических обязательств</li>
          </ul>
          <p className="mt-2">
            Такие данные хранятся в обезличенном виде и не могут быть использованы для идентификации Пользователя.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Контакты</h2>
          <p>По вопросам удаления данных:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Email: <a href="mailto:aleksandrbekk@bk.ru" className="text-orange-500 underline">aleksandrbekk@bk.ru</a></li>
            <li>Telegram: <a href="https://t.me/Neirociti_bot" className="text-orange-500 underline">@Neirociti_bot</a></li>
          </ul>
        </section>
      </div>
    </div>
  )
}
