import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SectionCard } from "@karaoke/ui";
import { DEFAULT_UI_LABELS, type GlobalSettings } from "@karaoke/contracts";
import { api } from "../../shared/api/client";

type TextField = {
  key: string;
  label: string;
  hint: string;
};

type CopyTab = "interface" | "telegram" | "rules";

const interfaceGroups: Array<{ id: string; title: string; description: string; fields: TextField[] }> = [
  {
    id: "header",
    title: "Шапка и навигация",
    description: "Название площадки и пункты меню в верхней части панели.",
    fields: [
      { key: "brand.eyebrow", label: "Подзаголовок бренда", hint: "Строка над названием площадки" },
      { key: "brand.title", label: "Название площадки", hint: "Главный заголовок в шапке" },
      { key: "nav.queue", label: "Меню: очередь", hint: "Пункт меню с рабочей очередью" },
      { key: "nav.archive", label: "Меню: архив", hint: "Пункт меню с историей смены" },
      { key: "nav.settings", label: "Меню: настройки", hint: "Пункт меню с настройками" },
      { key: "nav.logout", label: "Кнопка выхода", hint: "Кнопка завершения работы в панели" }
    ]
  },
  {
    id: "queue",
    title: "Страница очереди",
    description: "Заголовки, кнопки, поиск, таблица и действия ведущего.",
    fields: [
      { key: "queue.shiftActive", label: "Статус активной смены", hint: "Например: «Смена идёт»" },
      { key: "queue.shiftInactive", label: "Статус закрытой смены", hint: "Когда очередь не принимает заявки" },
      { key: "queue.inQueue", label: "Подпись счётчика очереди", hint: "Над числом заявок" },
      { key: "queue.nextSong", label: "Главная кнопка вызова", hint: "Когда ведущий вызывает следующую песню" },
      { key: "queue.nextSongPending", label: "Главная кнопка в процессе", hint: "Показывается во время вызова" },
      { key: "queue.undo", label: "Отмена последнего действия", hint: "Кнопка рядом с вызовом" },
      { key: "queue.undoPending", label: "Отмена в процессе", hint: "Показывается во время отмены" },
      { key: "queue.searchTitle", label: "Заголовок блока поиска", hint: "Карточка справа от очереди" },
      { key: "queue.searchLabel", label: "Подпись поля поиска", hint: "Над строкой поиска" },
      { key: "queue.searchPlaceholder", label: "Подсказка поиска", hint: "Текст внутри пустого поля" },
      { key: "queue.clearSearch", label: "Сброс поиска", hint: "Кнопка при активном поиске" },
      { key: "queue.tableRequest", label: "Столбец: заявка", hint: "Заголовок таблицы" },
      { key: "queue.tableGuest", label: "Столбец: гость", hint: "Заголовок таблицы" },
      { key: "queue.tableSung", label: "Столбец: исполнил", hint: "Заголовок таблицы" },
      { key: "queue.tableWait", label: "Столбец: ожидание", hint: "Заголовок таблицы" },
      { key: "queue.emptyTitle", label: "Пустая очередь: заголовок", hint: "Когда заявок нет" },
      { key: "queue.emptySubtitle", label: "Пустая очередь: подзаголовок", hint: "Пояснение под заголовком" },
      { key: "queue.receivedAt", label: "Время поступления", hint: "Используйте {{time}} для времени заявки" },
      { key: "queue.manualSource", label: "Заявка добавлена вручную", hint: "Под именем гостя" },
      { key: "queue.dragTitle", label: "Подсказка перетаскивания", hint: "Текст на кнопке изменения порядка" },
      { key: "queue.actionsLabel", label: "Другие действия", hint: "Подсказка кнопки меню строки" },
      { key: "queue.actionCall", label: "Действие: вызвать вне очереди", hint: "В меню заявки" },
      { key: "queue.actionEdit", label: "Действие: редактировать", hint: "В меню заявки" },
      { key: "queue.actionCopy", label: "Действие: копировать", hint: "Используйте {{request}} для текста заявки" },
      { key: "queue.actionDefer", label: "Действие: отложить", hint: "В меню заявки" },
      { key: "queue.actionMove", label: "Действие: переместить", hint: "В меню заявки" },
      { key: "queue.actionNoShow", label: "Действие: не дошёл", hint: "В меню заявки" },
      { key: "queue.copySuccess", label: "Успешное копирование заявки", hint: "Используйте {{request}} для скопированного текста" },
      { key: "queue.copyError", label: "Ошибка копирования", hint: "Если браузер не дал доступ к буферу" },
      { key: "queue.requestUpdated", label: "Заявка обновлена", hint: "Подтверждение после редактирования" },
      { key: "queue.movePrompt", label: "Вопрос о новой позиции", hint: "Заголовок окна перемещения" },
      { key: "queue.moveInvalid", label: "Некорректная позиция", hint: "Ошибка в окне перемещения" },
      { key: "queue.noShowConfirm", label: "Подтверждение «не дошёл»", hint: "Используйте {{guest}} для имени гостя" },
      { key: "queue.closeConfirm", label: "Подтверждение закрытия смены", hint: "Окно перед закрытием" },
      { key: "queue.editEmpty", label: "Пустая заявка", hint: "Подсказка в строке без текста" },
      { key: "queue.editSave", label: "Сохранить изменения", hint: "Подсказка кнопки сохранения" },
      { key: "queue.editCancel", label: "Отменить изменения", hint: "Подсказка кнопки отмены" },
      { key: "queue.editStart", label: "Редактировать заявку", hint: "Подсказка кнопки редактирования" }
    ]
  },
  {
    id: "sidebar",
    title: "Админка и смена",
    description: "Боковые карточки ведущего, ручное добавление и управление сменой.",
    fields: [
      { key: "queue.addTitle", label: "Заголовок ручной заявки", hint: "Карточка добавления справа" },
      { key: "queue.addGuestLabel", label: "Ручная заявка: гость", hint: "Подпись поля" },
      { key: "queue.addGuestPlaceholder", label: "Ручная заявка: пример гостя", hint: "Подсказка в поле" },
      { key: "queue.addRequestLabel", label: "Ручная заявка: заявка", hint: "Подпись поля" },
      { key: "queue.addRequestPlaceholder", label: "Ручная заявка: пример песни", hint: "Подсказка в поле" },
      { key: "queue.addSubmit", label: "Ручная заявка: кнопка", hint: "Кнопка отправки" },
      { key: "queue.addSubmitPending", label: "Ручная заявка: процесс", hint: "Показывается при добавлении" },
      { key: "session.title", label: "Заголовок карточки смены", hint: "Карточка статуса справа" },
      { key: "session.statusLabel", label: "Смена: статус", hint: "Подпись строки статуса" },
      { key: "session.statusActive", label: "Смена: активна", hint: "Значение статуса" },
      { key: "session.nameLabel", label: "Смена: название", hint: "Подпись названия" },
      { key: "session.openedLabel", label: "Смена: открыта", hint: "Подпись времени начала" },
      { key: "session.autoQueueLabel", label: "Смена: автоочередь", hint: "Подпись режима очереди" },
      { key: "session.autoQueueManual", label: "Смена: ручные правки", hint: "Статус ручного порядка" },
      { key: "session.autoQueueOn", label: "Смена: автоочередь включена", hint: "Статус автоматического порядка" },
      { key: "session.sungLabel", label: "Смена: исполнено", hint: "Подпись счётчика" },
      { key: "session.closed", label: "Смена: не открыта", hint: "Статус закрытой смены" },
      { key: "session.namePlaceholder", label: "Новая смена: пример названия", hint: "Подсказка в поле" },
      { key: "session.open", label: "Открыть смену", hint: "Кнопка запуска" },
      { key: "session.openPending", label: "Открытие смены: процесс", hint: "Показывается во время запуска" },
      { key: "session.closeTitle", label: "Заголовок закрытия смены", hint: "Нижняя карточка справа" },
      { key: "session.close", label: "Закрыть смену", hint: "Кнопка закрытия" },
      { key: "session.closePending", label: "Закрытие смены: процесс", hint: "Показывается во время закрытия" }
    ]
  },
  {
    id: "archive",
    title: "Архив и статистика",
    description: "Подписи на странице истории смены.",
    fields: [
      { key: "archive.title", label: "Заголовок архива", hint: "Страница «Архив»" },
      { key: "archive.empty", label: "Пустой архив", hint: "Когда в смене ещё нет завершённых заявок" },
      { key: "archive.requestedAt", label: "Время заявки в архиве", hint: "Используйте {{time}}" },
      { key: "archive.wait", label: "Ожидание в архиве", hint: "Используйте {{duration}}" },
      { key: "archive.statusSung", label: "Архив: исполнено", hint: "Статус завершённой заявки" },
      { key: "archive.statusCancelledByHost", label: "Архив: отменено ведущим", hint: "Статус завершённой заявки" },
      { key: "archive.statusLeftVenue", label: "Архив: гость ушёл", hint: "Статус завершённой заявки" },
      { key: "archive.statusUndone", label: "Архив: отмена через возврат", hint: "Статус завершённой заявки" },
      { key: "archive.statusCancelled", label: "Архив: отменено", hint: "Статус завершённой заявки" },
      { key: "archive.statusDone", label: "Архив: завершено", hint: "Запасной статус" },
      { key: "stats.title", label: "Заголовок статистики", hint: "Правая колонка страницы архива" },
      { key: "stats.requests", label: "Статистика: заявки", hint: "Подпись показателя" },
      { key: "stats.sung", label: "Статистика: исполнено", hint: "Подпись показателя" },
      { key: "stats.cancelled", label: "Статистика: не дошли", hint: "Подпись показателя" },
      { key: "stats.averageWait", label: "Статистика: ожидание", hint: "Подпись показателя" },
      { key: "stats.averageWaitValue", label: "Статистика: значение ожидания", hint: "Используйте {{minutes}}" },
      { key: "stats.topSingers", label: "Статистика: лидеры", hint: "Заголовок списка гостей" },
      { key: "stats.singerSummary", label: "Статистика: строка гостя", hint: "Используйте {{sung}} и {{requests}}" },
      { key: "stats.empty", label: "Пустая статистика", hint: "Когда ещё не было исполнений" }
    ]
  },
  {
    id: "public",
    title: "Публичная очередь",
    description: "Тексты, которые видят гости по ссылке на очередь.",
    fields: [
      { key: "public.priorityNotice", label: "Пояснение о порядке", hint: "Показывается над очередью и в карточке гостя" },
      { key: "public.errorNotice", label: "Ошибка загрузки", hint: "Когда публичная очередь недоступна" },
      { key: "public.currentPosition", label: "Текущая позиция", hint: "Вместо номера для выступающей заявки" },
      { key: "public.viewerRequest", label: "Заявка гостя", hint: "Запасная подпись в персональном просмотре" },
      { key: "public.viewerTitle", label: "Заголовок персональной карточки", hint: "Для гостя по персональной ссылке" },
      { key: "public.forecastCurrent", label: "Прогноз: сейчас", hint: "Используйте {{forecast}}" },
      { key: "public.forecastEstimated", label: "Прогноз: примерно", hint: "Используйте {{forecast}}" },
      { key: "public.tableRequest", label: "Столбец заявки", hint: "Заголовок публичной таблицы" },
      { key: "public.emptyTitle", label: "Пустая очередь: заголовок", hint: "Когда заявок нет" },
      { key: "public.emptySubtitle", label: "Пустая очередь: подзаголовок", hint: "Пояснение под заголовком" },
      { key: "public.count", label: "Счётчик заявок", hint: "Используйте {{count}}" }
    ]
  }
];

