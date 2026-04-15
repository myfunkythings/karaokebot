import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../../shared/api/client";

export function GuestSearchPanel() {
  const [query, setQuery] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["guests", query],
    queryFn: () => api.searchGuests(query),
    enabled: query.trim().length >= 2
  });

  return (
    <section className="sidebar-card sidebar-card--compact">
      <div className="sidebar-card__header">
        <h2>Поиск гостя</h2>
      </div>

      <div className="guest-search-card">
        <label className="field">
          <span>Гость</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Имя или @telegram"
          />
        </label>

        {isFetching ? <div className="sidebar-note">Ищем гостя…</div> : null}

        {query.trim().length >= 2 ? (
          <div className="guest-search-results">
            {data?.map((guest) => (
              <article className="guest-hit" key={guest.id}>
                <strong>{guest.displayName}</strong>
                <span>{guest.telegramUsername ? `@${guest.telegramUsername}` : "Добавлен вручную"}</span>
              </article>
            ))}
            {!data?.length && !isFetching ? (
              <div className="empty-state empty-state--inline">Ничего не нашли. Проверьте имя или ник.</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
