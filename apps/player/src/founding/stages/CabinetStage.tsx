import { useState } from "react";
import { chairRead, roleTitle, type ChairRead } from "@admin/player-core";
import type { PersonId } from "@admin/world";
import { Button, CardGrid, Column, Icon, Pressable, ReadingFrame, Row, Sheet, Sticky, Surface, Text, View, useMedia, type IconName } from "@admin/ui";
import { Distribution } from "@admin/ui/dossier";
import { ChairReadBadge, ChairReadKey, ChairTraits } from "../../executive/parts";
import { cabinetGroups, type CabinetGroup } from "../cabinet-groups";
import { withSeat, type ResolvedFounding, type FoundingDraft } from "../draft";
import { PersonFace } from "../../dossier/PersonFace";
import { CandidateList, Commits, StageGrid } from "../parts";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;

/**
 * Where the pinned shortlist sits in the founding frame: far enough down to
 * clear the step rail, which overlaps the top of the scroller, and short
 * enough to clear the footer. Measured at 1440 by 900; the panel only pins at
 * desktop widths, where the rail and footer keep these heights.
 */
const PIN_TOP = 16;
const FRAME_BARS = 200;

/** Each chair's department glyph. */
const DEPARTMENT_GLYPH: Readonly<Record<string, IconName>> = {
  "role-foreign-minister": "departmentState",
  "role-treasury-minister": "departmentTreasury",
  "role-defense-minister": "departmentDefense",
  "role-attorney-general": "departmentJustice",
  "role-interior-minister": "departmentInterior",
  "role-agriculture-secretary": "sectorAgriculture",
  "role-commerce-secretary": "departmentCommerce",
  "role-labor-secretary": "departmentLabor",
  "role-health-secretary": "departmentHealthHumanServices",
  "role-housing-secretary": "departmentHousingUrban",
  "role-transportation-secretary": "departmentTransportation",
  "role-energy-secretary": "departmentEnergy",
  "role-education-secretary": "departmentEducation",
  "role-veterans-secretary": "departmentVeteransAffairs",
  "role-homeland-secretary": "departmentHomelandSecurity",
  "role-intelligence-director": "departmentNationalSecurity",
};

const glyphFor = (role: string): IconName => DEPARTMENT_GLYPH[role] ?? "building";

function holderOf(role: string, resolved: ResolvedFounding) {
  const id = resolved.seated.cabinet[role];
  return resolved.cabinetSlates[role]?.find((row) => row.person.id === id)?.person;
}

function Seat({ role, resolved, selected, onSelect }: { readonly role: string; readonly resolved: ResolvedFounding; readonly selected: boolean; readonly onSelect: () => void }) {
  const person = holderOf(role, resolved);
  const title = roleTitle(role, resolved.seats.charter.roleTitles);
  return (
    <Pressable
      role="button"
      aria-pressed={selected}
      aria-label={`${title}: ${person?.name ?? "Empty"}. Show the shortlist`}
      onPress={onSelect}
      flexGrow={1}
      padding="md"
      borderWidth={selected ? 2 : 1}
      borderColor={selected ? "accent" : "borderColor"}
      borderRadius="card"
      backgroundColor={{ default: selected ? "infoFill" : "surface", hover: "surfaceHover" }}
    >
      <Row gap="md">
        {person ? <PersonFace person={person} size={44} /> : <Icon name="emptyCabinet" size={28} tone="danger" />}
        <Column flex={1} minWidth={0} gap="2xs">
          <Row gap="xs">
            <Icon name={glyphFor(role)} size={14} tone="gold" />
            <Text variant="caption" tone="secondary" numberOfLines={1} flexShrink={1}>
              {title}
            </Text>
          </Row>
          <Text variant="label" numberOfLines={1}>
            {person?.name ?? "Empty"}
          </Text>
          {person ? <ChairReadBadge read={chairRead(person)} /> : null}
        </Column>
        <Icon name="chevron" size={14} tone="colorSecondary" />
      </Row>
    </Pressable>
  );
}

function GroupHead({ group }: { readonly group: CabinetGroup }) {
  return (
    <Row gap="sm" top>
      <View width={36} height={36} borderRadius="pill" backgroundColor="goldFill" alignItems="center" justifyContent="center">
        <Icon name={group.icon} size={18} tone="goldInk" weight="fill" />
      </View>
      <Column flex={1} minWidth={0}>
        <Text variant="title" role="heading" aria-level={2}>
          {group.title}
        </Text>
        <Text variant="caption" tone="secondary">
          {`${group.roles.length} ${group.roles.length === 1 ? "seat" : "seats"} · ${group.lead}`}
        </Text>
      </Column>
    </Row>
  );
}

const READ_PARTS = [
  { key: "good", label: "Sound", ink: "successInk" },
  { key: "watch", label: "Worth watching", ink: "warningInk" },
  { key: "bad", label: "A real risk", ink: "danger" },
] as const;

