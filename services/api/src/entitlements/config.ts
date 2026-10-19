import type { Env } from "../config.js";
import type { ReceiptVerifier } from "./verifiers/types.js";

/**
 * Builds the verifiers this deployment is configured for.
 *
 * No storefront verifier is built yet, so every `redeem` answers
 * `verification-unavailable` and nothing grants. A Steam verifier lands here
 * and nowhere else: built only when its credentials are present, read through
 * `requireEnv` so a half-configured one fails at startup naming the missing
 * variable, because a half-configured store is a misconfiguration rather than
 * an opt-out.
 */
export function verifiersFromEnv(_env: Env): readonly ReceiptVerifier[] {
  return [];
}
