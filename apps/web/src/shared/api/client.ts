import type {
  GlobalSettings,
  LoginResponseDto,
  QueueSnapshotDto,
  SessionStatsDto
} from "@karaoke/contracts";

const API_BASE = import.meta.env.VITE_API_BASE ?? `${import.meta.env.BASE_URL}api`;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    credentials: "include"
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const message =
      typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof data.message === "string"
        ? data.message
        : `Ошибка запроса: ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  me: () => apiFetch<LoginResponseDto | { user: null }>("/auth/me"),
  login: (payload: { login: string; password: string }) =>
    apiFetch<LoginResponseDto>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  logout: () =>
    apiFetch<{ ok: boolean }>("/auth/logout", {
      method: "POST"
    }),
  getQueueSnapshot: (channelSlug?: string) =>
    apiFetch<QueueSnapshotDto>(
      `/queue/snapshot${channelSlug ? `?channel=${encodeURIComponent(channelSlug)}` : ""}`
    ),
  getStats: () => apiFetch<SessionStatsDto | null>("/stats/active-session"),
  getSettings: () => apiFetch<GlobalSettings>("/settings/global"),
  updateSettings: (payload: Partial<GlobalSettings>) =>
    apiFetch<GlobalSettings>("/settings/global", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  openSession: (payload: { title?: string }) =>
    apiFetch("/sessions/open", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  closeSession: () =>
    apiFetch("/sessions/active/close", {
      method: "POST"
    }),
  nextPerformer: (channelSlug?: string) =>
    apiFetch("/queue/next", {
      method: "POST",
      body: JSON.stringify({ channelSlug })
    }),
  callRequest: (requestId: string) =>
    apiFetch(`/queue/${requestId}/call`, {
      method: "POST"
    }),
  rebalanceQueue: (channelSlug?: string) =>
    apiFetch("/queue/rebalance", {
      method: "POST",
      body: JSON.stringify({ channelSlug })
    }),
  moveRequest: (requestId: string, position: number) =>
    apiFetch(`/queue/${requestId}/move`, {
      method: "POST",
      body: JSON.stringify({ position })
    }),
  deferRequest: (requestId: string) =>
    apiFetch(`/queue/${requestId}/defer`, {
      method: "POST",
      body: JSON.stringify({})
    }),
  cancelGuestFuture: (guestId: string, channelSlug?: string) =>
    apiFetch(`/queue/guest/${guestId}/cancel-future`, {
      method: "POST",
      body: JSON.stringify({ channelSlug })
    }),
  undoLastAction: () =>
    apiFetch("/queue/undo", {
      method: "POST"
    }),
  createManualRequest: (payload: {
    displayName: string;
    rawText: string;
    artist?: string;
    title?: string;
    channelSlug?: string;
  }) =>
    apiFetch("/song-requests/manual", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateRequestRawText: (requestId: string, payload: { rawText: string }) =>
    apiFetch(`/song-requests/${requestId}/raw-text`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  searchGuests: (query: string) =>
    apiFetch<Array<{ id: string; displayName: string; telegramUsername: string | null }>>(
      `/guests?query=${encodeURIComponent(query)}`
    )
};
