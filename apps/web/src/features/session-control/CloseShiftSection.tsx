export function CloseShiftSection({
  canManage,
  disabled,
  pending,
  onClose
}: {
  canManage: boolean;
  disabled: boolean;
  pending: boolean;
  onClose: () => void;
}) {
  function handleClose() {
    const confirmed = window.confirm("Закрыть текущую смену? После этого новые заявки приниматься не будут.");
    if (confirmed) {
      onClose();
    }
  }

  return (
    <section className="sidebar-card sidebar-card--danger">
      <div className="sidebar-card__header">
        <h2>Закрыть смену</h2>
      </div>

      <div className="close-shift-section">
        <button
          className="danger-button danger-button--ghost danger-button--block"
          type="button"
          onClick={handleClose}
          disabled={!canManage || disabled}
        >
          {pending ? "Закрываем…" : "Закрыть смену"}
        </button>
      </div>
    </section>
  );
}
