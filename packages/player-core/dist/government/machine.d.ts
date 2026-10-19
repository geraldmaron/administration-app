import { type InstitutionDef, type Nomination } from "@admin/engine";
export * from "./machine-white-house.js";
export * from "./machine-readings.js";
export { staffingChips, type StaffingChip } from "../institution/office-chips.js";
/**
 * How much of a body the President actually commands.
 *
 * The wording is deliberately about the President rather than about the body:
 * "independent" is a property of the agency, but what the player needs to know
 * is what happens when they pick up the phone.
 */
export type Command = "directed" | "arms-length" | "independent";
export declare const COMMAND_LABEL: Readonly<Record<Command, string>>;
export declare function commandOf(def: InstitutionDef): Command;
/**
 * The cabinet in the order it actually sits, and its three real divisions.
 *
 * Sixteen chairs in one undifferentiated column is a wall, and it throws away
 * structure the dataset already carries: `OfficeDef.cabinetRank` is the order
 * of precedence, and of succession among the executive officers once the
 * Vice President, the Speaker and the president pro tempore are passed, and it
 * is the order a president, a protocol officer and a seating plan all use. The
 * three bands below are not a visual device — they are the divisions that
 * change what the seat is. The first four departments are the ones every
 * administration has had and the ones a president actually convenes when a
 * week goes wrong; the rest are the domestic departments; and the last band is
 * the officers who sit at the table without a department behind them, which is
 * a different job.
 */
export type CabinetBand = "inner" | "departments" | "without-portfolio";
/** Where a cabinet chair sits in the order of precedence, if it has one. */
export declare function cabinetRankOf(role: string): number | undefined;
/**
 * Where a nomination is, in the words a player would use rather than the stage
 * id.
 */
export declare function nominationStanding(nomination: Nomination): string;
