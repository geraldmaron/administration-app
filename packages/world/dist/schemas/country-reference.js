import { z } from "zod";
import { NationId } from "./ids.js";
// Static dossier prose for a nation — institutional context the player reads
// before or beside live campaign state. Not a second source of stats.
export const CountryReference = z.object({
    nationId: NationId,
    executiveSummary: z.string().min(120).max(2000),
    background: z.string().min(80).max(3000),
    governmentSystem: z.string().min(40).max(1500),
    economyNarrative: z.string().min(40).max(1500),
    societyNarrative: z.string().min(40).max(1200).optional(),
    securityNarrative: z.string().min(40).max(1500).optional(),
    whyItMatters: z.string().min(40).max(800),
});
