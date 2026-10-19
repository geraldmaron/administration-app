export declare const typography: {
    readonly family: {
        readonly display: "Source Sans 3";
        readonly sans: "Source Sans 3";
        readonly serif: "Source Serif 4";
        readonly mono: "ui-monospace";
    };
    readonly weight: {
        readonly regular: 400;
        readonly medium: 600;
        readonly strong: 700;
    };
    /** rem. Metadata 12, compact data 14, body and controls 16, subheading 18, panel heading 22, primary figure 36, formal reading 18. */
    readonly size: {
        readonly caption: 0.75;
        readonly label: 0.875;
        readonly small: 0.875;
        readonly body: 1;
        readonly title: 1.125;
        readonly heading: 1.375;
        readonly figure: 2.25;
        readonly document: 1.125;
    };
    /** Page titles grow with the viewport; the title screen's name is larger. */
    readonly fluid: {
        readonly display: "clamp(1.75rem, 1.25rem + 1.5vw, 2.5rem)";
        readonly hero: "clamp(2.25rem, 1.75rem + 1.5vw, 3rem)";
    };
    readonly leading: {
        readonly tight: 1.15;
        readonly snug: 1.3;
        readonly body: 1.5;
        readonly compact: 1.4286;
        readonly control: 1.25;
        readonly document: 1.5556;
    };
    /** em. */
    readonly tracking: {
        readonly display: -0.025;
        readonly normal: 0;
        readonly eyebrow: 0.04;
    };
};
export type TypographyToken = typeof typography;
