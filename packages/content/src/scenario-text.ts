import type { ResolvedLocus } from "./scenario-locus.js";
import { otherMajorParty, selectNation, type StorySubject, type Campaign, type UsMajorParty } from "@admin/engine";
import {
  worldCities,
  worldSettlements,
  worldDataset,
  type Charter,
  type CityKind,
  type InstitutionKind,
  type NationId,
  type StateId,
} from "@admin/world";
import type { ScenarioDef } from "./scenario.js";
import { boundState, governorName, seasonAt, sinceDeedPhrase } from "./scenario-cast-conditions.js";
import { atSentenceStart, nationPhrase, takesDefiniteArticle } from "./nation-article.js";
import { boundOutletName } from "./scenario-outlet.js";

// Every authored string a player reads passes through here on its way to the
// screen. It is one module rather than a helper inside casting because the
// locus resolver needs it too, and when it lived inside casting the locus
// could not reach it — which is how a descriptor reached the Desk still
// spelling `{{city}}` in braces.

// The charter the player founded under decides what their own institutions
// are called, so content names the function ("the assembly") and this supplies
// the name. It is looked up rather than stored on the campaign because a
// charter is authored data that never changes within a run.
function foundingCharter(campaign: Campaign): Charter | undefined {
  return worldDataset.charters.find((charter) => charter.id === campaign.founding.charter);
}

export function institutionNamed(campaign: Campaign, kind: InstitutionKind): string | undefined {
  return foundingCharter(campaign)?.institutions.find((institution) => institution.kind === kind)?.name;
}

const CITY_KIND_GLOSS: Readonly<Record<CityKind, string>> = {
  industrial: "industrial metro",
  port: "port",
  capital: "capital",
  border: "border city",
  financial: "financial center",
  interior: "inland city",
};

export type PlaceTokens = {
  readonly subjects?: Readonly<Record<string, string>>;
  readonly city?: string;
  readonly settlement?: string;
  readonly cityKind?: string;
  /**
   * A US state's name, from the running condition a bound scenario is about or
   * from `locus.state`. Unlike `counterpart` or
   * `nation`, a state is not chosen per campaign — the fifty states are a
   * fixed dataset row, so a scenario may cite one by name at authoring time
   * without becoming a claim that varies by board draw. This token exists so a
   * writer reaches for `{{state}}` instead of hardcoding the name, which is
   * what lets a domestic scenario later re-cast across which state a disaster
   * or a strike lands in without a prose rewrite.
   */
  readonly state?: string;
  /**
   * The seated governor of the bound state.
   *
   * Only ever a real person on the live board — a scenario about a wildfire in
   * Colorado is being answered beside the governor who is actually in office in
   * Colorado, and that person is rolled per campaign, so the prose cannot name
   * them and the token has to. Absent where no state is bound or the seat is
   * unseated, which is what the audit refuses to publish a `{{governor}}`
   * against.
   */
  readonly governor?: string;
  /** What time of year it is on the scenario's own ground. */
  readonly season?: string;
  /** How long ago the deed this scenario waits on was done. See `sinceDeedPhrase`. */
  readonly sinceDeed?: string;
  /** The masthead an outlet week is about. Filled only on an outlet cast; see scenario-outlet.ts. */
  readonly outlet?: string;
  readonly reportId?: string;
  readonly reportSummary?: string;
  readonly reportFinding?: string;
  readonly reportSource?: string;
  readonly reportGaps?: string;
  readonly reportConfidence?: string;
  readonly reportExposure?: string;
  readonly reportTarget?: string;
  readonly reportRecipient?: string;
  readonly reportAgeDays?: string;
  readonly reportFindingCount?: string;
  readonly matterSubject?: string;
  readonly matterInstitution?: string;
  /** The name of the body the player and the counterpart share, from the scenario's own `sharedMembership` gate. */
  readonly sharedOrganization?: string;
  /** The sector of the U.S. tariff the counterpart's retaliation answers, read off the trade ledger. */
  readonly ourTariffSector?: string;
  readonly tradeSector?: string;
  readonly tradeRate?: string;
  readonly billTitle?: string;
  readonly billProvision?: string;
  readonly billHouseProvision?: string;
  readonly billSenateProvision?: string;
  readonly judicialSeat?: string;
  readonly judicialNominee?: string;
  readonly judicialNomineeRecord?: string;
  readonly judicialAlternate?: string;
  readonly judicialAlternateRecord?: string;
  readonly courtOrder?: string;
  readonly courtQuestion?: string;
};

