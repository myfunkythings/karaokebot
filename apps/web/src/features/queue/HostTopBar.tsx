type SummaryItem = {
  label: string;
  value: string;
};

export function HostTopBar({
  shiftActive,
  summary,
  onNext,
  onUndo,
  onClose,
  nextDisabled,
  undoDisabled,
  closeDisabled,
  nextPending,
  undoPending,
  closePending
}: {
  shiftActive: boolean;
  summary: readonly SummaryItem[];
  onNext: () => void;
  onUndo: () => void;
  onClose: () => void;
  nextDisabled: boolean;
  undoDisabled: boolean;
  closeDisabled: boolean;
  nextPending: boolean;
  undoPending: boolean;
  closePending: boolean;
}) {
  return (
    <section className="operational-toolbar">
      <div className="operational-toolbar__summary" aria-label="Статус смены">
        <span className={shiftActive ? "operational-toolbar__state operational-toolbar__state--live" : "operational-toolbar__state"}>
          {shiftActive ? "Смена идёт" : "Смена не открыта"}
        </span>
        <div className="operational-toolbar__facts">
          {summary.map((item) => (
            <div key={item.label} className="operational-toolbar__fact">
              <span>{item.label}</span>
              <strong title={item.value}>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="operational-toolbar__actions">
        <button className="primary-button primary-button--toolbar" onClick={onNext} disabled={nextDisabled} type="button">
          {nextPending ? "Вызываем..." : "Вызвать следующего"}
        </button>
        <button className="secondary-button secondary-button--toolbar" onClick={onUndo} disabled={undoDisabled} type="button">
          {undoPending ? "Отменяем..." : "Отменить последнее действие"}
        </button>
        <button
          className="danger-button danger-button--ghost danger-button--toolbar"
          onClick={onClose}
          disabled={closeDisabled}
          type="button"
        >
          {closePending ? "Закрываем..." : "Закрыть смену"}
        </button>
      </div>
    </section>
  );
}
