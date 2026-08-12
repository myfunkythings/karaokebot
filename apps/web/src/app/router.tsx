import { Navigate, createBrowserRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ArchivePage } from "../pages/ArchivePage";
import { SettingsPage } from "../pages/SettingsPage";
import { PublicQueuePage } from "../pages/PublicQueuePage";
import { RequireAuth } from "../features/auth/RequireAuth";
import { getActiveBotProfile, getRuntimeRouterBase } from "./botProfiles";

const appBase = getRuntimeRouterBase();
const activeBotProfile = getActiveBotProfile();
const rootElement =
  activeBotProfile.adminPath === "/" ? (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ) : activeBotProfile.publicPath === "/" ? (
    <PublicQueuePage />
  ) : (
    <Navigate to={activeBotProfile.adminPath} replace />
  );

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/",
    element: rootElement
  },
  {
    path: "/admin",
    element: (
      <RequireAuth>
        <DashboardPage />
      </RequireAuth>
    )
  },
  {
    path: "/bot/:channelSlug",
    element: (
      <RequireAuth>
        <DashboardPage />
      </RequireAuth>
    )
  },
  {
    path: "/queue/:botSlug",
    element: <PublicQueuePage />
  },
  {
    path: "/archive",
    element: (
      <RequireAuth>
        <ArchivePage />
      </RequireAuth>
    )
  },
  {
    path: "/settings",
    element: (
      <RequireAuth>
        <SettingsPage />
      </RequireAuth>
    )
  }
], {
  basename: appBase || undefined
});
