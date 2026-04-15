import { useEffect } from "react";

export function CopyToast({
  message,
  onClose
}: {
  message: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(onClose, 2400);
    return () => window.clearTimeout(timeoutId);
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div className="copy-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

