export function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit"
  });
}

export function formatTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatDurationMinutes(start: string, end: string | null) {
  if (!end) {
    return "—";
  }

  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  return `${Math.max(Math.round(diffMs / 1000 / 60), 0)} мин`;
}
