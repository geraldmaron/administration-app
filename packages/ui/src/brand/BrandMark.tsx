import { BRAND_MIN_SIZE, BRAND_VIEW_BOX, brandParts } from "@admin/design";
import Svg, { Path } from "react-native-svg";
import { useInk } from "../icons/Icon";

/** Product identity, not an official government seal. Decorative beside a name. */
export function BrandMark({ size = 24, tone = "chromeColor" }: { readonly size?: number; readonly tone?: "chromeColor" | "color" }) {
  const ink = useInk(tone);
  const brass = useInk("gold");
  const drawn = Math.max(size, BRAND_MIN_SIZE);
  return (
    <Svg width={drawn} height={drawn} viewBox={BRAND_VIEW_BOX} aria-hidden>
      {brandParts(drawn).map((part) => (
        <Path key={part.role} d={part.d} fillRule="evenodd" fill={part.role === "brass" ? brass : ink} />
      ))}
    </Svg>
  );
}
