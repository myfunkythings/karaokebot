export const staffRoles = ["owner", "host", "viewer"] as const;
export type StaffRole = (typeof staffRoles)[number];

export const sessionStatuses = ["draft", "active", "closed"] as const;
export type SessionStatus = (typeof sessionStatuses)[number];

export const songRequestStatuses = ["queued", "current", "sung", "cancelled"] as const;
export type SongRequestStatus = (typeof songRequestStatuses)[number];

export const songRequestOutcomes = [
  "sung",
  "cancelled_by_host",
  "left_venue",
  "undone"
] as const;
export type SongRequestOutcome = (typeof songRequestOutcomes)[number];

export const songRequestSources = ["telegram", "manual"] as const;
export type SongRequestSource = (typeof songRequestSources)[number];

export const orderModes = ["auto", "manual_pin"] as const;
export type OrderMode = (typeof orderModes)[number];

export const actorTypes = ["staff", "system", "telegram"] as const;
export type ActorType = (typeof actorTypes)[number];

export type QueuePolicyFlags = {
  prioritizeFirstTimeSinger: boolean;
  prioritizeLowerSungCount: boolean;
  prioritizeRequestTime: boolean;
};

export type BotReplyTemplates = {
  startMessage: string;
  unknownCommand: string;
  emptyMessage: string;
  requestAccepted: string;
  requestRejectedRateLimit: string;
  requestRejectedNoSession: string;
  statusCurrentPerformer: string;
  statusNoGuestProfile: string;
  statusNoActiveRequests: string;
  statusQueuedSummary: string;
  fallbackPositionUnavailable: string;
  fallbackRequestSaveFailed: string;
  fallbackStatusNoRequests: string;
  fallbackStatusNoActiveRequests: string;
  fallbackStatusQueuedSummary: string;
  fallbackStatusQueuedNoAhead: string;
  fallbackStatusQueuedAheadTemplate: string;
  telegramStatusButtonText: string;
  telegramViewQueueButtonText: string;
  telegramCancelButtonText: string;
  telegramCancelConfirmButtonText: string;
  telegramCancelAbortButtonText: string;
  telegramViewQueueReplyTemplate: string;
  telegramCancelConfirmationMessage: string;
  telegramCancelAbortMessage: string;
  telegramNextSongNotification: string;
};

