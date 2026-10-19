import { NationPartySystem, type Nation } from "../schemas/nation.js";
import { ROSTER_PARTY_SYSTEMS } from "./roster-tables.generated.js";
import type { Party, PartyKind } from "../schemas/org-cradle-charter.js";
import { CHARTER_USA_CONSTITUTION } from "./usa.js";

/**
 * Who contests power in each country, and what they believe.
 *
 * This exists because `Charter.parties` could not carry it. Twenty-one nations
 * in this dataset share `charter-presidential-republic` and twenty-one share
 * `charter-parliamentary-republic`, so a slate hung on the charter gave China
 * and Brazil the same politics — and every government abroad the same politics
 * as each other. Parties are a fact about a country, not about the shape of
 * its constitution.
 *
 * What it replaces on the surface is worse than a gap. A foreign national with
 * no ticket fell through to the United States' own caucus anchor, so a Kazakh
 * president's dossier read "Democrat" and said it in the grammar of a fact.
 *
 * ### What is authored here, and what is not
 *
 * The tickets that can plausibly hold or contest national power, at two to
 * three per country — not a full register of every registered party. A slate
 * longer than that is a list nobody reads and a research surface nobody can
 * keep true; a slate of the two or three that decide who governs is the fact a
 * president actually needs.
 *
 * `contest` is the honest reading of how open that competition is, and "none"
 * is a real answer rather than missing research. A monarchy fields no parties.
 * Saying it fields none is more accurate than inventing two.
 *
 * ### The axes
 *
 * The same three `Person.ideology` runs on, so a person and a ticket can be
 * compared without a conversion: `economicLeftRight` negative is left,
 * `authLibertarian` positive is authoritarian, `nationalistGlobalist` positive
 * is nationalist. `cohesion` is how alike the ticket's members read the same
 * act — a disciplined ruling party predicts its members, a broad coalition
 * does not, and every reading taken against a ticket is scaled by it.
 */

const party = (
  id: string,
  name: string,
  shortName: string,
  economicLeftRight: number,
  authLibertarian: number,
  nationalistGlobalist: number,
  cohesion: number,
  kind: PartyKind = "major",
): Party =>
  ({
    id,
    name,
    shortName,
    kind,
    beliefs: { economicLeftRight, authLibertarian, nationalistGlobalist },
    cohesion,
  }) as Party;

const system = (contest: NationPartySystem["contest"], parties: readonly Party[]): NationPartySystem => ({
  contest,
  parties: [...parties],
});

/** No party system at all — the seat of power is not contested by tickets. */
const NO_PARTIES = system("none", []);

