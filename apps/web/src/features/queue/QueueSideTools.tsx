export function QueueSideTools({
  searchValue,
  onSearchChange,
  onClearSearch,
  showRebalance,
  onRebalance,
  rebalancePending,
  canManage
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  showRebalance: boolean;
  onRebalance: () => void;
  rebalancePending: boolean;
  canManage: boolean;
}) {
  return (
    <section className="sidebar-card sidebar-card--compact">
      <div className="sidebar-card__header">
        <h2>Очередь</h2>
      </div>

      <div className="queue-side-tools">
        <label className="field">
          <span>Поиск</span>
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Заявка, гость или @telegram"
            aria-label="Поиск по очереди"
          />
        </label>

        {searchValue.trim() ? (
          <button className="ghost-button ghost-button--compact" onClick={onClearSearch} type="button">
            Сбросить поиск
          </button>
        ) : null}

        {showRebalance ? (
          <button
            className="ghost-button ghost-button--compact"
            onClick={onRebalance}
            disabled={!canManage || rebalancePending}
            type="button"
          >
            {rebalancePending ? "Возвращаем…" : "Вернуть порядок"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
