import { SectionCard, StatTile } from "@karaoke/ui";
import type { QueueSnapshotDto, SessionStatsDto } from "@karaoke/contracts";
import { useUiCopy } from "../../shared/ui/ui-copy";

export function StatsPanel({
  snapshot,
  stats
}: {
  snapshot: QueueSnapshotDto;
  stats: SessionStatsDto | null;
}) {
  const text = useUiCopy();
  return (
    <SectionCard title={text("stats.title")}>
      <div className="stats-grid">
        <StatTile label={text("stats.requests")} value={snapshot.stats.totalRequests} />
        <StatTile label={text("stats.sung")} value={snapshot.stats.totalSung} />
        <StatTile label={text("stats.cancelled")} value={snapshot.stats.totalCancelled} />
        <StatTile label={text("stats.averageWait")} value={text("stats.averageWaitValue", { minutes: snapshot.stats.averageWaitMinutes })} />
      </div>
      <div className="stack stack--dense">
        <h3>{text("stats.topSingers")}</h3>
        {stats?.topSingers.length ? (
          stats.topSingers.map((singer) => (
            <div className="leader-row" key={singer.guestId}>
              <strong>{singer.displayName}</strong>
              <span className="muted">
                {text("stats.singerSummary", { sung: singer.sungCount, requests: singer.requestsCount })}
              </span>
            </div>
          ))
        ) : (
          <div className="empty-state empty-state--inline">{text("stats.empty")}</div>
        )}
      </div>
    </SectionCard>
  );
}
