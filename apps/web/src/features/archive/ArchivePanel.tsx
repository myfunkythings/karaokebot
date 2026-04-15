import { SectionCard } from "@karaoke/ui";
import type { SongRequestDto } from "@karaoke/contracts";
import { formatDateTime, formatDurationMinutes } from "../../shared/lib/format";

function getArchiveStatus(item: SongRequestDto) {
  switch (item.outcome ?? item.status) {
    case "sung":
      return "Спето";
    case "cancelled_by_host":
      return "Отменено ведущим";
    case "left_venue":
      return "Гость ушёл";
    case "undone":
      return "Отменено через возврат";
    case "cancelled":
      return "Отменено";
    default:
      return "Завершено";
  }
}

export function ArchivePanel({ archive }: { archive: SongRequestDto[] }) {
  return (
    <SectionCard title="Архив смены">
      <div className="archive-list">
        {archive.length ? (
          archive.map((item) => (
            <article key={item.id} className="archive-row">
              <div>
                <strong>{item.title ?? item.rawText}</strong>
                <div className="muted">{item.guest.displayName}</div>
              </div>
              <div className="archive-row__meta">
                <span>{getArchiveStatus(item)}</span>
                <span>Заявка: {formatDateTime(item.requestedAt)}</span>
                <span>
                  Ожидание:{" "}
                  {formatDurationMinutes(
                    item.requestedAt,
                    item.completedAt ?? item.cancelledAt
                  )}
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">Архив пока пуст.</div>
        )}
      </div>
    </SectionCard>
  );
}
