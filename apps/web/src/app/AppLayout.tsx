import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { LoginResponseDto } from "@karaoke/contracts";
import { botProfiles, type BotProfile } from "./botProfiles";
import { api } from "../shared/api/client";
import { UiCopyProvider, useUiCopy } from "../shared/ui/ui-copy";

type User = LoginResponseDto["user"];

export function AppLayout({
  profile = botProfiles.mishka,
  queuePath = "/bot/mishka",
  onLogout,
  children
}: PropsWithChildren<{
  user: User;
  profile?: BotProfile;
  queuePath?: string;
  onLogout: () => void;
}>) {
  const settingsQuery = useQuery({
    queryKey: ["settings", "global", profile.channelSlug],
    queryFn: () => api.getSettings(profile.channelSlug)
  });

  return (
    <UiCopyProvider labels={settingsQuery.data?.uiLabels}>
      <AppLayoutContent profile={profile} queuePath={queuePath} onLogout={onLogout}>{children}</AppLayoutContent>
    </UiCopyProvider>
  );
}

function AppLayoutContent({
  profile,
  queuePath,
  onLogout,
  children
}: PropsWithChildren<{
  profile: BotProfile;
  queuePath: string;
  onLogout: () => void;
}>) {
  const text = useUiCopy();

  return (
    <main className={`page-shell ${profile.themeClassName}`}>
      <header className="app-header">
        <div className="app-header__copy">
          <div className="app-header__eyebrow">{text("brand.eyebrow")}</div>
          <h1 className="app-header__title">{text("brand.title") || profile.adminTitle}</h1>
        </div>

      </header>

      {children}

      <footer className="app-footer-actions">
        <nav className="app-nav" aria-label="Разделы панели">
          <NavLink
            to={queuePath}
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
      </footer>
    </main>
  );
}
