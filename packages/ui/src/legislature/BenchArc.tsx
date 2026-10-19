import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { View } from "@tamagui/core";
import { useInk } from "../icons/Icon";
import { FONT_FACES } from "../theme/tamagui.config";
import { benchSeats } from "./geometry";
import { SvgPress } from "../primitives/SvgPress";

export type BenchSeatView = {
  readonly id: string;
  /** Two letters, or a dash for an open seat. */
  readonly initials: string;
  /** Recorded lean on one axis, -1 left to 1 right; absent when unrecorded or the seat is open. */
  readonly lean?: number;
  readonly vacant: boolean;
  readonly chief: boolean;
  readonly active?: boolean;
};

/**
 * A bench on one arc, left to right by recorded lean: a seat whose record
 * leans clearly is filled in that side's ink, a slight lean is a ring in it,
 * an open or unrecorded seat is a dashed outline, and the chief is ringed in
 * gold. Strength is drawn as filled against ring, never as a faded fill.
 * The figure in the middle is the line the bench decides by.
 */
/** A recorded lean at or beyond this share of the axis is drawn filled; inside it, a ring. */
export const CLEAR_LEAN = 1 / 3;

export function BenchArc({ label, seats, figure, caption, onSeat }: { readonly label: string; readonly seats: readonly BenchSeatView[]; readonly figure: string; readonly caption: string; readonly onSeat?: (id: string) => void }) {
  const places = benchSeats(seats.length);
  const left = useInk("divergeCool");
  const right = useInk("divergeWarm");
  const line = useInk("borderColorStrong");
  const gold = useInk("gold");
  const ink = useInk("color");
  const quiet = useInk("colorSecondary");
  const surface = useInk("surface");
  return (
    <View width="100%" maxWidth={420} aspectRatio={320 / 170} role="img" aria-label={label} alignSelf="center">
      <Svg width="100%" height="100%" viewBox="0 0 320 170">
        {seats.map((seat, index) => {
          const place = places[index]!;
          const side = seat.lean === undefined ? undefined : seat.lean < 0 ? left : right;
          const clear = side !== undefined && !seat.vacant && Math.abs(seat.lean ?? 0) >= CLEAR_LEAN;
          const fill = clear ? side : surface;
          const edge = seat.active ? gold : side !== undefined && !seat.vacant ? side : line;
          return (
            <SvgPress key={seat.id} onPress={onSeat ? () => onSeat(seat.id) : undefined}>
              {seat.chief ? <Circle cx={place.x} cy={place.y} r={23} fill="none" stroke={gold} strokeWidth={2.5} /> : null}
              <Circle cx={place.x} cy={place.y} r={18} fill={fill} stroke={edge} strokeWidth={seat.active ? 3 : 2.5} strokeDasharray={seat.vacant || side === undefined ? "4 3" : undefined} />
              <SvgText x={place.x} y={place.y + 4} fontSize={12} fontWeight="700" fontFamily={FONT_FACES.sans[700]} fill={ink} textAnchor="middle">
                {seat.initials}
              </SvgText>
            </SvgPress>
          );
        })}
        <SvgText x={160} y={132} fontSize={30} fontWeight="700" fontFamily={FONT_FACES.sans[700]} fill={ink} textAnchor="middle">
          {figure}
        </SvgText>
        <SvgText x={160} y={152} fontSize={11} fontFamily={FONT_FACES.sans[700]} fill={quiet} textAnchor="middle">
          {caption}
        </SvgText>
      </Svg>
    </View>
  );
}
