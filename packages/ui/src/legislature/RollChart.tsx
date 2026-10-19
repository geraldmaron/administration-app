import { ScrollView } from "react-native";
import Svg, { Line, Rect } from "react-native-svg";
import { View } from "@tamagui/core";
import { Key } from "../data/Key";
import { useInk } from "../icons/Icon";
import { SvgPress } from "../primitives/SvgPress";
import { rollKeyEntries } from "./keys";
import type { Party } from "./types";

export type RollEntryView = {
  readonly id: string;
  readonly yeas: number;
  readonly nays: number;
  readonly required: number;
  readonly passed: boolean;
  /** Each party's yeas and nays, where the roll was recorded member by member. */
  readonly byParty?: Readonly<Record<Party, { readonly yea: number; readonly nay: number }>>;
};

const H = 110;
const PARTIES: readonly Party[] = ["democrat", "independent", "republican"];

/**
 * A chamber's roll calls oldest to newest: yeas rise and nays fall from the
 * axis, split by party where the record names members, each against a gold
 * tick at the number the question needed. A column the record kept only as a
 * total is drawn pale. The key prints under it unless its frame keys it.
 */
export function RollChart({ label, entries, seats, onEntry, keyed = true }: { readonly label: string; readonly entries: readonly RollEntryView[]; readonly seats: number; readonly onEntry?: (id: string) => void; readonly keyed?: boolean }) {
  const ink = { democrat: useInk("partyDem"), independent: useInk("partyInd"), republican: useInk("partyRep") } as Record<Party, string>;
  const axis = useInk("borderColorStrong");
  const gold = useInk("gold");
  const pale = useInk("colorTertiary");
  const lit = useInk("color");
  const step = Math.max(18, Math.min(56, Math.floor(640 / Math.max(1, entries.length))));
  const width = Math.max(200, entries.length * step + 8);
  const half = H / 2;
  const h = (count: number) => (count / Math.max(1, seats)) * half;
  const chart = (
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View width={width} height={H + 4} role="img" aria-label={label}>
        <Svg width={width} height={H + 4} viewBox={`0 0 ${width} ${H + 4}`}>
          <Line x1={0} x2={width} y1={half + 2} y2={half + 2} stroke={axis} strokeWidth={1} />
          {entries.map((entry, i) => {
            const x = 4 + i * step;
            const w = step - 4;
            let up = half + 2;
            let down = half + 2;
            const bars = entry.byParty
              ? PARTIES.flatMap((party) => {
                  const yea = h(entry.byParty![party].yea);
                  const nay = h(entry.byParty![party].nay);
                  up -= yea;
                  const top = up;
                  const bottom = down;
                  down += nay;
                  return [<Rect key={`${party}-y`} x={x} y={top} width={w} height={yea} fill={ink[party]} />, <Rect key={`${party}-n`} x={x} y={bottom} width={w} height={nay} fill={ink[party]} />];
                })
              : [<Rect key="y" x={x} y={half + 2 - h(entry.yeas)} width={w} height={h(entry.yeas)} fill={pale} />, <Rect key="n" x={x + 0.75} y={half + 2.75} width={Math.max(0, w - 1.5)} height={Math.max(0, h(entry.nays) - 1.5)} fill="none" stroke={pale} strokeWidth={1.5} />];
            return (
              <SvgPress key={entry.id} onPress={onEntry ? () => onEntry(entry.id) : undefined} highlight={<Rect x={x - 2} y={1} width={w + 4} height={H + 2} fill="none" stroke={lit} strokeWidth={2} rx={2} />}>
                {bars}
                <Line x1={x - 1} x2={x + w + 1} y1={half + 2 - h(entry.required)} y2={half + 2 - h(entry.required)} stroke={gold} strokeWidth={2} />
              </SvgPress>
            );
          })}
        </Svg>
      </View>
    </ScrollView>
  );
  if (!keyed) return chart;
  return (
    <View gap="sm">
      {chart}
      <Key entries={rollKeyEntries(entries)} label="What the columns mean" />
    </View>
  );
}
