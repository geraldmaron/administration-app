import type { StateId } from "../schemas/state.js";
export type StateDemographics = {
    readonly race: Readonly<Record<"race-hispanic" | "race-black" | "race-asian" | "race-white" | "race-other", number>>;
    readonly sex: Readonly<Record<"sex-female" | "sex-male", number>>;
    readonly nativity: Readonly<Record<"foreign-born" | "us-born", number>>;
    readonly disability: Readonly<Record<"with-disability" | "no-disability", number>>;
    readonly veteran: Readonly<Record<"veteran" | "non-veteran", number>>;
};
export declare const STATE_DEMOGRAPHICS: Readonly<Record<StateId, StateDemographics>>;
