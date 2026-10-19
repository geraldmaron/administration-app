/**
 * Semantic role contract for the token audit.
 *
 * Declares every AC role, which chroma lane it belongs to, which live token
 * it maps to, and which non-color cues must ride with it. Catalog roles are
 * fully mapped; consumer migration continues beyond this file.
 */
export type SemanticLane = "interaction" | "stance" | "danger" | "party" | "identity" | "classification" | "ownership" | "chrome";
/** Non-color channels that must accompany a role so color is never the only cue. */
export type NonColorCue = "icon" | "label" | "shape" | "stroke";
export type ContractRoleId = "interactive" | "selected" | "focus" | "favorable" | "caution" | "adverse" | "destructive" | "informational" | "democratic" | "republican" | "independent" | "institutional" | "classified" | "playerOwned" | "disabled" | "muted";
export type RoleMappingStatus = "mapped" | "gap";
export type SemanticRoleContract = {
    readonly id: ContractRoleId;
    /** The role's display label (Democratic / independent/other / player-owned). */
    readonly label: string;
    readonly lane: SemanticLane;
    readonly status: RoleMappingStatus;
    /**
     * Live token path when mapped; null when the role is a declared gap.
     * Paths are documentation strings, not runtime lookups.
     */
    readonly tokenPath: string | null;
    /** Resolved hex (or rgba) when mapped; null when gap. */
    readonly hex: string | null;
    readonly nonColorCues: readonly NonColorCue[];
    /** Why a gap exists, or how related roles share a token. */
    readonly note?: string;
};
/**
 * Lanes that must never share one hex across unrelated meanings.
 * Identity / chrome / ownership / classification are audited separately.
 */
export declare const EXCLUSIVE_LANES: readonly ["interaction", "danger", "party"];
export type ExclusiveLane = (typeof EXCLUSIVE_LANES)[number];
/**
 * Role pairs that may share one hex because they are the same interaction
 * meaning at different states — not a conflation across lanes.
 */
export declare const VALID_SHARED_HEX_PAIRS: ReadonlyArray<readonly [ContractRoleId, ContractRoleId]>;
/**
 * Roles whose contract must declare at least one non-color cue (interactive
 * affordances and meaning-bearing states).
 */
export declare const CUE_REQUIRED_ROLES: ReadonlySet<ContractRoleId>;
export declare const SEMANTIC_ROLE_CONTRACT: ReadonlyArray<SemanticRoleContract>;
export declare const SEMANTIC_ROLE_IDS: readonly ContractRoleId[];
export declare function roleById(id: ContractRoleId): SemanticRoleContract;
/** Live hex for a mapped role — consumers paint from the contract, not ad-hoc ramps. */
export declare function rolePaint(id: ContractRoleId): string;
/**
 * Stance reading ink via the contract. Neutral is not an AC role — it stays on
 * `color.stance.neutral` so a fact chip does not borrow muted/disabled chrome.
 */
export declare function stanceRoleInk(stance: "favorable" | "neutral" | "caution" | "adverse"): string;
export declare function isValidSharedHexPair(a: ContractRoleId, b: ContractRoleId): boolean;
