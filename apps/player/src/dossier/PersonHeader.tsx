import type { Campaign } from "@admin/engine";
import { place, subjectHref, type PersonFile } from "@admin/player-core";
import { Badge, Column, Icon, Row, Surface, Text, View, useMedia } from "@admin/ui";
import { fileNumber } from "@admin/ui/dossier";
import type { ChairActs } from "../executive/acts";
import { InstitutionSeal, LinkText } from "../executive/parts";
import { PersonActs } from "./PersonActs";
import { hasPersonActs, houseSeal, partyOf, personAttention, standingTag } from "./person-view";

/** Where they stand, in one row: their kind of post, their party, the government a foreign official answers to, and a pending nomination. A governor's state is already in their title. */
function Chips({ campaign, file }: { readonly campaign: Campaign; readonly file: PersonFile }) {
  const standing = file.dossier.standing;
  const tag = standingTag(standing);
  const party = partyOf(campaign, file);
  return (
    <Row gap="xs" wrap alignItems="center">
      {tag ? <Badge status={tag.status} icon={tag.icon}>{tag.label}</Badge> : null}
      {party ? <Badge status="outline">{party.name}</Badge> : null}
      {standing.kind === "foreign" || standing.kind === "foreign-leader" ? <LinkText href={subjectHref({ kind: "nation", id: standing.nation })} variant="caption">{standing.nationName}</LinkText> : null}
      {file.dossier.nomination ? <Badge status="warning" icon="pending">Nominee</Badge> : null}
    </Row>
  );
}

/** The role, stated once, as the door to where it is held: their office, their chamber, the Court. */
function Role({ file }: { readonly file: PersonFile }) {
  const role = file.dossier.standing;
  if (role.kind === "cabinet" && role.institution?.offices[0]) return <LinkText href={place.office(role.institution.offices[0].id)} variant="body">{role.title}</LinkText>;
  if (role.kind === "agency" && role.institution.offices[0]) return <LinkText href={place.office(role.institution.offices[0].id)} variant="body">{role.title}</LinkText>;
  if (role.kind === "hill") return <LinkText href={place.congress()} variant="body">{role.title.includes(role.chamber) ? role.title : `${role.title}, ${role.chamber}`}</LinkText>;
  if (role.kind === "justice") return <LinkText href={place.courts()} variant="body">{file.role}</LinkText>;
  return <Text variant="body">{file.dossier.nomination ? `Nominated for ${file.dossier.nomination.officeTitle}` : (file.seat?.title ?? file.role)}</Text>;
}

/** How the file is marked for handling, beside the seal of the house that keeps it. */
export function Marking({ file }: { readonly file: PersonFile }) {
  const seal = houseSeal(file.dossier.standing);
  return (
    <Row gap="sm" alignItems="center" flexShrink={0}>
      {seal ? <InstitutionSeal id={seal.id} name={seal.name} size={36} labeled /> : null}
      <View borderWidth={1} borderColor="goldRule" paddingHorizontal="sm" paddingVertical="2xs" borderRadius="chip">
        <Text variant="eyebrow" tone="gold">
          For the President
        </Text>
      </View>
    </Row>
  );
}

type HeaderProps = { readonly campaign: Campaign; readonly file: PersonFile; readonly acts: ChairActs; readonly asOf: string };

/**
 * What the file says beneath the page's identity header: the role as a door
 * to their office, where they stand, the file's number and date, and the acts
 * the President can take on them right here.
 */
export function PersonHeader({ campaign, file, acts, asOf }: HeaderProps) {
  const media = useMedia();
  return (
    <Surface level="base" pad={media.phone ? "md" : "lg"} borderTopWidth={3} borderTopColor="goldRule" role="region" aria-label={`Personnel record for ${file.person.name}`}>
      <Column gap="sm">
        <View alignSelf="flex-start" maxWidth="100%">
          <Role file={file} />
        </View>
        <Chips campaign={campaign} file={file} />
        <Text variant="caption" tone="tertiary">{`File ${fileNumber(file.person.id)} · As of ${asOf}`}</Text>
        {hasPersonActs(campaign, file) ? (
          <PersonActs campaign={campaign} file={file} acts={acts} />
        ) : (
          <Text variant="caption" tone="secondary">
            You don't need to do anything about this person today. Their record and connections are here whenever you want them.
          </Text>
        )}
      </Column>
    </Surface>
  );
}

/** Pending matters on the person, said in a slim band under the header and kept apart from the staff's readings. */
export function Attention({ file }: { readonly file: PersonFile }) {
  const reasons = personAttention(file);
  if (reasons.length === 0) return null;
  return (
    <Surface level="raised" pad="sm" accentEdge="warning" role="region" aria-label="Needs your attention">
      <Row gap="sm" top>
        <Icon name="caution" size={18} tone="warningInk" />
        <Column gap="2xs" flex={1}>
          <Text variant="label">Needs your attention</Text>
          {reasons.map((reason) => (
            <Text key={reason} variant="body">
              {reason}
            </Text>
          ))}
        </Column>
      </Row>
    </Surface>
  );
}
