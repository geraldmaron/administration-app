import type { Campaign } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
/**
 * One board per band the batch gates on. Each carries only its own band, so a
 * scenario gated on two readings at once is reachable only if some board holds
 * both — which a single-reading board never does. That is deliberate: two
 * pulse gates together are a claim about a specific week, and the writer who
 * makes it hands the gate a board that has it, or drops one.
 */
export declare function pulseBoards(defs: readonly ScenarioDef[]): readonly Campaign[];
