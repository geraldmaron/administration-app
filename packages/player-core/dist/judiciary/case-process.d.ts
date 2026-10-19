import { prospectiveOrderAuthority, type Campaign } from "@admin/engine";
import type { CourtDate } from "./court-system";
export type CaseStepId = "filed" | "interim" | "district" | "appeal" | "supreme" | "final";
export type CaseStepState = "done" | "now" | "possible" | "not-reached";
export type CaseStep = {
    readonly id: CaseStepId;
    readonly state: CaseStepState;
    readonly moments: readonly {
        readonly date: string;
        readonly text: string;
    }[];
};
/** What the challenged action is governed by today, from the weakest restraint to the final word. */
export type CaseGoverning = {
    readonly kind: "final";
    readonly upheld: boolean;
    readonly dismissed: boolean;
} | {
    readonly kind: "circuit";
    readonly setAside: boolean;
} | {
    readonly kind: "stay-granted";
} | {
    readonly kind: "lower-in-force";
    readonly setAside: boolean;
} | {
    readonly kind: "lower-stayed";
    readonly setAside: boolean;
} | {
    readonly kind: "interim";
} | {
    readonly kind: "none";
};
export type CaseProcess = {
    readonly steps: readonly CaseStep[];
    readonly current?: CaseStepId;
    readonly next?: CourtDate;
    readonly response?: CourtDate;
    /** `superseded` when a later judgment replaced the one the stay was about. */
    readonly stay?: {
        readonly status: "pending" | "granted" | "denied";
        readonly requested: string;
        readonly decided?: string;
        readonly superseded: boolean;
    };
    readonly governing: CaseGoverning;
    /** The order's own authority to operate, for a challenge to an executive order. */
    readonly operative?: ReturnType<typeof prospectiveOrderAuthority>;
    readonly remanded: boolean;
};
export declare function caseProcess(campaign: Campaign, id: string): CaseProcess | undefined;
