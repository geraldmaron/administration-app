import { View } from "@tamagui/core";
import { Text } from "./Text";

/** A count on a navigation item or a bell; `gold` for what waits on the President's signature rather than an alarm. */
export function CountDot({ count, label, tone = "danger" }: { readonly count: number; readonly label: string; readonly tone?: "danger" | "gold" }) {
  if (count <= 0) return null;
  return (
    <View aria-label={label} minWidth={18} height={18} paddingHorizontal={5} borderRadius="pill" backgroundColor={tone === "gold" ? "goldFill" : "dangerFill"} alignItems="center" justifyContent="center">
      <Text variant="caption" weight="strong" tone={tone === "gold" ? "goldInk" : "onDanger"}>
        {count > 99 ? "99+" : count}
      </Text>
    </View>
  );
}