const botReplyFields: Array<{ key: keyof GlobalSettings["botReplyTemplates"]; label: string; hint?: string }> = [
  { key: "startMessage", label: "Сообщение на /start" },
  { key: "unknownCommand", label: "Ответ на неизвестную команду" },
  { key: "emptyMessage", label: "Ответ на пустое сообщение" },
  { key: "requestAccepted", label: "Текст при успешной заявке" },
  { key: "requestRejectedRateLimit", label: "Текст при антиспаме" },
  { key: "requestRejectedNoSession", label: "Текст при закрытом приёме заявок" },
  { key: "statusCurrentPerformer", label: "Статус: пользователь уже у сцены" },
  { key: "statusNoGuestProfile", label: "Статус: у пользователя ещё не было заявок" },
  { key: "statusNoActiveRequests", label: "Статус: в активной смене заявок нет" },
  { key: "statusQueuedSummary", label: "Статус: заявка в очереди", hint: "Доступны {{title}} и {{position}}" },
  { key: "fallbackPositionUnavailable", label: "Fallback: не удалось показать позицию" },
  { key: "fallbackRequestSaveFailed", label: "Fallback: не удалось сохранить заявку" },
  { key: "fallbackStatusNoRequests", label: "Fallback: в очереди нет заявок" },
  { key: "fallbackStatusNoActiveRequests", label: "Fallback: у пользователя нет активных заявок" },
  { key: "fallbackStatusQueuedSummary", label: "Fallback: успешная заявка", hint: "Доступна переменная {{queue_tail}}" },
  { key: "fallbackStatusQueuedNoAhead", label: "Fallback: перед пользователем никого нет" },
  { key: "fallbackStatusQueuedAheadTemplate", label: "Fallback: перед пользователем есть очередь", hint: "Доступна переменная {{before}}" },
  { key: "telegramStatusButtonText", label: "Текст кнопки статуса" },
  { key: "telegramViewQueueButtonText", label: "Текст кнопки просмотра очереди" },
  { key: "telegramCancelButtonText", label: "Текст кнопки отмены заявки" },
  { key: "telegramCancelConfirmButtonText", label: "Текст кнопки подтверждения отмены" },
  { key: "telegramCancelAbortButtonText", label: "Текст кнопки отмены действия" },
  { key: "telegramViewQueueReplyTemplate", label: "Шаблон ответа «посмотреть очередь»" },
  { key: "telegramCancelConfirmationMessage", label: "Подтверждение отмены заявки" },
  { key: "telegramCancelAbortMessage", label: "Сообщение об отмене действия" },
  { key: "telegramNextSongNotification", label: "Уведомление о вызове следующей песни" }
];

