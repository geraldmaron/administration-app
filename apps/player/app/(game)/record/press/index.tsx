import { Redirect } from "expo-router";
import { place } from "@admin/player-core";

/** The press has one page, in Washington; the Record's old address leads there. */
export default function RecordPressRoute() {
  return <Redirect href={place.pressOffice() as never} />;
}
