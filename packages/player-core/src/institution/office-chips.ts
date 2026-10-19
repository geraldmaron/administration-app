import type { ActingAuthority, AppointmentClass, OfficeDef, RemovalConstraint } from "@admin/engine";

// The three facts that decide what staffing an office actually is, in the
// player's words.
//
// They are game mechanics, not metadata: appointment class decides whether a
// name goes to the Senate at all, the removal constraint decides whether the
// President can end the tenure and at what price, and the acting rule decides
// what happens to the building in between. The catalog has carried all three
// since it was written and no surface said any of them, so a player deciding
// whether to move on a chair could not see which of the three levers they had.
//
// Rendered as chips rather than prose, and as a fact rather than a verdict:
// "term-protected" is not bad news, it is the office's shape.

export type StaffingChip = {
  readonly key: "appointment" | "removal" | "acting";
  /** The chip's own word, short enough to sit in a row of three. */
  readonly label: string;
  /** What that word means, spoken — the chip label alone is a term of art. */
  readonly spoken: string;
};

export const APPOINTMENT_LABEL: Readonly<Record<AppointmentClass, string>> = {
  PAS: "Senate confirms",
  PA: "No Senate vote",
  SES: "Career staff",
  ScheduleC: "Political staff",
  "fixed-term": "Fixed term",
  judicial: "Judge",
  military: "Military officer",
};

export const APPOINTMENT_MEANING: Readonly<Record<AppointmentClass, string>> = {
  PAS: "You pick someone, and the Senate votes to confirm them",
  PA: "You pick someone, with no Senate vote",
  SES: "A career government job, not yours to fill",
  ScheduleC: "A political job you fill yourself",
  "fixed-term": "You pick someone for a term set by law, and the Senate confirms them",
  judicial: "You pick a judge, the Senate confirms them, and they serve for life",
  military: "A military officer you pick and the Senate confirms",
};

export const REMOVAL_LABEL: Readonly<Record<RemovalConstraint, string>> = {
  "at-will": "Any time",
  "for-cause": "Only for a reason",
  "term-protected": "Protected term",
};

const REMOVAL_MEANING: Readonly<Record<RemovalConstraint, string>> = {
  "at-will": "You can remove them whenever you choose, but it lowers your international standing",
  "for-cause": "You can remove them only for a reason the law accepts, and you have to put it in writing",
  "term-protected": "You can't remove them just because you disagree with them. You have to wait for their term to end",
};

/**
 * Exported because the cabinet roster prints the same facts on its own rows,
 * and one office described two ways in one room is worse than either wording.
 */
export const ACTING_LABEL: Readonly<Record<ActingAuthority, string>> = {
  "vacancies-act": "Vacancies Act",
  "statutory-succession": "Next in line",
  "board-quorum": "Board carries on",
  none: "No stand-in",
};

export const ACTING_MEANING: Readonly<Record<ActingAuthority, string>> = {
  "vacancies-act": "Someone can fill in for a limited time while the job is empty",
  "statutory-succession": "The law says who fills in while the job is empty",
  "board-quorum": "Nobody fills in. The board keeps working as long as it has enough members to vote",
  none: "Nobody can fill in while the job is empty",
};

export type StaffingChipOptions = {
  /**
   * In a single office file the ordinary rule matters, because it explains the
   * removal lever in that same file. In a branch-wide list it is filler:
   * fifteen "At will" chips in a column bury the exceptional offices the
   * player actually needs to notice.
   */
  readonly showOrdinaryRemoval?: boolean;
};

/**
 * The three staffing facts an office wears, in stable order. Callers may hide
 * the ordinary at-will removal fact in bulk views, but the exceptions stay in
 * the same slot and the office file can still state the complete rule.
 */
export function staffingChips(
  office: OfficeDef,
  { showOrdinaryRemoval = true }: StaffingChipOptions = {},
): readonly StaffingChip[] {
  const actingLimit =
    office.actingLimitDays !== undefined ? `, up to ${office.actingLimitDays} days` : "";
  const chips: StaffingChip[] = [
    {
      key: "appointment",
      label: APPOINTMENT_LABEL[office.appointmentClass],
      spoken: `Appointment: ${APPOINTMENT_LABEL[office.appointmentClass]}. ${APPOINTMENT_MEANING[office.appointmentClass]}.`,
    },
    {
      key: "removal",
      label: REMOVAL_LABEL[office.removal],
      spoken: `Removal: ${REMOVAL_LABEL[office.removal]}. ${REMOVAL_MEANING[office.removal]}.`,
    },
    {
      key: "acting",
      label: ACTING_LABEL[office.actingAuthority],
      spoken: `Who fills in: ${ACTING_LABEL[office.actingAuthority]}. ${ACTING_MEANING[office.actingAuthority]}${actingLimit}.`,
    },
  ];
  return showOrdinaryRemoval || office.removal !== "at-will"
    ? chips
    : chips.filter((chip) => chip.key !== "removal");
}
