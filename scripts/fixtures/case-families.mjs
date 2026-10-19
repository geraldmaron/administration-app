// Every case family on the Desk at once: a bill awaiting signature, a nominee
// with a finding against them, the appropriations deadline inside its closing
// weeks, a governor's relief request (with the Guard ask it carries), and an
// allied government invoking a compact.
//
// Built on `hurricane-request`, whose cyclone opens the relief claim through
// the engine's own onset and obligation phases. The other four are staged
// through `apply()` with the engine's own effect shapes and acts, because a
// seed on which all five arrive in the same week is not a draw the fixture
// can wait for: the bill and the conflict are whole records set by their own
// effects, the nomination is opened by `openNomination`, and the funding book
// is moved as `lapse.mjs` moves it.
import { apply } from "../../packages/engine/dist/effects.js";
import { openNomination, selectNominableFor } from "../../packages/engine/dist/nomination.js";
import { selectCompactCalls } from "../../packages/engine/dist/compacts.js";
import { caseDetails } from "../../packages/player-core/dist/index.js";
import { build as hurricane } from "./hurricane-request.mjs";

export const name = "case-families";

const OFFICE = "OFF-OMB-DIRECTOR";

function world(campaign, summary, effects) {
  return apply(campaign, { source: "simulate", actor: "world", turn: campaign.turn, narration: { summary }, effects });
}

function withBill(campaign) {
  const bill = {
    id: `bill:act-tax-relief-and-growth:${campaign.turn}`,
    act: "act-tax-relief-and-growth",
    title: "Tax Relief and Growth Act",
    sponsor: "bipartisan",
    introducedTurn: campaign.turn,
    status: "on-the-desk",
    presentedOn: campaign.calendar,
    passage: [
      { chamber: "house", yeas: 231, nays: 199, required: 218, passed: true },
      { chamber: "senate", yeas: 61, nays: 39, required: 60, passed: true },
    ],
  };
  return world(campaign, "The Tax Relief and Growth Act reaches the desk.", [{ kind: "bill", set: bill }]);
}

function withNomineeInTrouble(campaign) {
  const nominee = selectNominableFor(campaign, OFFICE)[0];
  if (!nominee) throw new Error(`nobody is nominable for ${OFFICE}`);
  const opened = openNomination(campaign, OFFICE, nominee.base.id);
  if (!opened.ok) throw new Error(opened.reason);
  const after = apply(campaign, opened.packet);
  const entry = Object.entries(after.nominations).find(([, item]) => item.office === OFFICE);
  if (!entry) throw new Error("openNomination opened no nomination for OMB");
  const [id, nomination] = entry;
  // A finding is what turns a nomination into a decision the President owes.
  const found = { ...nomination, controversies: ["Unpaid federal taxes from a consulting business"] };
  return { ...after, nominations: { ...after.nominations, [id]: found } };
}

function fundedThroughNextWeek(campaign) {
  return { ...campaign, congress: { ...campaign.congress, appropriation: { ...campaign.congress.appropriation, throughTurn: campaign.turn + 1 } } };
}

function withAllyAttacked(campaign) {
  const conflict = {
    id: `war:RUS:POL:${campaign.turn}`,
    aggressor: "RUS",
    defender: "POL",
    joined: { aggressor: [], defender: [] },
    startedTurn: campaign.turn,
    cause: "Russian forces cross into Poland from Belarus.",
    intensity: 0.6,
    warSupport: { aggressor: 0.6, defender: 0.7 },
    exhaustion: { aggressor: 0.1, defender: 0.1 },
    status: "active",
    beats: [{ turn: campaign.turn, description: "Russian forces cross into Poland from Belarus." }],
  };
  return world(campaign, conflict.cause, [{ kind: "conflict", set: conflict }]);
}

export function build() {
  const campaign = withAllyAttacked(fundedThroughNextWeek(withNomineeInTrouble(withBill(hurricane()))));
  if (selectCompactCalls(campaign).length === 0) throw new Error("the attack on an ally raised no compact call");
  const kinds = new Set(caseDetails(campaign).map((row) => row.kindLabel));
  const missing = ["Bill", "Nomination", "Budget", "Emergency", "World request"].filter((kind) => !kinds.has(kind));
  if (missing.length > 0) throw new Error(`the fixture raises no case for: ${missing.join(", ")}`);
  return campaign;
}
