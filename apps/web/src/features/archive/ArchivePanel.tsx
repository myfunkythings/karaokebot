import { SectionCard } from "@karaoke/ui";
import type { SongRequestDto } from "@karaoke/contracts";
import { formatDateTime, formatDurationMinutes } from "../../shared/lib/format";
import { useUiCopy } from "../../shared/ui/ui-copy";

function getArchiveStatus(item: SongRequestDto, text: ReturnType<typeof useUiCopy>) {
  switch (item.outcome ?? item.status) {
    case "sung":
      return text("archive.statusSung");
    case "cancelled_by_host":
      return text("archive.statusCancelledByHost");
    case "left_venue":
      return text("archive.statusLeftVenue");
    case "undone":
      return text("archive.statusUndone");
    case "cancelled":
      return text("archive.statusCancelled");
    default:
      return text("archive.statusDone");
  }
}

export function ArchivePanel({ archive }: { archive: SongRequestDto[] }) {
  const text = useUiCopy();
  return (
    <SectionCard title={text("archive.title")}>
      <div className="archive-list">
        {archive.length ? (
          archive.map((item) => (
            <article key={item.id} className="archive-row">
              <div>
                <strong>{item.title ?? item.rawText}</strong>
                <div className="muted">{item.guest.displayName}</div>
              </div>
              <div className="archive-row__meta">
                <span>{getArchiveStatus(item, text)}</span>
                <span>{text("archive.requestedAt", { time: formatDateTime(item.requestedAt) })}</span>
                <span>
                  {text("archive.wait", {
                    duration: formatDurationMinutes(item.requestedAt, item.completedAt ?? item.cancelledAt)
                  })}
                </span>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state">{text("archive.empty")}</div>
        )}
      </div>
    </SectionCard>
  );
}
