import { useQuery } from "@tanstack/react-query";
import type { PublicQueueSnapshotDto, PublicSongRequestDto } from "@karaoke/contracts";
import { Navigate, useParams } from "react-router-dom";
import { api } from "../shared/api/client";
import { getActiveBotProfile, getBotProfileBySlug } from "../app/botProfiles";

const mockPublicQueueSnapshot: PublicQueueSnapshotDto = {
  isOpen: true,
  activeChannel: {
    color: "#203B47"
  },
  current: {
    position: null,
    rawText: "Queen - The Show Must Go On",
    artist: "Queen",
    title: "The Show Must Go On",
    status: "current"
  },
  queued: [
    {
      position: 1,
      rawText: "Кино - Группа крови",
      artist: "Кино",
      title: "Группа крови",
      status: "queued"
    },
    {
      position: 2,
      rawText: "ABBA - Dancing Queen",
      artist: "ABBA",
      title: "Dancing Queen",
      status: "queued"
    },
    {
      position: 3,
      rawText: "Земфира - Хочешь",
      artist: "Земфира",
      title: "Хочешь",
      status: "queued"
    },
    {
      position: 4,
      rawText: "Bon Jovi - It's My Life",
      artist: "Bon Jovi",
      title: "It's My Life",
      status: "queued"
    },
    {
      position: 5,
      rawText: "Мумий Тролль - Владивосток 2000",
      artist: "Мумий Тролль",
      title: "Владивосток 2000",
      status: "queued"
    },
    {
      position: 6,
      rawText: "Adele - Rolling in the Deep",
      artist: "Adele",
      title: "Rolling in the Deep",
      status: "queued"
    },
    {
      position: 7,
      rawText: "Ленинград - Экспонат",
      artist: "Ленинград",
      title: "Экспонат",
      status: "queued"
    },
    {
      position: 8,
      rawText: "The Killers - Mr. Brightside",
      artist: "The Killers",
      title: "Mr. Brightside",
      status: "queued"
    },
    {
      position: 9,
      rawText: "Алла Пугачева - Миллион алых роз",
      artist: "Алла Пугачева",
      title: "Миллион алых роз",
      status: "queued"
    },
    {
      position: 10,
      rawText: "Nirvana - Smells Like Teen Spirit",
      artist: "Nirvana",
      title: "Smells Like Teen Spirit",
      status: "queued"
    }
  ],
  stats: {
    queuedCount: 10,
    hasCurrent: true
  },
  updatedAt: new Date().toISOString()
};

function formatRequest(request: PublicSongRequestDto) {
  if (request.artist && request.title) {
    return `${request.artist} - ${request.title}`;
  }

  return request.rawText;
}

function PublicQueueRow({ request, isNext = false }: { request: PublicSongRequestDto; isNext?: boolean }) {
  return (
    <tr className={request.status === "current" ? "public-queue-row public-queue-row--current" : isNext ? "public-queue-row public-queue-row--next" : "public-queue-row"}>
      <td className="public-queue-table__position">
        <span>{request.position ?? "Сейчас"}</span>
      </td>
      <td className="public-queue-table__request">
        <strong>{formatRequest(request)}</strong>
      </td>
    </tr>
  );
}

export function PublicQueuePage() {
  const { botSlug } = useParams();
  const hostProfile = getActiveBotProfile();
  const routeProfile = getBotProfileBySlug(botSlug);
  const activeProfile = routeProfile ?? (!botSlug ? hostProfile : null);
  const channelSlug = activeProfile?.channelSlug;

  const snapshotQuery = useQuery({
    queryKey: ["queue", "public-snapshot", channelSlug],
    queryFn: () => api.getPublicQueueSnapshot(channelSlug ?? "main"),
    enabled: Boolean(channelSlug),
    refetchInterval: 5_000,
    retry: import.meta.env.DEV ? false : 2
  });

  if (!activeProfile || !channelSlug) {
    return <Navigate to={hostProfile.publicPath} replace />;
  }

  const devOfflineMode = import.meta.env.DEV && snapshotQuery.isError;
  const snapshot = devOfflineMode ? mockPublicQueueSnapshot : snapshotQuery.data;

  if (snapshotQuery.isLoading && !devOfflineMode) {
    return <main className="page-shell public-queue-page">Загружаем очередь...</main>;
  }

  if (!snapshot) {
    return (
      <main className="page-shell public-queue-page">
        <section className="host-panel-page public-queue-shell">
          <div className="host-console-bar public-queue-topbar">
            <div className="host-console-bar__admin">
              <img className="public-queue-logo" src="/sanatorium-john-doe-logo.png" alt={activeProfile.title} />
              <span>
                Позиции в очереди могут меняться, т.к. система автоматически поднимает наверх тех, кто спел меньше, а
                уже потом сортирует по времени заявки.
              </span>
            </div>
          </div>
          <p className="public-queue-empty">Не удалось загрузить очередь. Обновите страницу чуть позже.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={`page-shell public-queue-page ${activeProfile.themeClassName}`}>
      <section className="host-panel-page public-queue-shell">
        <div className="host-console-bar public-queue-topbar">
          <div className="host-console-bar__admin">
            <img className="public-queue-logo" src="/sanatorium-john-doe-logo.png" alt={activeProfile.title} />
            <span>
              Позиции в очереди могут меняться, т.к. система автоматически поднимает наверх тех, кто спел меньше, а уже
              потом сортирует по времени заявки.
            </span>
          </div>

          <div className="queue-panel__controls public-queue-meta">
            <span className={snapshot.isOpen ? "shift-pill shift-pill--active" : "shift-pill"}>
              <span
                className="request-channel-badge__dot"
                style={{ background: snapshot.activeChannel.color ?? "#58707b" }}
              />
              {snapshot.isOpen ? "Смена идёт" : "Смена не открыта"}
            </span>
            <span className="queue-count-chip">{snapshot.stats.queuedCount} заявок</span>
          </div>
        </div>

        <section className="queue-panel public-queue-panel">
          <div className="queue-table-wrap">
            <table className="queue-table public-queue-table">
              <thead>
                <tr>
                  <th className="queue-table__col-index">#</th>
                  <th className="queue-table__col-request">Заявка</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.current ? <PublicQueueRow request={snapshot.current} /> : null}
                {snapshot.queued.map((request, index) => (
                  <PublicQueueRow
                    key={`${request.position ?? index}-${request.rawText}`}
                    request={request}
                    isNext={index === 0}
                  />
                ))}
                {!snapshot.current && !snapshot.queued.length ? (
                  <tr>
                    <td className="queue-table__empty" colSpan={2}>
                      <strong>Очередь пока пустая.</strong>
                      <span>Заявки появятся здесь сразу после отправки.</span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
