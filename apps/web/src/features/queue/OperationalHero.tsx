import { useMemo } from "react";
import { SectionCard } from "@karaoke/ui";
import type { QueueSnapshotDto, SongRequestDto } from "@karaoke/contracts";
import { formatTime } from "../../shared/lib/format";

function getSongLabel(request: SongRequestDto | null) {
  if (!request) {
    return "Пока нет заявки";
  }

  if (request.artist && request.title) {
    return `${request.artist} - ${request.title}`;
  }

  return request.title ?? request.rawText;
}

function getPerformerLabel(request: SongRequestDto | null) {
  if (!request) {
    return "Ждём первую заявку";
  }

  return request.guest.displayName;
}

function getRequestedMeta(request: SongRequestDto | null) {
  if (!request) {
    return "Как только появится заявка, она отобразится здесь.";
  }

  const time = formatTime(request.requestedAt);
  return `Заявка в очереди с ${time}`;
}

function OperationalSlot({
  label,
  request,
  emphasized
}: {
  label: string;
  request: SongRequestDto | null;
  emphasized?: boolean;
}) {
  return (
    <article className={emphasized ? "operational-slot operational-slot--current" : "operational-slot"}>
      <span className="eyebrow">{label}</span>
      <strong className="operational-slot__name">{getPerformerLabel(request)}</strong>
      <span className="operational-slot__song">{getSongLabel(request)}</span>
      <span className="operational-slot__meta">{getRequestedMeta(request)}</span>
    </article>
  );
}

export function OperationalHero({
  snapshot,
  canManage,
  onNext,
  isAdvancing
}: {
  snapshot: QueueSnapshotDto;
  canManage: boolean;
  onNext: () => void;
  isAdvancing: boolean;
}) {
  const nextRequest = snapshot.queued[0] ?? null;
  const heroSummary = useMemo(() => {
    if (!snapshot.session) {
      return "Смена не открыта. Откройте смену справа, чтобы принимать и вызывать заявки.";
    }

    if (snapshot.current && nextRequest) {
      return `На очереди ${snapshot.queued.length} заявок. После текущего номера можно сразу вызывать следующего исполнителя.`;
    }

    if (snapshot.current) {
      return "Текущий номер идёт. После него очередь опустеет, если не появятся новые заявки.";
    }

    if (nextRequest) {
      return `Сцена свободна. В очереди ${snapshot.queued.length} ${snapshot.queued.length === 1 ? "заявка" : "заявки"}, можно вызывать следующего.`;
    }

    return "Сцена свободна, очередь пустая. Новые заявки появятся здесь.";
  }, [nextRequest, snapshot.current, snapshot.queued.length, snapshot.session]);

  const primaryLabel = snapshot.current
    ? "Завершить номер и вызвать следующего"
    : "Вызвать следующего";

  return (
    <SectionCard
      title="Оперативная очередь"
      actions={
        <div className="hero-actions">
          <button
            className="primary-button primary-button--hero"
            onClick={onNext}
            disabled={!canManage || !snapshot.session || (!snapshot.current && !nextRequest) || isAdvancing}
          >
            {isAdvancing ? "Обновляем сцену…" : primaryLabel}
          </button>
        </div>
      }
    >
      <div className="operational-hero">
        <div className="operational-hero__summary">
          <span className="eyebrow">Главный сценарий</span>
          <h3>Кто поёт сейчас и кто выходит следующим</h3>
          <p className="muted">{heroSummary}</p>
        </div>

        <div className="operational-hero__grid">
          <OperationalSlot label="Сейчас поёт" request={snapshot.current} emphasized />
          <OperationalSlot label="Следующий" request={nextRequest} />
        </div>

        <div className="operational-hero__meta">
          <div className="hero-stat">
            <span className="hero-stat__label">В очереди</span>
            <strong className="hero-stat__value">{snapshot.queued.length}</strong>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">Исполнено за смену</span>
            <strong className="hero-stat__value">{snapshot.stats.totalSung}</strong>
          </div>
          <div className="hero-stat">
            <span className="hero-stat__label">Среднее ожидание</span>
            <strong className="hero-stat__value">{snapshot.stats.averageWaitMinutes} мин</strong>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
