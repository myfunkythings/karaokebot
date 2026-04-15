import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../shared/api/client";
import { AppLayout } from "../app/AppLayout";
import { SettingsPanel } from "../features/settings/SettingsPanel";

const loginPath = `${import.meta.env.BASE_URL}login`;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.me
  });
  const settingsQuery = useQuery({
    queryKey: ["settings", "global"],
    queryFn: api.getSettings
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await queryClient.clear();
      window.location.assign(loginPath);
    }
  });

  const user = meQuery.data?.user;
  const settings = settingsQuery.data;

  if (!user || !settings) {
    return <main className="page-shell">Собираем настройки…</main>;
  }

  return (
    <AppLayout user={user} onLogout={() => logoutMutation.mutate()}>
      <div className="settings-page-grid">
        <SettingsPanel settings={settings} canEdit={user.role === "owner"} />
      </div>
    </AppLayout>
  );
}
