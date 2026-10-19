import { apply } from "../../packages/engine/dist/effects.js";
import { servicePhase } from "../../packages/engine/dist/services.js";
import { intelligencePhase } from "../../packages/engine/dist/intelligence.js";
import { inspectorGeneralPhase } from "../../packages/engine/dist/inspectors-general.js";
import { oversightRipeningPhase } from "../../packages/engine/dist/oversight.js";
import { judicialReviewPhase } from "../../packages/engine/dist/judicial-review.js";
import { entryClassOrderSubjects, signOrder } from "../../packages/engine/dist/orders.js";
import { selectDateOfTurn } from "../../packages/engine/dist/clock.js";
import { charterOf } from "../../packages/player-core/dist/index.js";
import { foundFixture } from "./_campaign.mjs";

export const name = "judicial-breadth";
const challenged = { stream: () => ({ key: "judicial-breadth", next: () => 0,
  nextInt: (min) => min, pick: (items) => items[0] }) };

function run(phase, campaign) {
  return phase(campaign).reduce(apply, campaign);
}

/** The same effect-producing phase order the full campaign uses for these systems. */
function week(campaign, court) {
  let next = run(servicePhase, campaign);
  next = run(intelligencePhase, next);
  next = run(inspectorGeneralPhase, next);
  next = run(oversightRipeningPhase, next);
  next = run(court, next);
  const turn = next.turn + 1;
  return { ...next, turn, calendar: selectDateOfTurn(next, turn) };
}

function ready(campaign) {
  const wage = campaign.services?.["wage-complaints"]?.wageComplaint;
  const housing = campaign.services?.["fair-housing-complaints"]?.housingComplaint;
  const surveillance = campaign.security.intelligence.surveillanceIncident;
  return wage?.status === "recovered" && housing?.status === "reconsidered"
    && surveillance?.status === "complied"
    && ["entry-suspension", "wage-hour-enforcement", "fair-housing-enforcement", "unlawful-surveillance"].every((kind) =>
      campaign.judiciary.cases.some((entry) => entry.matter?.kind === kind))
    && ["wage-hour-enforcement", "fair-housing-enforcement", "unlawful-surveillance"].every((kind) =>
      campaign.judiciary.cases.some((entry) => entry.subject?.kind === kind));
}

// Setup assumption: a proclamation needs an observed security threat from the
// country it names. One overt foreign pursuit stands in for that finding; the
// cases and remedies below still come only from the real phases.
function withEntryThreat(campaign) {
  const nation = Object.keys(campaign.nations).find((id) => id !== campaign.founding.nation);
  const pursuit = { id: `pursuit:entry:${nation}`, actor: nation, target: campaign.founding.nation,
    aim: "security", openedTurn: campaign.turn, commitment: 0.7, progress: 0.2,
    rungReached: 2, overt: true, lastActedTurn: campaign.turn, status: "active", beats: [] };
  return { ...campaign, pursuits: { ...campaign.pursuits, [pursuit.id]: pursuit } };
}

/** Actual service, collection, IG and court effects produce every case and its remedy. */
export function build() {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const opening = withEntryThreat(foundFixture({ seedText: `judicial-breadth-${attempt}`, leaderName: "Fixture President" }));
    const signed = signOrder(opening, charterOf(opening), "order-entry-suspension", challenged,
      entryClassOrderSubjects(opening)[0]);
    if (!signed.ok) continue;
    let campaign = apply(opening, signed.packet);
    campaign = { ...campaign, institutions: { ...campaign.institutions,
      "INST-NSA": { ...opening.institutions["INST-NSA"], integrity: 0.3 } } };
    const court = judicialReviewPhase(charterOf(campaign));
    for (let turn = 0; turn < 240 && !ready(campaign); turn += 1) campaign = week(campaign, court);
    if (ready(campaign)) return campaign;
  }
  throw new Error("No seeded campaign produced recovered wage and housing claims plus a completed exposed-surveillance claim");
}
