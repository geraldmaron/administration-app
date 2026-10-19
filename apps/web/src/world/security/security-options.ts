/** Deliberate presidential rationales, not claims that an allegation has been proved. */
export const RELIEF_REASONS = [
  "Lost confidence in the commander's judgment.",
  "A change in command priorities requires new leadership.",
  "Reorganize the command leadership.",
] as const;

export const PLAN_REASONS = [
  "Consolidate operational responsibility.",
  "Align the country with regional planning.",
  "Rebalance responsibility between geographic commands.",
] as const;

/** These record the finding's purpose; later operations still need their own modeled review. */
export const FINDING_OBJECTIVES = [
  "Disrupt foreign military logistics.",
  "Counter coercion by the target government.",
  "Support a foreign partner against external threats.",
] as const;

export const NOTICE_REASONS = [
  "Prior notice could expose the operation before it begins.",
  "Protect intelligence sources and operational methods while notice is delayed.",
  "Delay prior notice during time-sensitive execution.",
] as const;
