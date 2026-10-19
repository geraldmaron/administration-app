import type { z } from "zod";
import type { NationPartySystem } from "../schemas/nation.js";
import type { School } from "../schemas/background.js";
export declare const ROSTER_PARTY_SYSTEMS: Readonly<Record<string, z.input<typeof NationPartySystem>>>;
export declare const ROSTER_SCHOOLS: readonly z.input<typeof School>[];
/** Where a government with no university of note educates its officials: its region's hub countries. */
export declare const ROSTER_SCHOOL_HUBS: Readonly<Record<string, readonly string[]>>;
