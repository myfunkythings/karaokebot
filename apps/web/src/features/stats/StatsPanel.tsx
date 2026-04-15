import { SectionCard, StatTile } from "@karaoke/ui";
import type { QueueSnapshotDto, SessionStatsDto } from "@karaoke/contracts";

export function StatsPanel({
  snapshot,
  stats
}: {
  snapshot: QueueSnapshotDto;
  stats: SessionStatsDto | null;
}) {
  return (
    <SectionCard title="Сводка смены">
      <div className="stats-grid">
        <StatTile label="Заявок за смену" value={snapshot.stats.totalRequests} />
        <StatTile label="Исполнено" value={snapshot.stats.totalSung} />
        <StatTile label="Не дошли до сцены" value={snapshot.stats.totalCancelled} />
        <StatTile label="Среднее ожидание" value={`${snapshot.stats.averageWaitMinutes} мин`} />
      </div>
      <div className="stack stack--dense">
        <h3>Кто уже пел чаще всего</h3>
        {stats?.topSingers.length ? (
          stats.topSingers.map((singer) => (
            <div className="leader-row" key={singer.guestId}>
              <strong>{singer.displayName}</strong>
              <span className="muted">
                {singer.sungCount} выход(а) на сцену из {singer.requestsCount} заявок
              </span>
            </div>
          ))
        ) : (
          <div className="empty-state empty-state--inline">Статистика по гостям появится после первых исполнений.</div>
        )}
      </div>
    </SectionCard>
  );
}
