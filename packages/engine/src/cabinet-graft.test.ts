import { describe, expect, it } from "vitest";
import type { Person, RoleId } from "@admin/world";
import { foundedForBalance } from "./balance-harness.js";
import { apply } from "./effects.js";
import { cabinetGraftPackets, graftDisclosed, purchasingOpportunity } from "./cabinet-graft.js";
import { inspectorGeneralPhase, auditWarrant } from "./inspectors-general.js";
import { matterRipensTurn, oversightRipeningPhase, selectInspector } from "./oversight.js";
import { createSave, loadSave } from "./save.js";
import { datedScandalIdentities } from "./scandal-origins.js";
import type { Campaign } from "./state.js";

const DEFENSE = "role-defense-minister" as RoleId;
const DEPARTMENT = "INST-DOD";

function staged(budget: number, person: Partial<Person> = {}, pressure = 0): Campaign {
  const founded = foundedForBalance("cabinet-graft-proof").campaign;
  const id = founded.player.cabinet[DEFENSE]!;
  const holder = founded.people[id]!;
  const runtime = founded.institutions[DEPARTMENT as never]!;
  return {
    ...founded, turn: 40, calendar: { year: 2029, month: 10, day: 1 },
    player: { ...founded.player, budget: { ...founded.player.budget, military: budget } },
    congress: { ...founded.congress, appropriation: { ...founded.congress.appropriation, throughTurn: 300 } },
    people: { ...founded.people, [id]: { ...holder, base: { ...holder.base, integrity: 0, ambition: 1, traits: ["corrupt"], ...person } } },
    institutions: { ...founded.institutions, [DEPARTMENT]: { ...runtime, integrity: 0.75, oversightPressure: pressure } },
  };
}

function graft(state: Campaign) {
  return cabinetGraftPackets(state).find((packet) => packet.provenance?.graft?.institution === DEPARTMENT);
}

