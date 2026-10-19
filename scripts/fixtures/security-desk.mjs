// The security desk with something on every ledger: forty-eight fighters
// standing behind the guarantee to Poland and an authorization against Iran
// already voted (both from war-joined), then a written finding on Iran briefed
// to the Gang of Eight, a standing tasking of the NSA against Russia, and an
// assessment of Russia's intent on file.
//
// Every piece goes through the engine's own act, so the save is one a player
// could have reached.
import { apply } from "../../packages/engine/dist/effects.js";
import { commissionAssessment } from "../../packages/engine/dist/assessments.js";
import { signFinding } from "../../packages/engine/dist/findings.js";
import { taskCollection } from "../../packages/engine/dist/intelligence.js";
import { build as warJoined } from "./war-joined.mjs";

export const name = "security-desk";

function packetOf(result, what) {
  if (!result.ok) throw new Error(`${what} was refused: ${result.reason}`);
  return result.packet;
}

export function build() {
  const base = warJoined();
  const signed = apply(base, packetOf(signFinding(base, "Disrupt a weapons shipment bound for an armed group", "IRN", "written", "gang-of-eight"), "the finding on Iran"));
  const tasked = apply(signed, packetOf(taskCollection(signed, { element: "IC-NSA", discipline: "sigint", targetKind: "foreign-nation", target: "RUS", question: "Where are Russia's reserves moving?" }), "the tasking"));
  const judged = apply(tasked, packetOf(commissionAssessment(tasked, "intent", "RUS"), "the assessment"));
  if (judged.security.covert.findings.length !== 1) throw new Error("the finding on Iran was not signed");
  if (Object.keys(judged.security.intelligence.taskings).length !== 1) throw new Error("the tasking was not opened");
  if (judged.security.assessments.length < 1) throw new Error(`the assessment was not commissioned: ${judged.security.assessments.length}`);
  return judged;
}