export const DEFAULT_UI_LABELS: Record<string, string> = {
  "brand.eyebrow": "Пойте любые песни, кроме плохих",
  "brand.title": "MISHKA KARAOKE",
  "nav.queue": "Очередь",
  "nav.archive": "Архив",
  "nav.settings": "Настройки",
  "nav.logout": "Выйти",
  "queue.shiftActive": "Смена идёт",
  "queue.shiftInactive": "Смена не открыта",
  "queue.inQueue": "В очереди",
  "queue.nextSong": "Следующая песня",
  "queue.nextSongPending": "Вызываем…",
  "queue.undo": "Отменить последнее действие",
  "queue.undoPending": "Отменяем…",
  "queue.searchTitle": "Очередь",
  "queue.searchLabel": "Поиск",
  "queue.searchPlaceholder": "Заявка, гость или @telegram",
  "queue.clearSearch": "Сбросить поиск",
  "queue.tableRequest": "Заявка",
  "queue.tableGuest": "Гость",
  "queue.tableSung": "Спел",
  "queue.tableWait": "Ожидание",
  "queue.emptyTitle": "Очередь пока пуста",
  "queue.emptySubtitle": "Новые заявки появятся здесь",
  "queue.receivedAt": "Поступила в {{time}}",
  "queue.manualSource": "Добавлен вручную",
  "queue.dragTitle": "Перетащить в очереди",
  "queue.actionsLabel": "Другие действия",
  "queue.actionCall": "Вызвать вне очереди",
  "queue.actionEdit": "Редактировать",
  "queue.actionCopy": "Копировать «{{request}} караоке»",
  "queue.actionDefer": "Отложить",
  "queue.actionMove": "Переместить",
  "queue.actionNoShow": "Не дошёл",
  "queue.copySuccess": "Скопировано: {{request}}",
  "queue.copyError": "Не удалось скопировать заявку",
  "queue.requestUpdated": "Заявка обновлена",
  "queue.movePrompt": "Новая позиция в очереди",
  "queue.moveInvalid": "Введите корректный номер позиции.",
  "queue.noShowConfirm": "Отметить, что {{guest}} не дошёл(а), и снять будущие заявки?",
  "queue.closeConfirm": "Закрыть текущую смену? После этого новые заявки приниматься не будут.",
  "queue.editEmpty": "Пустая заявка",
  "queue.editSave": "Сохранить",
  "queue.editCancel": "Отменить",
  "queue.editStart": "Редактировать",
  "queue.addTitle": "Добавить заявку",
  "queue.addGuestLabel": "Гость",
  "queue.addGuestPlaceholder": "Например: Аня, стол 4",
  "queue.addRequestLabel": "Заявка",
  "queue.addRequestPlaceholder": "Например: emma ruth rundle - living with a black dog",
  "queue.addSubmit": "Добавить заявку",
  "queue.addSubmitPending": "Добавляем…",
  "session.title": "Смена",
  "session.statusLabel": "Статус",
  "session.statusActive": "Смена идёт",
  "session.nameLabel": "Название",
  "session.openedLabel": "Открыта",
  "session.autoQueueLabel": "Автоочередь",
  "session.autoQueueManual": "ручные правки",
  "session.autoQueueOn": "вкл",
  "session.sungLabel": "Исполнено",
  "session.closed": "не открыта",
  "session.namePlaceholder": "Караоке вечер",
  "session.open": "Открыть смену",
  "session.openPending": "Открываем…",
  "session.closeTitle": "Закрыть смену",
  "session.close": "Закрыть смену",
  "session.closePending": "Закрываем…",
  "archive.title": "Архив смены",
  "archive.empty": "Архив пока пуст.",
  "archive.requestedAt": "Заявка: {{time}}",
  "archive.wait": "Ожидание: {{duration}}",
  "archive.statusSung": "Спето",
  "archive.statusCancelledByHost": "Отменено ведущим",
  "archive.statusLeftVenue": "Гость ушёл",
  "archive.statusUndone": "Отменено через возврат",
  "archive.statusCancelled": "Отменено",
  "archive.statusDone": "Завершено",
  "stats.title": "Сводка смены",
  "stats.requests": "Заявок за смену",
  "stats.sung": "Исполнено",
  "stats.cancelled": "Не дошли до сцены",
  "stats.averageWait": "Среднее ожидание",
  "stats.averageWaitValue": "{{minutes}} мин",
  "stats.topSingers": "Кто уже пел чаще всего",
  "stats.singerSummary": "{{sung}} выход(а) на сцену из {{requests}} заявок",
  "stats.empty": "Статистика по гостям появится после первых исполнений.",
  "admin.label": "Админка",
  "admin.defaultChannel": "Основной бот",
  "admin.queueCount": "{{shown}} из {{total}}",
  "admin.queueCountSingle": "{{count}} заявок",
  "admin.nowLabel": "Сейчас",
  "admin.nextLabel": "Следующий",
  "admin.stageFree": "Сцена свободна",
  "admin.queueEmpty": "Очередь пуста",
  "admin.nextTitleCurrent": "Завершит текущий номер и вызовет следующего",
  "admin.nextTitleEmpty": "Вызовет следующую заявку",
  "admin.conflictDismiss": "Понятно",
  "public.loading": "Загружаем очередь...",
  "public.priorityNotice": "Позиции прогнозные. Это не финальное место: очередь пересчитывается после новых заявок и выступлений.",
  "public.errorNotice": "Не удалось загрузить очередь. Обновите страницу чуть позже.",
  "public.currentPosition": "Сейчас",
  "public.viewerRequest": "Ваша заявка",
  "public.viewerTitle": "Ваша ближайшая песня",
  "public.forecastCurrent": "Сейчас ваша песня: {{forecast}}.",
  "public.forecastEstimated": "Сейчас ваша песня прогнозно {{forecast}}.",
  "public.tableRequest": "Заявка",
  "public.emptyTitle": "Очередь пока пустая.",
  "public.emptySubtitle": "Заявки появятся здесь сразу после отправки.",
  "public.count": "{{count}} заявок"
};

