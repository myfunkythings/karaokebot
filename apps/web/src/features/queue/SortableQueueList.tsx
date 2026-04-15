import type { SongRequestDto } from "@karaoke/contracts";
import { formatTime } from "../../shared/lib/format";

function getSongLabel(request: SongRequestDto) {
  if (request.artist && request.title) {
    return `${request.artist} - ${request.title}`;
  }

  return request.title ?? request.rawText;
}

function getWaitLabel(timestamp: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000));
  if (minutes < 1) {
    return "меньше минуты";
  }
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes ? `${hours} ч ${restMinutes} мин` : `${hours} ч`;
}

function getRowStatus(
  request: SongRequestDto,
  _queueIndex: number | null,
  currentRequestId: string | null
): { label: string; tone: string } {
  if (request.id === currentRequestId) {
    return { label: "Сейчас поет", tone: "queue-status queue-status--current" };
  }
  return { label: "В очереди", tone: "queue-status" };
}

type QueueTableRequest = {
  request: SongRequestDto;
  queueIndex: number | null;
  rowNumber: number | string;
};

export function SortableQueueList({
  currentRequest,
  requests,
  filteredRequests,
  sungCountByGuestId,
  onCall,
  onMove,
  onDefer,
  onCancelGuest,
  canManage
}: {
  currentRequest: SongRequestDto | null;
  requests: SongRequestDto[];
  filteredRequests: SongRequestDto[];
  sungCountByGuestId: Record<string, number>;
  onCall: (requestId: string) => void;
  onMove: (requestId: string, position: number) => void;
  onDefer: (requestId: string) => void;
  onCancelGuest: (guestId: string) => void;
  canManage: boolean;
}) {
  const visibleRows: QueueTableRequest[] = [];

  if (currentRequest) {
    visibleRows.push({
      request: currentRequest,
      queueIndex: null,
      rowNumber: "•"
    });
  }

  for (const request of filteredRequests) {
    visibleRows.push({
      request,
      queueIndex: requests.findIndex((item) => item.id === request.id),
      rowNumber: requests.findIndex((item) => item.id === request.id) + 1
    });
  }

  function handleCancelGuest(request: SongRequestDto) {
    const confirmed = window.confirm(`Отметить, что ${request.guest.displayName} не дошёл(а), и снять будущие заявки?`);
    if (confirmed) {
      onCancelGuest(request.guest.id);
    }
  }

  function handleMoveRequest(request: SongRequestDto) {
    const currentPosition = requests.findIndex((item) => item.id === request.id) + 1;
    const nextPosition = window.prompt("Новая позиция в очереди", String(currentPosition));
    if (!nextPosition) {
      return;
    }

    const parsedPosition = Number(nextPosition);
    if (!Number.isInteger(parsedPosition) || parsedPosition < 1) {
      window.alert("Введите корректный номер позиции.");
      return;
    }

    onMove(request.id, parsedPosition);
  }

  return (
    <div className="queue-table-wrap">
      <table className="queue-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Гость</th>
            <th>Telegram</th>
            <th>Песня</th>
            <th>Спето</th>
            <th>Ожидание</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {!visibleRows.length ? (
            <tr>
              <td className="queue-table__empty" colSpan={8}>
                <strong>Очередь пока пуста</strong>
                <span>Новые заявки появятся здесь. Можно добавить вручную справа.</span>
              </td>
            </tr>
          ) : (
            visibleRows.map(({ request, queueIndex, rowNumber }) => {
              const status = getRowStatus(request, queueIndex, currentRequest?.id ?? null);

              return (
                <tr
                  key={request.id}
                  className={status.label === "Сейчас поет" ? "queue-table__row queue-table__row--current" : "queue-table__row"}
                >
                  <td>{rowNumber}</td>
                  <td>
                    <div className="queue-table__guest">
                      <strong>{request.guest.displayName}</strong>
                      <span>{request.source === "manual" ? "Добавлено ведущим" : `С ${formatTime(request.requestedAt)}`}</span>
                    </div>
                  </td>
                  <td>{request.guest.telegramUsername ? `@${request.guest.telegramUsername}` : "—"}</td>
                  <td>
                    <div className="queue-table__song">
                      <strong>{getSongLabel(request)}</strong>
                      {request.rawText !== getSongLabel(request) ? <span>{request.rawText}</span> : null}
                    </div>
                  </td>
                  <td>{sungCountByGuestId[request.guest.id] ?? 0}</td>
                  <td>{getWaitLabel(request.requestedAt)}</td>
                  <td>
                    <span className={status.tone}>{status.label}</span>
                  </td>
                  <td>
                    {queueIndex === null ? (
                      <span className="queue-table__actions-empty">Текущий номер</span>
                    ) : (
                      <div className="queue-table__actions">
                        <button className="toolbar-link" onClick={() => onCall(request.id)} disabled={!canManage}>
                          Вызвать
                        </button>
                        <button className="toolbar-link" onClick={() => onDefer(request.id)} disabled={!canManage}>
                          Отложить
                        </button>
                        <button className="toolbar-link" onClick={() => handleMoveRequest(request)} disabled={!canManage}>
                          Переместить
                        </button>
                        <button
                          className="toolbar-link toolbar-link--danger"
                          onClick={() => handleCancelGuest(request)}
                          disabled={!canManage}
                        >
                          Не дошёл
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