/** How the whole Cabinet reads at a glance, so the seats worth a second look stand out before any is opened. */
function CabinetReading({ resolved }: { readonly resolved: ResolvedFounding }) {
  const reads = resolved.seats.departments.flatMap((role) => {
    const person = holderOf(role as string, resolved);
    return person ? [chairRead(person).tone] : [];
  });
  const parts = READ_PARTS.map((part) => ({ ...part, count: reads.filter((tone) => tone === part.key).length }));
  return (
    <Surface level="raised" pad="lg" role="region" aria-label="How your Cabinet reads">
      <Column gap="md">
        <ReadingFrame
          title="How your Cabinet reads"
          unit={`${reads.length} of ${resolved.seats.departments.length} seats filled, by how each holder reads`}
          help={{ meaning: "The bar splits the seats by how the person you'd seat in each one reads. Sound means nothing about them is working against you. Worth watching and a real risk point to the trait that could cost you, which the seat's marks and its shortlist spell out." }}
        >
          <Distribution label="Seats by how their holder reads" parts={parts} />
        </ReadingFrame>
        <ChairReadKey />
      </Column>
    </Surface>
  );
}

function Reason({ read }: { readonly read: ChairRead }) {
  return (
    <Column gap="xs">
      <ChairTraits read={read} />
      {read.tone === "good" ? null : (
        <Text variant="caption" tone="secondary">
          {read.reason}
        </Text>
      )}
    </Column>
  );
}

function Shortlist({ role, resolved, update }: { readonly role: string; readonly resolved: ResolvedFounding; readonly update: Update }) {
  const slate = resolved.cabinetSlates[role] ?? [];
  return (
    <CandidateList
      label={`Shortlist for ${roleTitle(role, resolved.seats.charter.roleTitles)}`}
      chosen={resolved.seated.cabinet[role] as string | undefined}
      onChoose={(id) => update((current) => withSeat(current, role, id as PersonId))}
      // The card is itself the radio, so each trait and the reason are said on it rather than behind a button.
      candidates={slate.map((candidate) => ({ person: candidate.person, fit: candidate.band, crossesTheAisle: candidate.crossesTheAisle, extra: <Reason read={chairRead(candidate.person)} /> }))}
    />
  );
}

/** Where the chosen seat sits in the Cabinet, with a way to step to the seat before or after it. */
function SeatStepper({ role, order, onSelect }: { readonly role: string; readonly order: readonly string[]; readonly onSelect: (role: string) => void }) {
  const at = order.indexOf(role);
  const previous = order[at - 1];
  const next = order[at + 1];
  return (
    <Row gap="sm" between>
      <Text variant="caption" tone="secondary">{`Seat ${at + 1} of ${order.length}`}</Text>
      <Row gap="xs">
        <Button size="compact" kind="quiet" icon="return" disabled={!previous} label="Previous seat" onPress={() => previous && onSelect(previous)}>
          Previous
        </Button>
        <Button size="compact" kind="secondary" iconAfter="chevron" disabled={!next} label="Next seat" onPress={() => next && onSelect(next)}>
          Next seat
        </Button>
      </Row>
    </Row>
  );
}

function ShortlistPanel({ role, order, resolved, update, onSelect }: { readonly role: string; readonly order: readonly string[]; readonly resolved: ResolvedFounding; readonly update: Update; readonly onSelect: (role: string) => void }) {
  return (
    <Column gap="md">
      <Row gap="sm">
        <Icon name={glyphFor(role)} size={24} tone="gold" />
        <Text variant="heading" role="heading" aria-level={2} flex={1}>
          {roleTitle(role, resolved.seats.charter.roleTitles)}
        </Text>
      </Row>
      <SeatStepper role={role} order={order} onSelect={onSelect} />
      <Shortlist role={role} resolved={resolved} update={update} />
    </Column>
  );
}

/** The Cabinet in groups by what each department does, and the chosen seat's shortlist: beside it on a wide screen, in a sheet over it on a phone. */
export function CabinetStage({ resolved, update }: { readonly resolved: ResolvedFounding; readonly update: Update }) {
  const media = useMedia();
  const beside = Boolean(media.desktop);
  const groups = cabinetGroups(resolved.seats.departments.map((role) => role as string));
  const order = groups.flatMap((group) => group.roles);
  const [selected, setSelected] = useState<string>(() => order[0] ?? "");
  const [sheet, setSheet] = useState(false);
  const choose = (role: string) => {
    setSelected(role);
    if (!beside) setSheet(true);
  };
  const panel = <ShortlistPanel role={selected} order={order} resolved={resolved} update={update} onSelect={setSelected} />;
  return (
    <StageGrid
      main={
        <>
          <Commits>Your Cabinet is the group of secretaries who run the big departments, like Defense and the Treasury. Each one needs a Senate vote before they can start. Whoever you pick stays in charge until you replace them.</Commits>
          <CabinetReading resolved={resolved} />
          {groups.map((group) => (
            <Column key={group.key} gap="md" role="region" aria-label={group.title}>
              <GroupHead group={group} />
              <CardGrid columns={{ phone: 1, tablet: 2, desktop: 2, wide: 2 }} gap="sm" role="list" aria-label={`${group.title}: seats`}>
                {group.roles.map((role) => (
                  <Seat key={role} role={role} resolved={resolved} selected={beside && selected === role} onSelect={() => choose(role)} />
                ))}
              </CardGrid>
            </Column>
          ))}
          {beside ? null : (
            <Sheet open={sheet} onClose={() => setSheet(false)} eyebrow="The Cabinet" title={roleTitle(selected, resolved.seats.charter.roleTitles)}>
              <Column gap="md">
                <SeatStepper role={selected} order={order} onSelect={setSelected} />
                <Shortlist role={selected} resolved={resolved} update={update} />
              </Column>
            </Sheet>
          )}
        </>
      }
      side={beside ? <Sticky key={selected} top={PIN_TOP} reserve={FRAME_BARS}>{panel}</Sticky> : null}
      stickySide
    />
  );
}
