import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { LoginResponseDto } from "@karaoke/contracts";
import { api } from "../shared/api/client";
import { UiCopyProvider, useUiCopy } from "../shared/ui/ui-copy";

type User = LoginResponseDto["user"];

export function AppLayout({
  onLogout,
  children
}: PropsWithChildren<{
  user: User;
  onLogout: () => void;
}>) {
  const settingsQuery = useQuery({
    queryKey: ["settings", "global"],
    queryFn: api.getSettings
  });

  return (
    <UiCopyProvider labels={settingsQuery.data?.uiLabels}>
      <AppLayoutContent onLogout={onLogout}>{children}</AppLayoutContent>
    </UiCopyProvider>
  );
}

function AppLayoutContent({ onLogout, children }: PropsWithChildren<{ onLogout: () => void }>) {
  const text = useUiCopy();

  return (
    <main className="page-shell">
      <header className="app-header">
        <div className="app-header__copy">
          <div className="app-header__eyebrow">{text("brand.eyebrow")}</div>
          <h1 className="app-header__title">{text("brand.title")}</h1>
        </div>

        <div className="app-header__actions">
          <nav className="app-nav" aria-label="Разделы панели">
            <NavLink
              to="/"
              end
              className={({ isActive }) => (isActive ? "app-nav__link app-nav__link--active" : "app-nav__link")}
            >
              {text("nav.queue")}
            </NavLink>
            <NavLink
              to="/archive"
              className={({ isActive }) => (isActive ? "app-nav__link app-nav__link--active" : "app-nav__link")}
            >
              {text("nav.archive")}
            </NavLink>
            <NavLink
              to="/settings"
              className={({ isActive }) => (isActive ? "app-nav__link app-nav__link--active" : "app-nav__link")}
            >
              {text("nav.settings")}
            </NavLink>
          </nav>

          <button className="ghost-button ghost-button--compact app-header__logout" onClick={onLogout} type="button">
            {text("nav.logout")}
          </button>
        </div>
      </header>

      {children}
    </main>
  );
}
