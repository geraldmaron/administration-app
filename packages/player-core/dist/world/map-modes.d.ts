export declare const MAP_MODES: readonly [{
    readonly id: "trust";
    readonly label: "Their trust in you";
}, {
    readonly id: "reading";
    readonly label: "Your view of them";
}, {
    readonly id: "blocs";
    readonly label: "Blocs and alliances";
}, {
    readonly id: "regime";
    readonly label: "Type of government";
}, {
    readonly id: "conflict";
    readonly label: "Conflict";
}, {
    readonly id: "trade";
    readonly label: "Trade with the US";
}, {
    readonly id: "house";
    readonly label: "House delegation";
}, {
    readonly id: "governors";
    readonly label: "Governors' parties";
}, {
    readonly id: "electoral";
    readonly label: "Election forecast";
}, {
    readonly id: "senate";
    readonly label: "Senate seats up";
}, {
    readonly id: "hazards";
    readonly label: "Disasters and emergencies";
}, {
    readonly id: "deployments";
    readonly label: "US troops and bases";
}, {
    readonly id: "sanctions";
    readonly label: "Sanctions";
}];
export type MapModeId = (typeof MAP_MODES)[number]["id"];
export type MapLegendRow = {
    readonly word: string;
    readonly fill: string;
};
/** The sentence a mode shows when it has nothing it can color without inventing it. */
export declare const MAP_UNSEATED = "No one in office yet.";
/** Which of the 5-point lean scale a state's current lean falls in, for the electoral lens. */
export declare function electoralBucket(lean: number): "lean-democrat" | "tossup" | "lean-republican";
export declare function mapRegionFill(mode: MapModeId, bucket: string | number | undefined): string | "empty";
/** The words that travel with a fill, so the color is never the only signal. */
export declare function mapBucketWord(mode: MapModeId, bucket: string | number | undefined): string;
/** Legend swatches whose words name the fill. Trust keeps the board's own legend. */
export declare function mapLegend(mode: MapModeId): readonly MapLegendRow[];
