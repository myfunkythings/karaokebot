import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../shared/api/client";
import { AppLayout } from "../app/AppLayout";
import { ArchivePanel } from "../features/archive/ArchivePanel";
import { StatsPanel } from "../features/stats/StatsPanel";
import { getActiveBotProfile, getLoginPath } from "../app/botProfiles";

const loginPath = getLoginPath();

export function ArchivePage() {
  const queryClient = useQueryClient();
  const activeProfile = getActiveBotProfile();
  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.me
  });
  const snapshotQuery = useQuery({
    queryKey: ["queue", "snapshot"],
    queryFn: () => api.getQueueSnapshot(),
    refetchInterval: 5_000
  });
  const statsQuery = useQuery({
    queryKey: ["stats", "active"],
    queryFn: api.getStats,
    refetchInterval: 10_000
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await queryClient.clear();
      window.location.assign(loginPath);
    }
  });

  const user = meQuery.data?.user;
  const snapshot = snapshotQuery.data;

  if (!user || !snapshot) {
    return <main className="page-shell">Собираем архив…</main>;
  }

  return (
    <AppLayout user={user} profile={activeProfile} queuePath={activeProfile.queuePath} onLogout={() => logoutMutation.mutate()}>
      <div className="dashboard-grid">
        <div className="dashboard-column dashboard-column--wide">
          <ArchivePanel archive={snapshot.archive} />
        </div>
        <div className="dashboard-column">
          <StatsPanel snapshot={snapshot} stats={statsQuery.data ?? null} />
        </div>
      </div>
    </AppLayout>
  );
}
