import type { CaseFile, CaseGoverning, CaseStepId, CaseStepState, CourtLane, DocketCase } from "@admin/player-core";

/** The authorities the courts screens cite (DECISIONS §8.12). */
export const LAW = {
  appointments: "U.S. Const. art. II, §2, cl. 2",
  litigation: "28 U.S.C. §509",
  takeCare: "U.S. Const. art. II, §3",
  limits: "Youngstown Sheet & Tube Co. v. Sawyer, 343 U.S. 579 (1952)",
} as const;

export const COURTS_VIEWS = ["bench", "docket", "nominations"] as const;
export type CourtsView = (typeof COURTS_VIEWS)[number];

export function courtsView(value: unknown): CourtsView {
  return COURTS_VIEWS.find((entry) => entry === value) ?? "bench";
}

export const LANE_WORDS: Readonly<Record<CourtLane, string>> = {
  filed: "District court",
  injunction: "Temporary order",
  circuit: "Appeals court",
  emergency: "Request to pause",
  review: "Supreme Court",
  decision: "Decided",
};

export const LANES: readonly CourtLane[] = ["filed", "injunction", "circuit", "emergency", "review", "decision"];

/** "Ninth Circuit", "D.C. Circuit". */
export const circuitWords = (name: string): string => `${name === "District of Columbia" ? "D.C." : name} Circuit`;

/** "in 3 weeks", "this week", "next week". */
export function weeksWords(weeks: number): string {
  if (weeks <= 0) return "this week";
  if (weeks === 1) return "next week";
  return `in ${weeks} weeks`;
}

export const initials = (name: string): string => name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("");

/** How a case's clock reads: the answer the administration owes, the argument and opinion, or the next step's date. */
export function dueWords(row: Pick<DocketCase, "responseDue" | "stage" | "calendar" | "due" | "weeksLeft">): string {
  if (row.responseDue) return `Your answer due ${row.responseDue}`;
  const step = { threshold: "First review", interim: "Temporary order", "lower-merits": "District court ruling", "circuit-merits": "Appeals court ruling", appeal: "Appeal decision", "supreme-merits": "Supreme Court review", remand: "Back in the lower court", final: "Final" }[row.stage ?? "threshold"];
  if (row.calendar?.status === "scheduled") return `Arguments ${row.due}. The ruling comes later in the term that starts October ${row.calendar.termYear}`;
  if (row.calendar?.status === "argued") return `Ruling due ${row.due}`;
  if (row.calendar?.status === "carried") return `Ruling delayed because too few justices can take part. Next check ${row.due}`;
  if (row.weeksLeft <= 0) return `${step} is due next week (${row.due})`;
  return `${step} ${row.due}, in ${row.weeksLeft} ${row.weeksLeft === 1 ? "week" : "weeks"}`;
}

/** A challenged order struck down is the President losing it, so a high chance reads bad. Qualitative; the internal threshold is not a calibrated probability. */
export function strikeVerdict(chance: number): { readonly tone: "danger" | "warning" | "success"; readonly word: string; readonly at: number } {
  if (chance >= 0.55) return { tone: "danger", word: "Likely struck down", at: 0.75 };
  if (chance >= 0.4) return { tone: "warning", word: "Toss-up", at: 0.5 };
  return { tone: "success", word: "Likely upheld", at: 0.25 };
}

