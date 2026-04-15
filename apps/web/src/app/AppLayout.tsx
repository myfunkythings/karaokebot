import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import type { LoginResponseDto } from "@karaoke/contracts";

type User = LoginResponseDto["user"];

function getRoleLabel(role: User["role"]) {
  switch (role) {
    case "owner":
      return "владелец";
    case "host":
      return "ведущий";
    case "viewer":
      return "наблюдатель";
    default:
      return role;
  }
}

export function AppLayout({
  user,
  onLogout,
  children
}: PropsWithChildren<{
  user: User;
  onLogout: () => void;
}>) {
  return (
    <main className="page-shell">
      <header className="app-header">
        <div className="app-header__copy">
          <div className="app-header__eyebrow">
            {user.displayName} · {getRoleLabel(user.role)}
          </div>
          <h1 className="app-header__title">MISHKA KARAOKE</h1>
          <p className="app-header__subtitle">Оперативная панель ведущего</p>
        </div>

        <div className="app-header__actions">
          <nav className="app-nav" aria-label="Разделы панели">
            <NavLink
              to="/"
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
        </div>
      </header>

      {children}
    </main>
  );
}
