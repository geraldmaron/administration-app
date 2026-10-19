import type { ScenarioDef } from "./scenario.js";
import type { FindingSink } from "./scenario-audit-cohorts.js";
export declare function auditSpeakerDepartments(defs: readonly ScenarioDef[], findings: FindingSink): void;
/**
 * The kinds this family raises. A batch that asserts zero findings excludes
 * them and counts them instead, the way it treats the grounding family: they
 * are the writers' room's work list, not a reason to refuse a pack.
 */
export declare const SPEAKER_FINDING_KINDS: ReadonlySet<string>;
