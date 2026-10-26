import { describe, expect, it } from "vitest";
import { AA_NON_TEXT, AA_NORMAL_TEXT, AAA_NORMAL_TEXT, composite, contrastRatio } from "./contrast";
import { DESK_THEMES, desk, isContrastTheme, type DeskRoles } from "./desk";

// Every text and mark pairing a usage note in desk.ts names, measured in all
// four themes. Text holds 4.5:1 (7:1 in the contrast themes); boundaries, the
// focus ring, pips and party marks hold 3:1. A translucent ground is measured
// composited over the plane it sits on.

type Role = keyof DeskRoles;
type Pair = readonly [Role, Role];

const TEXT: readonly Pair[] = [
  ["ink", "ground"], ["ink", "plane"], ["ink", "raised"], ["ink", "raisedHover"], ["ink", "overlay"], ["ink", "selected"], ["ink", "pressed"],
  ["ink2", "ground"], ["ink2", "plane"], ["ink2", "raised"], ["ink2", "overlay"],
  ["ink3", "plane"], ["ink3", "raised"],
  ["signal", "plane"], ["signal", "raised"], ["onSignal", "signalFill"], ["onSignal", "signalFillHover"],
  ["brass", "plane"], ["brass", "raised"], ["onBrass", "brassFill"],
  ["alarm", "plane"], ["alarm", "raised"], ["onAlarm", "alarmFill"], ["onAlarm", "alarmFillHover"],
  ["info", "plane"], ["info", "infoWash"], ["success", "plane"], ["success", "successWash"], ["warning", "plane"], ["warning", "warningWash"],
  ["danger", "plane"], ["danger", "dangerWash"], ["pending", "plane"], ["pending", "pendingWash"],
  ["attentionHeldPip", "raised"], ["attentionWaitingPip", "raised"],
  ["paperInk", "paper"], ["paperInk2", "paper"],
  ["situationInk", "situationPlane"], ["situationInk2", "situationPlane"], ["situationAccent", "situationPlane"],
  ["onSituationAction", "situationActionFill"], ["onSituationAction", "situationActionFillHover"],
];

const MARKS: readonly Pair[] = [
  ["lineStrong", "plane"], ["lineStrong", "raised"], ["focus", "ground"], ["focus", "plane"], ["focus", "raised"],
  ["attentionClearPip", "plane"], ["attentionWaitingPip", "plane"], ["attentionHeldPip", "plane"],
  ["paperRuleStrong", "paper"], ["partyDem", "plane"], ["partyRep", "plane"], ["partyInd", "plane"],
];

function ratio(roles: DeskRoles, [ink, ground]: Pair): number {
  return contrastRatio(composite(roles[ink], roles.plane), composite(roles[ground], roles.plane));
}

describe("desk contrast", () => {
  for (const id of DESK_THEMES) {
    const roles = desk[id];
    const floor = isContrastTheme(id) ? AAA_NORMAL_TEXT : AA_NORMAL_TEXT;

    it(`${id}: every text pair clears ${floor}:1`, () => {
      for (const pair of TEXT) expect(ratio(roles, pair), `${pair[0]} on ${pair[1]}`).toBeGreaterThanOrEqual(floor);
    });

    it(`${id}: every boundary, focus ring and meaningful mark clears 3:1`, () => {
      for (const pair of MARKS) expect(ratio(roles, pair), `${pair[0]} on ${pair[1]}`).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });
  }

  it("gives every theme the same roles", () => {
    const keys = Object.keys(desk.night).sort();
    for (const id of DESK_THEMES) expect(Object.keys(desk[id]).sort(), id).toEqual(keys);
  });
});
