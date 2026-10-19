import { type FacedPerson, type NationFidelity, type NationId } from "@admin/world";
import { type Campaign } from "@admin/engine";
export { LEADER_TABLE_AS_OF } from "@admin/world";
/**
 * Who runs each capital on the board, read the way the rest of the game already
 * reads it.
 *
 * The person is the engine's own answer (`foreignLeaderFor`) — the same living
 * national a counterpart's beat is spoken by and a country file points at — so
 * the leaders directory can never name someone the conversation would not.
 * A nation whose charter or bench cannot seat anyone says so with an absent
 * `person` rather than a borrowed name.
 */
export type WorldLeaderRow = {
    readonly nation: NationId;
    readonly nationName: string;
    /** What a player searches by as often as the name: "Reykjavik", "Mongolian". */
    readonly capital: string;
    readonly adjective: string;
    /** The dataset's region id, which the roster groups the whole world under. */
    readonly region: string;
    /** How deeply the dataset knows the country; a thin one is on the board, not on the desk. */
    readonly fidelity: NationFidelity;
    /** The form of government as a reader knows it: "Communist party-led state", not the charter the simulation runs. */
    readonly government: string;
    /** What the country calls its lead chair — "Federal Chancellor", "Crown Prince and Prime Minister". */
    readonly title?: string;
    /** The seated leader as their face is drawn: the whole record the portrait reads, so it matches every other screen. */
    readonly person?: FacedPerson;
};
/** A charter id as a player reads it; the id itself when the dataset has no such charter. */
export declare function charterName(charterId: string): string;
/**
 * What a country's government is, in the words a reader would use for it.
 *
 * The charter is the coarse model the simulation runs a government under, and
 * six of them cover 195 countries, so it named China "The Presidential
 * Republic". The label is the Factbook's government type where there is one.
 */
export declare function governmentType(nationId: string, charterId: string): string;
/**
 * What a country calls its lead chair: the leader table's title where the
 * table has a row and shaped this campaign's cast ("Federal Chancellor", not
 * the generic charter's "Prime Minister"), the charter's own title otherwise.
 */
export declare function leadTitle(campaign: Campaign, nation: string, lead: string, titles?: Readonly<Record<string, string>>): string;
export declare function worldLeaderRows(campaign: Campaign): readonly WorldLeaderRow[];
/**
 * The chip beside a foreign leader: the people are invented, and what they are
 * held to is dated. Absent unless this campaign's leaders were actually drawn
 * from the constraint table, because otherwise the sentence would describe a
 * world the game is not showing.
 */
export declare function leaderProvenanceLine(campaign: Campaign): string | undefined;
/**
 * "In office since", to the precision the seat's date was known and with where
 * it came from. One reading owns the line, so the country file and the press
 * abroad never print the same seat two ways.
 */
export declare function inOfficeSince(campaign: Campaign, nation: NationId): string | undefined;
/** The calendar's next scheduled selection for this seat, to the month, when the table carries one. */
export declare function nextSelectionWords(campaign: Campaign, nation: NationId): string | undefined;
