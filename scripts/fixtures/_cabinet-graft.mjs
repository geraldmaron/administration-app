import { apply } from "../../packages/engine/dist/effects.js";
import { cabinetGraftPackets } from "../../packages/engine/dist/cabinet-graft.js";
import { inspectorGeneralPhase } from "../../packages/engine/dist/inspectors-general.js";
import { matterRipensTurn, oversightRipeningPhase } from "../../packages/engine/dist/oversight.js";
import { selectDateOfTurn, selectTurnOfDate } from "../../packages/engine/dist/clock.js";
import { recomputeApproval } from "../../packages/engine/dist/opinion.js";
import { foundFixture } from "./_campaign.mjs";

const ROLE = "role-defense-minister";
const DEPARTMENT = "INST-DOD";

function run(phase, campaign) {
  return phase(campaign).reduce(apply, campaign);
}

/**
 * Counterfactual setup: enacted 4% military allocation, a corrupt/ambitious
 * Defense Secretary, and 0.72 existing oversight pressure. Those conditions
 * make one steering act and its later discovery deterministic for the fixture;
 * the act, inspector inquiry, and report still come from their engine phases.
 */
function opportunity() {
  const founded = foundFixture({ seedText: "fixture-cabinet-graft", leaderName: "Fixture President" });
  const person = founded.player.cabinet[ROLE];
  if (!person) throw new Error("the founding seated no Defense Secretary");
  const holder = founded.people[person];
  const institution = founded.institutions[DEPARTMENT];
  if (!holder || !institution) throw new Error("the Defense holder or department is absent");
  return recomputeApproval({
    ...founded,
    turn: selectTurnOfDate(founded, { year: 2029, month: 10, day: 1 }),
    calendar: { year: 2029, month: 10, day: 1 },
    player: { ...founded.player, budget: { ...founded.player.budget, military: 0.04 } },
    congress: { ...founded.congress, appropriation: { ...founded.congress.appropriation,
      throughTurn: selectTurnOfDate(founded, { year: 2030, month: 9, day: 30 }),
    } },
    people: { ...founded.people, [person]: { ...holder, base: {
      ...holder.base, integrity: 0, ambition: 1, traits: ["corrupt"],
    } } },
    institutions: { ...founded.institutions, [DEPARTMENT]: { ...institution,
      integrity: 0.75, oversightPressure: 0.72,
    } },
  });
}

/** All three snapshots originate from actual graft, inspector and ripening packets. */
export function graftStages() {
  const before = opportunity();
  const packet = cabinetGraftPackets(before).find((row) => row.provenance?.graft?.institution === DEPARTMENT);
  if (!packet) throw new Error("the enacted Defense allocation produced no graft packet");
  const acted = apply(before, packet);
  const event = acted.ledger.find((row) => row.causal?.graft?.institution === DEPARTMENT);
  if (!event?.causal?.eventId) throw new Error("the graft was not recorded with a causal ID");
  const dueTurn = event.turn + 21;
  const due = { ...acted, turn: dueTurn, calendar: selectDateOfTurn(acted, dueTurn) };
  const opened = run(inspectorGeneralPhase, due);
  const matter = opened.oversight.matters.find((row) => row.causeId === event.causal.eventId);
  if (!matter || matter.stage !== "opened") throw new Error("the Defense inspector did not open the graft matter");
  const gatherAt = matterRipensTurn(matter);
  if (gatherAt === undefined) throw new Error("the graft matter has no gathering date");
  const gatheringTurn = { ...opened, turn: gatherAt, calendar: selectDateOfTurn(opened, gatherAt) };
  const gathering = run(oversightRipeningPhase, gatheringTurn);
  const advanced = gathering.oversight.matters.find((row) => row.id === matter.id);
  if (!advanced || advanced.stage !== "gathering") throw new Error("the graft matter did not gather");
  const reportAt = matterRipensTurn(advanced);
  if (reportAt === undefined) throw new Error("the graft matter has no report date");
  const reportTurn = { ...gathering, turn: reportAt, calendar: selectDateOfTurn(gathering, reportAt) };
  const reported = run(oversightRipeningPhase, reportTurn);
  const finding = reported.oversight.matters.find((row) => row.id === matter.id);
  if (!finding || finding.stage !== "reported" || !finding.finding) throw new Error("the inspector filed no graft finding");
  return { opened, reported };
}
