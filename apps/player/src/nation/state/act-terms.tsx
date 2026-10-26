import type { ReactNode } from "react";
import { authorityByCite, formatSignedPoints, type LocaleActOption } from "@admin/player-core";
import { Column, Icon, LegalCitation, Pressable, ReadingFrame, Row, Surface, Text, View } from "@admin/ui";
import { TrackRow, type ChoiceRowView } from "@admin/ui/nation";
import { useOpenAuthority } from "../../law/AuthorityProvider";
import { toneKey } from "../keys";

// The terms a domestic force act carries beyond its price: the law it rests on,
// what that law needs first, the suit it invites, the forces and bill it
// commits, and how much it eases the unrest. Drawn the same on the act desk,
// the Nation page's panel and the comparison, so a term reads one way.

type Litigation = NonNullable<LocaleActOption["litigation"]>;

const pct = (share: number): string => `${Math.round(share * 100)}%`;
const riskTone = (share: number) => (share >= 0.5 ? ("bad" as const) : ("watch" as const));

/**
 * A citation as a door into the law, its press area 44 points tall around the
 * chip so a thumb finds it on a phone without the chip itself growing.
 */
export function LawDoor({ cite, title }: { readonly cite: string; readonly title: string }) {
  const open = useOpenAuthority();
  const record = authorityByCite(cite);
  const name = record?.shortTitle ?? record?.title ?? title;
  return (
    <Pressable role="button" aria-label={`Law: ${name}, ${cite}. Open the law`} onPress={() => open(cite)} minHeight={44} justifyContent="center" alignSelf="flex-start" maxWidth="100%" backgroundColor="transparent">
      <LegalCitation citation={{ cite, title: name }} />
    </Pressable>
  );
}

/** The law as a label, for a card that is itself a press target: a second control inside it would nest one door in another. */
export function LawLabel({ option }: { readonly option: LocaleActOption }): ReactNode {
  if (!option.authority) return <Text variant="caption" tone="secondary">No special legal authority: ordinary federal spending.</Text>;
  return (
    <Column gap="2xs">
      <LegalCitation citation={{ cite: option.authority.cite, title: option.authority.name }} />
      <Text variant="caption" tone="secondary">{option.authority.limit}</Text>
    </Column>
  );
}

/** Every option's law as a door, set under a comparison whose cards are themselves press targets. */
export function LawDoors({ options }: { readonly options: readonly LocaleActOption[] }) {
  const cited = options.flatMap((option) => (option.authority ? [{ id: option.id, name: option.name, authority: option.authority }] : []));
  const unique = cited.filter((entry, index) => cited.findIndex((other) => other.authority.cite === entry.authority.cite) === index);
  if (unique.length === 0) return null;
  return (
    <Column gap="xs" role="list" aria-label="The law behind each choice">
      <Text variant="label" tone="secondary">The law behind each choice</Text>
      <Row gap="sm" wrap>
        {unique.map((entry) => (
          <View key={entry.authority.cite} role="listitem" maxWidth="100%">
            <LawDoor cite={entry.authority.cite} title={entry.authority.name} />
          </View>
        ))}
      </Row>
    </Column>
  );
}

/** What the law needs before the act can go, each condition drawn met (a filled check) or not yet (an empty ring). */
export function GatesList({ gates }: { readonly gates: LocaleActOption["gates"] }) {
  if (gates.length === 0) return null;
  return (
    <Column gap="2xs" role="list" aria-label="What the law needs first">
      {gates.map((gate) => (
        <Row key={gate.label} gap="xs" top role="listitem" aria-label={`${gate.met ? "Met" : "Not met yet"}: ${gate.label}${gate.cite ? `, ${gate.cite}` : ""}`}>
          {gate.met ? (
            <Icon name="approve" size={16} tone="successInk" weight="fill" />
          ) : (
            <View width={16} height={16} borderRadius="pill" borderWidth={2} borderColor="borderColorStrong" aria-hidden />
          )}
          <Column flex={1} minWidth={0}>
            <Text variant="caption" tone={gate.met ? "primary" : "secondary"}>
              {gate.label}
            </Text>
            {gate.cite ? <Text variant="caption" tone="tertiary">{gate.cite}</Text> : null}
          </Column>
        </Row>
      ))}
    </Column>
  );
}

function StepMark({ number, done, current }: { readonly number: number; readonly done: boolean; readonly current: boolean }) {
  if (done) return <Icon name="approve" size={24} tone="successInk" weight="fill" />;
  return (
    <View width={24} height={24} borderRadius="pill" alignItems="center" justifyContent="center" borderWidth={2} borderColor={current ? "danger" : "borderColorStrong"} backgroundColor="surface" aria-hidden>
      <Text variant="caption" weight="strong" tone={current ? "danger" : "secondary"}>{number}</Text>
    </View>
  );
}

