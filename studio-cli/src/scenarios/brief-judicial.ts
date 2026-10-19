import type { ScenarioBriefSpec } from "./brief.js";

export function judicialBriefSection(spec: ScenarioBriefSpec): readonly string[] {
  if (spec.cast !== "judicialVacancy") return [];
  return [
    "Judicial vacancy binding",
    'Use cast { "pick": "judicialVacancy" } and exactly one condition { "kind": "judicialVacancy" }. The binder chooses a genuinely vacant Court seat and two candidates accepted by openNomination. Give separate replies commitment.judicialNomination { "action": "submit", "candidate": "first" } and { "action": "submit", "candidate": "alternate" }; do not combine either typed action with authored cost, impact, or another command.',
    "Write {{judicialSeat}} for the frozen office, {{judicialNominee}} and {{judicialAlternate}} for the names, and {{judicialNomineeRecord}} and {{judicialAlternateRecord}} for each person's public career and education. Either reply submits its candidate to vetting. It does not seat the nominee or promise Senate confirmation. A candidate or vacancy instance that changes before commit withdraws the answer.",
    "",
  ];
}
