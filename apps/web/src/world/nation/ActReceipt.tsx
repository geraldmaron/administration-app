import { place, readingMoves, standingToward, type Standing } from "@admin/player-core";
import type { NationId } from "@admin/world";
import { Gauge, Receipt, buttonClass, Icon } from "@admin/ui-web";
import { Door } from "../../shell/Door";
import { toneOf } from "../../shell/valence";
import { AssetTextLine } from "../forces/AssetFigure";
import { Moves } from "../../shell/Moves";
import { Screen } from "../../shell/Screen";
import { countryActHref, countryReturnHref, type CountrySearch } from "./country-search";
import type { ActDone } from "./use-act-commit";

function standingLevels(standing: Standing | undefined): { readonly theirs?: number; readonly ours?: number; readonly tension?: number } {
  return {
    ...(standing?.theirs ? { theirs: standing.theirs.trust.level } : {}),
    ...(standing?.ours ? { ours: standing.ours.trust.level } : {}),
    ...(standing?.tension ? { tension: standing.tension.level } : {}),
  };
}

/** Where the relationship stood and stands now: the meter at the value after, with a tick where it stood before. */
function Relationship({ done, nation }: { readonly done: ActDone; readonly nation: NationId }) {
  const before = standingToward(done.before, nation);
  const after = standingToward(done.after, nation);
  if (!after) return null;
  const was = standingLevels(before);
  return (
    <div className="receipt-standing">
      {after.theirs ? (
        <Gauge
          shape="meter"
          label={after.theirs.caption}
          value={after.theirs.trust.level / 4}
          valueText={after.theirs.trust.word}
          tone={toneOf(after.theirs.trust.stance)}
          {...(was.theirs !== undefined ? { marks: [{ at: was.theirs / 4, label: `Before, ${before?.theirs?.trust.word ?? ""}` }] } : {})}
          caption={before?.theirs && before.theirs.trust.word !== after.theirs.trust.word ? `Was ${before.theirs.trust.word.toLowerCase()}` : "Where it stood before"}
        />
      ) : null}
      {after.ours ? (
        <Gauge
          shape="meter"
          label={after.ours.caption}
          value={after.ours.trust.level / 4}
          valueText={after.ours.trust.word}
          tone={toneOf(after.ours.trust.stance)}
          {...(was.ours !== undefined ? { marks: [{ at: was.ours / 4, label: `Before, ${before?.ours?.trust.word ?? ""}` }] } : {})}
        />
      ) : null}
      {after.tension ? (
        <Gauge
          shape="meter"
          label="Tension between you"
          value={after.tension.level / 4}
          valueText={after.tension.word}
          tone={toneOf(after.tension.stance)}
          {...(was.tension !== undefined ? { marks: [{ at: was.tension / 4, label: `Before, ${before?.tension?.word ?? ""}` }] } : {})}
        />
      ) : null}
    </div>
  );
}

/** The proof an act on a government was taken: what it cost, how it came out, what moved, and the Record entry. */
export function ActReceipt({ nation, name, done, origin = {} }: { readonly nation: NationId; readonly name: string; readonly done: ActDone; readonly origin?: CountrySearch }) {
  const moves = readingMoves(done.before, done.after);
  return (
    <Screen icon="approve" title={name} eyebrow="Act taken" screenClass="workspace" camera="keep">
      <div className="act-desk act-desk--done">
        <Receipt
          title={done.title}
          date={done.date}
          lines={done.lines.map((line) => ({ label: line.label, value: line.unitType ? <AssetTextLine unitType={line.unitType} text={line.value} /> : line.value }))}
          {...(done.outcome ? { outcome: done.outcome } : {})}
          record={done.saveError ? `It stands, but this device did not save it: ${done.saveError}` : "It is on your Record."}
        >
          {done.eventId ? (
            <Door href={place.event(done.eventId)} className={buttonClass("primary", "sm")}>
              Open the Record entry
            </Door>
          ) : null}
          <Door href={countryReturnHref(nation, origin)} className={buttonClass("secondary", "sm")}>
            Back to {name}
          </Door>
          <Door href={countryActHref(nation, {}, origin)} className={buttonClass("ghost", "sm")}>
            Act again
          </Door>
        </Receipt>
        <section aria-labelledby="act-moved">
          <h2 id="act-moved" className="brief-section__title">
            <Icon name="layerTrust" size={20} /> Where the relationship stands
          </h2>
          <Relationship done={done} nation={nation} />
          <p className="brief-section__note">The map colors each government by its standing toward you.</p>
        </section>
        <section aria-labelledby="act-moved-home">
          <h2 id="act-moved-home" className="brief-section__title">
            <Icon name="graph" size={20} /> What it moved at home
          </h2>
          <Moves moves={moves} none="No national reading moved right away. A foreign government's answer arrives as the weeks run." />
        </section>
      </div>
    </Screen>
  );
}
