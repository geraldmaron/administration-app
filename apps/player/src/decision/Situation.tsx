import type { Campaign, ConversationBeat } from "@admin/engine";
import type { CastScenario } from "@admin/content";
import { monogramFor, place, pressureSourceLabel, roleTitle, type MatterClock } from "@admin/player-core";
import { CardGrid, classificationKey, Column, DocParagraph, EntityLink, Icon, MemoPaper, Row, Seal, Section, Text, type IconName } from "@admin/ui";
import { Voice } from "@admin/ui/review";
import { useMarking } from "../shell/classification";
import { officeHrefOfRole, type Letterhead } from "./letterhead";
import { Deadline, OpenEnded, RowLink, go } from "./parts";
import { ScenarioTags } from "./ScenarioTags";

type PressureSource = NonNullable<CastScenario["def"]["context"]>["pressures"][number]["source"];

/** Who is pressing, by the glyph a briefing reader would expect. */
const PRESSURE_ICON: Readonly<Record<PressureSource, IconName>> = {
  cabinet: "building",
  legislature: "subjectChamber",
  street: "eventUnrest",
  press: "press",
  military: "instrumentMilitary",
  business: "sectorFinance",
  ally: "world",
  adversary: "escalate",
  court: "court",
};

/** The one sentence that says what happened, before anyone's opinion of it. */
function lede(cast: CastScenario, beats: readonly ConversationBeat[]): string {
  return beats.find((beat) => beat.speaker.kind === "narrator")?.text ?? cast.def.context?.standing ?? beats[0]?.text ?? cast.script.subject;
}

function Particulars({ cast }: { readonly cast: CastScenario }) {
  const particulars = cast.def.particulars ?? [];
  if (particulars.length === 0) {
    return (
      <Text variant="caption" tone="secondary">
        No numbers were included with this report.
      </Text>
    );
  }
  return (
    <CardGrid columns={{ phone: 1, tablet: 2, desktop: 3, wide: 4 }} role="list" aria-label="Key numbers">
      {particulars.map((particular) => (
        <Column key={particular.label} role="listitem" gap="2xs" flexGrow={1} borderLeftWidth={2} borderLeftColor="accent" paddingLeft="sm">
          <Text variant="caption" tone="secondary">
            {particular.label}
          </Text>
          <Text variant="title" weight="strong" tabular>
            {particular.value}
          </Text>
        </Column>
      ))}
    </CardGrid>
  );
}

function Locus({ locus }: { readonly locus: NonNullable<CastScenario["locus"]> }) {
  const body = (
    <>
      <Icon name="mapPin" size={18} tone="accent" />
      <Text variant="label">{locus.placeName}</Text>
      {locus.descriptor ? (
        <Text variant="caption" tone="secondary" flexShrink={1}>
          {locus.descriptor}
        </Text>
      ) : null}
    </>
  );
  const state = locus.state;
  if (!state) {
    return (
      <Row gap="sm" wrap padding="xs">
        {body}
      </Row>
    );
  }
  return (
    <RowLink label={`Open ${locus.placeName}`} href={place.state(state)} onPress={() => go(place.state(state))}>
      {body}
    </RowLink>
  );
}

function Parties({ campaign, cast }: { readonly campaign: Campaign; readonly cast: CastScenario }) {
  const home = cast.counterpart === campaign.founding.nation;
  const nation = campaign.nations[cast.counterpart];
  const pressures = cast.def.context?.pressures ?? [];
  if (home && pressures.length === 0 && !cast.locus) return null;
  return (
    <Column gap="sm">
      <Text variant="eyebrow" tone="secondary">
        Who's involved and what they want
      </Text>
      {!home && nation ? (
        <RowLink label={`Open ${nation.base.identity.name}`} href={place.country(cast.counterpart)} onPress={() => go(place.country(cast.counterpart))}>
          <Icon name="flag" size={18} tone="accent" />
          <Text variant="label">{nation.base.identity.name}</Text>
          <Text variant="caption" tone="secondary">
            The other government
          </Text>
        </RowLink>
      ) : null}
      {cast.locus ? <Locus locus={cast.locus} /> : null}
      {pressures.map((pressure) => (
        <Row key={`${pressure.source}-${pressure.want}`} gap="sm" top>
          <Icon name={PRESSURE_ICON[pressure.source]} size={18} tone={pressure.source === "adversary" ? "danger" : "colorSecondary"} />
          <Column flex={1}>
            <Text variant="label">{pressureSourceLabel(pressure.source)}</Text>
            <Text variant="caption" tone="secondary">
              {pressure.want}
            </Text>
          </Column>
        </Row>
      ))}
    </Column>
  );
}

function Preparer({ by }: { readonly by: Letterhead["preparedBy"] }) {
  const body = (
    <Column gap="2xs">
      <Text variant="caption" tone="secondary">
        Prepared by
      </Text>
      <Text variant="label">{by?.name ?? "The Situation Room"}</Text>
      {by ? (
        <Text variant="caption" tone="secondary">
          {by.role}
        </Text>
      ) : null}
    </Column>
  );
  const person = by?.person;
  if (!person || !by) return body;
  return (
    <RowLink label={`Open ${by.name}'s file`} href={place.person(person)} onPress={() => go(place.person(person))}>
      {body}
    </RowLink>
  );
}

function Prepared({ head }: { readonly head: Letterhead }) {
  const by = head.preparedBy;
  return (
    <Row wrap gap="lg" between>
      <Preparer by={by} />
      <Column gap="2xs" maxWidth={320}>
        <Text variant="caption" tone="secondary">
          Handling
        </Text>
        <Text variant="caption">{head.marking.helper}</Text>
      </Column>
    </Row>
  );
}

