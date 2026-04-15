import type { PropsWithChildren, ReactNode } from "react";

export function SectionCard({
  title,
  actions,
  children
}: PropsWithChildren<{ title: string; actions?: ReactNode }>) {
  return (
    <section className="section-card">
      <div className="section-card__header">
        <div>
          <h2>{title}</h2>
        </div>
        {actions ? <div>{actions}</div> : null}
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <article className="stat-tile">
      <span className="stat-tile__label">{label}</span>
      <strong className="stat-tile__value">{value}</strong>
    </article>
  );
}
