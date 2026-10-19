/** One thing the President could do next, as a door rather than a control. */
export type CounselAct = {
    readonly label: string;
    readonly href: string;
};
export type PlaceCounsel = {
    /** One or two sentences of counsel, already written. */
    readonly lines: readonly string[];
    /** True when the place has nothing to report, so a surface can quiet itself. */
    readonly quiet: boolean;
    readonly next?: CounselAct;
};
