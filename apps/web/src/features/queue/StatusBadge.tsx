type QueueVisualStatus = "queued" | "current" | "no-show" | "done";

const statusMeta: Record<QueueVisualStatus, { label: string; className: string }> = {
  queued: {
    label: "В очереди",
    className: "queue-status"
  },
  current: {
    label: "Сейчас поет",
    className: "queue-status queue-status--current"
  },
  "no-show": {
    label: "Не дошёл",
    className: "queue-status queue-status--no-show"
  },
  done: {
    label: "Исполнено",
    className: "queue-status queue-status--done"
  }
};

export function StatusBadge({ status }: { status: QueueVisualStatus }) {
  const meta = statusMeta[status];
  return <span className={meta.className}>{meta.label}</span>;
}

export type { QueueVisualStatus };
