import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export type EmptyStateProps = {
  readonly icon?: IconName;
  readonly title: string;
  readonly children?: ReactNode;
  /** Set while something is being read, so the state is announced as work rather than absence. */
  readonly busy?: boolean;
};

/** Where a reading or a list has nothing to show: what is absent, and what would fill it. */
export function EmptyState({ icon = "emptyRecord", title, children, busy = false }: EmptyStateProps) {
  return (
    <div className="ui-empty" role="status" aria-busy={busy || undefined}>
      <Icon name={busy ? "loadingOrbit" : icon} size={32} className="ui-empty__icon" />
      <p className="ui-empty__title">{title}</p>
      {children ? <div className="ui-empty__body">{children}</div> : null}
    </div>
  );
}
