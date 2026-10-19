import type { ReactNode } from "react";
export type TopBarProps = {
    /** Where the mark leads: the title screen, or the Brief while a campaign is in play. */
    readonly home: ReactNode;
    /** The date and the state of the term, read at a glance. */
    readonly status?: ReactNode;
    /** Continue, save status, search: the bar's controls, in that order. */
    readonly actions?: ReactNode;
};
/** The mark, the presidency's current state, and the controls that act on the whole game. */
export declare function TopBar({ home, status, actions }: TopBarProps): import("react").JSX.Element;
export type WordmarkProps = {
    /** Who holds the office, once a term is in play. */
    readonly holder?: string;
};
/** The seal and the office it stands for, as the top bar draws them. The words hide on a phone; the seal keeps its label. */
export declare function Wordmark({ holder }: WordmarkProps): import("react").JSX.Element;
