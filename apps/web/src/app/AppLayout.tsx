import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import type { LoginResponseDto } from "@karaoke/contracts";
import { botProfiles, type BotProfile } from "./botProfiles";

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
  return (
    <main className={`page-shell ${profile.themeClassName}`}>
      <header className="app-header">
        <div className="app-header__copy">
          <div className="app-header__eyebrow">Пойте любые песни, кроме плохих</div>
          <h1 className="app-header__title">{profile.adminTitle}</h1>
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
            Очередь
          </NavLink>
          <NavLink
            to="/archive"
            className={({ isActive }) => (isActive ? "app-nav__link app-nav__link--active" : "app-nav__link")}
          >
            Архив
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? "app-nav__link app-nav__link--active" : "app-nav__link")}
          >
            Настройки
          </NavLink>
        </nav>

        <button className="ghost-button ghost-button--compact app-header__logout" onClick={onLogout} type="button">
          Выйти
        </button>
      </footer>
    </main>
  );
}