/** Pending, struck down and upheld are different facts, each with its own words; the color only repeats them. */
export function caseStatusWords(file: Pick<DocketCase, "status" | "dismissedAtThreshold" | "subject" | "endReason">): { readonly label: string; readonly status: "warning" | "danger" | "success" } {
  const tone = file.status === "pending" ? "warning" : file.status === "struck-down" ? "danger" : "success";
  const ended = file.endReason === "sunset" ? "expired" : "canceled";
  const kind = file.subject?.kind;
  if (file.endReason) {
    const label = file.status === "pending" ? `Still open, order ${ended}` : file.dismissedAtThreshold ? `Case thrown out, order ${ended}` : file.status === "upheld" ? `Upheld, order ${ended}` : "Struck down, final";
    return { label, status: tone };
  }
  if (file.dismissedAtThreshold) return { label: "Case thrown out, order still in effect", status: tone };
  const claim = file.status === "struck-down" && kind === "wage-hour-enforcement" ? "Overtime owed, final"
    : file.status === "struck-down" && kind === "unlawful-surveillance" ? "Damages awarded, final"
      : file.status === "struck-down" && kind === "fair-housing-enforcement" ? "Housing violation proved, final"
        : file.status === "upheld" && kind === "wage-hour-enforcement" ? "No unpaid overtime proved"
          : file.status === "upheld" && kind === "fair-housing-enforcement" ? "Housing claim not proved"
            : undefined;
  return { label: claim ?? (file.status === "pending" ? "Still in the courts" : file.status === "struck-down" ? "Struck down, final" : "Upheld, still in effect"), status: tone };
}

const COURT = "Supreme Court of the United States";
export const circuitCourt = (circuit: string): string => (circuit === "District of Columbia" ? "United States Court of Appeals for the D.C. Circuit" : `United States Court of Appeals for the ${circuit} Circuit`);

/** The court the case is before, by its full name. */
export function forumOf(file: Pick<CaseFile, "forum" | "lowerForum" | "circuit">): string {
  if (file.forum === "lower") return file.lowerForum?.court ?? "Federal district court";
  if (file.forum === "circuit") return circuitCourt(file.circuit?.court ?? file.lowerForum?.circuit ?? "Federal");
  return COURT;
}

/** The seal a case's forum speaks under. */
export const forumSeal = (file: Pick<CaseFile, "forum">): string => (file.forum === "supreme" || file.forum === undefined ? "SEAL-SUPREME-COURT" : "SEAL-COURT-OF-APPEALS");

export const STEP_WORDS: Readonly<Record<CaseStepId, string>> = { filed: "Filed", interim: "Temporary order", district: "District court ruling", appeal: "Appeal", supreme: "Supreme Court", final: "Final ruling" };
export const STEP_STATE: Readonly<Record<CaseStepState, "done" | "current" | "possible" | "ahead">> = { done: "done", now: "current", possible: "possible", "not-reached": "ahead" };

/** What governs the challenged action today, from the weakest restraint to the final word, so a stay never reads as a remedy. */
export function governingWords(governing: CaseGoverning, subject: string): { readonly title: string; readonly detail: string } {
  switch (governing.kind) {
    case "final":
      return governing.dismissed ? { title: "Final: thrown out", detail: "The case ended before any court ruled on the main question." } : { title: governing.upheld ? "Final: upheld" : "Final: struck down", detail: `This final ruling decides ${subject}. Later events don't change it.` };
    case "circuit":
      return { title: governing.setAside ? "Appeals court ruling applies: struck down" : "Appeals court ruling applies: upheld", detail: "The ruling of the three appeals judges replaces the district court's ruling, along with any pause on it." };
    case "stay-granted":
      return { title: "A stay pauses the lower court's ruling", detail: "It's temporary while a higher court decides whether to take the case. It isn't a ruling on the challenge." };
    case "lower-in-force":
      return { title: governing.setAside ? "Lower court's ruling applies: struck down" : "Lower court's ruling applies: upheld", detail: "It applies now. Appealing it doesn't pause it." };
    case "lower-stayed":
      return { title: "Lower court's ruling paused during the appeal", detail: `It went ${governing.setAside ? "against" : "for"} ${subject}, but it doesn't take effect while the appeal goes on.` };
    case "interim":
      return { title: "Temporary order in place", detail: "A temporary order applies until the court rules on the main question." };
    case "none":
      return { title: "No court order yet", detail: `Nothing a court has done restrains ${subject} so far.` };
  }
}
