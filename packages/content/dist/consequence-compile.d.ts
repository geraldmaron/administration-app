import type { ConsequenceCard } from "@admin/engine";
import type { ConsequenceDef } from "./consequence.js";
export declare function compileConsequence(def: ConsequenceDef): ConsequenceCard;
export declare function compileConsequences(defs: readonly ConsequenceDef[]): readonly ConsequenceCard[];