/**
 * The matter as the paper it arrives on: the raising office's letterhead and
 * emblem, the engine's marking at top and foot (and on the frame's banner
 * while the memo is open), what happened, the facts, the parties and who
 * prepared it.
 */
export function Briefing({ campaign, cast, beats, head }: { readonly campaign: Campaign; readonly cast: CastScenario; readonly beats: readonly ConversationBeat[]; readonly head: Letterhead }) {
  useMarking(head.marking.level);
  const level = classificationKey(head.marking.level);
  const caveat = head.marking.caveats.join("//");
  return (
    <Column gap="sm">
      <Row gap="sm" wrap>
        <ScenarioTags cast={cast} />
      </Row>
      <MemoPaper
        seal={<Seal spec={head.seal} size={64} label={`Emblem of ${head.issuer}`} />}
        house={head.issuer}
        date={head.filed}
        {...(head.preparedBy ? { from: `${head.preparedBy.name}, ${head.preparedBy.role}` } : {})}
        subject={cast.script.subject}
        level={level}
        {...(caveat ? { caveat } : {})}
        footer={<Prepared head={head} />}
      >
        <DocParagraph>{lede(cast, beats)}</DocParagraph>
        <Particulars cast={cast} />
        <Parties campaign={campaign} cast={cast} />
      </MemoPaper>
    </Column>
  );
}

/** Known now: the deadline, what waiting costs and what is not yet known, kept beside the situation. */
export function Status({ cast, clock }: { readonly cast: CastScenario; readonly clock?: MatterClock }) {
  return (
    <Section icon="pending" title="Timing and what we don't know">
      <Column gap="xs">
        <Row gap="xs">
          <Icon name="schedule" size={16} tone="colorSecondary" />
          <Text variant="eyebrow" tone="secondary">
            Deadline
          </Text>
        </Row>
        {clock ? <Deadline clock={clock} /> : <OpenEnded holds note="There's no deadline" />}
      </Column>
      <Column gap="xs">
        <Row gap="xs">
          <Icon name="caution" size={16} tone="warningInk" />
          <Text variant="eyebrow" tone="secondary">
            If you wait
          </Text>
        </Row>
        <Text variant="body">{cast.def.context?.inaction ?? "It stays on your desk, and time stays paused until you deal with it."}</Text>
      </Column>
      <Column gap="xs">
        <Row gap="xs">
          <Icon name="hidden" size={16} tone="colorSecondary" />
          <Text variant="eyebrow" tone="secondary">
            What we don't know yet
          </Text>
        </Row>
        <Text variant="body">{cast.def.context?.unknown ?? "The report doesn't flag anything. The numbers below are your staff's best guesses, not results."}</Text>
      </Column>
    </Section>
  );
}

type Plate = { readonly name: string; readonly role: string; readonly person?: string; readonly roleId?: string };

/** Who is speaking. A narrator has no plate. */
function plateOf(beat: ConversationBeat): Plate | undefined {
  const speaker = beat.speaker;
  switch (speaker.kind) {
    case "narrator":
      return undefined;
    case "vacant":
      return { name: "Nobody in this job", role: roleTitle(speaker.role) };
    case "player":
      return { name: speaker.name, role: speaker.title };
    case "official":
      return { name: speaker.name, role: roleTitle(speaker.role), person: speaker.person, roleId: speaker.role };
    case "counterpart":
      return { name: speaker.name, role: "Their government", ...(speaker.person ? { person: speaker.person } : {}) };
  }
}

function Voices({ beats }: { readonly beats: readonly ConversationBeat[] }) {
  const spoken = beats.flatMap((beat) => {
    const plate = plateOf(beat);
    return plate ? [{ plate, text: beat.text }] : [];
  });
  if (spoken.length === 0) return null;
  return (
    <Column gap="md" role="list" aria-label="Who said what">
      {spoken.map(({ plate, text }, index) => {
        const office = plate.roleId ? officeHrefOfRole(plate.roleId) : undefined;
        return (
        <Voice
          key={index}
          letters={plate.name === "Nobody in this job" ? "?" : monogramFor(plate.name)}
          name={plate.name}
          role={plate.role}
          line={text}
          nameSlot={plate.person ? <EntityLink label={plate.name} href={place.person(plate.person!)} onPress={() => go(place.person(plate.person!))} /> : undefined}
          tag={office ? <EntityLink label="Their office" icon="building" href={office} onPress={() => go(office)} /> : undefined}
        />
        );
      })}
    </Column>
  );
}

/** Who said what, how it arrived and similar cases: the evidence behind the briefing. */
export function Background({ cast, beats }: { readonly cast: CastScenario; readonly beats: readonly ConversationBeat[] }) {
  const empty = beats.every((beat) => beat.speaker.kind === "narrator") && !cast.def.context && !cast.transmission;
  if (empty) {
    return (
      <Text variant="body" tone="secondary">
        The report doesn't include any more background on this.
      </Text>
    );
  }
  return (
    <Column gap="lg">
      <Voices beats={beats} />
      {cast.def.context ? (
        <Column gap="sm">
          <Text variant="body">
            <Text variant="body" weight="strong">How it got here. </Text>
            {cast.def.context.standing}
          </Text>
          <Text variant="body">
            <Text variant="body" weight="strong">Similar cases in the past. </Text>
            {cast.def.context.precedent}
          </Text>
        </Column>
      ) : null}
      {cast.transmission ? (
        <Column gap="xs" borderLeftWidth={3} borderLeftColor="goldRule" paddingLeft="md">
          <Text variant="document">{cast.transmission.text}</Text>
          <Text variant="caption" tone="secondary">{`— ${cast.transmission.attribution}`}</Text>
        </Column>
      ) : null}
    </Column>
  );
}