function valuesChanged(left: Record<string, string>, right: Record<string, string>) {
  return Object.keys(left).some((key) => left[key] !== right[key]);
}

const publicAppearanceFields: Array<{ key: keyof GlobalSettings["publicQueueAppearance"]; label: string; hint: string }> = [
  { key: "backgroundColor", label: "Фон страницы", hint: "Пространство вокруг карточек" },
  { key: "surfaceColor", label: "Фон карточек", hint: "Карточка гостя и выделенная строка" },
  { key: "accentColor", label: "Акцент", hint: "Номер, выделение и важные элементы" },
  { key: "textColor", label: "Основной текст", hint: "Заголовки и названия песен" }
];

export function SettingsPanel({
  settings,
  canEdit,
  channelSlug
}: {
  settings: GlobalSettings;
  canEdit: boolean;
  channelSlug: string;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(settings);
  const [tab, setTab] = useState<CopyTab>("interface");
  const [activeGroup, setActiveGroup] = useState(interfaceGroups[0]?.id ?? "header");
  const [search, setSearch] = useState("");

  useEffect(() => setDraft(settings), [settings]);

  const mutation = useMutation({
    mutationFn: (payload: Partial<GlobalSettings>) => api.updateSettings(payload, channelSlug),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["settings", "global", channelSlug] })
  });

  const visibleGroups = useMemo(() => interfaceGroups.map((group) => ({
    ...group,
    fields: group.fields.filter((field) => `${field.label} ${field.hint} ${field.key}`.toLowerCase().includes(search.trim().toLowerCase()))
  })).filter((group) => group.fields.length), [search]);
  const selectedGroup = visibleGroups.find((group) => group.id === activeGroup) ?? visibleGroups[0];
  const textChanges = valuesChanged(draft.uiLabels, settings.uiLabels);
  const botChanges = valuesChanged(draft.botReplyTemplates, settings.botReplyTemplates);
  const appearanceChanged = publicAppearanceFields.some(
    ({ key }) => draft.publicQueueAppearance[key] !== settings.publicQueueAppearance[key]
  );
  const rulesChanged = draft.antiSpamSeconds !== settings.antiSpamSeconds || draft.skipDownPositions !== settings.skipDownPositions ||
    Object.keys(draft.queuePolicyFlags).some((key) => draft.queuePolicyFlags[key as keyof GlobalSettings["queuePolicyFlags"]] !== settings.queuePolicyFlags[key as keyof GlobalSettings["queuePolicyFlags"]]);
  const hasChanges = textChanges || botChanges || appearanceChanged || rulesChanged;

  function save() {
    mutation.mutate({
      ...(textChanges ? { uiLabels: draft.uiLabels } : {}),
      ...(botChanges ? { botReplyTemplates: draft.botReplyTemplates } : {}),
      ...(appearanceChanged ? { publicQueueAppearance: draft.publicQueueAppearance } : {}),
      ...(rulesChanged ? {
        antiSpamSeconds: draft.antiSpamSeconds,
        skipDownPositions: draft.skipDownPositions,
        queuePolicyFlags: draft.queuePolicyFlags
      } : {})
    });
  }

  function updateLabel(key: string, value: string) {
    setDraft((current) => ({ ...current, uiLabels: { ...current.uiLabels, [key]: value } }));
  }

  function updatePublicAppearance(
    key: keyof GlobalSettings["publicQueueAppearance"],
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      publicQueueAppearance: { ...current.publicQueueAppearance, [key]: value }
    }));
  }

  return (
    <SectionCard title="Настройки">
      <div className="settings-editor">
        <div className="settings-editor__intro">
          <div>
            <span className="eyebrow">Контент-панель</span>
            <h3>Тексты интерфейса и Telegram</h3>
            <p>Меняйте подписи без правок в коде. Изменения сразу попадут на соответствующие экраны после сохранения.</p>
          </div>
          <div className={hasChanges ? "settings-editor__counter settings-editor__counter--dirty" : "settings-editor__counter"}>
            {hasChanges ? "Есть несохранённые изменения" : "Все изменения сохранены"}
          </div>
        </div>

        <div className="settings-editor__tabs" role="tablist" aria-label="Раздел настроек">
          <button type="button" className={tab === "interface" ? "settings-editor__tab settings-editor__tab--active" : "settings-editor__tab"} onClick={() => setTab("interface")}>Интерфейс</button>
          <button type="button" className={tab === "telegram" ? "settings-editor__tab settings-editor__tab--active" : "settings-editor__tab"} onClick={() => setTab("telegram")}>Telegram</button>
          <button type="button" className={tab === "rules" ? "settings-editor__tab settings-editor__tab--active" : "settings-editor__tab"} onClick={() => setTab("rules")}>Правила очереди</button>
        </div>

        {tab === "interface" ? (
          <div className="settings-copy-editor">
            <aside className="settings-copy-editor__sidebar">
              <label className="settings-search">
                <span>Найти текст</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Например: очередь, кнопка, архив" />
              </label>
              <div className="settings-copy-editor__groups" role="tablist" aria-label="Экран интерфейса">
                {visibleGroups.map((group) => (
                  <button key={group.id} type="button" className={selectedGroup?.id === group.id ? "settings-group-button settings-group-button--active" : "settings-group-button"} onClick={() => setActiveGroup(group.id)}>
                    <span>{group.title}</span><small>{group.fields.length}</small>
                  </button>
                ))}
              </div>
            </aside>
            <section className="settings-copy-editor__content">
              {selectedGroup ? <>
                <div className="settings-copy-editor__heading"><div><h3>{selectedGroup.title}</h3><p>{selectedGroup.description}</p></div><span>{selectedGroup.fields.length} текстов</span></div>
                {selectedGroup.id === "public" ? (
                  <section className="settings-appearance-card">
                    <div>
                      <span className="eyebrow">Внешний вид</span>
                      <h4>Оформление публичной очереди</h4>
                      <p>Изменения видны гостям по ссылке на очередь после сохранения.</p>
                    </div>
                    <div className="settings-appearance-grid">
                      {publicAppearanceFields.map(({ key, label, hint }) => (
                        <label className="settings-color-field" key={key}>
                          <span><strong>{label}</strong><small>{hint}</small></span>
                          <span className="settings-color-field__control">
                            <input type="color" value={draft.publicQueueAppearance[key]} disabled={!canEdit} onChange={(event) => updatePublicAppearance(key, event.target.value)} />
                            <input value={draft.publicQueueAppearance[key]} disabled={!canEdit} onChange={(event) => updatePublicAppearance(key, event.target.value)} aria-label={label} />
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>
                ) : null}
                <div className="settings-text-list">
                  {selectedGroup.fields.map((field) => (
                    <label className="settings-text-card" key={field.key}>
                      <span className="settings-text-card__top"><span><strong>{field.label}</strong><small>{field.hint}</small></span><button type="button" onClick={() => updateLabel(field.key, DEFAULT_UI_LABELS[field.key] ?? "")} disabled={!canEdit || draft.uiLabels[field.key] === (DEFAULT_UI_LABELS[field.key] ?? "")}>Сбросить</button></span>
                      <textarea value={draft.uiLabels[field.key] ?? DEFAULT_UI_LABELS[field.key] ?? ""} onChange={(event) => updateLabel(field.key, event.target.value)} disabled={!canEdit} rows={2} />
                    </label>
                  ))}
                </div>
              </> : <div className="empty-state">По этому запросу текстов не найдено.</div>}
            </section>
          </div>
        ) : null}

        {tab === "telegram" ? <div className="settings-text-list">
          <div className="settings-copy-editor__heading"><div><h3>Сообщения бота</h3><p>Шаблоны, которые получает гость в Telegram. Не меняйте переменные в двойных фигурных скобках.</p></div><span>{botReplyFields.length} текстов</span></div>
          {botReplyFields.map(({ key, label, hint }) => <label className="settings-text-card" key={key}><span><strong>{label}</strong>{hint ? <small>{hint}</small> : null}</span><textarea value={draft.botReplyTemplates[key]} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, botReplyTemplates: { ...current.botReplyTemplates, [key]: event.target.value } }))} rows={3} /></label>)}
        </div> : null}

        {tab === "rules" ? <div className="settings-rules">
          <div className="settings-copy-editor__heading"><div><h3>Логика очереди</h3><p>Эти настройки влияют на порядок заявок, а не на тексты интерфейса.</p></div></div>
          <div className="settings-rules__grid">
            <label className="field"><span>Антиспам, сек</span><input type="number" value={draft.antiSpamSeconds} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, antiSpamSeconds: Number(event.target.value) }))} /></label>
            <label className="field"><span>Перенос отложенной заявки, позиций</span><input type="number" value={draft.skipDownPositions} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, skipDownPositions: Number(event.target.value) }))} /></label>
          </div>
          <div className="settings-rules__checks">
            {([
              ["prioritizeFirstTimeSinger", "Приоритет тем, кто ещё не пел"],
              ["prioritizeLowerSungCount", "Приоритет по меньшему количеству исполнений"],
              ["prioritizeRequestTime", "Учитывать время поступления заявки"]
            ] as const).map(([key, label]) => <label className="settings-rule-check" key={key}><input type="checkbox" checked={draft.queuePolicyFlags[key]} disabled={!canEdit} onChange={(event) => setDraft((current) => ({ ...current, queuePolicyFlags: { ...current.queuePolicyFlags, [key]: event.target.checked } }))} /><span>{label}</span></label>)}
          </div>
        </div> : null}

        <div className="settings-editor__footer">
          <span>{canEdit ? "Сохраняются только изменённые блоки." : "Изменять настройки может только владелец."}</span>
          <button className="primary-button" type="button" onClick={save} disabled={!canEdit || mutation.isPending || !hasChanges}>{mutation.isPending ? "Сохраняем…" : "Сохранить изменения"}</button>
        </div>
      </div>
    </SectionCard>
  );
}
