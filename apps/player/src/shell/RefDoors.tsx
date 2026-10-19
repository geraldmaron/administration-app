import type { Campaign } from "@admin/engine";
import { resolveRef, type EntityRef, type NamedRef } from "@admin/player-core";
import { Icon, Peek, Row, type IconName } from "@admin/ui";
import { PersonName } from "../dossier/PersonPeek";
import { NationName } from "../world/parts";
import { go } from "./navigate";

const KIND_ICON: Readonly<Record<EntityRef["kind"], IconName>> = {
  person: "subjectPerson",
  nation: "flag",
  state: "mapPin",
  bill: "subjectCapitol",
  case: "court",
  institution: "westWing",
  war: "conflict",
  order: "domesticLedger",
};

const MOST_SHOWN = 4;

function RefName({ campaign, named }: { readonly campaign: Campaign; readonly named: NamedRef }) {
  if (named.kind === "person") return <PersonName campaign={campaign} id={named.id} name={named.name} role={named.role} />;
  if (named.kind === "nation") return <NationName nation={named.id} name={named.name} role={named.role} />;
  return (
    <Row gap="xs" flexShrink={1}>
      <Icon name={KIND_ICON[named.kind]} size={16} tone="colorSecondary" />
      <Peek name={named.name} identity={<Icon name={KIND_ICON[named.kind]} size={28} tone="colorSecondary" />} role={named.role} onOpen={() => go(named.href)} openLabel={`Open ${named.name}`} />
    </Row>
  );
}

/**
 * The people, governments and bodies a dated row or a notification is about,
 * each a name that opens a quick look. They sit inside a row that is itself a
 * door, so a name never takes the row's own press. Nothing draws when the
 * campaign no longer holds what the row names.
 */
export function refDoors(campaign: Campaign, refs: readonly EntityRef[]) {
  const seen = new Set<string>();
  const named = refs.flatMap((ref) => {
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const found = resolveRef(campaign, ref);
    return found ? [found] : [];
  }).slice(0, MOST_SHOWN);
  if (named.length === 0) return undefined;
  return (
    <Row gap="md" wrap role="list" aria-label="What it is about">
      {named.map((item) => (
        <RefName key={`${item.kind}:${item.id}`} campaign={campaign} named={item} />
      ))}
    </Row>
  );
}
