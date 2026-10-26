import { ideologyConviction, resolveAdministrationParty, type AdministrationParty } from "@admin/engine";
import { ticketConsequence, ticketLabel } from "@admin/player-core";
import { IDEOLOGY_AXES, IDEOLOGY_AXIS_POLES, type IdeologyAxis } from "@admin/world";
import { Column, Meter, ReadingFrame, Row, Text } from "@admin/ui";
import { ChoiceList, Field, Slider } from "@admin/ui/forms";
import { withLeader, type FoundingDraft } from "../draft";
import { PartyMark } from "../glyphs";
import { Commits, TitledReading, StageGrid } from "../parts";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;

const PARTIES: readonly AdministrationParty[] = ["democrat", "republican", "independent"];

/** How far from the center a position sits, in words: the ends of an axis are where conviction lives. */
export function leanWord(value: number, axis: IdeologyAxis): string {
  const poles = IDEOLOGY_AXIS_POLES[axis];
  const pole = value < 0 ? poles.negative : poles.positive;
  const magnitude = Math.abs(value);
  if (magnitude < 0.15) return "Center";
  if (magnitude < 0.45) return `Leans ${pole}`;
  if (magnitude < 0.75) return pole;
  return `Firmly ${pole}`;
}

function convictionWord(conviction: number): string {
  if (conviction < 0.2) return "Flexible";
  if (conviction < 0.45) return "Committed";
  if (conviction < 0.7) return "Strong beliefs";
  return "Hard-liner";
}

function Axis({ axis, draft, update }: { readonly axis: IdeologyAxis; readonly draft: FoundingDraft; readonly update: Update }) {
  const poles = IDEOLOGY_AXIS_POLES[axis];
  const value = draft.leader.ideology[axis];
  return (
    <Field label={poles.caption} aside={<Text variant="label" tone="accent">{leanWord(value, axis)}</Text>}>
      {(control) => (
        <Column gap="2xs">
          <Slider {...control} centered min={-1} max={1} step={0.05} value={value} valueText={leanWord(value, axis)} onChange={(next) => update((current) => withLeader(current, { ideology: { ...current.leader.ideology, [axis]: next } }))} />
          <Row between>
            <Text variant="caption" tone="secondary">
              {poles.negative}
            </Text>
            <Text variant="caption" tone="secondary">
              {poles.positive}
            </Text>
          </Row>
        </Column>
      )}
    </Field>
  );
}

/** The party choice every path shares: chosen outright, with where the President's economics point. */
export function PartyChoice({ draft, update, suggested, help }: { readonly draft: FoundingDraft; readonly update: Update; readonly suggested: AdministrationParty | undefined; readonly help?: string }) {
  return (
    <ChoiceList
      label="Party"
      help={help}
      minCardWidth={220}
      value={draft.leader.party}
      options={PARTIES.map((party) => {
        const label = ticketLabel(party, undefined);
        return { value: party, label, visual: <PartyMark party={party} />, detail: `${ticketConsequence(label)}${suggested === party ? " This party matches your views on the economy." : ""}` };
      })}
      onChange={(party) => update((current) => withLeader(current, { party }))}
    />
  );
}

/** The party, chosen outright, and the three axes of what the President believes. */
export function PoliticsStage({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  const conviction = ideologyConviction(draft.leader.ideology);
  return (
    <StageGrid
      main={
        <>
          <Commits>Your party changes how Congress treats you, starting in your first week. Your beliefs decide which people are a good fit for your running mate, your staff, and your Cabinet.</Commits>
          <PartyChoice draft={draft} update={update} suggested={resolveAdministrationParty(draft.leader.ideology)} />
          <Column gap="lg" role="group" aria-label="Beliefs">
            <Text variant="title" role="heading" aria-level={3}>
              Beliefs
            </Text>
            {IDEOLOGY_AXES.map((axis) => (
              <Axis key={axis} axis={axis} draft={draft} update={update} />
            ))}
          </Column>
        </>
      }
      side={
        <TitledReading icon="graph" title="How firm your views are">
          <ReadingFrame title="How far your beliefs are from the middle" unit="From the middle, 0, to the far end, 100%" legend={[{ id: "conviction", kind: "swatch", label: "How far from the middle", ink: "accent", figure: convictionWord(conviction) }]} help={{ meaning: "The filled part of the bar is how far your three beliefs, put together, are from the middle of the political spectrum. The word is Flexible under 20%, Committed to 45%, Strong beliefs to 70%, and Hard-liner above that." }}>
            <Meter label="Distance from the middle" value={conviction} figure={convictionWord(conviction)} />
          </ReadingFrame>
          <Text variant="caption" tone="secondary">
            This puts your three beliefs together and shows how far they are from the middle.
          </Text>
        </TitledReading>
      }
    />
  );
}
