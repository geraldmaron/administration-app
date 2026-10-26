import type { Authority } from "./types.js";
export declare const uscode: (title: number, section: string) => string;
/** The official govinfo edition of one section, which resolves to the current annual Code. */
export declare const govinfoCode: (title: number, section: string) => string;
export declare const SECURITY_AUTHORITIES: readonly Authority[];
