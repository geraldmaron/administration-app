export type PartyMarkParty = "democrat" | "republican" | "independent";
export type PartyMarkProps = {
    readonly party: PartyMarkParty;
    /** Height in pixels; the width follows the drawing. */
    readonly size?: number;
    /** Spoken name; without one the mark is decorative. */
    readonly label?: string;
    readonly className?: string;
};
/** The party's animal: the Democratic donkey, the Republican elephant, a plain star for an independent. */
export declare function PartyMark({ party, size, label, className }: PartyMarkProps): import("react").JSX.Element;
