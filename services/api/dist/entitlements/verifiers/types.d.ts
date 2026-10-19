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
export declare function attempt(platform: StorePlatform, call: () => Promise<ReceiptVerification>): Promise<ReceiptVerification>;
export declare function parseJson(body: string): Record<string, unknown>;
