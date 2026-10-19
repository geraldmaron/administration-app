import { metricBenchmarks, type Campaign } from "@admin/engine";
import type { NowReading } from "@admin/player-core";
import type { MeterMark } from "@admin/ui";

const KIND: Readonly<Record<ReturnType<typeof metricBenchmarks>[number]["kind"], MeterMark["kind"]>> = {
  gate: "gate",
  historical: "historical",
  "own-record": "record",
};

type Benchmark = ReturnType<typeof metricBenchmarks>[number];

/** Marks on the same whole percent are one tick with both names, so a flat term never draws two ticks on one spot. */
function merged(marks: readonly Benchmark[]): readonly { readonly names: readonly string[]; readonly at: number; readonly kind: MeterMark["kind"] }[] {
  return marks.reduce<{ names: string[]; at: number; kind: MeterMark["kind"] }[]>((out, mark) => {
    const last = out[out.length - 1];
    if (last && last.kind === KIND[mark.kind] && Math.round(last.at * 100) === Math.round(mark.at * 100)) last.names.push(mark.label);
    else out.push({ names: [mark.label], at: mark.at, kind: KIND[mark.kind] });
    return out;
  }, []);
}

const nameOf = (names: readonly string[]): string => (names.length === 2 && names[0] === "Term low" && names[1] === "Term high" ? "Term low and high" : names.map((name, i) => (i === 0 ? name : name.toLowerCase())).join(" and "));

/**
 * A reading's landmarks on its own 0..1 track, each named with its figure so
 * the tick says what it is worth. Approval is read against the real polls of
 * past presidents, which is the only landmark that tells it apart from any
 * other number; the other readings use the engine's gates and this term's
 * opening, best and worst.
 */
export function readingMarks(campaign: Campaign, key: NowReading["key"]): readonly MeterMark[] {
  const all = metricBenchmarks(campaign, key);
  const chosen = key === "approval" ? all.filter((mark) => mark.kind === "historical") : all;
  return merged(chosen).map((mark, i) => ({
    id: `${key}-${i}`,
    label: `${nameOf(mark.names)} ${Math.round(mark.at * 100)}%`,
    at: mark.at,
    kind: mark.kind,
  }));
}
