export type FlagProps = {
    /** The place the flag belongs to: "California", "Japan". */
    readonly name: string;
    /** The real flag artwork's URL. Absent, a plain field stands in and says so. */
    readonly src?: string;
    /** Height in CSS pixels; the box is always 3:2 so rows keep their rhythm. */
    readonly height?: number;
    /** A flag beside the place's own name adds nothing for a screen reader. */
    readonly decorative?: boolean;
};
/** A real flag in a 3:2 box with a hairline, so a white field still reads as a flag on white. */
export declare function Flag({ name, src, height, decorative }: FlagProps): import("react").JSX.Element;