export type PublicQueueAppearance = {
  backgroundColor: string;
  surfaceColor: string;
  accentColor: string;
  textColor: string;
};

export const DEFAULT_PUBLIC_QUEUE_APPEARANCE: PublicQueueAppearance = {
  backgroundColor: "#f4f6f6",
  surfaceColor: "#fff8f2",
  accentColor: "#dc8056",
  textColor: "#173c45"
};

export type GlobalSettings = {
  antiSpamSeconds: number;
  skipDownPositions: number;
  queuePolicyFlags: QueuePolicyFlags;
  botReplyTemplates: BotReplyTemplates;
  uiLabels: Record<string, string>;
  publicQueueAppearance: PublicQueueAppearance;
};

export type SessionSummary = {
  id: string;
  title: string;
  status: SessionStatus;
  version: number;
  openedAt: string | null;
  closedAt: string | null;
  timezone: string;
};

export type GuestProfileDto = {
  id: string;
  displayName: string;
  telegramUsername: string | null;
  telegramUserId: string | null;
};

export type RequestChannelDto = {
  id: string;
  slug: string;
  name: string;
  color: string | null;
};

export type SongRequestDto = {
  id: string;
  sessionId: string;
  channel: RequestChannelDto;
  guest: GuestProfileDto;
  rawText: string;
  artist: string | null;
  title: string | null;
  needsReview: boolean;
  source: SongRequestSource;
  status: SongRequestStatus;
  outcome: SongRequestOutcome | null;
  requestedAt: string;
  calledAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  queueRank: number | null;
  orderMode: OrderMode;
  manualRank: number | null;
  deferCount: number;
  note: string | null;
};

export type PublicSongRequestDto = {
  position: number | null;
  rawText: string;
  artist: string | null;
  title: string | null;
  status: Extract<SongRequestStatus, "queued" | "current">;
  isViewerRequest?: boolean;
  forecastTracksAhead?: number | null;
  forecastText?: string | null;
};

export type PublicQueueSnapshotDto = {
  isOpen: boolean;
  activeChannel: Pick<RequestChannelDto, "color">;
  uiLabels: Record<string, string>;
  publicQueueAppearance: PublicQueueAppearance;
  current: PublicSongRequestDto | null;
  queued: PublicSongRequestDto[];
  viewer: {
    queuedCount: number;
    nearestRequest: {
      position: number | null;
      rawText: string;
      artist: string | null;
      title: string | null;
      status: Extract<SongRequestStatus, "queued" | "current">;
      forecastTracksAhead: number | null;
      forecastText: string;
    } | null;
  } | null;
  stats: {
    queuedCount: number;
    hasCurrent: boolean;
  };
  updatedAt: string;
};

export type QueueSnapshotDto = {
  session: SessionSummary | null;
  queueVersion: number | null;
  channels: RequestChannelDto[];
  activeChannelSlug: string;
  current: SongRequestDto | null;
  queued: SongRequestDto[];
  archive: SongRequestDto[];
  activeOperators: Array<{
    id: string;
    displayName: string;
    role: StaffRole;
    lastSeenAt: string;
  }>;
  recentActions: Array<{
    id: string;
    actorDisplayName: string;
    actionType: string;
    label: string;
    createdAt: string;
  }>;
  stats: {
    totalRequests: number;
    totalSung: number;
    totalCancelled: number;
    averageWaitMinutes: number;
  };
};

export type SessionStatsDto = {
  totalRequests: number;
  totalSung: number;
  totalCancelled: number;
  totalDeferred: number;
  averageWaitMinutes: number;
  topSingers: Array<{
    guestId: string;
    displayName: string;
    sungCount: number;
    requestsCount: number;
  }>;
};

export type LoginResponseDto = {
  user: {
    id: string;
    displayName: string;
    role: StaffRole;
    login: string;
  };
};
