import { BRAND_DESK_PATH, BRAND_PORTAL_PATH, BRAND_VIEW_BOX } from "@admin/design";
import Svg, { Path } from "react-native-svg";
import { useInk } from "../icons/Icon";

/** Product identity, not an official government seal. Decorative beside a name. */
export function BrandMark({ size = 24, tone = "chromeColor" }: { readonly size?: number; readonly tone?: "chromeColor" | "color" }) {
  const ink = useInk(tone);
  const gold = useInk("gold");
  return (
    <Svg width={size} height={size} viewBox={BRAND_VIEW_BOX} aria-hidden>
      <Path d={BRAND_PORTAL_PATH} fill={ink} />
      <Path d={BRAND_DESK_PATH} fill={gold} />
    </Svg>
  );
}
