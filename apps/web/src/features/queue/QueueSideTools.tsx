export function QueueSideTools({
  searchValue,
  onSearchChange,
  onClearSearch
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
}) {
  const text = useUiCopy();
  return (
    <section className="sidebar-card sidebar-card--compact">
      <div className="sidebar-card__header">
        <h2>{text("queue.searchTitle")}</h2>
      </div>

      <div className="queue-side-tools">
        <label className="field">
          <span>{text("queue.searchLabel")}</span>
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={text("queue.searchPlaceholder")}
            aria-label={text("queue.searchLabel")}
          />
        </label>

        {searchValue.trim() ? (
          <button className="ghost-button ghost-button--compact" onClick={onClearSearch} type="button">
            {text("queue.clearSearch")}
          </button>
        ) : null}
      </div>
    </section>
  );
}
import { useUiCopy } from "../../shared/ui/ui-copy";
