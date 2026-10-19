import type { Campaign } from "@admin/engine";

// What happened in this sitting that the next screen should say: the oath
// just taken. It is never saved; the Record keeps the fact, and this keeps
// only the receipt the Brief shows until the world first moves.

export type OathReceipt = {
  /** The campaign exactly as sworn in; once the world runs, the receipt has been read. */
  readonly campaign: Campaign;
  /** The names of the orders signed at the oath. */
  readonly orders: readonly string[];
};

let lastOath: OathReceipt | undefined;

export function rememberOath(receipt: OathReceipt): void {
  lastOath = receipt;
}

/** The receipt for this exact campaign state, if it is the one just sworn in. */
export function oathReceiptFor(campaign: Campaign): OathReceipt | undefined {
  return lastOath?.campaign === campaign ? lastOath : undefined;
}