export const NATION_PARTY_SYSTEMS: Readonly<Record<string, NationPartySystem>> = {
  // The seat of play reads its own slate off its charter, which is where the
  // engine's Congress already looks for it. Pointing at the same array rather
  // than restating it keeps one source: a ticket cannot be a Democrat in the
  // chamber and something else on a dossier.
  USA: system("multiparty", CHARTER_USA_CONSTITUTION.parties ?? []),

  // --- The Americas --------------------------------------------------------
  BRA: system("multiparty", [
    party("party-bra-pt", "Workers' Party", "PT", -0.55, -0.1, -0.2, 0.75),
    party("party-bra-pl", "Liberal Party", "PL", 0.45, 0.4, 0.5, 0.65),
    party("party-bra-mdb", "Brazilian Democratic Movement", "MDB", 0.1, 0.1, 0.05, 0.45),
  ]),
  // The President's own movement governs from a congressional minority, with
  // the Democratic Centre and the Liberals among its provisional partners.
  COL: system("multiparty", [
    party("party-col-defensores", "Defenders of the Homeland", "Defenders of the Homeland", 0.5, 0.55, 0.55, 0.65),
    party("party-col-pacto", "Historic Pact", "Historic Pact", -0.55, -0.2, -0.15, 0.6),
    party("party-col-cd", "Democratic Centre", "Democratic Centre", 0.5, 0.45, 0.35, 0.75),
    party("party-col-liberal", "Colombian Liberal Party", "Liberal", -0.1, 0.05, -0.05, 0.4),
  ]),
  VEN: system("dominant-party", [
    party("party-ven-psuv", "United Socialist Party of Venezuela", "PSUV", -0.8, 0.75, 0.5, 0.9),
    party("party-ven-pud", "Democratic Unitary Platform", "Unitary Platform", 0.3, -0.35, -0.3, 0.45),
  ]),
  CUB: system("one-party", [
    party("party-cub-pcc", "Communist Party of Cuba", "PCC", -0.85, 0.8, 0.55, 0.95),
  ]),
  CAN: system("multiparty", [
    party("party-can-liberal", "Liberal Party of Canada", "Liberal", -0.25, -0.15, -0.4, 0.8),
    party("party-can-conservative", "Conservative Party of Canada", "Conservative", 0.4, 0.15, 0.25, 0.8),
    party("party-can-ndp", "New Democratic Party", "NDP", -0.6, -0.25, -0.25, 0.75),
  ]),
  MEX: system("dominant-party", [
    party("party-mex-morena", "National Regeneration Movement", "Morena", -0.55, 0.25, 0.35, 0.8),
    party("party-mex-pan", "National Action Party", "PAN", 0.45, 0.1, -0.1, 0.7),
    party("party-mex-pri", "Institutional Revolutionary Party", "PRI", 0.1, 0.25, 0.1, 0.5),
  ]),

  // --- Europe --------------------------------------------------------------
  DEU: system("multiparty", [
    party("party-deu-union", "Christian Democratic Union", "CDU/CSU", 0.3, 0.1, 0.05, 0.75),
    party("party-deu-spd", "Social Democratic Party", "SPD", -0.4, -0.1, -0.3, 0.75),
    party("party-deu-afd", "Alternative for Germany", "AfD", 0.2, 0.55, 0.8, 0.7),
  ]),
  POL: system("multiparty", [
    party("party-pol-pis", "Law and Justice", "PiS", -0.15, 0.55, 0.7, 0.85),
    party("party-pol-ko", "Civic Coalition", "Civic Coalition", 0.25, -0.2, -0.45, 0.7),
    party("party-pol-konf", "Confederation", "Confederation", 0.7, 0.2, 0.75, 0.55),
  ]),
  ISL: system("multiparty", [
    party("party-isl-sjalf", "Independence Party", "Independence", 0.4, 0.05, 0.2, 0.7),
    party("party-isl-vg", "Left-Green Movement", "Left-Green", -0.6, -0.35, -0.2, 0.65),
    party("party-isl-sf", "Social Democratic Alliance", "Social Democrat", -0.35, -0.2, -0.35, 0.65),
  ]),
  GBR: system("multiparty", [
    party("party-gbr-labour", "Labour Party", "Labour", -0.35, -0.05, -0.2, 0.7),
    party("party-gbr-conservative", "Conservative Party", "Conservative", 0.4, 0.2, 0.35, 0.6),
    party("party-gbr-reform", "Reform UK", "Reform", 0.45, 0.35, 0.85, 0.65),
  ]),
  FRA: system("multiparty", [
    party("party-fra-rn", "National Rally", "National Rally", -0.05, 0.5, 0.85, 0.75),
    party("party-fra-ens", "Renaissance", "Renaissance", 0.3, 0.05, -0.5, 0.65),
    party("party-fra-lfi", "France Unbowed", "France Unbowed", -0.75, -0.25, 0.15, 0.7),
  ]),
  ITA: system("multiparty", [
    party("party-ita-fdi", "Brothers of Italy", "Brothers of Italy", 0.25, 0.45, 0.7, 0.8),
    party("party-ita-pd", "Democratic Party", "Democratic", -0.4, -0.15, -0.45, 0.6),
    party("party-ita-m5s", "Five Star Movement", "Five Star", -0.45, -0.1, 0.25, 0.45),
  ]),
  ESP: system("multiparty", [
    party("party-esp-psoe", "Spanish Socialist Workers' Party", "PSOE", -0.45, -0.1, -0.35, 0.75),
    party("party-esp-pp", "People's Party", "People's Party", 0.4, 0.2, 0.3, 0.7),
    party("party-esp-vox", "Vox", "Vox", 0.35, 0.55, 0.85, 0.75),
  ]),
  UKR: system("multiparty", [
    party("party-ukr-sluha", "Servant of the People", "Servant of the People", 0.1, 0.1, 0.35, 0.6),
    party("party-ukr-es", "European Solidarity", "European Solidarity", 0.3, 0.05, 0.4, 0.6),
  ]),
  RUS: system("dominant-party", [
    party("party-rus-er", "United Russia", "United Russia", 0.1, 0.85, 0.85, 0.9),
    party("party-rus-kprf", "Communist Party of the Russian Federation", "Communist", -0.65, 0.6, 0.7, 0.65),
    party("party-rus-ldpr", "Liberal Democratic Party of Russia", "LDPR", 0.2, 0.7, 0.9, 0.6),
  ]),
  SWE: system("multiparty", [
    party("party-swe-sap", "Swedish Social Democratic Party", "Social Democrat", -0.4, -0.1, -0.25, 0.8),
    party("party-swe-mod", "Moderate Party", "Moderate", 0.45, 0.1, 0.1, 0.75),
    party("party-swe-sd", "Sweden Democrats", "Sweden Democrats", 0.05, 0.45, 0.8, 0.7),
  ]),
  CHE: system("multiparty", [
    party("party-che-svp", "Swiss People's Party", "SVP", 0.45, 0.25, 0.75, 0.75),
    party("party-che-sp", "Social Democratic Party", "Social Democrat", -0.5, -0.2, -0.35, 0.7),
    party("party-che-fdp", "FDP.The Liberals", "FDP", 0.5, -0.1, 0.05, 0.65),
  ]),
  // Tisza has governed with a supermajority since May 2026 (the leader table,
  // packages/world/sources/leader-table), so power is contested again and the
  // governing ticket leads.
  HUN: system("multiparty", [
    party("party-hun-tisza", "Respect and Freedom Party", "Tisza", 0.2, -0.2, 0.15, 0.7),
    party("party-hun-fidesz", "Fidesz", "Fidesz", 0.15, 0.7, 0.8, 0.9),
  ]),

  // --- Asia ----------------------------------------------------------------
  CHN: system("one-party", [
    party("party-chn-cpc", "Communist Party of China", "CPC", -0.35, 0.95, 0.8, 0.95),
  ]),
  SGP: system("dominant-party", [
    party("party-sgp-pap", "People's Action Party", "PAP", 0.35, 0.6, 0.35, 0.9),
    party("party-sgp-wp", "Workers' Party", "Workers' Party", -0.2, -0.05, 0.1, 0.7),
  ]),
  PRK: system("one-party", [
    party("party-prk-wpk", "Workers' Party of Korea", "WPK", -0.7, 1, 0.95, 0.95),
  ]),
  VNM: system("one-party", [
    party("party-vnm-cpv", "Communist Party of Vietnam", "CPV", -0.3, 0.85, 0.6, 0.9),
  ]),
  IDN: system("multiparty", [
    party("party-idn-gerindra", "Great Indonesia Movement Party", "Gerindra", 0.15, 0.4, 0.55, 0.7),
    party("party-idn-pdip", "Indonesian Democratic Party of Struggle", "PDI-P", -0.3, 0.1, 0.3, 0.65),
    party("party-idn-golkar", "Party of Functional Groups", "Golkar", 0.3, 0.25, 0.2, 0.5),
  ]),
  IND: system("dominant-party", [
    party("party-ind-bjp", "Bharatiya Janata Party", "BJP", 0.3, 0.5, 0.8, 0.85),
    party("party-ind-inc", "Indian National Congress", "Congress", -0.3, -0.1, -0.15, 0.6),
    party("party-ind-aitc", "All India Trinamool Congress", "Trinamool", -0.25, 0.2, 0.2, 0.6),
  ]),
  PAK: system("multiparty", [
    party("party-pak-pmln", "Pakistan Muslim League (N)", "PML-N", 0.25, 0.35, 0.3, 0.7),
    party("party-pak-ppp", "Pakistan Peoples Party", "PPP", -0.35, 0.15, 0.1, 0.65),
    party("party-pak-pti", "Pakistan Tehreek-e-Insaf", "PTI", 0, 0.2, 0.55, 0.7),
  ]),
  BGD: system("multiparty", [
    party("party-bgd-bnp", "Bangladesh Nationalist Party", "BNP", 0.25, 0.3, 0.55, 0.65),
    party("party-bgd-al", "Bangladesh Awami League", "Awami League", -0.25, 0.5, 0.25, 0.7),
    party("party-bgd-jamaat", "Bangladesh Jamaat-e-Islami", "Jamaat", 0.1, 0.65, 0.6, 0.75),
  ]),
  KAZ: system("dominant-party", [
    // The pro-presidential successor to Amanat, which won seven votes in ten
    // at the August 2026 Kurultai election (the leader table's sources).
    party("party-kaz-adilet", "Adilet", "Adilet", 0.2, 0.7, 0.5, 0.85),
    party("party-kaz-auyl", "Auyl People's Democratic Patriotic Party", "Auyl", -0.25, 0.4, 0.4, 0.55),
    party("party-kaz-respublica", "Respublica", "Respublica", 0.45, 0.35, 0.3, 0.5),
  ]),
  JPN: system("dominant-party", [
    party("party-jpn-ldp", "Liberal Democratic Party", "LDP", 0.3, 0.3, 0.35, 0.7),
    party("party-jpn-cdp", "Constitutional Democratic Party", "Constitutional Democrat", -0.3, -0.2, -0.2, 0.6),
    party("party-jpn-ishin", "Japan Innovation Party", "Ishin", 0.5, 0.15, 0.4, 0.6),
  ]),
  KOR: system("multiparty", [
    party("party-kor-dp", "Democratic Party of Korea", "Democratic", -0.35, -0.05, 0.05, 0.75),
    party("party-kor-ppp", "People Power Party", "People Power", 0.4, 0.3, 0.35, 0.7),
  ]),
  TWN: system("multiparty", [
    party("party-twn-dpp", "Democratic Progressive Party", "DPP", -0.1, -0.2, 0.5, 0.8),
    party("party-twn-kmt", "Kuomintang", "Kuomintang", 0.3, 0.2, -0.3, 0.7),
    party("party-twn-tpp", "Taiwan People's Party", "TPP", 0.15, 0, 0.1, 0.5),
  ]),
  AUS: system("multiparty", [
    party("party-aus-labor", "Australian Labor Party", "Labor", -0.35, -0.05, -0.15, 0.85),
    party("party-aus-coalition", "Liberal–National Coalition", "Coalition", 0.45, 0.2, 0.3, 0.75),
    party("party-aus-greens", "Australian Greens", "Greens", -0.65, -0.4, -0.4, 0.75),
  ]),

  // --- Middle East and North Africa ---------------------------------------
  SAU: NO_PARTIES,
  ARE: NO_PARTIES,
  AFG: NO_PARTIES,
  // The state is being rebuilt after the fall of the Baath order; no ticket
  // yet contests national power on a scheduled ballot.
  SYR: NO_PARTIES,
  IRQ: system("multiparty", [
    party("party-irq-cf", "Coordination Framework", "Coordination Framework", -0.1, 0.5, 0.35, 0.55),
    party("party-irq-taqaddum", "Taqaddum", "Taqaddum", 0.35, 0.3, 0.3, 0.6),
    party("party-irq-kdp", "Kurdistan Democratic Party", "KDP", 0.3, 0.4, 0.6, 0.75),
  ]),
  // Factions rather than parties: a slate reaches the ballot only after the
  // Guardian Council vets it, which is why the contest is not open.
  IRN: system("dominant-party", [
    party("party-irn-principlist", "Principlists", "Principlist", -0.1, 0.85, 0.8, 0.75),
    party("party-irn-reformist", "Reformists", "Reformist", 0.1, 0.35, 0.3, 0.55),
  ]),
  ISR: system("multiparty", [
    party("party-isr-likud", "Likud", "Likud", 0.35, 0.35, 0.7, 0.7),
    party("party-isr-yeshatid", "Yesh Atid", "Yesh Atid", 0.2, -0.25, 0.1, 0.65),
    party("party-isr-shas", "Shas", "Shas", -0.2, 0.55, 0.55, 0.8),
  ]),
  TUR: system("dominant-party", [
    party("party-tur-akp", "Justice and Development Party", "AKP", 0.15, 0.7, 0.7, 0.85),
    party("party-tur-chp", "Republican People's Party", "CHP", -0.3, -0.05, 0.2, 0.65),
    party("party-tur-mhp", "Nationalist Movement Party", "MHP", 0.2, 0.6, 0.9, 0.75),
  ]),
  YEM: system("multiparty", [
    party("party-yem-gpc", "General People's Congress", "GPC", 0.1, 0.5, 0.4, 0.45),
    party("party-yem-islah", "Al-Islah", "Al-Islah", 0.2, 0.55, 0.45, 0.6),
  ]),
  EGY: system("dominant-party", [
    party("party-egy-mostaqbal", "Nation's Future Party", "Nation's Future", 0.2, 0.8, 0.6, 0.85),
    party("party-egy-wafd", "New Wafd Party", "Wafd", 0.25, 0.3, 0.3, 0.45),
  ]),
  MAR: system("multiparty", [
    party("party-mar-rni", "National Rally of Independents", "RNI", 0.4, 0.35, 0.25, 0.65),
    party("party-mar-pam", "Authenticity and Modernity Party", "PAM", 0.3, 0.3, 0.2, 0.6),
    party("party-mar-istiqlal", "Istiqlal Party", "Istiqlal", 0.1, 0.35, 0.45, 0.6),
  ]),
  DZA: system("dominant-party", [
    party("party-dza-fln", "National Liberation Front", "FLN", -0.2, 0.7, 0.6, 0.75),
    party("party-dza-rnd", "Democratic National Rally", "RND", 0.05, 0.6, 0.5, 0.65),
  ]),

  // --- Sub-Saharan Africa --------------------------------------------------
  NGA: system("multiparty", [
    party("party-nga-apc", "All Progressives Congress", "APC", 0.3, 0.35, 0.35, 0.6),
    party("party-nga-pdp", "Peoples Democratic Party", "PDP", 0.1, 0.3, 0.2, 0.5),
    party("party-nga-lp", "Labour Party", "Labour", -0.35, -0.05, 0.1, 0.5),
  ]),
  ZAF: system("multiparty", [
    party("party-zaf-anc", "African National Congress", "ANC", -0.4, 0.25, 0.25, 0.6),
    party("party-zaf-da", "Democratic Alliance", "Democratic Alliance", 0.45, -0.2, -0.25, 0.75),
    party("party-zaf-eff", "Economic Freedom Fighters", "EFF", -0.85, 0.45, 0.6, 0.75),
  ]),
  ETH: system("dominant-party", [
    party("party-eth-prosperity", "Prosperity Party", "Prosperity", -0.05, 0.65, 0.5, 0.8),
    party("party-eth-ezema", "Ethiopian Citizens for Social Justice", "Ezema", 0.1, -0.05, 0.05, 0.5),
  ]),
  COD: system("multiparty", [
    party("party-cod-udps", "Union for Democracy and Social Progress", "UDPS", -0.2, 0.3, 0.3, 0.55),
    party("party-cod-fcc", "Common Front for Congo", "Common Front", 0.05, 0.45, 0.3, 0.45),
  ]),
  RWA: system("dominant-party", [
    party("party-rwa-rpf", "Rwandan Patriotic Front", "RPF", -0.1, 0.75, 0.5, 0.9),
    party("party-rwa-green", "Democratic Green Party of Rwanda", "Green", -0.3, -0.25, -0.05, 0.55),
  ]),

  // --- The roster's later admissions ---------------------------------------
  NLD: system("multiparty", [
    party("party-nld-d66", "Democrats 66", "D66", -0.05, -0.45, -0.6, 0.7),
    party("party-nld-vvd", "People's Party for Freedom and Democracy", "VVD", 0.5, 0.1, 0.15, 0.7),
    party("party-nld-pvv", "Party for Freedom", "PVV", 0.1, 0.5, 0.85, 0.75),
    party("party-nld-gl-pvda", "GroenLinks-PvdA", "GroenLinks-PvdA", -0.5, -0.25, -0.4, 0.65),
  ]),
  BEL: system("multiparty", [
    party("party-bel-nva", "New Flemish Alliance", "N-VA", 0.4, 0.25, 0.7, 0.7),
    party("party-bel-ps", "Socialist Party", "PS", -0.5, -0.15, -0.35, 0.7),
    party("party-bel-mr", "Reformist Movement", "MR", 0.5, 0.05, -0.1, 0.65),
  ]),
  IRL: system("multiparty", [
    party("party-irl-ff", "Fianna Fáil", "Fianna Fáil", 0.15, 0.1, 0.1, 0.6),
    party("party-irl-fg", "Fine Gael", "Fine Gael", 0.35, 0.1, -0.25, 0.65),
    party("party-irl-sf", "Sinn Féin", "Sinn Féin", -0.5, -0.1, 0.4, 0.75),
  ]),
  NOR: system("multiparty", [
    party("party-nor-ap", "Arbeiderpartiet", "Arbeiderpartiet", -0.4, -0.1, -0.2, 0.75),
    party("party-nor-hoyre", "Conservative Party", "Conservative", 0.45, 0.1, 0.05, 0.75),
    party("party-nor-frp", "Progress Party", "Progress", 0.5, 0.3, 0.7, 0.65),
  ]),
  DNK: system("multiparty", [
    party("party-dnk-social", "Social Democrats", "Social Democrat", -0.35, 0, 0.15, 0.8),
    party("party-dnk-venstre", "Venstre", "Venstre", 0.5, 0.05, 0.05, 0.7),
    party("party-dnk-df", "Danish People's Party", "Danish People's", 0.05, 0.4, 0.8, 0.65),
  ]),
  ARG: system("multiparty", [
    party("party-arg-lla", "Liberty Advances", "Liberty Advances", 0.85, 0.2, 0.35, 0.65),
    party("party-arg-uxp", "Union for the Homeland", "Union for the Homeland", -0.6, 0.2, 0.3, 0.55),
    party("party-arg-pro", "Republican Proposal", "PRO", 0.55, 0.15, 0.05, 0.6),
  ]),
  CHL: system("multiparty", [
    party("party-chl-republicano", "Republican Party", "Republican", 0.55, 0.5, 0.6, 0.75),
    party("party-chl-af", "Broad Front", "Broad Front", -0.6, -0.3, -0.25, 0.6),
    party("party-chl-udi", "Independent Democratic Union", "UDI", 0.5, 0.3, 0.25, 0.65),
  ]),
  THA: system("multiparty", [
    party("party-tha-pheu", "Pheu Thai Party", "Pheu Thai", -0.3, 0.15, 0.25, 0.65),
    party("party-tha-pp", "People's Party", "People's Party", -0.15, -0.4, -0.1, 0.7),
    party("party-tha-bhumjaithai", "Bhumjaithai Party", "Bhumjaithai", 0.3, 0.4, 0.4, 0.5),
  ]),
  PHL: system("multiparty", [
    party("party-phl-pfp", "Partido Federal ng Pilipinas", "PFP", 0.3, 0.4, 0.35, 0.45),
    party("party-phl-lakas", "Lakas-CMD", "Lakas", 0.3, 0.35, 0.3, 0.45),
    party("party-phl-pdp", "PDP-Laban", "PDP-Laban", -0.1, 0.55, 0.5, 0.45),
    party("party-phl-liberal", "Liberal Party", "Liberal", 0.1, -0.3, -0.15, 0.5),
  ]),
  MYS: system("multiparty", [
    party("party-mys-ph", "Alliance of Hope", "Alliance of Hope", -0.1, -0.25, -0.2, 0.6),
    party("party-mys-pn", "National Alliance", "National Alliance", 0.2, 0.45, 0.7, 0.7),
    party("party-mys-bn", "National Front", "National Front", 0.35, 0.35, 0.4, 0.5),
  ]),
  // An emirate: the Shura Council advises, and no ticket contests the throne.
  QAT: NO_PARTIES,

  // --- Europe / Eurasia, remaining ----------------------------------------
  BLR: system("dominant-party", [
    party("party-blr-belayarus", "Belaya Rus", "Belaya Rus", -0.2, 0.9, 0.7, 0.9),
  ]),
};

