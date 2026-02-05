export default function Terms() {
  return (
    <div className="min-h-screen bg-white px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Пользовательское соглашение</h1>
      <p className="text-sm text-gray-500 mb-6">Последнее обновление: 5 февраля 2026 г.</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Общие положения</h2>
          <p>
            Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между
            сервисом <strong>AI CITI</strong> (далее — «Сервис», «мы») и пользователем (далее — «Пользователь», «вы»),
            возникающие в связи с использованием Сервиса.
          </p>
          <p className="mt-2">
            Используя Сервис, вы подтверждаете, что ознакомились с настоящим Соглашением и принимаете его условия.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Описание Сервиса</h2>
          <p>
            AI CITI — это Telegram Mini App, предоставляющий инструменты на основе искусственного интеллекта
            для создания контента, включая:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Генерацию каруселей для социальных сетей</li>
            <li>Планирование и публикацию постов в Instagram</li>
            <li>AI-ассистентов для создания контента</li>
            <li>Обучающие материалы и квизы</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Регистрация и аккаунт</h2>
          <p>
            Регистрация осуществляется автоматически через Telegram.
            Пользователь несёт ответственность за все действия, совершённые в рамках его аккаунта.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Нейроны (внутренняя валюта)</h2>
          <p>Сервис использует внутреннюю валюту — нейроны. Условия использования:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Нейроны приобретаются за реальные деньги через платёжные системы</li>
            <li>Нейроны расходуются при использовании AI-инструментов</li>
            <li>Нейроны не подлежат обмену обратно на денежные средства</li>
            <li>Неиспользованные нейроны не сгорают</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Подписки</h2>
          <p>Сервис предоставляет подписки с ежемесячным автосписанием:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Подписка продлевается автоматически каждые 30 дней</li>
            <li>Отмена подписки возможна в любой момент</li>
            <li>При отмене подписка действует до конца оплаченного периода</li>
            <li>Возврат средств за текущий период не осуществляется</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Платежи и возвраты</h2>
          <p>
            Оплата производится через платёжную систему Lava.top.
            Принимаются карты Visa, Mastercard, МИР.
          </p>
          <p className="mt-2">
            Возврат средств возможен в случае технической ошибки при обработке платежа.
            Для запроса возврата свяжитесь с нами по электронной почте.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Интеллектуальная собственность</h2>
          <p>
            Контент, созданный Пользователем с помощью Сервиса, принадлежит Пользователю.
            Сервис и его исходный код, дизайн, логотипы являются интеллектуальной собственностью AI CITI.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Ограничения использования</h2>
          <p>Пользователю запрещено:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Использовать Сервис для создания незаконного или вредоносного контента</li>
            <li>Пытаться получить несанкционированный доступ к системам Сервиса</li>
            <li>Нарушать работу Сервиса или его инфраструктуры</li>
            <li>Передавать доступ к аккаунту третьим лицам</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Ограничение ответственности</h2>
          <p>
            Сервис предоставляется «как есть». Мы не гарантируем бесперебойную работу Сервиса
            и не несём ответственности за убытки, возникшие в связи с использованием или невозможностью
            использования Сервиса.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Изменения соглашения</h2>
          <p>
            Мы оставляем за собой право изменять условия настоящего Соглашения.
            Актуальная версия всегда доступна по адресу{' '}
            <a href="https://aiciti.pro/terms" className="text-orange-500 underline">aiciti.pro/terms</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Контакты</h2>
          <p>По вопросам, связанным с настоящим Соглашением:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Email: <a href="mailto:aleksandrbekk@bk.ru" className="text-orange-500 underline">aleksandrbekk@bk.ru</a></li>
            <li>Telegram: <a href="https://t.me/Neirociti_bot" className="text-orange-500 underline">@Neirociti_bot</a></li>
          </ul>
        </section>
      </div>
    </div>
  )
}