/** Troops go in two steps a week apart: the proclamation the Insurrection Act requires, then the troops on it. */
export function StepsLine({ option, proclaimed }: { readonly option: LocaleActOption; readonly proclaimed: boolean }) {
  if (!option.step) return null;
  return (
    <Column gap="xs" role="list" aria-label="The steps, in order">
      <Row gap="sm" role="listitem" aria-label={`Step 1, ${proclaimed ? "done" : "not done yet"}: issue the proclamation`}>
        <StepMark number={1} done={proclaimed} current={!proclaimed} />
        <Text variant="caption" flex={1} tone={proclaimed ? "secondary" : "primary"}>
          {proclaimed ? "The proclamation to disperse is in force." : "Issue the proclamation to disperse first."}
        </Text>
      </Row>
      <View width={24} alignItems="center" aria-hidden>
        <View width={2} height={8} backgroundColor="borderColorStrong" />
      </View>
      <Row gap="sm" role="listitem" aria-label="Step 2: send the troops, from the week after the proclamation">
        <StepMark number={2} done={false} current={proclaimed} />
        <Text variant="caption" flex={1}>
          Send the troops, from the week after the proclamation.
        </Text>
      </Row>
      <Text variant="caption" tone="secondary">
        {option.step.text}
      </Text>
    </Column>
  );
}

/** The formations a mission takes and what it bills each week, for how long. */
export function CommitmentLine({ commitment }: { readonly commitment: NonNullable<LocaleActOption["commitment"]> }) {
  return (
    <Column gap="2xs">
      {commitment.forcesText ? (
        <Row gap="xs">
          <Icon name="unitGroundFormation" size={16} tone="colorSecondary" />
          <Text variant="caption" flex={1}>{commitment.forcesText}</Text>
        </Row>
      ) : null}
      <Row gap="xs">
        <Icon name="budget" size={16} tone="colorSecondary" />
        <Text variant="caption" flex={1}>{`${commitment.weeklyText} a week for ${commitment.weeks} ${commitment.weeks === 1 ? "week" : "weeks"}, until the order ends or a court pauses it`}</Text>
      </Row>
    </Column>
  );
}

/** How far the mission answers the unrest, drawn against a full answer, with its weeks and the push it gives national protest. */
export function EasesReading({ eases }: { readonly eases: NonNullable<LocaleActOption["eases"]> }) {
  const protest = eases.protest === 0 ? "It doesn't change protest across the country." : `National protest pressure ${formatSignedPoints(eases.protest)} pts${eases.protest < 0 ? ", calming it" : ", stirring it up"}.`;
  if (eases.attention <= 0) return <Text variant="caption">{`It doesn't answer the unrest itself. ${protest}`}</Text>;
  return (
    <ReadingFrame level="label" title="How much it answers the unrest" unit="% of a full answer" {...(eases.weeks > 0 ? { period: `for ${eases.weeks} ${eases.weeks === 1 ? "week" : "weeks"}` } : {})} legend={toneKey({ good: "The share of the unrest it answers" })} help={{ meaning: "Unrest that nobody answers lasts longer. A full bar is as much of an answer as any federal step can be. The mission counts only while its order is in force." }}>
      <Column gap="2xs">
        <TrackRow name="Answers" figure={pct(eases.attention)} value={eases.attention} tone="good" />
        <Text variant="caption" tone="secondary">{protest}</Text>
      </Column>
    </ReadingFrame>
  );
}

/** The suit an order invites: who sues, the odds at each step, and what the Attorney General says of it. */
export function LitigationReading({ litigation }: { readonly litigation: Litigation }) {
  const interim = litigation.interimRelief;
  const plaintiffs = litigation.plaintiffs;
  return (
    <ReadingFrame level="label" title="If it's challenged in court" unit="% chance" legend={toneKey({ watch: "Under 50%", bad: "50% or more" })} help={{ meaning: "The first bar is the chance someone sues over this order. The others are the chances a court pauses it while the case runs and strikes it down at the end. A paused order stops the mission and its weekly bill." }}>
      <Column gap="xs">
        <TrackRow name="Someone sues" figure={pct(litigation.filingChance)} value={litigation.filingChance} tone={riskTone(litigation.filingChance)} />
        {interim === undefined ? null : <TrackRow name="A court pauses it first" figure={pct(interim)} value={interim} tone={riskTone(interim)} />}
        <TrackRow name="A court strikes it down" figure={pct(litigation.meritsChance)} value={litigation.meritsChance} tone={riskTone(litigation.meritsChance)} />
        {plaintiffs.length > 0 ? (
          <Row gap="xs" top>
            <Icon name="court" size={16} tone="colorSecondary" />
            <Text variant="caption" flex={1}>{`Likely to sue: ${plaintiffs.join("; ")}`}</Text>
          </Row>
        ) : null}
        {litigation.counsel ? (
          <Row gap="xs" top>
            <Icon name={litigation.counsel.objects ? "caution" : "departmentJustice"} size={16} tone={litigation.counsel.objects ? "warningInk" : "colorSecondary"} />
            <Text variant="caption" flex={1} tone={litigation.counsel.objects ? "warning" : "primary"}>
              {litigation.counsel.objects ? `${litigation.counsel.name} objects to it.` : `${litigation.counsel.name} will defend it.`}
            </Text>
          </Row>
        ) : null}
        {litigation.reasoning ? <Text variant="caption" tone="secondary">{litigation.reasoning}</Text> : null}
      </Column>
    </ReadingFrame>
  );
}

