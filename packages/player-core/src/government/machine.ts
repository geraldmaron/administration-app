import { INSTITUTION_CATALOG, type InstitutionDef, type Nomination } from "@admin/engine";

// The White House posts, the band-and-confidence readings and an office's
// staffing facts belong to the same vocabulary and reach the package through
// this module.
export * from "./machine-white-house.js";
export * from "./machine-readings.js";
export { staffingChips, type StaffingChip } from "../institution/office-chips.js";

// The branch's shared vocabulary: how much of a body the President commands,
// where a cabinet chair sits in the order of precedence, and where a nomination
// has got to.
//
// The tree itself is not here. It used to be — this module built a flat reading
// of the executive branch grouped by command band, and the organogram it drew
// was the wrong shape for the catalog it was drawing (see `organogram.ts`).
// What survived that rebuild is the vocabulary, because it is right and because
// four other surfaces read it: the office file's masthead, the office dossier,
// the cabinet seating plan and the Government room itself.

/**
 * How much of a body the President actually commands.
 *
 * The wording is deliberately about the President rather than about the body:
 * "independent" is a property of the agency, but what the player needs to know
 * is what happens when they pick up the phone.
 */
export type Command = "directed" | "arms-length" | "independent";

export const COMMAND_LABEL: Readonly<Record<Command, string>> = {
  directed: "Under your direction",
  "arms-length": "Partly independent",
  independent: "Independent of you",
};

export function commandOf(def: InstitutionDef): Command {
  switch (def.independence) {
    case "independent":
      return "independent";
    case "semi-autonomous":
      return "arms-length";
    default:
      return "directed";
  }
}

// --- The cabinet's own order ------------------------------------------------

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

const RANK_BY_ROLE: ReadonlyMap<string, number> = new Map(
  INSTITUTION_CATALOG.flatMap((def) => {
    const rank = def.offices[0]?.cabinetRank;
    return def.cabinetRole && rank !== undefined ? [[def.cabinetRole as string, rank] as const] : [];
  }),
);

/** Where a cabinet chair sits in the order of precedence, if it has one. */
export function cabinetRankOf(role: string): number | undefined {
  return RANK_BY_ROLE.get(role);
}

/**
 * Where a nomination is, in the words a player would use rather than the stage
 * id.
 */
export function nominationStanding(nomination: Nomination): string {
  switch (nomination.stage) {
    case "shortlist":
      return "On the shortlist";
    case "vetting":
      return "Background check under way";
    case "prepared":
      return "Paperwork ready";
    case "nominated":
      return "Sent to the Senate";
    case "referred":
      return "Sent to a Senate committee";
    case "disclosures":
      return "Committee is reviewing their records";
    case "hearing-scheduled":
      return "Waiting for a hearing date";
    case "hearing":
      return "At the hearing";
    case "committee-action":
      return "Waiting for the committee's decision";
    case "executive-calendar":
      return "On the Senate's list for a vote";
    case "floor-pending":
      return "Waiting for a vote in the full Senate";
    case "cloture":
      return "Vote to end debate requested";
    case "vote":
      return "Being voted on";
    case "confirmed":
      return "Confirmed, not yet sworn in";
    case "sworn-in":
      return "Sworn in";
    case "rejected":
      return "Voted down by the Senate";
    case "withdrawn":
      return "Withdrawn";
    case "returned":
      return "Sent back without a vote";
  }
}
