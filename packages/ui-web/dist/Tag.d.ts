import type { ReactNode } from "react";
import { type IconName } from "./Icon";
/** Red for force and urgent risk, gold for the institution and current state, blue for where you go, neutral for a plain fact. */
export type TagTone = "risk" | "caution" | "identity" | "action" | "neutral" | "good";
export type TagProps = {
    readonly children: ReactNode;
    readonly tone?: TagTone;
    readonly icon?: IconName;
    /** Filled rather than tinted: the one tag on a card that must be seen first, such as CRITICAL. */
    readonly solid?: boolean;
};
/**
 * A short label set as a chip: a severity, a kind, a staffing. Read at a
 * glance, never the only place the fact is said. A status reads by its dot and
 * tint; only the solid tag, the one that must be seen first, keeps its glyph.
 */
export declare function Tag({ children, tone, icon, solid }: TagProps): import("react").JSX.Element;
