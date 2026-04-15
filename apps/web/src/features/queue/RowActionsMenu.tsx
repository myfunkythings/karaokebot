import { useEffect, useRef, useState } from "react";
import type { SongRequestDto } from "@karaoke/contracts";

function KebabIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="3" cy="8" r="1.2" fill="currentColor" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
      <circle cx="13" cy="8" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function RowActionsMenu({
  request,
  canManage,
  canReorder,
  canCall,
  onEdit,
  onCopy,
  onCall,
  onDefer,
  onMove,
  onNoShow
}: {
  request: SongRequestDto;
  canManage: boolean;
  canReorder: boolean;
  canCall: boolean;
  onEdit: () => void;
  onCopy: () => void;
  onCall: (request: SongRequestDto) => void;
  onDefer: (requestId: string) => void;
  onMove: (request: SongRequestDto) => void;
  onNoShow: (request: SongRequestDto) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function runAction(callback: () => void) {
    callback();
    setIsOpen(false);
  }

  return (
    <div className="row-actions-menu" ref={menuRef}>
      <button
        type="button"
        className="row-actions-menu__trigger"
        aria-label="Другие действия"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <KebabIcon />
      </button>

      {isOpen ? (
        <div className="row-actions-menu__dropdown" role="menu">
          <button
            type="button"
            className="row-actions-menu__item"
            role="menuitem"
            disabled={!canManage || !canCall}
            onClick={() => runAction(() => onCall(request))}
          >
            Вызвать вне очереди
          </button>
          <button type="button" className="row-actions-menu__item" role="menuitem" onClick={() => runAction(onEdit)}>
            Редактировать
          </button>
          <button type="button" className="row-actions-menu__item" role="menuitem" onClick={() => runAction(onCopy)}>
            Копировать "{request.rawText} караоке"
          </button>
          <button
            type="button"
            className="row-actions-menu__item"
            role="menuitem"
            disabled={!canManage || !canReorder}
            onClick={() => runAction(() => onDefer(request.id))}
          >
            Отложить
          </button>
          <button
            type="button"
            className="row-actions-menu__item"
            role="menuitem"
            disabled={!canManage || !canReorder}
            onClick={() => runAction(() => onMove(request))}
          >
            Переместить
          </button>
          <button
            type="button"
            className="row-actions-menu__item row-actions-menu__item--danger"
            role="menuitem"
            disabled={!canManage || !canReorder}
            onClick={() => runAction(() => onNoShow(request))}
          >
            Не дошёл
          </button>
        </div>
      ) : null}
    </div>
  );
}
