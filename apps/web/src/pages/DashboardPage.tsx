import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useParams } from "react-router-dom";
import { api } from "../shared/api/client";
import { AppLayout } from "../app/AppLayout";
import { HostPanelPage } from "../features/queue/HostPanelPage";
import { ManualRequestForm } from "../features/queue/ManualRequestForm";
import { QueueSideTools } from "../features/queue/QueueSideTools";
import { MiniSessionStatus } from "../features/session-control/MiniSessionStatus";
import { CloseShiftSection } from "../features/session-control/CloseShiftSection";
import { mockQueueSnapshot, mockUser } from "../shared/mock/hostPanelMock";

const loginPath = `${import.meta.env.BASE_URL}login`;

export function DashboardPage() {
  const queryClient = useQueryClient();
  const [queueSearchValue, setQueueSearchValue] = useState("");
  const { channelSlug } = useParams();
  const activeChannelSlug = channelSlug?.trim();
  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.me
  });
  const snapshotQuery = useQuery({
    queryKey: ["queue", "snapshot", activeChannelSlug],
    queryFn: () => api.getQueueSnapshot(activeChannelSlug),
    enabled: Boolean(activeChannelSlug),
    refetchInterval: 5_000
  });
  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await queryClient.clear();
      window.location.assign(loginPath);
    }
  });
  const closeSessionMutation = useMutation({
    mutationFn: api.closeSession,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["queue", "snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["stats", "active"] })
      ]);
    }
  });
  const isLoading = meQuery.isLoading || snapshotQuery.isLoading;
  const user = meQuery.data?.user;
  const snapshot = snapshotQuery.data;
  const devOfflineMode =
    import.meta.env.DEV &&
    ((meQuery.isError && snapshotQuery.isError) || (!user && !snapshot && !isLoading));
  const resolvedUser = devOfflineMode ? mockUser : user;
  const resolvedSnapshot = devOfflineMode ? mockQueueSnapshot : snapshot;
  const resolvedChannelSlug = devOfflineMode
    ? mockQueueSnapshot.activeChannelSlug
    : activeChannelSlug;

  if (!activeChannelSlug && !devOfflineMode) {
    return <Navigate to="/bot/main" replace />;
  }

  if (isLoading) {
    return <main className="page-shell">Собираем оперативный пульт…</main>;
  }

  if (!resolvedUser || !resolvedSnapshot) {
    return <main className="page-shell">Не удалось загрузить данные смены.</main>;
  }

  const canManage = resolvedUser.role === "owner" || resolvedUser.role === "host";
  const expectedQueueVersion = resolvedSnapshot.queueVersion ?? 0;
  return (
    <AppLayout
      user={resolvedUser}
      queuePath={`/bot/${resolvedChannelSlug ?? "main"}`}
      onLogout={() => (devOfflineMode ? undefined : logoutMutation.mutate())}
    >
      <div className="dashboard-grid dashboard-grid--host">
        <div className="dashboard-column dashboard-column--main">
          <HostPanelPage
            snapshot={resolvedSnapshot}
            canManage={canManage}
            searchValue={queueSearchValue}
          />
        </div>
        <aside className="dashboard-column dashboard-column--side right-sidebar">
          <QueueSideTools
            searchValue={queueSearchValue}
            onSearchChange={setQueueSearchValue}
            onClearSearch={() => setQueueSearchValue("")}
          />
          <ManualRequestForm canManage={canManage} channelSlug={resolvedSnapshot.activeChannelSlug} />
          <MiniSessionStatus
            activeSession={resolvedSnapshot.session}
            snapshot={resolvedSnapshot}
            canManage={canManage}
          />
          <CloseShiftSection
            canManage={canManage}
            disabled={!resolvedSnapshot.session || closeSessionMutation.isPending}
            pending={closeSessionMutation.isPending}
            onClose={() => closeSessionMutation.mutate(expectedQueueVersion)}
          />
        </aside>
      </div>
    </AppLayout>
  );
}
