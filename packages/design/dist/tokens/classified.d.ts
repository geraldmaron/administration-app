export type ClassificationMark = {
    readonly fill: string;
    readonly ink: string;
    readonly label: string;
    readonly portion: string;
};
export declare const classification: {
    readonly unclassified: {
        readonly fill: "#007A33";
        readonly ink: "#FFFFFF";
        readonly label: "UNCLASSIFIED";
        readonly portion: "U";
    };
    readonly cui: {
        readonly fill: "#502B85";
        readonly ink: "#FFFFFF";
        readonly label: "CUI";
        readonly portion: "CUI";
    };
    readonly confidential: {
        readonly fill: "#0033A0";
        readonly ink: "#FFFFFF";
        readonly label: "CONFIDENTIAL";
        readonly portion: "C";
    };
    readonly secret: {
        readonly fill: "#C8102E";
        readonly ink: "#FFFFFF";
        readonly label: "SECRET";
        readonly portion: "S";
    };
    readonly topSecret: {
        readonly fill: "#B34700";
        readonly ink: "#FFFFFF";
        readonly label: "TOP SECRET";
        readonly portion: "TS";
    };
    readonly topSecretSci: {
        readonly fill: "#FCE83A";
        readonly ink: "#1B1B1B";
        readonly label: "TOP SECRET//SCI";
        readonly portion: "TS//SCI";
    };
};
export type ClassificationKey = keyof typeof classification;
/**
 * The situation room: the surface a classified document, a crisis and the
 * command picture sit on. Near-black so the banner colors and the map's
 * readings carry, with an amber ink that reads as a watch floor rather than
 * as the everyday workspace.
 */
export declare const situation: {
    readonly ground: "#06090F";
    readonly surface: "#0E141F";
    readonly raised: "#152033";
    readonly raisedHover: "#1C2A42";
    readonly text: "#EDE6D3";
    readonly secondary: "#B9B09A";
    readonly tertiary: "#8E8775";
    readonly line: "#2F3A4E";
    readonly lineStrong: "#5B6A86";
    readonly accent: "#F2B33D";
    readonly accentFill: "#C98A12";
    readonly alert: "#FF5A5F";
    readonly focus: "#FFD27A";
};
/** Paper under the dark theme: still paper in the fiction, dimmed so it does not glare. */
export declare const paperDark: {
    readonly surface: "#E7E1D1";
    readonly ink: "#1B1B1B";
    readonly rule: "#B4AA8F";
};
