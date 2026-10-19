import { type Campaign } from "@admin/engine";
import type { SummonsBrief, SummonsKind } from "./types";
export declare const LEGISLATIVE_BRIEFS: Readonly<Partial<Record<SummonsKind, (campaign: Campaign) => SummonsBrief>>>;
