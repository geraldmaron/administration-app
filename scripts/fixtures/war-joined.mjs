// A war between two other governments that the United States can enter, with
// the War Powers record of an earlier strike open beside it and forces already
// promised abroad.
//
// Built the way a term would get here: the defense appropriation raised in the
// first week, a security guarantee to Poland with forty-eight fighters standing
// behind it, Congress asked for and granting an authorization against Iran,
// air strikes on Iran flown under it and reported, weeks for the air force to
// grow on the new money, and then Russia invading Ukraine. The strike was
// authorized, so its report stays on the books without a withdrawal clock and
// the office's own authority still reaches the new war. The browser suite
// enters that war from this state, so the save carries the moment before the
// join rather than after it.
import { apply } from "../../packages/engine/dist/effects.js";
import { projectBudgetDraft, enactBudget } from "../../packages/engine/dist/budget-draft.js";
import { accountCap, selectBudget } from "../../packages/engine/dist/budget.js";
import { selectForceBench } from "../../packages/engine/dist/capacity.js";
import { openConflict } from "../../packages/engine/dist/conflicts.js";
import { selectJoinableConflicts } from "../../packages/engine/dist/war-entry.js";
import { landRung } from "../../packages/engine/dist/__fixtures__/ladder.js";
import { createRngStreams } from "../../packages/engine/dist/rng.js";
import { issueForceAuthorization, resolveDueAuthorizations } from "../../packages/engine/dist/force-authorization.js";
import { selectAuthorizationAgainst } from "../../packages/engine/dist/state-selectors.js";
import { fileWarPowersReport } from "../../packages/engine/dist/war-powers-report.js";
import { warPowersBeforeJoin } from "../../packages/player-core/dist/index.js";
import { advanceWeeks, foundFixture } from "./_campaign.mjs";

export const name = "war-joined";

const IRAN = "IRN";
const POLAND = "POL";
const RUSSIA = "RUS";
const UKRAINE = "UKR";

function done(result, what) {
  if (!result.ok) throw new Error(`${what} was refused: ${result.reason ?? result.missingCapability}`);
  return result.packet;
}

function raiseDefense(campaign) {
  const draft = projectBudgetDraft(campaign, { military: accountCap(campaign, "military") });
  if (!draft.ok) throw new Error(`the defense appropriation could not be drafted: ${draft.reason}`);
  if (draft.candidate.allocation.military <= selectBudget(campaign).military) throw new Error("the defense appropriation did not rise");
  return apply(campaign, done(enactBudget(campaign, draft.candidate), "the defense appropriation"));
}

function authorizeAgainstIran(campaign) {
  const asked = apply(campaign, done(issueForceAuthorization(campaign, IRAN), "asking Congress for force against Iran"));
  // The vote is taken where the Desk's Continue takes it, once its date has passed.
  const voted = resolveDueAuthorizations(advanceWeeks(asked, 1)).campaign;
  if (!selectAuthorizationAgainst(voted, IRAN)) throw new Error("Congress did not authorize force against Iran");
  return voted;
}

function strikeIran(campaign) {
  const struck = apply(campaign, done(landRung(campaign, campaign.founding.nation, IRAN, "military", 4, createRngStreams(campaign.seed)), "the strike on Iran"));
  const obligation = struck.security.warPowers.obligations.find((entry) => entry.target === IRAN);
  if (!obligation) throw new Error("the strike on Iran opened no War Powers obligation");
  return apply(struck, done(fileWarPowersReport(struck, obligation.id, "the authorization Congress voted", "Air strikes on missile sites", 1), "the report on Iran"));
}

function guaranteePoland(campaign) {
  return apply(campaign, done(landRung(campaign, campaign.founding.nation, POLAND, "assistance", 5, createRngStreams(campaign.seed)), "the guarantee to Poland"));
}

function russiaInvadesUkraine(campaign) {
  const war = openConflict(RUSSIA, UKRAINE, campaign.turn, "Russia invades Ukraine.");
  return apply(campaign, {
    source: "simulate",
    actor: "world",
    turn: campaign.turn,
    narration: { summary: war.cause },
    effects: [{ kind: "conflict", set: war }],
  });
}

function assertBoard(campaign) {
  const us = campaign.founding.nation;
  const war = Object.values(campaign.conflicts).find((conflict) => conflict.aggressor === RUSSIA && conflict.defender === UKRAINE && conflict.status === "active");
  if (!war) throw new Error("Russia's war on Ukraine is not on the board");
  if (!selectJoinableConflicts(campaign, us).some((option) => option.conflict.id === war.id && option.side === "defender")) {
    throw new Error("the United States cannot enter Ukraine's defense from this state");
  }
  const preview = warPowersBeforeJoin(campaign, war.id, "defender");
  if (!preview || preview.refusal || !preview.withdrawal || !preview.deterrence) throw new Error(`the join preview is not a clean one: ${JSON.stringify(preview)}`);
  const guarantee = Object.values(campaign.commitments).find((row) => row.target.id === POLAND && row.status === "active" && row.source.kind === "orderOfBattle");
  if (guarantee?.source.unitType !== "air.fighter" || guarantee.source.count !== 48) throw new Error("the guarantee to Poland holds no forty-eight fighters");
  const fighters = selectForceBench(campaign, us, "air", "air.fighter");
  if (!fighters || fighters.fielded <= fighters.establishment) throw new Error(`the raised appropriation bought no fighters: ${JSON.stringify(fighters)}`);
  const iran = campaign.security.warPowers.obligations.find((entry) => entry.target === IRAN);
  if (!iran?.description.startsWith("Air strikes against Iran") || iran.terminated) throw new Error("the War Powers record does not carry the strike on Iran by name");
}

export function build() {
  const sworn = foundFixture({ seedText: "fixture-war-joined", leaderName: "Fixture President" });
  const armed = strikeIran(authorizeAgainstIran(guaranteePoland(raiseDefense(sworn))));
  const campaign = russiaInvadesUkraine(advanceWeeks(armed, 7));
  assertBoard(campaign);
  return campaign;
}
