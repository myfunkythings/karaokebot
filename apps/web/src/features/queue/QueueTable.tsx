import { useMemo, useState, type Dispatch, type PointerEvent, type ReactNode, type SetStateAction } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SongRequestDto } from "@karaoke/contracts";
import {
  InlineEditableRequestText,
  buildKaraokeCopyText,
  writeTextToClipboard
} from "./InlineEditableRequestText";
import { RowActionsMenu } from "./RowActionsMenu";

type QueueRowStatus = "current" | "next" | "queued";

type QueueRowData = {
  request: SongRequestDto;
  rowNumber: string;
  status: QueueRowStatus;
  queueIndex: number | null;
  sungCount: number;
};

type QueueRowActions = {
  canManage: boolean;
  editingRequestId: string | null;
  setEditingRequestId: Dispatch<SetStateAction<string | null>>;
  onCall: (request: SongRequestDto) => void;
  onDefer: (requestId: string) => void;
  onMove: (request: SongRequestDto) => void;
  onNoShow: (request: SongRequestDto) => void;
  onCopied: (message: string) => void;
  onSaveRequestText: (requestId: string, rawText: string) => Promise<void>;
};

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="5" cy="4" r="1" fill="currentColor" />
      <circle cx="11" cy="4" r="1" fill="currentColor" />
      <circle cx="5" cy="8" r="1" fill="currentColor" />
      <circle cx="11" cy="8" r="1" fill="currentColor" />
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="11" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function getWaitLabel(timestamp: string) {
  const totalMinutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const restMinutes = totalMinutes % 60;
  return `${hours}:${String(restMinutes).padStart(2, "0")}`;
}

function getCreatedAtLabel(timestamp: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function getVisualStatus(
  request: SongRequestDto,
  queueIndex: number | null,
  currentRequestId: string | null
): QueueRowStatus {
  if (request.id === currentRequestId) {
    return "current";
  }
  if (queueIndex === 0) {
    return "next";
  }
  return "queued";
}

function getRowMeta(row: QueueRowData) {
  return `Подана ${getCreatedAtLabel(row.request.requestedAt)}`;
}

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button, input, textarea, select, a, [contenteditable='true']"));
}

function getQueueBadge(row: QueueRowData, currentRequestId: string | null) {
  if (row.request.id === currentRequestId) {
    return {
      label: "Сейчас поёт",
      className: "queue-status queue-status--current"
    };
  }

  if (row.queueIndex === 0) {
    return {
      label: "Следующий",
      className: "queue-status queue-status--next"
    };
  }

  return {
    label: "В очереди",
    className: "queue-status"
  };
}

async function copyRequest(rawText: string, onCopied: (message: string) => void) {
  const copiedValue = buildKaraokeCopyText(rawText);

  try {
    await writeTextToClipboard(copiedValue);
    onCopied(`Скопировано: ${copiedValue}`);
  } catch (error) {
    console.error(error);
    onCopied("Не удалось скопировать заявку");
  }
}

function getRowClassName(row: QueueRowData, isDragging = false) {
  const classNames = ["queue-table__row"];

  if (row.status === "current") {
    classNames.push("queue-table__row--current");
  }

  if (row.request.needsReview) {
    classNames.push("queue-table__row--needs-review");
  }

  if (row.status === "next") {
    classNames.push("queue-table__row--next");
  }

  if (isDragging) {
    classNames.push("queue-table__row--dragging");
  }

  return classNames.join(" ");
}

