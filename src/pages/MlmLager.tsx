export default function MlmLager() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-[#FFF8F5]">
      <div className="max-w-2xl mx-auto px-5 py-10">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg mb-4">
            <span className="text-2xl text-white">📋</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Пользовательское соглашение</h1>
          <p className="text-sm text-gray-400 mt-2">Последнее обновление: 12 февраля 2026 г.</p>
        </div>

        {/* Вступление */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
          <p className="text-gray-700 leading-relaxed">
            Приобретая курс <strong className="text-gray-900">МЛМ ЛАГЕРЬ</strong> (далее — «Курс»),
            Вы соглашаетесь со следующими условиями.
          </p>
        </div>

        {/* Ученикам запрещено */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <span className="text-lg">🚫</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Ученикам курса запрещено</h2>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-sm font-semibold text-red-400 mt-0.5 shrink-0">1.</span>
              <p className="text-sm text-gray-700 leading-relaxed">
                Заниматься агитацией / рекрутингом в свои проекты, компании среди участников курса,
                в общем чате курса, а также в личных сообщениях.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-sm font-semibold text-red-400 mt-0.5 shrink-0">2.</span>
              <p className="text-sm text-gray-700 leading-relaxed">
                Передавать свои логин и пароль третьим лицам, не являющимся слушателями курса.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-sm font-semibold text-red-400 mt-0.5 shrink-0">3.</span>
              <p className="text-sm text-gray-700 leading-relaxed">
                Скачивать материалы, уроки курса из личного кабинета и передавать их третьим лицам.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-sm font-semibold text-red-400 mt-0.5 shrink-0">4.</span>
              <p className="text-sm text-gray-700 leading-relaxed">
                Хамить, оскорблять и нецензурно выражаться по отношению к другим участникам курса.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-sm font-semibold text-red-400 mt-0.5 shrink-0">5.</span>
              <p className="text-sm text-gray-700 leading-relaxed">
                Все материалы школы защищены 4 ч. ГК РФ (гл. «Авторское право»). Вы можете сохранить
                файлы на своём устройстве для личного использования, но не имеете права распространять их.
                При попытке перепродажи материалов уроков ваш доступ к курсу будет{' '}
                <strong className="text-red-500">заблокирован без возврата платы за обучение</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Организатор обязуется */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
              <span className="text-lg">✅</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Организатор курса обязуется</h2>
          </div>

          <div className="space-y-5">
            {/* Пункт 1 — доступ и тарифы */}
            <div>
              <div className="flex gap-3 mb-3">
                <span className="text-sm font-semibold text-orange-500 mt-0.5 shrink-0">1.</span>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Сразу после подтверждения оплаты предоставить доступ к курсу и к полному перечню
                  уроков (в рамках конкретно купленного тарифа) на срок, установленный каждым тарифом:
                </p>
              </div>

              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium">Стандарт</span>
                  <span className="text-sm text-gray-700">4 месяца</span>
                </div>
                <div className="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">Платина</span>
                  <span className="text-sm text-gray-700">12 месяцев</span>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">VIP</span>
                    <span className="text-sm text-gray-700">Безлимитный доступ</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5 ml-0.5">
                    Ко всем материалам курса, которые будут добавлены на{' '}
                    <a
                      href="https://aiciti.pro"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 underline"
                    >
                      наш сайт
                    </a>
                    {' '}в течение года с момента покупки тарифа.
                  </p>
                </div>
              </div>

              <p className="ml-6 mt-3 text-xs text-gray-500 leading-relaxed">
                Данный пункт может прекратить своё действие только в случае полного закрытия курса{' '}
                <strong>МЛМ ЛАГЕРЬ</strong>.
              </p>
            </div>

            {/* Пункт 2 — возврат */}
            <div>
              <div className="flex gap-3 mb-2">
                <span className="text-sm font-semibold text-orange-500 mt-0.5 shrink-0">2.</span>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Вернуть участнику курса полную стоимость обучения, в случае если участник будет
                  недоволен качеством материала.
                </p>
              </div>
              <div className="ml-6 bg-cyan-50 border border-cyan-100 rounded-xl px-4 py-3">
                <p className="text-xs text-cyan-700 leading-relaxed">
                  <strong>Условия возврата:</strong> возврат возможен только в первые{' '}
                  <strong>24 часа</strong> после покупки курса, при условии, что участником открыто
                  не более трёх уроков, а также не активировано кураторство в первом модуле.
                </p>
                <p className="text-xs text-cyan-600 mt-2">
                  Возврат денежных средств производится в течение{' '}
                  <strong>14 календарных дней</strong> после запроса.
                </p>
              </div>
            </div>

            {/* Пункт 3 — проверка ДЗ */}
            <div>
              <div className="flex gap-3 mb-3">
                <span className="text-sm font-semibold text-orange-500 mt-0.5 shrink-0">3.</span>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Обеспечить проверку выполнения домашних заданий 2 раза в день на срок,
                  заявленный в каждом тарифе:
                </p>
              </div>

              <div className="ml-6 space-y-2">
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 font-medium">Стандарт</span>
                  <span className="text-sm text-gray-700">30 календарных дней</span>
                </div>
                <div className="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">Платина</span>
                  <span className="text-sm text-gray-700">90 календарных дней</span>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl px-4 py-2.5">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">VIP</span>
                  <span className="text-sm text-gray-700">180 календарных дней</span>
                </div>
              </div>

              <p className="ml-6 mt-3 text-xs text-gray-500 leading-relaxed">
                Консультации на тарифе <strong>Платина</strong> доступны в течение{' '}
                <strong>6 месяцев</strong> после покупки курса.
              </p>
            </div>

            {/* Пункт 4 — сертификат */}
            <div>
              <div className="flex gap-3">
                <span className="text-sm font-semibold text-orange-500 mt-0.5 shrink-0">4.</span>
                <div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Выдать Сертификат участнику курса при условии:
                  </p>
                  <div className="mt-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                    <p className="text-xs text-green-700 leading-relaxed">
                      🎓 Выполнения всех домашних заданий курса и сдачи выпускного экзамена.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Вступление в силу */}
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-5 shadow-sm mb-4">
          <p className="text-sm text-gray-700 leading-relaxed text-center">
            Данные правила вступают в силу с момента получения доступа к обучающему кабинету.
          </p>
        </div>

        {/* Контакты */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
              <span className="text-lg">📨</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Контакты</h2>
          </div>
          <div className="space-y-2 ml-1">
            <p className="text-sm text-gray-600">
              Email:{' '}
              <a href="mailto:aleksandrbekk@bk.ru" className="text-orange-500 underline">
                aleksandrbekk@bk.ru
              </a>
            </p>
            <p className="text-sm text-gray-600">
              Telegram:{' '}
              <a
                href="https://t.me/Neirociti_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-500 underline"
              >
                @Neirociti_bot
              </a>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 mb-4">
          © 2026 AI CITI. Все права защищены.
        </p>
      </div>
    </div>
  )
}