/**
 * The tokens whose value comes from the board rather than from the writer.
 *
 * Exported so the binder's vocabulary and the audit's are one list rather than
 * two that can disagree: a token this file fills but the audit does not know is
 * an error on every scenario that reaches for it, and one the audit knows but
 * this file does not fill prints a blank where a name should be. The type
 * assertion below is what holds the list to `PlaceTokens` rather than to a
 * comment.
 */
export const PLACE_TOKEN_NAMES = ["city", "settlement", "cityKind", "state", "governor", "season", "sinceDeed", "outlet", "sharedOrganization", "ourTariffSector", "reportId", "reportSummary", "reportFinding", "reportSource", "reportGaps", "reportConfidence", "reportExposure", "reportTarget", "reportRecipient", "reportAgeDays", "reportFindingCount", "matterSubject", "matterInstitution", "tradeSector", "tradeRate", "billTitle", "billProvision", "billHouseProvision", "billSenateProvision", "judicialSeat", "judicialNominee", "judicialNomineeRecord", "judicialAlternate", "judicialAlternateRecord", "courtOrder", "courtQuestion"] as const;

type PlaceTokenName = Exclude<keyof PlaceTokens, "subjects">;
type TokensCovered = (typeof PLACE_TOKEN_NAMES)[number] extends PlaceTokenName
  ? PlaceTokenName extends (typeof PLACE_TOKEN_NAMES)[number]
    ? true
    : never
  : never;
const _tokensCovered: TokensCovered = true;
void _tokensCovered;

function institutionVars(campaign: Campaign): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const institution of foundingCharter(campaign)?.institutions ?? []) {
    if (institution.kind) vars[institution.kind] = institution.name;
  }
  return vars;
}

function stateNameOf(id: StateId | undefined): string | undefined {
  if (!id) return undefined;
  return worldDataset.states.find((entry) => entry.id === id)?.name;
}

/**
 * Which state this scenario is actually about.
 *
 * The running condition wins over the authored field: a scenario that says its
 * place is wherever the thing is happening is being read against the fire that
 * is burning, and an author who wrote a state as well has written a default the
 * bind is there to override.
 */
function boundStateId(campaign: Campaign, def: ScenarioDef, ground: NationId): StateId | undefined {
  if (def.locus.bind === "condition") {
    const fromCondition = boundState(campaign, def, ground);
    if (fromCondition) return fromCondition;
  }
  return def.locus.state;
}

/**
 * Every token whose value comes from the board rather than from the writer.
 *
 * One function because they are one question — where is this happening, and
 * therefore who answers for it, and what time of year is it there — and because
 * every caller that renders authored prose needs all of them or none: a beat
 * that got `{{state}}` and not `{{governor}}` would print a raw brace beside a
 * real state name.
 */
/** What `{{state}}` and `{{governor}}` read when a bound condition names no state. */
export const UNPLACED_STATE = "the country";
export const UNPLACED_GOVERNOR = "a governor";

export function boundPlace(campaign: Campaign, def: ScenarioDef, counterpart: NationId, locus?: ResolvedLocus, subjects: readonly StorySubject[] = []): PlaceTokens {
  const ground = def.locus.ground === "counterpart" ? counterpart : campaign.founding.nation;
  const settlement = locus?.settlement ? worldSettlements.find((place) => place.id === locus.settlement) : undefined;
  const cityId = locus?.city ?? def.locus.city;
  const city = cityId ? campaign.cities[cityId]?.base ?? worldCities.find((entry) => entry.id === cityId) : undefined;
  const stateId = locus?.state ?? boundStateId(campaign, def, ground);
  const state = stateNameOf(stateId);
  const governor = stateId ? governorName(campaign, stateId) : undefined;
  const season = seasonAt(campaign.calendar.month, selectNation(campaign, ground)?.base.geo.lat ?? 0);
  const sinceDeed = sinceDeedPhrase(campaign, def);
  const outlet = boundOutletName(campaign, def.cast);
  // A week bound to a condition that turns out to be nation-wide names no
  // state; the words stand in for the place rather than leave a raw token on
  // the screen, because the scenario is still about the thing that is running.
  const unplaced = def.locus.bind === "condition" && !state;
  return {
    ...(settlement ? { settlement: settlement.name } : {}),
    ...(subjects.length ? { subjects: Object.fromEntries(subjects.map((subject) => [subject.key, subject.name])) } : {}),
    ...(city ? { city: city.name, cityKind: CITY_KIND_GLOSS[city.kind] } : settlement ? { city: settlement.name, cityKind: settlement.commercialPort ? "port" : "small settlement" } : {}),
    ...(state ? { state } : unplaced ? { state: UNPLACED_STATE } : {}),
    ...(governor ? { governor } : unplaced ? { governor: UNPLACED_GOVERNOR } : {}),
    ...(sinceDeed ? { sinceDeed } : {}),
    ...(outlet ? { outlet } : {}),
    season,
  };
}

