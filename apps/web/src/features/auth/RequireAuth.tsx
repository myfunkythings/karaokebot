import { useQuery } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import type { PropsWithChildren } from "react";
import { api } from "../../shared/api/client";

export function RequireAuth({ children }: PropsWithChildren) {
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

  const location = useLocation();
  const { data, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: api.me,
    retry: false
  });

  if (isLoading) {
    return <div className="page-shell">Загружаем доступ…</div>;
  }

  if (!data?.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
