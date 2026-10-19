import type { ReactNode } from "react";
import { Icon, type IconName } from "@admin/ui-web";

/** One bordered section of the digest, named by its heading for assistive technology. */
export function Panel({ id, icon, title, note, className, children }: { readonly id: string; readonly icon: IconName; readonly title: string; readonly note?: ReactNode; readonly className?: string; readonly children: ReactNode }) {
  return (
    <section className={className ? `dg-panel ${className}` : "dg-panel"} aria-labelledby={id}>
      <h2 id={id} className="dg-panel__title"><Icon name={icon} size={20} /> {title}</h2>
      {note ? <p className="dg-panel__note">{note}</p> : null}
      {children}
    </section>
  );
}
