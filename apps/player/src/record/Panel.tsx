import type { ReactNode } from "react";
import { Column, Section, Surface, type IconName } from "@admin/ui";

/** One area of a Record or Legacy page: the shared section heading over a single raised panel, so every such area reads the same. */
export function RecordArea({ id, icon, title, lede, children }: { readonly id: string; readonly icon: IconName; readonly title: string; readonly lede?: string; readonly children: ReactNode }) {
  return (
    <Section id={id} icon={icon} title={title} {...(lede ? { helper: lede } : {})}>
      <Surface level="raised" pad="lg">
        <Column gap="md">{children}</Column>
      </Surface>
    </Section>
  );
}
