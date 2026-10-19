import { Text } from "../primitives/Text";

/** DECISIONS §8.10: stated once in the Handbook and on the first seal screen. */
export const SEAL_NOTICE =
  "The emblems in this game were drawn by the game's artists. They aren't official, and no government or organization has endorsed this game.";

export function SealNotice() {
  return (
    <Text variant="caption" tone="secondary">
      {SEAL_NOTICE}
    </Text>
  );
}
