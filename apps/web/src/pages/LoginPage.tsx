import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { api } from "../shared/api/client";

export function LoginPage() {
  if (import.meta.env.DEV) {
    return <Navigate to="/" replace />;
  }

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: api.login,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      const redirectTo = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(redirectTo, { replace: true });
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loginMutation.mutate({ login, password });
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <form className="stack" onSubmit={handleSubmit}>
          <label className="field">
            <span>Общий логин</span>
            <input value={login} onChange={(event) => setLogin(event.target.value)} />
          </label>
          <label className="field">
            <span>Общий пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {loginMutation.error ? (
            <div className="error-banner">{loginMutation.error.message}</div>
          ) : null}
          <button className="primary-button" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Входим…" : "Войти"}
          </button>
        </form>
      </section>
    </main>
  );
}
