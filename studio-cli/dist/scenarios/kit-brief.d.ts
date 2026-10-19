import { type ScenarioBriefSpec } from "./brief.js";
export type KitCast = ScenarioBriefSpec["cast"];
/**
 * Every cast an outside author may pick: the schema's own list, less "nation".
 * A named-nation cast is a set-piece, which needs an owner and a reason the
 * kit cannot supply, so it stays an in-repo decision.
 */
export declare const KIT_CASTS: readonly KitCast[];
export declare function kitBrief(): string;
export declare function kitCatalog(): string;
export declare function kitDirectors(): string;
