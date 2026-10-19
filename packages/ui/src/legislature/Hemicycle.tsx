import { useMemo, type ReactNode } from "react";
import { View } from "@tamagui/core";
import Svg, { Circle, Line } from "react-native-svg";
import { Key } from "../data/Key";
import type { KeyEntry } from "../data/key-entries";
import { useInk } from "../icons/Icon";
import { SvgPress } from "../primitives/SvgPress";
import { hemicycleSeats, majoritySpoke, seatRadius } from "./geometry";
import { seatKeyEntries, type SeatMarkings } from "./keys";
import type { Party, PartySeats } from "./types";

export type SeatVote = "yea" | "nay" | "none";

export type SeatView = {
  readonly id: string;
  /** Absent for a seat no record fills: drawn hollow, never as a party. */
  readonly party?: Party;
  readonly vote?: SeatVote;
  readonly selected?: boolean;
  readonly dimmed?: boolean;
  readonly leader?: boolean;
  readonly vacant?: boolean;
};

export type HemicycleProps = {
  /** What the chart shows, said whole for a screen reader: parties, counts and the line. */
  readonly label: string;
  /** In seating order, left to right. */
  readonly seats: readonly SeatView[];
  readonly majority?: number;
  /** A press on a seat; the seats are left out of the tab order, so a list beside the chart must reach the same doors. */
  readonly onSeat?: (id: string) => void;
  readonly legend?: ReactNode;
};

function useInks() {
  const dem = useInk("partyDem");
  const rep = useInk("partyRep");
  const ind = useInk("partyInd");
  return { party: { democrat: dem, republican: rep, independent: ind } as Record<Party, string>, gold: useInk("gold"), line: useInk("borderColorStrong"), faint: useInk("colorTertiary"), ink: useInk("color") };
}

/**
 * A chamber as its members sit: each mark a seat, hued by party. With votes,
 * a yea is filled, a nay ringed and a seat with no recorded vote faint; the
 * party hue stays, so a member who crossed the aisle stands out. Gold rings
 * mark leaders and the selection.
 */
export function Hemicycle({ label, seats, majority, onSeat, legend }: HemicycleProps) {
  const places = useMemo(() => hemicycleSeats(seats.length), [seats.length]);
  const spoke = majoritySpoke(places, majority);
  const radius = seatRadius(seats.length);
  const ink = useInks();
  return (
    <View gap="sm">
      <View width="100%" aspectRatio={100 / 54} role="img" aria-label={label}>
        <Svg width="100%" height="100%" viewBox="0 0 100 54">
          {places.map((place, i) => {
            const seat = seats[i]!;
            const color = seat.party ? ink.party[seat.party] : ink.line;
            const hollow = !seat.party || seat.vacant || seat.vote === "nay";
            const ring = seat.selected || seat.leader;
            return (
              <SvgPress key={seat.id} opacity={seat.dimmed ? 0.18 : seat.vote === "none" ? 0.3 : 1} onPress={onSeat && seat.party ? () => onSeat(seat.id) : undefined} highlight={<Circle cx={place.x} cy={place.y} r={radius * 1.7} fill="none" stroke={ink.ink} strokeWidth={radius * 0.5} />}>
                <Circle cx={place.x} cy={place.y} r={radius} fill={hollow ? "none" : color} stroke={color} strokeWidth={hollow ? radius * 0.45 : 0} />
                {ring ? <Circle cx={place.x} cy={place.y} r={radius * 1.45} fill="none" stroke={ink.gold} strokeWidth={seat.selected ? radius * 0.6 : radius * 0.35} /> : null}
              </SvgPress>
            );
          })}
          {spoke ? <Line x1={spoke.x1} y1={spoke.y1} x2={spoke.x2} y2={spoke.y2} stroke={ink.ink} strokeWidth={0.5} strokeDasharray="1.2 0.8" /> : null}
        </Svg>
      </View>
      {legend}
    </View>
  );
}

type LegendExtra = { readonly id: string; readonly label: string; readonly ink: "gold" | "colorTertiary"; readonly hollow?: boolean };

/**
 * The parties with their counts, so color is never the only way to tell them
 * apart, and the chamber's markings. Kept for screens that hand-build their
 * markings; a new screen passes `seatKeyEntries` to its reading's frame.
 */
export function PartyLegend({ parties, majority, extra, marks }: { readonly parties: readonly PartySeats[]; readonly majority?: number; readonly extra?: readonly LegendExtra[]; readonly marks?: SeatMarkings }) {
  const entries: readonly KeyEntry[] = [
    ...seatKeyEntries(parties, { ...marks, ...(majority ? { majority } : {}) }),
    ...(extra ?? []).map((item): KeyEntry => ({ id: item.id, kind: item.hollow ? "ring" : "dot", label: item.label, ink: item.ink })),
  ];
  return <Key entries={entries} label="Parties and markings" />;
}