describe("contract steering and inspector discovery", () => {
  it("requires an enacted purchasing line and prices the same chair by actual access and scrutiny", () => {
    const none = staged(0);
    const small = staged(0.004);
    const large = staged(0.04);
    expect(purchasingOpportunity(none, DEFENSE)).toBeUndefined();
    expect(graft(none)).toBeUndefined();
    const lapsed = { ...large, congress: { ...large.congress,
      appropriation: { ...large.congress.appropriation, throughTurn: 1 } } };
    expect(purchasingOpportunity(lapsed, DEFENSE)).toBeUndefined();
    expect(purchasingOpportunity(large, DEFENSE)!.annualPurchasing).toBeGreaterThan(purchasingOpportunity(small, DEFENSE)!.annualPurchasing);
    const low = graft(small)!;
    const high = graft(large)!;
    expect(high.provenance!.decision!.question).toBe("steer-contracts");
    expect(high.provenance!.decision!.score).toBeGreaterThan(low.provenance!.decision!.score);
    expect(high.provenance!.graft!.annualPurchasing).toBeGreaterThan(low.provenance!.graft!.annualPurchasing);
    const lowAfter = apply(small, low);
    const highAfter = apply(large, high);
    expect(auditWarrant(highAfter.institutions[DEPARTMENT as never]!)).toBeGreaterThan(auditWarrant(lowAfter.institutions[DEPARTMENT as never]!));
    const scrutiny = (state: Campaign) => ({ ...state, institutions: { ...state.institutions,
      [DEPARTMENT]: { ...state.institutions[DEPARTMENT as never]!, oversightPressure: 0.72 } } });
    const opensDefense = (state: Campaign) => inspectorGeneralPhase(state).flatMap((packet) => packet.effects)
      .some((effect) => effect.kind === "oversight" && effect.matters?.some((matter) =>
        matter.origin.kind === "inspector-general" && matter.origin.institution === DEPARTMENT));
    expect(opensDefense(scrutiny(lowAfter))).toBe(false);
    expect(opensDefense(scrutiny(highAfter))).toBe(true);
    const scrutinized = graft(staged(0.04, {}, 0.8));
    expect(scrutinized!.provenance!.decision!.score).toBeLessThan(high.provenance!.decision!.score);
    expect(cabinetGraftPackets({ ...large, calendar: { year: 2029, month: 10, day: 8 } })).toEqual([]);
  });

  it("retains the responsible person and funding snapshot through a successor and save, until the inspector reports", () => {
    const before = staged(0.04);
    const packet = graft(before)!;
    const steerer = packet.provenance!.graft!.person;
    const acted = apply(before, packet);
    expect(graft(acted)).toBeUndefined();
    const event = acted.ledger.at(-1)!;
    expect(event.causal?.graft?.person).toBe(steerer);
    expect(graftDisclosed(acted, event)).toBe(false);
    const successor = Object.keys(acted.people).find((id) => id !== steerer)!;
    const changed = { ...acted, player: { ...acted.player, cabinet: { ...acted.player.cabinet, [DEFENSE]: successor } } } as Campaign;
    expect(graft(changed)).toBeUndefined();
    const restored = loadSave(createSave(changed));
    const original = restored.ledger.find((entry) => entry.causal?.eventId === event.causal?.eventId)!;
    expect(original.causal?.graft).toBeDefined();
    expect(original.causal?.graft).toEqual(event.causal?.graft);
    expect(graftDisclosed(restored, original)).toBe(false);
    const inspector = selectInspector(restored, DEPARTMENT as never);
    expect(inspector).toBeDefined();
    const early = { ...restored, turn: event.turn + 20 };
    expect(inspectorGeneralPhase(early).flatMap((row) => row.effects).some((effect) =>
      effect.kind === "oversight" && effect.matters?.some((row) => row.causeId === event.causal?.eventId))).toBe(false);
    const watched = { ...early, institutions: { ...early.institutions,
      [DEPARTMENT]: { ...early.institutions[DEPARTMENT as never]!, oversightPressure: 1 } } };
    expect(inspectorGeneralPhase(watched).flatMap((row) => row.effects).some((effect) =>
      effect.kind === "oversight" && effect.matters?.some((row) => row.causeId === event.causal?.eventId))).toBe(true);
    const due = { ...restored, turn: event.turn + 40 };
    const removed = { ...due, oversight: { ...due.oversight, inspectors: { ...due.oversight.inspectors,
      [DEPARTMENT]: { ...inspector!, removedTurn: due.turn } } } };
    expect(inspectorGeneralPhase(removed).flatMap((row) => row.effects).some((effect) =>
      effect.kind === "oversight" && effect.matters?.some((row) => row.causeId === event.causal?.eventId))).toBe(false);
    const opening = inspectorGeneralPhase(due);
    expect(opening[0]?.narration.summary).toContain("suspected irregularities");
    expect(opening[0]?.narration.summary).not.toContain(restored.people[steerer as never]!.base.name);
    const opened = opening.reduce(apply, due);
    const matter = opened.oversight.matters.find((row) => row.causeId === event.causal?.eventId);
    expect(matter).toBeDefined();
    expect(loadSave(createSave(opened)).oversight.matters.some((row) => row.causeId === event.causal?.eventId)).toBe(true);
    expect(matter?.subject).not.toContain(restored.people[steerer as never]!.base.name);
    expect(matter?.subject).not.toContain(restored.people[successor as never]!.base.name);
    expect(graftDisclosed(opened, original)).toBe(false);
    const gatheringTurn = { ...opened, turn: matterRipensTurn(matter!)! };
    const gathering = oversightRipeningPhase(gatheringTurn).reduce(apply, gatheringTurn);
    const gatheringMatter = gathering.oversight.matters.find((row) => row.id === matter!.id)!;
    expect(gatheringMatter.beats.at(-1)?.description).not.toContain(restored.people[steerer as never]!.base.name);
    const reportTurn = { ...gathering, turn: matterRipensTurn(gatheringMatter)! };
    const reportPackets = oversightRipeningPhase(reportTurn);
    expect(reportPackets[0]?.provenance?.causeIds).toContain(event.causal?.eventId);
    const reported = reportPackets.reduce(apply, reportTurn);
    const finding = reported.oversight.matters.find((row) => row.id === matter!.id)!;
    expect(finding.finding).toContain(restored.people[steerer as never]!.base.name);
    expect(finding.finding).not.toContain(restored.people[successor as never]!.base.name);
    expect(graftDisclosed(reported, original)).toBe(true);
    expect(datedScandalIdentities(reported).find((story) => story.origin.kind === "inspector-general"
      && story.origin.matterId === matter!.id)?.implicated?.person).toBe(steerer);
  });
});