/**
 * The ticket that governs a baked country today where the bake predates it.
 *
 * The Factbook archive the roster slates come from lists the seated tickets
 * of its own year, so a party founded or swept to power since is missing, and
 * a leader drawn from the slate would carry a ticket that no longer governs.
 * Each entry here is the governing party of the leader constraint table
 * (packages/world/sources/leader-table, as of 2026-09-23), put first on the
 * slate; a country the bake recorded as running no parties is corrected to
 * the contest its governing party now wins. Each party is placed on the axes
 * by the same judgment the authored slates above use; none is measured.
 */
const GOVERNING_ADDITIONS: Readonly<Record<string, { readonly contest?: NationPartySystem["contest"]; readonly party: Party }>> = {
  BGR: { party: party("party-bgr-progressive-bulgaria", "Progressive Bulgaria", "Progressive Bulgaria", -0.15, 0.3, 0.45, 0.8) },
  BIH: { party: party("party-bih-hdz-bih", "Croatian Democratic Union of Bosnia and Herzegovina", "HDZ BiH", 0.25, 0.3, 0.7, 0.8) },
  CRI: { party: party("party-cri-ppso", "Sovereign People's Party", "PPSO", 0.35, 0.4, 0.35, 0.75) },
  GAB: {
    contest: "dominant-party",
    party: party("party-gab-udb", "Democratic Union of Builders", "UDB", 0.05, 0.55, 0.35, 0.8),
  },
  GIN: {
    contest: "dominant-party",
    party: party("party-gin-gmd", "Generation for Modernity and Development", "GMD", 0, 0.65, 0.45, 0.8),
  },
  KIR: { contest: "dominant-party", party: party("party-kir-tkp", "Tobwaan Kiribati Party", "TKP", 0, 0.1, 0.3, 0.6) },
  MMR: {
    contest: "dominant-party",
    party: party("party-mmr-usdp", "Union Solidarity and Development Party", "USDP", 0.2, 0.85, 0.75, 0.85),
  },
  NPL: { party: party("party-npl-rsp", "Rastriya Swatantra Party", "RSP", 0.1, -0.1, 0.2, 0.65) },
  SOM: {
    contest: "dominant-party",
    party: party("party-som-jsp", "Justice and Solidarity Party", "JSP", 0.1, 0.35, 0.4, 0.6),
  },
  STP: { party: party("party-stp-adi", "Independent Democratic Action", "ADI", 0.2, 0.15, 0.2, 0.55) },
};

