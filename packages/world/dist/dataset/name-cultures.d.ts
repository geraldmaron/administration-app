import { type NameCulture } from "./name-banks.js";
import { type VendoredNameCulture } from "./name-banks.vendored.js";
import { type RegionalNameCulture } from "./name-banks-regional.js";
import { NameBank, NameGroup } from "../schemas/people-pool.js";
import type { PortraitHeritage } from "../schemas/portrait.js";
/**
 * The American bench, named the way American officials are named.
 *
 * The United States used to draw every name from the `anglo` bank it shares
 * with Britain, Canada, Australia and the Anglophone Caribbean, so a House
 * Democratic caucus that is a quarter Black and a sixth Hispanic was staffed by
 * Smiths and Coopers. These six groups are counted from public records rather
 * than authored, and a person draws from the one their own heritage picks, so a
 * name and a face agree.
 *
 * Sources, each opened 2026-09-23:
 *
 * - Surnames: U.S. Census Bureau, "Frequently Occurring Surnames from the 2010
 *   Census" (Names_2010Census.csv in
 *   https://www2.census.gov/topics/genealogy/2010surnames/names.zip), public
 *   domain. Each group is the surnames ranked by count x the group's percentage
 *   (white at >= 50% white and < 20% Hispanic and Asian; Black at >= 25% Black;
 *   Hispanic at >= 60% Hispanic; the three Asian groups at >= 50-70% Asian and
 *   Pacific Islander, split by tradition by hand). Forms the file strips of
 *   spacing (DELACRUZ, VANBUREN) are left out, and so are the surnames of every
 *   president and vice president since 1961.
 * - Given-name sex: Social Security Administration national baby names,
 *   yob1945-yob1995 (https://www.ssa.gov/oact/babynames/names.zip, public
 *   domain; retrieved through the Internet Archive's copy because ssa.gov
 *   refuses scripted downloads). Masculine is >= 90% male, feminine <= 10%,
 *   neutral 25-75%.
 * - Given-name ethnicity: Tzioumis, K. (2018), "Demographic aspects of first
 *   names", Scientific Data 5:180025, Harvard Dataverse doi:10.7910/DVN/TYJKEZ,
 *   CC0 1.0. Names ranked by SSA count x the group's percentage; the Asian
 *   groups lead with heritage names (Priya, Minh, Wei) and fill with the
 *   American names Asian Americans most often carry.
 */
export type UsNameGroupId = "white" | "black" | "hispanic" | "east-asian" | "south-asian" | "southeast-asian";
export declare const US_NAME_GROUPS: Readonly<Record<UsNameGroupId, NameGroup>>;
export declare const US_NAME_BANK: NameBank;
/**
 * Which American name group a face belongs to. A white official's face is
 * drawn as northern European, and the census "other" group (most of it Native
 * American, whose names in the record are English-origin) as mixed; both take
 * the white group's names.
 */
export declare const US_NAME_GROUP_BY_HERITAGE: Readonly<Partial<Record<PortraitHeritage, UsNameGroupId>>>;
/**
 * Either an authored bank (name-banks.ts), one counted from Wikidata
 * (name-banks.vendored.ts), one of the traditions split out of a shared bank
 * (name-banks-regional.ts), or the American one above.
 */
export type AnyNameCulture = NameCulture | VendoredNameCulture | RegionalNameCulture | "american";
export declare const ALL_NAME_BANKS: Readonly<Record<AnyNameCulture, NameBank>>;
/**
 * The tradition a nation's lead chair is named from, where its people draw
 * from several; undefined where they draw from one.
 */
export declare function leadNameGroup(nation: string): NameGroup | undefined;
/**
 * The one group a person of this heritage is named from, where the nation's
 * bank is split by heritage. Absent for every bank that is one tradition, which
 * then draws its groups by weight as it always has.
 */
export declare function nameGroupForHeritage(culture: AnyNameCulture, heritage: PortraitHeritage): NameGroup | undefined;
/**
 * The naming tradition of each country the roster carries at thin fidelity.
 * The authored countries' traditions are in people.ts. A country with a bank
 * counted from its own citizens' names draws from it; where a bank is shared,
 * it is because the naming is one tradition (Senegal and the Gambia, Czechia
 * and Slovakia, the Polynesian states).
 */
export declare const ROSTER_NAME_CULTURE: Readonly<Record<string, AnyNameCulture>>;
/**
 * The bank a nation's people are named from: its culture's own, narrowed to
 * the traditions the nation itself follows where the bank serves several.
 */
export declare function nationNameBank(nation: string, culture: AnyNameCulture): NameBank;
/**
 * Every tradition by its id, from every bank and every nation's own split, so
 * a draw can be read back against a list of traditions kept outside the banks.
 */
export declare function nameGroupById(id: string): NameGroup | undefined;
