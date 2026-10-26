import type { ReactNode } from "react";
import { Column, Pane, type IconName } from "@admin/ui";

/** One area of a Record or Legacy page: a pane with its title and situation line, so every such area reads the same. */
export function RecordArea({ id, icon, title, lede, children }: { readonly id: string; readonly icon: IconName; readonly title: string; readonly lede?: string; readonly children: ReactNode }) {
  return (
    <Pane id={id} icon={icon} title={title} level="raised" {...(lede ? { line: lede } : {})}>
      <Column gap="md">{children}</Column>
    </Pane>
  );
}
