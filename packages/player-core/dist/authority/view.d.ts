import type { Authority, AuthorityView } from "./types.js";
/** The host of an https link, without relying on a platform URL parser. */
export declare function sourceHost(url: string): string | undefined;
export declare function sourceLabel(url: string): string;
export declare function authorityView(authority: Authority): AuthorityView;
