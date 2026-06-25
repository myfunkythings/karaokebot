import type { PropsWithChildren } from "react";
import { NavLink } from "react-router-dom";
import type { LoginResponseDto } from "@karaoke/contracts";

type User = LoginResponseDto["user"];

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
          <div className="app-header__eyebrow">Пойте любые песни, кроме плохих</div>
          <h1 className="app-header__title">MISHKA KARAOKE</h1>
        </div>

        <div className="app-header__actions">
          <div className="app-header__operator">
            <span>Оператор</span>
            <strong>{user.displayName}</strong>
          </div>

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
