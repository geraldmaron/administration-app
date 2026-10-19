import { personFile, place, type PersonFile } from "@admin/player-core";
import type { Campaign } from "@admin/engine";
import { Column, Peek, Text } from "@admin/ui";
import { BandSteps, Monogram } from "@admin/ui/dossier";
import { readingTone } from "../executive/present";
import { go } from "../shell/navigate";

/** Loyalty and competence, as the staff rate them, drawn small; drawn only when the quick look is open. */
function StandingReadings({ campaign, id }: { readonly campaign: Campaign; readonly id: string }) {
  const file: PersonFile | undefined = personFile(campaign, id);
  const shown = file?.readings.filter((reading) => reading.key === "loyalty" || reading.key === "competence") ?? [];
  if (shown.length === 0) return null;
  return (
    <Column gap="xs">
      {shown.map((reading) => (
        <BandSteps key={reading.key} label={reading.label} lit={reading.band + 1} word={reading.word} tone={readingTone(reading)} />
      ))}
    </Column>
  );
}

/**
 * A person's name inside a row that is itself a door: pressing it opens a
 * quick look (face, role, how the staff rate them, and the way into their
 * file) instead of the row's own door.
 */
export function PersonPeek({ campaign, id, name, role }: { readonly campaign: Campaign; readonly id: string; readonly name: string; readonly role?: string }) {
  const line = role ?? personFile(campaign, id)?.role;
  return <Peek name={name} identity={<Monogram name={name} size={44} />} {...(line ? { role: line } : {})} readings={<StandingReadings campaign={campaign} id={id} />} onOpen={() => go(place.person(id))} />;
}

/** A name with a person behind it opens their quick look; a name with none stays words. */
export function PersonName({ campaign, id, name, role, variant = "label" }: { readonly campaign: Campaign; readonly id: string | undefined; readonly name: string; readonly role?: string; readonly variant?: "label" | "caption" }) {
  if (!id) return <Text variant={variant}>{name}</Text>;
  return <PersonPeek campaign={campaign} id={id} name={name} {...(role ? { role } : {})} />;
}