/** The direct order the law refuses, said as why and never offered as a press: its lawful neighbor is its own row. */
export function RefusedByLaw({ option }: { readonly option: LocaleActOption }) {
  if (!option.refusedByLaw) return null;
  return (
    <Surface level="sunken" pad="md" role="note" aria-label={`Why you can't order this: ${option.name}`}>
      <Column gap="xs">
        <Row gap="xs">
          <Icon name="statusBlocked" size={18} tone="colorSecondary" />
          <Text variant="label" flex={1}>{`Why you can't order this: ${option.name.toLowerCase()}`}</Text>
        </Row>
        <Text variant="caption">{option.refusedByLaw.reason}</Text>
        <Text variant="caption" tone="secondary">
          {option.refusedByLaw.neighbor === "surveil-under-order"
            ? "A court's order is already in force here, so you can conduct surveillance under it instead."
            : "The lawful way to start is to set an investigative priority, then ask Justice to seek a court order below."}
        </Text>
        {option.authority ? <LawDoor cite={option.authority.cite} title={option.authority.name} /> : null}
      </Column>
    </Surface>
  );
}

/** The governor's step toward you or away, in points. */
export function governorShiftWords(shift: number | undefined): string | undefined {
  if (shift === undefined || shift === 0) return undefined;
  return `The governor ${shift > 0 ? "warms to you" : "cools on you"}: ${formatSignedPoints(shift)} pts`;
}

/** The comparison rows the force acts add, each present only when some option carries it. */
export function forceRows(options: readonly LocaleActOption[], proclaimed: boolean): readonly ChoiceRowView[] {
  const cells = (cell: (option: LocaleActOption) => ReactNode) => Object.fromEntries(options.map((option) => [option.id, cell(option)]));
  const any = (has: (option: LocaleActOption) => boolean) => options.some(has);
  return [
    { id: "law", label: "The law it rests on", icon: "law", cells: cells((option) => <LawLabel option={option} />) },
    ...(any((option) => option.gates.length > 0) ? [{ id: "gates", label: "What the law needs first", icon: "ballot" as const, cells: cells((option) => (option.gates.length ? <GatesList gates={option.gates} /> : undefined)) }] : []),
    ...(any((option) => option.step !== undefined) ? [{ id: "steps", label: "The steps", icon: "schedule" as const, cells: cells((option) => (option.step ? <StepsLine option={option} proclaimed={proclaimed} /> : undefined)) }] : []),
    ...(any((option) => option.commitment !== undefined) ? [{ id: "commitment", label: "Forces and weekly bill", icon: "unitGroundFormation" as const, cells: cells((option) => (option.commitment ? <CommitmentLine commitment={option.commitment} /> : undefined)) }] : []),
    ...(any((option) => option.eases !== undefined) ? [{ id: "eases", label: "Eases the unrest", icon: "eventUnrest" as const, cells: cells((option) => (option.eases ? <EasesReading eases={option.eases} /> : undefined)) }] : []),
    ...(any((option) => option.litigation !== undefined) ? [{ id: "litigation", label: "If it's challenged", icon: "court" as const, cells: cells((option) => (option.litigation ? <LitigationReading litigation={option.litigation} /> : undefined)) }] : []),
  ];
}

/** The review's lines for a force act's terms, so the package reviewed is every term the row drew. */
export function forceReviewLines(option: LocaleActOption): readonly { readonly label: string; readonly value: string }[] {
  const interim = option.litigation?.interimRelief;
  const shift = governorShiftWords(option.governorShift);
  return [
    ...(option.authority ? [{ label: "The law", value: `${option.authority.cite}, ${option.authority.name}` }] : []),
    ...(option.step ? [{ label: "The steps", value: option.step.text }] : []),
    ...(option.commitment ? [{ label: "Forces and weekly bill", value: `${option.commitment.forcesText ? `${option.commitment.forcesText}. ` : ""}${option.commitment.weeklyText} a week for ${option.commitment.weeks} weeks` }] : []),
    ...(option.litigation ? [{ label: "Chance someone sues", value: pct(option.litigation.filingChance) }] : []),
    ...(interim === undefined ? [] : [{ label: "Chance a court pauses it", value: pct(interim) }]),
    ...(option.litigation ? [{ label: "Chance a court strikes it down", value: pct(option.litigation.meritsChance) }] : []),
    ...(shift ? [{ label: "The governor's view of you", value: shift }] : []),
  ];
}
