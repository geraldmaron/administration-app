import type { PressureSource, ScenarioClass, ScenarioSeverity } from "@admin/content";
export declare function classPhrase(kind: ScenarioClass): string;
export declare function classLabel(kind: ScenarioClass): string;
export declare function severityWord(severity: ScenarioSeverity): string;
/** The line under a waiting decision: its weight and kind in a plain sentence, the all-caps tag left to the chip. */
export declare function waitingReason(severity: ScenarioSeverity, kind: ScenarioClass): string;
export declare function pressureSourceLabel(source: PressureSource): string;
