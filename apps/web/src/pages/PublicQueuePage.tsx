import { useQuery } from "@tanstack/react-query";
import type { CSSProperties } from "react";
import {
  DEFAULT_PUBLIC_QUEUE_APPEARANCE,
  DEFAULT_UI_LABELS,
  type PublicQueueSnapshotDto,
  type PublicSongRequestDto
} from "@karaoke/contracts";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../shared/api/client";
import { getActiveBotProfile, getBotProfileBySlug } from "../app/botProfiles";
import { UiCopyProvider, useUiCopy } from "../shared/ui/ui-copy";

const mockPublicQueueSnapshot: PublicQueueSnapshotDto = {
  isOpen: true,
  activeChannel: {
    color: "#203B47"
  },
  uiLabels: DEFAULT_UI_LABELS,
  publicQueueAppearance: DEFAULT_PUBLIC_QUEUE_APPEARANCE,
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
  viewer: null,
  updatedAt: new Date().toISOString()
};

function formatRequest(request: PublicSongRequestDto) {
  if (request.artist && request.title) {
    return `${request.artist} - ${request.title}`;
  }

  return request.rawText;
}

function formatViewerForecastSentence(forecastText: string, text: ReturnType<typeof useUiCopy>) {
  if (forecastText.startsWith("примерно")) {
    return text("public.forecastEstimated", { forecast: forecastText });
  }

  return text("public.forecastCurrent", { forecast: forecastText });
}

function PublicQueueBrand() {
  const text = useUiCopy();

  return (
    <div className="public-queue-brand">
      <span>{text("brand.eyebrow")}</span>
      <strong className="public-queue-title">{text("brand.title")}</strong>
    </div>
  );
}

function PublicQueueRow({ request, isNext = false }: { request: PublicSongRequestDto; isNext?: boolean }) {
  const text = useUiCopy();
  const rowClassName = [
    "public-queue-row",
    request.status === "current" ? "public-queue-row--current" : "",
    isNext ? "public-queue-row--next" : "",
    request.isViewerRequest ? "public-queue-row--viewer" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <tr className={rowClassName}>
      <td className="public-queue-table__position">
        <span>{request.position ?? text("public.currentPosition")}</span>
      </td>
      <td className="public-queue-table__request">
        <strong>{formatRequest(request)}</strong>
        {request.isViewerRequest ? (
          <span>{request.forecastText ?? text("public.viewerRequest")}</span>
        ) : null}
      </td>
    </tr>
  );
}

export function PublicQueuePage() {
  const { botSlug } = useParams();
  const [searchParams] = useSearchParams();
  const hostProfile = getActiveBotProfile();
  const routeProfile = getBotProfileBySlug(botSlug);
  const activeProfile = routeProfile ?? (!botSlug ? hostProfile : null);
  const channelSlug = activeProfile?.channelSlug;
  const guestToken = searchParams.get("guest");

  const snapshotQuery = useQuery({
    queryKey: ["queue", "public-snapshot", channelSlug, guestToken],
    queryFn: () => api.getPublicQueueSnapshot(channelSlug ?? "main", guestToken),
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
              <strong className="public-queue-title">{activeProfile.title}</strong>
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

  return <UiCopyProvider labels={snapshot.uiLabels}><PublicQueueContent snapshot={snapshot} activeProfile={activeProfile} /></UiCopyProvider>;
}

function PublicQueueContent({
  snapshot,
  activeProfile
}: {
  snapshot: PublicQueueSnapshotDto;
  activeProfile: ReturnType<typeof getActiveBotProfile>;
}) {
  const text = useUiCopy();
  const publicQueueStyle = {
    "--public-queue-background": snapshot.publicQueueAppearance.backgroundColor,
    "--public-queue-surface": snapshot.publicQueueAppearance.surfaceColor,
    "--public-queue-accent": snapshot.publicQueueAppearance.accentColor,
    "--public-queue-text": snapshot.publicQueueAppearance.textColor
  } as CSSProperties;

  return (
    <main className={`page-shell public-queue-page ${activeProfile.themeClassName}`} style={publicQueueStyle}>
      <section className="host-panel-page public-queue-shell">
        <div className="host-console-bar public-queue-topbar">
          <div className="host-console-bar__admin">
            <PublicQueueBrand />
            <span>
              {text("public.priorityNotice")}
            </span>
          </div>

          <div className="queue-panel__controls public-queue-meta">
            <span className={snapshot.isOpen ? "shift-pill shift-pill--active" : "shift-pill"}>
              <span
                className="request-channel-badge__dot"
                style={{ background: snapshot.activeChannel.color ?? "#58707b" }}
              />
              {snapshot.isOpen ? text("queue.shiftActive") : text("queue.shiftInactive")}
            </span>
            <span className="queue-count-chip">{text("public.count", { count: snapshot.stats.queuedCount })}</span>
          </div>
        </div>

        {snapshot.viewer?.nearestRequest ? (
          <section className="public-queue-viewer-card">
            <span>{text("public.viewerTitle")}</span>
            <strong>{formatRequest(snapshot.viewer.nearestRequest)}</strong>
            <p>
              {formatViewerForecastSentence(snapshot.viewer.nearestRequest.forecastText, text)} {text("public.priorityNotice")}
            </p>
          </section>
        ) : null}

        <section className="queue-panel public-queue-panel">
          <div className="queue-table-wrap">
            <table className="queue-table public-queue-table">
              <thead>
                <tr>
                  <th className="queue-table__col-index">#</th>
                  <th className="queue-table__col-request">{text("public.tableRequest")}</th>
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
                      <strong>{text("public.emptyTitle")}</strong>
                      <span>{text("public.emptySubtitle")}</span>
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
