export default function Privacy() {
  return (
    <div className="min-h-screen bg-white px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Политика конфиденциальности</h1>
      <p className="text-sm text-gray-500 mb-6">Последнее обновление: 5 февраля 2026 г.</p>

      <div className="space-y-6 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Общие положения</h2>
          <p>
            Настоящая Политика конфиденциальности описывает, как сервис <strong>AI CITI</strong> (далее — «Сервис», «мы»)
            собирает, использует, хранит и защищает персональные данные пользователей (далее — «Пользователь», «вы»).
          </p>
          <p className="mt-2">
            Используя Сервис, вы соглашаетесь с условиями настоящей Политики конфиденциальности.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Какие данные мы собираем</h2>
          <p>Мы можем собирать следующие данные:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Идентификатор Telegram (Telegram ID)</li>
            <li>Имя и фамилия из профиля Telegram</li>
            <li>Имя пользователя (username) Telegram</li>
            <li>Языковые настройки</li>
            <li>Данные об использовании Сервиса (генерации, покупки, подписки)</li>
            <li>Техническая информация (тип устройства, версия приложения)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Как мы используем данные</h2>
          <p>Собранные данные используются для:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Предоставления и улучшения функциональности Сервиса</li>
            <li>Идентификации Пользователя и управления аккаунтом</li>
            <li>Обработки платежей и управления подписками</li>
            <li>Отправки уведомлений, связанных с работой Сервиса</li>
            <li>Технической поддержки и обратной связи</li>
            <li>Аналитики и улучшения качества Сервиса</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Хранение и защита данных</h2>
          <p>
            Персональные данные хранятся на защищённых серверах с использованием шифрования.
            Мы принимаем организационные и технические меры для защиты данных от несанкционированного доступа,
            изменения, раскрытия или уничтожения.
          </p>
          <p className="mt-2">
            Данные хранятся в течение всего периода использования Сервиса и могут быть удалены по запросу Пользователя.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Передача данных третьим лицам</h2>
          <p>
            Мы не продаём и не передаём персональные данные третьим лицам, за исключением случаев:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Обработки платежей через платёжные системы (Lava.top)</li>
            <li>Требований законодательства Российской Федерации</li>
            <li>Защиты прав и безопасности Сервиса и его пользователей</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Интеграция с Instagram</h2>
          <p>
            Сервис может взаимодействовать с Instagram API для публикации контента от имени Пользователя.
            Мы запрашиваем только те разрешения, которые необходимы для работы функций Сервиса.
            Данные Instagram аккаунта не хранятся дольше, чем это необходимо для выполнения запрошенных операций.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Права пользователя</h2>
          <p>Вы имеете право:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Запросить информацию о хранящихся персональных данных</li>
            <li>Запросить исправление неточных данных</li>
            <li>Запросить удаление ваших данных</li>
            <li>Отозвать согласие на обработку данных</li>
          </ul>
          <p className="mt-2">
            Для реализации этих прав свяжитесь с нами по адресу: <a href="mailto:aleksandrbekk@bk.ru" className="text-orange-500 underline">aleksandrbekk@bk.ru</a>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Удаление данных</h2>
          <p>
            Вы можете запросить полное удаление ваших данных на странице{' '}
            <a href="/data-deletion" className="text-orange-500 underline">удаления данных</a> или
            связавшись с нами по электронной почте.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Изменения политики</h2>
          <p>
            Мы оставляем за собой право обновлять настоящую Политику конфиденциальности.
            Актуальная версия всегда доступна по адресу{' '}
            <a href="https://aiciti.pro/privacy" className="text-orange-500 underline">aiciti.pro/privacy</a>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Контакты</h2>
          <p>По вопросам обработки персональных данных:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Email: <a href="mailto:aleksandrbekk@bk.ru" className="text-orange-500 underline">aleksandrbekk@bk.ru</a></li>
            <li>Telegram: <a href="https://t.me/Neirociti_bot" className="text-orange-500 underline">@Neirociti_bot</a></li>
          </ul>
        </section>
      </div>
    </div>
  )
}
