import { type ReactNode } from "react";
export type HelpTipProps = {
    /** What the button is about, said by a screen reader: "About approval". */
    readonly label: string;
    /** The short note: what it means, its basis or date, its uncertainty, what the President can do. Anything needed to act belongs on the screen. */
    readonly children: ReactNode;
    /** Deeper context, opened from the note into an inspector beside the page. */
    readonly more?: {
        readonly title: string;
        readonly body: ReactNode;
    };
};
/**
 * The one help affordance: an "i" that opens a short note on click, tap or
 * Enter (never hover alone), anchored to it in the top layer so no card can
 * clip it. "More context" opens the deeper explanation in an inspector, and
 * closing that returns focus to the "i". A press on the "i" inside a card's
 * door opens only the note.
 */
export declare function HelpTip({ label, children, more }: HelpTipProps): import("react").JSX.Element;
