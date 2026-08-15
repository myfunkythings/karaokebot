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
  const text = useUiCopy();
  function handleClose() {
    const confirmed = window.confirm(text("queue.closeConfirm"));
    if (confirmed) {
      onClose();
    }
  }

  return (
    <section className="sidebar-card sidebar-card--danger">
      <div className="sidebar-card__header">
        <h2>{text("session.closeTitle")}</h2>
      </div>

      <div className="close-shift-section">
        <button
          className="danger-button danger-button--ghost danger-button--block"
          type="button"
          onClick={handleClose}
          disabled={!canManage || disabled}
        >
          {pending ? text("session.closePending") : text("session.close")}
        </button>
      </div>
    </section>
  );
}
import { useUiCopy } from "../../shared/ui/ui-copy";
