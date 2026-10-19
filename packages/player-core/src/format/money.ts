// Currency is a display concern and nothing else.
//
// Every money field in the world dataset and every treasury figure the engine
// carries is stored in USD millions. This module is the only place that number
// is ever restated, which is what makes the guarantee checkable: no simulation
// rule can read a display preference it has no way to reach.

export type MoneyDisplay = {
  /** ISO-style three-letter code, as authored on the nation's identity. */
  readonly code: string;
  /** Units of this currency per one US dollar. Exactly 1 for the dollar itself. */
  readonly perUsd: number;
};

/** The canonical unit. Money is already stored this way, so it converts by identity. */
export const USD_DISPLAY: MoneyDisplay = { code: "USD", perUsd: 1 };

export type MoneyFormatter = (usdMillions: number) => string;

const TRILLION_IN_MILLIONS = 1_000_000;
const BILLION_IN_MILLIONS = 1_000;

function symbolFor(code: string): string {
  // The dollar earns its sign because it is the unit everything is stored in
  // and the one a player is most likely to read without thinking. An authored
  // currency gets its code, which is unambiguous and needs no glyph shipped.
  return code === "USD" ? "$" : `${code} `;
}

/**
 * A money figure, converted from the stored USD millions into the given display
 * (the dollar unless a caller passes another), and abbreviated to
 * trillions/billions/millions.
 */
export function formatMoney(usdMillions: number, display: MoneyDisplay = USD_DISPLAY): string {
  const converted = usdMillions * display.perUsd;
  const magnitude = Math.abs(converted);
  const sign = converted < 0 ? "-" : "";
  const symbol = symbolFor(display.code);
  if (magnitude >= TRILLION_IN_MILLIONS) {
    return `${sign}${symbol}${(magnitude / TRILLION_IN_MILLIONS).toFixed(2)}T`;
  }
  if (magnitude >= BILLION_IN_MILLIONS) {
    return `${sign}${symbol}${(magnitude / BILLION_IN_MILLIONS).toFixed(2)}B`;
  }
  return `${sign}${symbol}${Math.round(magnitude)}M`;
}
