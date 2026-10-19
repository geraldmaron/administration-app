import {
  GOVERNMENT_TYPES,
  LEADER_TABLE_AS_OF,
  NATION_LEADER_CONSTRAINTS,
  nationRoleTitle,
  worldDataset,
  type FacedPerson,
  type NationFidelity,
  type NationId,
  type Person,
} from "@admin/world";
import { foreignLeaderFor, selectPerson, type Campaign } from "@admin/engine";
import { formatDate, roleTitle } from "../format/figures";
import { foreignLeadershipReading } from "../press/foreign-coverage";

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

/**
 * The face a seated leader is drawn with. The seat can name someone the
 * campaign holds no record for; they keep their name and draw as a monogram,
 * because a face invented without their record could not match it anywhere else.
 */
function seatedFace(seated: { readonly person: string; readonly name: string }, record: Person | undefined, nation: string): FacedPerson {
  if (record) return { ...record, name: seated.name };
  return { id: seated.person as Person["id"], name: seated.name, nationality: nation as Person["nationality"], age: 0, portraitRef: "", traits: [], eligibleRoles: [] };
}

/** A charter id as a player reads it; the id itself when the dataset has no such charter. */
export function charterName(charterId: string): string {
  return worldDataset.charters.find((charter) => charter.id === charterId)?.name ?? charterId;
}

/**
 * What a country's government is, in the words a reader would use for it.
 *
 * The charter is the coarse model the simulation runs a government under, and
 * six of them cover 195 countries, so it named China "The Presidential
 * Republic". The label is the Factbook's government type where there is one.
 */
export function governmentType(nationId: string, charterId: string): string {
  return GOVERNMENT_TYPES[nationId] ?? charterName(charterId);
}

/**
 * Whether this campaign's foreign cast was drawn against the leader table this
 * build ships. A save founded before the table (or against another edition of
 * it) seated leaders the table never shaped: a woman may sit where the table
 * has a King. Its screens use the charter's titles and make no claim about
 * where the people came from.
 */
function drawnAgainstLeaderTable(campaign: Campaign): boolean {
  return campaign.founding.leaderTable === LEADER_TABLE_AS_OF && Object.keys(NATION_LEADER_CONSTRAINTS).length > 0;
}

/**
 * What a country calls its lead chair: the leader table's title where the
 * table has a row and shaped this campaign's cast ("Federal Chancellor", not
 * the generic charter's "Prime Minister"), the charter's own title otherwise.
 */
export function leadTitle(campaign: Campaign, nation: string, lead: string, titles?: Readonly<Record<string, string>>): string {
  const table = drawnAgainstLeaderTable(campaign) ? nationRoleTitle(nation, lead) : undefined;
  return table ?? roleTitle(lead, titles);
}

export function worldLeaderRows(campaign: Campaign): readonly WorldLeaderRow[] {
  return Object.values(campaign.nations)
    .filter((nation) => nation.base.id !== campaign.founding.nation)
    .map((nation): WorldLeaderRow => {
      const charter = worldDataset.charters.find((entry) => entry.id === nation.base.identity.government);
      const lead = charter?.cabinetRoles[0];
      const seated = foreignLeaderFor(campaign, nation.base.id);
      const person = seated ? selectPerson(campaign, seated.person) : undefined;
      return {
        nation: nation.base.id,
        nationName: nation.base.identity.name,
        capital: nation.base.identity.capital,
        adjective: nation.base.identity.adjective,
        region: nation.base.geo.region as string,
        fidelity: nation.base.fidelity ?? "full",
        government: governmentType(nation.base.id, nation.base.identity.government),
        ...(lead ? { title: leadTitle(campaign, nation.base.id, lead, charter?.roleTitles) } : {}),
        ...(seated ? { person: seatedFace(seated, person?.base, nation.base.id) } : {}),
      };
    })
    .sort((a, b) => a.nationName.localeCompare(b.nationName));
}

/**
 * The chip beside a foreign leader: the people are invented, and what they are
 * held to is dated. Absent unless this campaign's leaders were actually drawn
 * from the constraint table, because otherwise the sentence would describe a
 * world the game is not showing.
 */
export function leaderProvenanceLine(campaign: Campaign): string | undefined {
  if (!drawnAgainstLeaderTable(campaign)) return undefined;
  const [year, month, day] = LEADER_TABLE_AS_OF.split("-").map(Number);
  return `The leaders are made up, based on each country's government as of ${formatDate({ year: year!, month: month!, day: day! })}.`;
}

/**
 * "In office since", to the precision the seat's date was known and with where
 * it came from. One reading owns the line, so the country file and the press
 * abroad never print the same seat two ways.
 */
export function inOfficeSince(campaign: Campaign, nation: NationId): string | undefined {
  return foreignLeadershipReading(campaign, nation)?.since;
}

/** The calendar's next scheduled selection for this seat, to the month, when the table carries one. */
export function nextSelectionWords(campaign: Campaign, nation: NationId): string | undefined {
  const next = foreignLeadershipReading(campaign, nation)?.nextSelection;
  return next ? `Next time a leader is chosen: ${next}` : undefined;
}