const PARTY_NOUN: Readonly<Record<UsMajorParty, string>> = { democrat: "Democrats", republican: "Republicans" };
const PARTY_ADJECTIVE: Readonly<Record<UsMajorParty, string>> = { democrat: "Democratic", republican: "Republican" };

/**
 * The two caucuses by name, so a scenario says "Republicans in Congress" and
 * not "the other party". Read off the caucus the administration sits nearest,
 * the axis every seat and leadership post is already counted along, so an
 * independent president's opposition is the caucus across from the one their
 * politics anchor on.
 */
function partyVars(campaign: Campaign): Record<string, string> {
  const own = campaign.congress?.caucusAnchor;
  if (!own) return {};
  const other = otherMajorParty(own);
  return { opposition: PARTY_NOUN[other], oppositionAdjective: PARTY_ADJECTIVE[other], caucus: PARTY_NOUN[own], caucusAdjective: PARTY_ADJECTIVE[own] };
}

export function renderText(
  campaign: Campaign,
  counterpart: NationId,
  text: string,
  place?: PlaceTokens,
): string {
  const counterpartIdentity = selectNation(campaign, counterpart)?.base.identity;
  const playerIdentity = selectNation(campaign, campaign.founding.nation)?.base.identity;
  const vars: Record<string, string> = {
    counterpart: counterpartIdentity?.name ?? String(counterpart),
    counterpartAdjective: counterpartIdentity?.adjective ?? counterpartIdentity?.name ?? String(counterpart),
    leader: campaign.founding.name,
    title: campaign.founding.title,
    nation: playerIdentity?.name ?? String(campaign.founding.nation),
    // The player's own institutions, named by the charter they founded under.
    // A token whose body this charter lacks is left standing rather than
    // rendered blank — the audit refuses to publish that case, so reaching it
    // means something upstream is wrong and should look wrong.
    ...institutionVars(campaign),
    ...partyVars(campaign),
    ...Object.fromEntries(Object.entries(place ?? {}).filter(([key]) => key !== "subjects")),
    ...(place?.subjects ?? {}),
  };
  // The two nation tokens are the only ones whose replacement is a country's
  // name, and a country's name is the only thing in this vocabulary that might
  // need an article in front of it. The possessive is swallowed by the pattern
  // so "the United States's" never reaches a screen.
  const articled: Readonly<Record<string, boolean>> = {
    counterpart: takesDefiniteArticle(counterpartIdentity),
    nation: takesDefiniteArticle(playerIdentity),
  };
  return text.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}(’s|'s)?/g, (whole, key: string, possessive: string | undefined, offset: number) => {
    const value = vars[key];
    if (value === undefined) return whole;
    // Only an article name's possessive is reshaped; every other name keeps
    // exactly the apostrophe the writer typed.
    if (!(key in articled) || articled[key] !== true) {
      // A board word that opens a sentence opens it capitalized: a season or a
      // stand-in place is written lowercase and can land first.
      const opened = atSentenceStart(text, offset) ? value.charAt(0).toUpperCase() + value.slice(1) : value;
      return `${opened}${possessive ?? ""}`;
    }
    return nationPhrase(value, true, {
      sentenceStart: atSentenceStart(text, offset),
      possessive: possessive !== undefined,
    });
  });
}