function QueueTableRowCells({
  row,
  currentRequestId,
  dragHandle,
  canManage,
  editingRequestId,
  setEditingRequestId,
  onCall,
  onDefer,
  onMove,
  onNoShow,
  onCopied,
  onSaveRequestText
}: QueueRowActions & {
  row: QueueRowData;
  currentRequestId: string | null;
  dragHandle: ReactNode;
}) {
  const isCurrent = row.status === "current";
  const canReorder = !isCurrent;
  const queueBadge = getQueueBadge(row, currentRequestId);

  return (
    <>
      <td className="queue-table__position" data-label="Позиция">
        <div className="queue-table__position-inner">
          {dragHandle}
          <span>{row.rowNumber}</span>
        </div>
      </td>
      <td className="queue-table__request-cell" data-label="Заявка">
        <InlineEditableRequestText
          value={row.request.rawText}
          isEditing={editingRequestId === row.request.id}
          onStartEditing={() => setEditingRequestId(row.request.id)}
          onCancelEditing={() =>
            setEditingRequestId((currentId) => (currentId === row.request.id ? null : currentId))
          }
          onSave={async (nextValue) => {
            await onSaveRequestText(row.request.id, nextValue);
            setEditingRequestId(null);
            onCopied("Заявка обновлена");
          }}
        />
        <span className="queue-table__request-meta">{getRowMeta(row)}</span>
        <span className="request-channel-badge">
          <span
            className="request-channel-badge__dot"
            style={{ background: row.request.channel.color ?? "#58707b" }}
            aria-hidden="true"
          />
          {row.request.channel.name}
        </span>
        <span className={queueBadge.className}>{queueBadge.label}</span>
        {row.request.needsReview ? (
          <span className="queue-table__review-badge" title="Заявка пришла без понятного разделения на исполнителя и песню">
            Проверить
          </span>
        ) : null}
      </td>
      <td data-label="Гость">
        <div className="queue-guest-cell">
          <strong>{row.request.guest.displayName}</strong>
          <span>{row.request.guest.telegramUsername ? `@${row.request.guest.telegramUsername}` : "Добавлен вручную"}</span>
        </div>
      </td>
      <td className="queue-sung-cell" data-label="Спето">{row.sungCount}</td>
      <td className="queue-wait-cell" data-label="Ждёт">{getWaitLabel(row.request.requestedAt)}</td>
      <td className="queue-table__actions-cell" data-label="Действия">
        <div className="queue-row-actions">
          <RowActionsMenu
            request={row.request}
            canManage={canManage}
            canReorder={canReorder}
            canCall={!isCurrent}
            onEdit={() => setEditingRequestId(row.request.id)}
            onCopy={() => void copyRequest(row.request.rawText, onCopied)}
            onCall={onCall}
            onDefer={onDefer}
            onMove={onMove}
            onNoShow={onNoShow}
          />
        </div>
      </td>
    </>
  );
}

function StaticQueueTableRow({
  row,
  currentRequestId,
  ...actions
}: QueueRowActions & { row: QueueRowData; currentRequestId: string | null }) {
  return (
    <tr className={getRowClassName(row)}>
      <QueueTableRowCells
        row={row}
        currentRequestId={currentRequestId}
        dragHandle={<span className="queue-table__drag-handle-placeholder" aria-hidden="true" />}
        {...actions}
      />
    </tr>
  );
}

function SortableQueueTableRow({
  row,
  currentRequestId,
  ...actions
}: QueueRowActions & { row: QueueRowData; currentRequestId: string | null }) {
  const { attributes, listeners, setActivatorNodeRef, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: row.request.id
    });
  function handleTabletEdgePointerDown(event: PointerEvent<HTMLTableRowElement>) {
    if (!window.matchMedia("(max-width: 1180px)").matches || isInteractiveTarget(event.target)) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const edgeSize = Math.min(56, rect.width * 0.22);

    if (pointerX <= edgeSize || rect.width - pointerX <= edgeSize) {
      const startDragging = listeners?.onPointerDown as ((event: PointerEvent<HTMLTableRowElement>) => void) | undefined;
      startDragging?.(event);
    }
  }

  return (
    <tr
      ref={setNodeRef}
      className={getRowClassName(row, isDragging)}
      onPointerDown={handleTabletEdgePointerDown}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
    >
      <QueueTableRowCells
        row={row}
        currentRequestId={currentRequestId}
        dragHandle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="queue-table__drag-handle"
            aria-label={`Перетащить заявку ${row.request.rawText}`}
            title="Перетащить в очереди"
            {...attributes}
            {...listeners}
          >
            <DragHandleIcon />
          </button>
        }
        {...actions}
      />
    </tr>
  );
}

