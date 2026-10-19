import { Button } from "@admin/ui";
import { go } from "../shell/navigate";

/** The address of one glossary term, landed on in the Handbook's A to Z. */
export const termHref = (id: string): string => `/handbook/terms?at=${encodeURIComponent(id)}`;

/** The Handbook door a reading's "how to read this" offers, for the frame that carries it. */
export function termDoor(id: string, label: string): { readonly label: string; readonly onOpen: () => void } {
  return { label, onOpen: () => go(termHref(id)) };
}

/** The Handbook door a help sheet ends with, for the glossary term that explains what the sheet is about. */
export function termRelated(id: string, label: string) {
  return (
    <Button kind="secondary" size="compact" icon="glossary" onPress={() => go(termHref(id))}>
      {`Look up “${label}” in the Handbook`}
    </Button>
  );
}