/** The thin countries' party systems, baked from the Factbook's seated tickets and Wikidata's stated ideologies. */
const ROSTER_PARTY_SYSTEM_BY_NATION: ReadonlyMap<string, NationPartySystem> = new Map(
  Object.entries(ROSTER_PARTY_SYSTEMS).map(([nation, input]) => {
    const parsed = NationPartySystem.parse(input);
    const addition = GOVERNING_ADDITIONS[nation];
    if (!addition) return [nation, parsed];
    return [nation, { contest: addition.contest ?? parsed.contest, parties: [addition.party, ...parsed.parties] }];
  }),
);

/**
 * Attach each nation's politics to its record.
 *
 * A nation with nothing authored is a research gap, not a country with no
 * politics — `contest: "none"` is the second statement and has to be written
 * down rather than inferred from silence. So an unauthored nation throws here
 * rather than assembling into a dataset the validator would refuse anyway,
 * which puts the failure on the id that caused it instead of on a schema error
 * fifty nations later.
 */
export function applyPartySystems<T extends { readonly id: Nation["id"] }>(
  nations: readonly T[],
): (T & { partySystem: NationPartySystem })[] {
  return nations.map((nation) => {
    const found = NATION_PARTY_SYSTEMS[nation.id as string] ?? ROSTER_PARTY_SYSTEM_BY_NATION.get(nation.id as string);
    if (!found) throw new Error(`no party system authored for nation "${nation.id}"`);
    return { ...nation, partySystem: found };
  });
}
