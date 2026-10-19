/** Deliberate presidential rationales, not claims that an allegation has been proved. */
export const RELIEF_REASONS = [
  "Lost confidence in the commander's judgment.",
  "The command's priorities have changed and need a new leader.",
  "Reorganize the command's leaders.",
] as const;

export const PLAN_REASONS = [
  "Put one command in charge of operations there.",
  "Plan for the country together with its neighbors.",
  "Even out the work between regional commands.",
] as const;

/** These record the finding's purpose; later operations still need their own modeled review. */
export const FINDING_OBJECTIVES = [
  "Disrupt the other military's supply lines.",
  "Push back against pressure from the target government.",
  "Help a partner country defend itself from outside threats.",
] as const;

export const NOTICE_REASONS = [
  "Telling Congress first could expose the operation before it starts.",
  "Protect spies and their methods until Congress is told.",
  "Wait to tell Congress while timing is critical.",
] as const;
