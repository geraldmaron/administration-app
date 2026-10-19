import type { ReceiptVerification, StorePlatform } from "@admin/contracts";

/**
 * A verifier talks to one store and reports what that store said. It is never
 * allowed to invent a `valid`: an unreachable or unconfigured store returns
 * `unavailable`, which the entitlement service refuses to grant on.
 */
export interface ReceiptVerifier {
  readonly platform: StorePlatform;
  verify(receipt: string, productId: string): Promise<ReceiptVerification>;
}

/**
 * The HTTP call, injected. Real deployments pass `globalThis.fetch`; tests pass
 * a transport that asserts on the request it was handed. Keeping it a port is
 * what makes the store adapters testable without a live store account.
 */
export type HttpTransport = (url: string, init: HttpRequestInit) => Promise<HttpResponse>;

export type HttpRequestInit = {
  readonly method: "GET" | "POST";
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
};

export type HttpResponse = {
  readonly status: number;
  readonly body: string;
};

/** Wraps a transport call so a network fault becomes `unavailable`, never `invalid`. */
export async function attempt(
  platform: StorePlatform,
  call: () => Promise<ReceiptVerification>,
): Promise<ReceiptVerification> {
  try {
    return await call();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { status: "unavailable", reason: `${platform} verification could not complete: ${detail}` };
  }
}

export function parseJson(body: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(body);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("store response was not a JSON object");
  }
  return parsed as Record<string, unknown>;
}
