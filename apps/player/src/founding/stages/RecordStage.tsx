import type { LeaderDraft } from "@admin/engine";
import { LEADER_READINGS, attributeConsequence, attributeIsRead, attributeVerdict, attributesUnder } from "@admin/player-core";
import { leaderBackgroundById, leaderBackgrounds, leaderRouteById, leaderRoutes, type LeaderAttributes } from "@admin/world";
import { Column, Meter, ReadingFrame, Text } from "@admin/ui";
import { ChoiceList } from "@admin/ui/forms";
import { withLeader, type FoundingDraft } from "../draft";
import { CAREER_GLYPH, CardGlyph, ROUTE_GLYPH } from "../glyphs";
import { Commits, Reading, StageGrid } from "../parts";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;

// Ambition carries no verdict on the President's own chair, so it is named by
// how much of it there is, never by whether that is good.
function amountWord(value: number): string {
  if (value >= 0.65) return "High";
  if (value >= 0.45) return "Moderate";
  if (value >= 0.25) return "Low";
  return "Slight";
}

/** The readings this draft would swear in, or nothing while the career or route is unknown. */
function draftAttributes(leader: LeaderDraft): LeaderAttributes | undefined {
  const background = leaderBackgroundById.get(leader.backgroundId as string);
  const route = leaderRouteById.get(leader.routeId as string);
  return background && route ? attributesUnder(leader, background, route) : undefined;
}

/**
 * The President's readings as meters, each with what it moves for a President.
 * A reading nothing in the game uses for a sitting President is named once
 * below, not drawn as a meter that would look like it mattered.
 */
function LeaderReadings({ attributes }: { readonly attributes: LeaderAttributes }) {
  const read = LEADER_READINGS.filter((reading) => attributeIsRead(reading.key, "president"));
  const unread = LEADER_READINGS.filter((reading) => !attributeIsRead(reading.key, "president"));
  const word = (reading: (typeof LEADER_READINGS)[number]) => (reading.judged ? attributeVerdict(attributes[reading.key]) : amountWord(attributes[reading.key]));
  return (
    <Reading icon="graph" title="What your life story gives you">
      <ReadingFrame
        title="Your readings"
        unit="Each on a scale from none to the most there is"
        legend={[{ id: "judged", kind: "swatch", label: "How people judge you", ink: "accent" }, { id: "amount", kind: "swatch", label: "An amount you have", ink: "warningInk" }]}
        help={{ meaning: "Each bar is one thing your life story gives you. A blue bar is a quality people judge you on, and its word (Strong, Fair, Weak or Poor) says how it rates. A gold bar is an amount, such as money or contacts, and its word says how much: Slight under 25%, Low to 45%, Moderate to 65%, High above that." }}
      >
        {read.map((reading) => (
          <Column key={reading.key} gap="2xs">
            <Meter label={reading.label} value={attributes[reading.key]} figure={word(reading)} tone={reading.judged ? "accent" : "warningInk"} />
            <Text variant="caption" tone="secondary">
              {attributeConsequence(reading.key, "president")}
            </Text>
          </Column>
        ))}
      </ReadingFrame>
      {unread.length > 0 ? (
        <Text variant="caption" tone="tertiary">
          {unread.map((reading) => `${reading.label} (${word(reading).toLowerCase()})`).join(" and ")} {unread.length === 1 ? "is" : "are"} part of your life story. {unread.length === 1 ? "It doesn't" : "They don't"} count once you're President.
        </Text>
      ) : null}
    </Reading>
  );
}

/** The life before the office: a career, the route it took to the nomination, and the readings they add up to. */
export function RecordStage({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  const attributes = draftAttributes(draft.leader);
  return (
    <StageGrid
      main={
        <>
          <Commits>Your career and how you became your party's pick for president set your five starting scores. Under each score, you'll see what it changes once you're President.</Commits>
          <ChoiceList
            label="Career"
            minCardWidth={240}
            value={draft.leader.backgroundId as string}
            options={leaderBackgrounds.map((background) => ({ value: background.id as string, label: background.name, visual: <CardGlyph name={CAREER_GLYPH[background.id as string]} />, detail: `${background.kicker} · Ages ${background.ageRange.min}–${background.ageRange.max}` }))}
            onChange={(id) => update((current) => withLeader(current, { backgroundId: id as LeaderDraft["backgroundId"] }))}
          />
          <ChoiceList
            label="How you became your party's pick"
            minCardWidth={240}
            value={draft.leader.routeId as string}
            options={leaderRoutes.map((route) => ({ value: route.id as string, label: route.name, visual: <CardGlyph name={ROUTE_GLYPH[route.id as string]} />, detail: route.kicker }))}
            onChange={(id) => update((current) => withLeader(current, { routeId: id as LeaderDraft["routeId"] }))}
          />
        </>
      }
      side={attributes ? <LeaderReadings attributes={attributes} /> : null}
    />
  );
}
