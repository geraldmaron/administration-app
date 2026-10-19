import { Column, Page, Text } from "@admin/ui";
import { BackButton } from "../shell/BackButton";

/** A door to something the record does not hold, said plainly with the way back. */
export function Missing({ eyebrow, title, line, back, backLabel }: { readonly eyebrow: string; readonly title: string; readonly line: string; readonly back: string; readonly backLabel: string }) {
  return (
    <Page eyebrow={eyebrow} title={title}>
      <Column gap="md">
        <Text tone="secondary">{line}</Text>
        <BackButton parent={back} parentLabel={backLabel} />
      </Column>
    </Page>
  );
}
