import { type PolicyDomain } from "@admin/engine";
import { type MapLens } from "../contract.js";
import { type MapPalette } from "../palette.js";
/** The lens id for a domain's share. */
export declare function shareLensId(domain: PolicyDomain): string;
/** Every share lens id, one per domain. */
export declare const SHARE_LENS_IDS: readonly string[];
export declare function shareDomainOf(id: string): PolicyDomain | undefined;
export declare function shareLens(domain: PolicyDomain, palette: MapPalette): MapLens;
