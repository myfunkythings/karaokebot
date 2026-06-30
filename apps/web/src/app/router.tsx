import { Navigate, createBrowserRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ArchivePage } from "../pages/ArchivePage";
import { SettingsPage } from "../pages/SettingsPage";
import { RequireAuth } from "../features/auth/RequireAuth";

const appBase = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/",
    element: <Navigate to="/bot/mishka" replace />
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
