import type { LeaderDraft } from "@admin/engine";
import { leaderBackgroundById, leaderBackgrounds, leaderRouteById, leaderRoutes, type LeaderAttributes } from "@admin/world";
import { LEADER_READINGS, attributeConsequence, attributeIsRead, attributeVerdict, attributesUnder } from "@admin/player-core";
import { Choice, Gauge } from "@admin/ui-web";
import { withLeader, type FoundingDraft } from "../draft";
import { CAREER_GLYPH, CardGlyph, ROUTE_GLYPH } from "../glyphs";
import { Commits } from "../parts";

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
export function draftAttributes(leader: LeaderDraft): LeaderAttributes | undefined {
  const background = leaderBackgroundById.get(leader.backgroundId as string);
  const route = leaderRouteById.get(leader.routeId as string);
  return background && route ? attributesUnder(leader, background, route) : undefined;
}

/**
 * The President's readings as meters, each with what it moves for a President.
 * A reading nothing in the game uses for a sitting President is named once
 * below, not drawn as a meter that would look like it mattered.
 */
export function LeaderReadings({ attributes }: { readonly attributes: LeaderAttributes }) {
  const read = LEADER_READINGS.filter((reading) => attributeIsRead(reading.key, "president"));
  const unread = LEADER_READINGS.filter((reading) => !attributeIsRead(reading.key, "president"));
  return (
    <section className="readings" aria-label="Your readings">
      <h3 className="readings__title">What this life adds up to</h3>
      {read.map((reading) => {
        const value = attributes[reading.key];
        return (
          <Gauge
            key={reading.key}
            shape="meter"
            label={reading.label}
            value={value}
            valueText={reading.judged ? attributeVerdict(value) : amountWord(value)}
            tone={reading.judged ? "identity" : "reading"}
            caption={attributeConsequence(reading.key, "president")}
          />
        );
      })}
      {unread.length > 0 ? (
        <p className="stage-note">
          {unread.map((reading) => `${reading.label} (${reading.judged ? attributeVerdict(attributes[reading.key]).toLowerCase() : amountWord(attributes[reading.key]).toLowerCase()})`).join(" and ")} {unread.length === 1 ? "is" : "are"} part of your biography. {unread.length === 1 ? "It does" : "They do"} not count for a sitting President.
        </p>
      ) : null}
    </section>
  );
}

/** The life before the office: a career, the route it took to the nomination, and the readings they add up to. */
export function RecordStage({ draft, update }: { readonly draft: FoundingDraft; readonly update: Update }) {
  const attributes = draftAttributes(draft.leader);
  return (
    <div className="stage-grid">
      <div className="stage-grid__main">
        <Commits>Your career and the route it took set the five readings you are sworn in with. Each says below what it moves for a President.</Commits>
        <Choice
          legend="Career"
          layout="cards"
          value={draft.leader.backgroundId as string}
          options={leaderBackgrounds.map((background) => ({ value: background.id as string, label: background.name, visual: <CardGlyph name={CAREER_GLYPH[background.id as string]} />, detail: `${background.kicker} · Ages ${background.ageRange.min}–${background.ageRange.max}` }))}
          onChange={(id) => update((current) => withLeader(current, { backgroundId: id as LeaderDraft["backgroundId"] }))}
        />
        <Choice
          legend="Route to the nomination"
          layout="cards"
          value={draft.leader.routeId as string}
          options={leaderRoutes.map((route) => ({ value: route.id as string, label: route.name, visual: <CardGlyph name={ROUTE_GLYPH[route.id as string]} />, detail: route.kicker }))}
          onChange={(id) => update((current) => withLeader(current, { routeId: id as LeaderDraft["routeId"] }))}
        />
      </div>
      <div className="stage-grid__side">{attributes ? <LeaderReadings attributes={attributes} /> : null}</div>
    </div>
  );
}
