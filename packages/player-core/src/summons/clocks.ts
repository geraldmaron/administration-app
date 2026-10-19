import type { Campaign } from "@admin/engine";
import { EXECUTIVE_BRIEFS } from "./clocks-executive";
import { LEGISLATIVE_BRIEFS } from "./clocks-legislative";
import { SUMMONS_DUE } from "./due";
import type { SummonsBrief, SummonsKind, SummonsSpec } from "./types";

/**
 * Every institutional clock the campaign carries, reading and prose joined.
 *
 * The reading half is declared once in `due.ts`; the prose half is written per
 * branch — the legislative file holds the obligations Congress creates and the
 * executive file holds the ones the presidency creates for itself. Joining them
 * here is what keeps a clock from being declared twice, and it is why the
 * attention loop can read the due half without loading either brief file.
 *
 * Known gap: only four of these clocks carry a `window` on their brief — the
 * war-powers report and termination, the desk window on a bill, and the
 * disapproval window on a rule. Those four are the ones a rule actually sets a
 * length for, and the folio draws each as a ring. The rest are dated
 * obligations with no countdown behind them: an election has a date and no
 * window, an appropriation lapses on a turn nobody started a clock for, a
 * nomination advances on the Senate's own pace. Giving those a ring would mean
 * inventing a denominator, so they carry none and the folio draws none.
 */
const BRIEFS: Readonly<Partial<Record<SummonsKind, (campaign: Campaign) => SummonsBrief>>> = {
  ...LEGISLATIVE_BRIEFS,
  ...EXECUTIVE_BRIEFS,
};

function briefFor(id: SummonsKind): (campaign: Campaign) => SummonsBrief {
  const compose = BRIEFS[id];
  // A clock declared with no way to be read is a folio that opens onto nothing.
  // Refusing at module load is the only place this can be caught before a
  // player presses the row.
  if (compose === undefined) throw new Error(`The ${id} clock has no brief to compose.`);
  return compose;
}

/**
 * Each clock's short name, at most 18 characters so it fits the context bar's
 * narrowest caption. A Record over every kind, so a clock cannot be added
 * without one.
 */
const SUMMONS_LABELS: Readonly<Record<SummonsKind, string>> = {
  appropriation: "Funding deadline",
  shutdown: "Shutdown",
  "bill-desk": "Bill on your desk",
  "aumf-expiry": "War authorization",
  "treaty-ratification": "Treaty vote",
  "war-powers-report": "War Powers report",
  "war-powers-termination": "War Powers clock",
  "nomination-stage": "Nomination",
  "ruling-due": "Court ruling",
  "rule-effective": "Rule takes effect",
  "rule-disapproval": "Rule can be undone",
  "acting-authority": "Temporary leader",
  "departure-transition": "Cabinet departure",
  "election-milestone": "Next election",
  "removal-beat": "Removal case",
};

export const CLOCKS: readonly SummonsSpec[] = SUMMONS_DUE.map((spec) => ({
  ...spec,
  label: SUMMONS_LABELS[spec.id],
  compose: briefFor(spec.id),
}));
