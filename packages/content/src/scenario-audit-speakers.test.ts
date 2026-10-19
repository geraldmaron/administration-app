import { describe, expect, it } from "vitest";
import { auditPasses, auditScenarios, type ScenarioFinding } from "./scenario-audit.js";
import { auditSpeakerDepartments } from "./scenario-audit-speakers.js";
import { CORE_SCENARIOS } from "./packs/core.js";
import { PILOT_SCENARIOS } from "./packs/pilot.js";
import type { ScenarioDef, ScenarioReply } from "./scenario.js";
import type { ScenarioSpeakerRoleHint } from "./scenario-speaker.js";

// The cases are the ones the finding was raised on, chosen by hand: the
// Secretary of the Interior voicing a riot, which is a police ministry's brief
// in other constitutions and no part of a lands department's in Washington.

const LINE = "The duty officer wrote it up at once and the paperwork went upstairs two hours later.";

function spokenBy(hint: ScenarioSpeakerRoleHint, scenarioClass: ScenarioDef["class"], rejoinder?: ScenarioSpeakerRoleHint): ScenarioDef {
  const base = CORE_SCENARIOS[0]!;
  const first = base.replies.findIndex((reply) => reply.commitment.kind === "position");
  const replies = base.replies.map((reply, index): ScenarioReply => {
    if (reply.commitment.kind !== "position") {
      const authored = reply.commitment.rejoinder;
      return authored ? { ...reply, commitment: { ...reply.commitment, rejoinder: { ...authored, speaker: { kind: "narrator" as const } } } } : reply;
    }
    const speaker = index === first && rejoinder ? { kind: "cabinet" as const, roleHint: rejoinder } : { kind: "narrator" as const };
    return { ...reply, commitment: { ...reply.commitment, rejoinder: { speaker, text: LINE } } };
  });
  return { ...base, class: scenarioClass, opening: [{ speaker: { kind: "cabinet", roleHint: hint }, text: LINE }], replies };
}

function mismatches(defs: readonly ScenarioDef[]): ScenarioFinding[] {
  const found: ScenarioFinding[] = [];
  auditSpeakerDepartments(defs, { push: (finding) => found.push(finding as ScenarioFinding) });
  return found;
}

describe("a department speaking outside its brief", () => {
  it("warns once per beat, naming the chair and the room that owns the week", () => {
    const found = mismatches([spokenBy("interior", "unrest", "education")]);
    expect(found.map((finding) => [finding.kind, finding.severity])).toEqual([
      ["speaker-department-mismatch", "warning"],
      ["speaker-department-mismatch", "warning"],
    ]);
    expect(found[0]!.message).toContain("Secretary of the Interior");
    expect(found[0]!.message).toContain("Secretary of Homeland Security");
    expect(found[1]!.message).toContain("rejoinder");
  });

  it("says nothing when the department has standing in the week, or when nobody from the cabinet speaks", () => {
    expect(mismatches([spokenBy("homeland", "unrest", "justice")])).toEqual([]);
    expect(mismatches([spokenBy("interior", "disaster")])).toEqual([]);
  });

  it("never refuses a batch: the finding is a warning even where it fires", () => {
    const findings = auditScenarios([spokenBy("interior", "unrest")]);
    expect(findings.filter((finding) => finding.kind === "speaker-department-mismatch")).not.toHaveLength(0);
    expect(findings.filter((finding) => finding.kind === "speaker-department-mismatch").every((finding) => finding.severity === "warning")).toBe(true);
  });
});

describe("the bundled packs, as the writers' room reads them", () => {
  it("reports the count and passes every mismatch as a warning", () => {
    const shipped = [...CORE_SCENARIOS, ...PILOT_SCENARIOS];
    const found = mismatches(shipped);
    console.info(`[speaker-department-mismatch] ${found.length} beats across ${shipped.length} bundled scenarios`);
    expect(found.every((finding) => finding.severity === "warning")).toBe(true);
    expect(auditPasses(found)).toBe(true);
  });
});

describe("a memo's declared responsible office", () => {
  it("warns when the first speaker is not the office the memo names", () => {
    const def = { ...spokenBy("finance", "economy"), responsibleOffice: "commerce" } as ScenarioDef;
    expect(mismatches([def]).map((finding) => finding.kind)).toContain("speaker-not-responsible-office");
  });

  it("is quiet when the first speaker is the declared office", () => {
    const def = { ...spokenBy("finance", "economy"), responsibleOffice: "finance" } as ScenarioDef;
    expect(mismatches([def]).map((finding) => finding.kind)).not.toContain("speaker-not-responsible-office");
  });
});