export function QueueTable({
  currentRequest,
  requests,
  sungCountByGuestId,
  canManage,
  onCall,
  onDefer,
  onReorder,
  onMove,
  onNoShow,
  onCopied,
  onSaveRequestText,
  movePending,
  dragDisabled
}: {
  currentRequest: SongRequestDto | null;
  requests: SongRequestDto[];
  sungCountByGuestId: Record<string, number>;
  canManage: boolean;
  onCall: (request: SongRequestDto) => void;
  onDefer: (requestId: string) => void;
  onReorder: (requestId: string, position: number) => void;
  onMove: (request: SongRequestDto) => void;
  onNoShow: (request: SongRequestDto) => void;
  onCopied: (message: string) => void;
  onSaveRequestText: (requestId: string, rawText: string) => Promise<void>;
  movePending: boolean;
  dragDisabled?: boolean;
}) {
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const dragEnabled = canManage && requests.length > 1 && !movePending && !dragDisabled;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const rows = useMemo(() => {
    const visibleRows: QueueRowData[] = [];

    if (currentRequest) {
      visibleRows.push({
        request: currentRequest,
        rowNumber: "•",
        status: "current",
        queueIndex: null,
        sungCount: sungCountByGuestId[currentRequest.guest.id] ?? 0
      });
    }

    requests.forEach((request, index) => {
      visibleRows.push({
        request,
        rowNumber: String(index + 1),
        status: getVisualStatus(request, index, currentRequest?.id ?? null),
        queueIndex: index,
        sungCount: sungCountByGuestId[request.guest.id] ?? 0
      });
    });

    return visibleRows;
  }, [currentRequest, requests, sungCountByGuestId]);
  const currentRequestId = currentRequest?.id ?? null;
  const rowActions: QueueRowActions = {
    canManage,
    editingRequestId,
    setEditingRequestId,
    onCall,
    onDefer,
    onMove,
    onNoShow,
    onCopied,
    onSaveRequestText
  };
  const currentRow = currentRequest ? rows.find((row) => row.status === "current") ?? null : null;
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!dragEnabled || !over || active.id === over.id) {
      return;
    }

    const targetIndex = requests.findIndex((request) => request.id === over.id);
    if (targetIndex === -1) {
      return;
    }

    onReorder(String(active.id), targetIndex + 1);
  }

  return (
    <section className="queue-card">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="queue-table-wrap">
          <table className="queue-table">
            <thead>
              <tr>
                <th className="queue-table__col-index">#</th>
                <th className="queue-table__col-request">Заявка</th>
                <th className="queue-table__col-guest">Гость</th>
                <th className="queue-table__col-sung">Спето</th>
                <th className="queue-table__col-wait">Ожидание</th>
                <th className="queue-table__col-actions" aria-label="Дополнительные действия" />
              </tr>
            </thead>
            <tbody>
              {!rows.length ? (
                <tr>
                  <td className="queue-table__empty" colSpan={6}>
                    <strong>Очередь пока пуста</strong>
                    <span>Новые заявки появятся здесь</span>
                  </td>
                </tr>
              ) : dragEnabled ? (
                <>
                  {currentRow ? (
                    <StaticQueueTableRow row={currentRow} currentRequestId={currentRequestId} {...rowActions} />
                  ) : null}
                  <SortableContext items={requests.map((request) => request.id)} strategy={verticalListSortingStrategy}>
                    {rows
                      .filter((row) => row.status !== "current")
                      .map((row) => (
                        <SortableQueueTableRow key={row.request.id} row={row} currentRequestId={currentRequestId} {...rowActions} />
                      ))}
                  </SortableContext>
                </>
              ) : (
                rows.map((row) => (
                  <StaticQueueTableRow key={row.request.id} row={row} currentRequestId={currentRequestId} {...rowActions} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </DndContext>
    </section>
  );
}
