// The judgment the roster's thin records are drafted from.
//
// Everything a source states about a country comes from the seed tables. What
// is here is what no source states and a person has to decide: which of the
// game's regions a country sits in, which of the seven generic charters its
// government is closest to, the spelling a player reads, how exposed a region
// is to each kind of disaster, what a party's stated ideology means on the
// game's three axes, how power is contested where no party holds a seat, and
// where a small state's officials study. Each table is a prior: the content
// room overrides a country by authoring it, and the thin record stops reading
// the prior the moment it does.
//
// Read by scripts/draft-nation-records.mjs (drafts a record once, for a
// country that has none) and scripts/bake-nations.mjs (party systems, schools
// and neighbors, rebaked whenever the seed moves).

/** The game's region for each country the roster adds. Two regions are new: Central America and the Caucasus. */
export const REGION_OF = Object.fromEntries(
  Object.entries({
    "region-north-africa": "LBY TUN SDN MRT",
    "region-west-africa": "BEN BFA CPV CIV GMB GHA GIN GNB LBR MLI NER SEN SLE TGO",
    "region-central-africa": "CMR CAF TCD COG GNQ GAB STP",
    "region-east-africa": "KEN TZA UGA BDI ERI DJI SOM SSD",
    "region-southern-africa": "AGO NAM BWA LSO SWZ ZWE ZMB MWI MOZ MDG MUS COM SYC",
    "region-caribbean": "ATG BHS BRB DMA DOM GRD HTI JAM KNA LCA VCT TTO",
    "region-central-america": "BLZ CRI SLV GTM HND NIC PAN",
    "region-south-america": "BOL ECU GUY PRY PER SUR URY",
    "region-northern-europe": "EST LVA LTU FIN",
    "region-western-europe": "AUT LIE LUX MCO",
    "region-central-europe": "CZE SVK SVN",
    "region-southern-europe": "ALB AND BIH HRV GRC MLT MNE MKD PRT SMR SRB XKX CYP",
    "region-eastern-europe": "BGR ROU MDA",
    "region-caucasus": "ARM AZE GEO",
    "region-central-asia": "KGZ TJK TKM UZB",
    "region-south-asia": "BTN MDV NPL LKA",
    "region-southeast-asia": "BRN KHM LAO MMR TLS",
    "region-east-asia": "MNG",
    "region-middle-east": "BHR JOR KWT LBN OMN PSE",
    "region-oceania": "NZL FJI KIR MHL FSM NRU PLW PNG WSM SLB TON TUV VUT",
  }).flatMap(([region, ids]) => ids.split(" ").map((id) => [id, region])),
);

/**
 * The Factbook's government type → the closest of the seven generic charters,
 * following the precedents the authored roster set: constitutional realms and
 * one-party parliaments are parliamentary (Britain, Japan, Vietnam), executive
 * monarchies are absolute (Morocco), and a semi-presidential republic is
 * presidential (France).
 */
export const CHARTER_BY_GOVERNMENT_TYPE = [
  [/absolute monarchy/i, "charter-absolute-monarchy"],
  [/communist/i, "charter-parliamentary-republic"],
  [/military regime/i, "charter-military-junta"],
  [/parliamentary|constitutional monarchy/i, "charter-parliamentary-republic"],
  [/presidential|authoritarian|in transition/i, "charter-presidential-republic"],
];

/** Countries whose charter is not the one their Factbook label implies, each with the reason. */
export const CHARTER_OVERRIDES = {
  // Executive monarchies with an elected chamber: the monarch appoints and
  // dismisses the government, as Morocco's does.
  BHR: "charter-absolute-monarchy",
  KWT: "charter-absolute-monarchy",
  JOR: "charter-absolute-monarchy",
  // Ruled by the soldiers who took power in a coup, whatever the constitution
  // they suspended called the office.
  MLI: "charter-military-junta",
  NER: "charter-military-junta",
  BFA: "charter-military-junta",
  GIN: "charter-military-junta",
  SDN: "charter-military-junta",
  // A president chosen by and answerable to the legislature, as South Africa's is.
  MHL: "charter-parliamentary-republic",
  FSM: "charter-parliamentary-republic",
  // The Palestinian Authority's executive is a directly elected president.
  PSE: "charter-presidential-republic",
  // Constitutions newer than the Factbook label: Georgia's 2017 and
  // Mongolia's 2019 amendments moved power to parliament; Kyrgyzstan's 2021
  // and Tunisia's 2022 constitutions moved it to the president.
  GEO: "charter-parliamentary-republic",
  MNG: "charter-parliamentary-republic",
  KGZ: "charter-presidential-republic",
  TUN: "charter-presidential-republic",
  // An executive president elected with the legislature, not a prime minister answerable to it.
  GUY: "charter-presidential-republic",
  // Semi-presidential in name; the prime minister governs and falls to a no-confidence vote.
  PRT: "charter-parliamentary-republic",
};

/**
 * Where the seed's name, adjective, capital or languages are not what a player
 * should read: American usage, the seat a US embassy deals with, an adjective
 * the seed gives as a noun, or official languages where GeoNames lists a
 * minority or historical one second. Coordinates travel with a moved capital.
 */
export const IDENTITY_OVERRIDES = {
  ATG: { adjective: "Antiguan and Barbudan", capital: "Saint John's" },
  BHS: { name: "Bahamas", definiteArticle: true },
  BIH: { adjective: "Bosnian" },
  BOL: { capital: "La Paz", lat: -16.5, lon: -68.15 },
  BRB: { adjective: "Barbadian" },
  BWA: { adjective: "Botswanan" },
  CAF: { definiteArticle: true },
  CIV: { name: "Cote d'Ivoire", adjective: "Ivorian" },
  COG: { adjective: "Congolese", definiteArticle: true },
  COM: { definiteArticle: true },
  CRI: { capital: "San Jose" },
  DMA: { adjective: "Dominica" },
  DOM: { definiteArticle: true },
  FSM: { name: "Micronesia" },
  GMB: { name: "Gambia", definiteArticle: true },
  GNQ: { adjective: "Equatoguinean", capital: "Malabo", lat: 3.75, lon: 8.78 },
  GRD: { capital: "Saint George's" },
  KGZ: { adjective: "Kyrgyz" },
  KIR: { adjective: "I-Kiribati" },
  KNA: { adjective: "Kittitian and Nevisian" },
  LAO: { adjective: "Lao", languages: ["Lao"] },
  LIE: { adjective: "Liechtensteiner" },
  LSO: { adjective: "Basotho" },
  LUX: { adjective: "Luxembourgish" },
  MCO: { adjective: "Monegasque" },
  MDV: { capital: "Male", definiteArticle: true },
  MHL: { definiteArticle: true },
  MMR: { capital: "Naypyidaw", lat: 19.76, lon: 96.07 },
  NRU: { capital: "Yaren", lat: -0.55, lon: 166.92, languages: ["Nauruan", "English"] },
  PLW: { capital: "Ngerulmud", lat: 7.5, lon: 134.62 },
  PRY: { capital: "Asuncion" },
  // The Palestinian Authority governs from Ramallah; East Jerusalem is the
  // capital it claims, and the seed has neither coordinates nor an adjective.
  PSE: { name: "Palestine", adjective: "Palestinian", capital: "Ramallah", lat: 31.9, lon: 35.2 },
  SLB: { definiteArticle: true, languages: ["English"] },
  SWZ: { adjective: "Swazi" },
  TJK: { adjective: "Tajik" },
  TKM: { adjective: "Turkmen" },
  TLS: { name: "Timor-Leste" },
  TTO: { adjective: "Trinidadian and Tobagonian", languages: ["English"] },
  UZB: { adjective: "Uzbek" },
  VCT: { adjective: "Vincentian", languages: ["English"] },
  XKX: { adjective: "Kosovar" },
  SVN: { languages: ["Slovenian"] },
  MNE: { languages: ["Montenegrin", "Serbian"] },
  PRT: { languages: ["Portuguese"] },
  AUT: { languages: ["German"] },
  ERI: { languages: ["Tigrinya", "Arabic"] },
  CZE: { languages: ["Czech"] },
  GRC: { languages: ["Greek"] },
  ALB: { languages: ["Albanian"] },
  MWI: { languages: ["English", "Chichewa"] },
  LBY: { languages: ["Arabic"] },
  MNG: { languages: ["Mongolian"] },
  KHM: { languages: ["Khmer"] },
  UGA: { languages: ["English", "Swahili"] },
  MUS: { languages: ["English", "French"] },
  PNG: { languages: ["English", "Tok Pisin"] },
  TUV: { languages: ["Tuvaluan", "English"] },
};

/**
 * How exposed each region is to each kind of disaster, 0..1. A regional prior:
 * the country rows below override it where one country's exposure is plainly
 * not its neighbors' (Haiti's and Nepal's earthquakes, Mozambique's cyclones).
 */
export const REGION_HAZARDS = {
  "region-north-africa": { drought: 0.35, earthquake: 0.15, flood: 0.1 },
  "region-west-africa": { drought: 0.35, flood: 0.3, pandemic: 0.2 },
  "region-central-africa": { flood: 0.25, pandemic: 0.3, drought: 0.1 },
  "region-east-africa": { drought: 0.45, flood: 0.3, pandemic: 0.2, earthquake: 0.1 },
  "region-southern-africa": { drought: 0.4, flood: 0.25, cyclone: 0.15, pandemic: 0.15 },
  "region-caribbean": { cyclone: 0.6, flood: 0.25, earthquake: 0.2 },
  "region-central-america": { earthquake: 0.4, cyclone: 0.35, flood: 0.3, drought: 0.15 },
  "region-south-america": { flood: 0.25, earthquake: 0.2, drought: 0.2 },
  "region-northern-europe": { flood: 0.1 },
  "region-western-europe": { flood: 0.15, wildfire: 0.05 },
  "region-central-europe": { flood: 0.2, drought: 0.1 },
  "region-southern-europe": { earthquake: 0.3, wildfire: 0.25, flood: 0.15, drought: 0.15 },
  "region-eastern-europe": { flood: 0.2, drought: 0.15, earthquake: 0.1 },
  "region-caucasus": { earthquake: 0.4, flood: 0.15 },
  "region-central-asia": { earthquake: 0.35, drought: 0.3, flood: 0.15 },
  "region-south-asia": { flood: 0.45, earthquake: 0.3, cyclone: 0.25 },
  "region-southeast-asia": { flood: 0.45, cyclone: 0.35, earthquake: 0.25 },
  "region-east-asia": { drought: 0.25, earthquake: 0.15 },
  "region-middle-east": { drought: 0.35, earthquake: 0.2 },
  "region-oceania": { cyclone: 0.55, flood: 0.3, earthquake: 0.25 },
};

export const HAZARD_OVERRIDES = {
  HTI: { earthquake: 0.6, cyclone: 0.6, flood: 0.3 },
  NPL: { earthquake: 0.6, flood: 0.35 },
  MOZ: { cyclone: 0.5, flood: 0.4, drought: 0.3 },
  MDG: { cyclone: 0.5, drought: 0.3, flood: 0.25 },
  PNG: { earthquake: 0.45, flood: 0.3, cyclone: 0.2 },
  VUT: { earthquake: 0.45, cyclone: 0.55, flood: 0.2 },
  NZL: { earthquake: 0.45, flood: 0.15, wildfire: 0.05 },
  GRC: { earthquake: 0.35, wildfire: 0.35, drought: 0.15 },
  PRT: { wildfire: 0.35, drought: 0.2, earthquake: 0.15 },
  AUT: { flood: 0.2 },
  LIE: { flood: 0.1 },
  LUX: { flood: 0.1 },
  MCO: {},
  SMR: { earthquake: 0.1 },
  AND: { flood: 0.1 },
  MLT: { drought: 0.15 },
  BHS: { cyclone: 0.7, flood: 0.3 },
};

/** Where officials were educated when their own country has no university of note: the region's hub, by the host country's schools. */
export const SCHOOL_HUBS = {
  "region-oceania": ["FJI", "AUS", "NZL"],
  "region-caribbean": ["JAM", "TTO", "BRB", "USA"],
  "region-western-europe": ["CHE", "FRA", "AUT", "DEU"],
  "region-southern-europe": ["ITA", "ESP", "FRA"],
  "region-south-asia": ["IND"],
  "region-west-africa": ["FRA", "SEN", "GHA"],
  "region-central-africa": ["FRA", "CMR"],
  "region-east-africa": ["KEN", "GBR"],
  "region-southern-africa": ["ZAF", "GBR"],
  "region-middle-east": ["JOR", "LBN", "GBR"],
};

/**
 * How power is contested where the Factbook records no party holding a seat:
 * a monarchy that bars parties, a junta that suspended them, a Pacific
 * parliament of independents. "none" is the reading, not missing research.
 */
export const CONTEST_OVERRIDES = {
  BRN: "none", OMN: "none", KWT: "none", SWZ: "none", BHR: "none", JOR: "none",
  TUV: "none", NRU: "none", PLW: "none", FSM: "none", MHL: "none", KIR: "none", TON: "none",
  MMR: "none", MLI: "none", NER: "none", BFA: "none", GIN: "none", SDN: "none",
  LBY: "none", SOM: "none", ERI: "one-party", LAO: "one-party", SSD: "dominant-party", PSE: "dominant-party",
  // The Factbook records no seated party: Gabon has run transitional
  // institutions since its 2023 coup, and Tunisia's 2023 parliament was elected
  // as independents under a president governing by decree. The content room
  // should confirm Gabon when it authors it.
  GAB: "none", TUN: "none",
};

/**
 * The ticket that holds power where the Factbook records no seats for it: a
 * one-party state's party, and the movement that governs a dominant-party one.
 */
export const NAMED_TICKETS = {
  ERI: [["People's Front for Democracy and Justice", "PFDJ"]],
  SSD: [["Sudan People's Liberation Movement", "SPLM"]],
  PSE: [["Fatah", "Fatah"]],
};

/**
 * Stated ideology → the game's three axes (economic left −/right +,
 * libertarian −/authoritarian +, globalist −/nationalist +), keyed by
 * Wikidata's English label verbatim, lowercased. A party's beliefs are the mean
 * of the ideologies it states that appear here; a party that states none of
 * them reads the country's center, which is honest about what is known.
 */
export const IDEOLOGY_BELIEFS = {
  "social democracy": [-0.35, -0.15, -0.2],
  "democratic socialism": [-0.6, -0.2, -0.15],
  "socialism": [-0.65, 0.05, 0],
  "communism": [-0.85, 0.5, 0.1],
  "marxism–leninism": [-0.85, 0.6, 0.1],
  "left-wing populism": [-0.5, 0, 0.25],
  "progressivism": [-0.3, -0.35, -0.3],
  "green politics": [-0.35, -0.35, -0.4],
  "liberalism": [0.2, -0.35, -0.35],
  "social liberalism": [-0.05, -0.35, -0.35],
  "classical liberalism": [0.55, -0.4, -0.2],
  "economic liberalism": [0.55, -0.15, -0.2],
  "liberal conservatism": [0.4, 0.05, 0.05],
  "conservatism": [0.35, 0.25, 0.3],
  "christian democracy": [0.2, 0.15, 0],
  "national conservatism": [0.3, 0.4, 0.65],
  "social conservatism": [0.2, 0.4, 0.4],
  "nationalism": [0.1, 0.35, 0.7],
  "ethnic nationalism": [0.05, 0.45, 0.8],
  "civic nationalism": [0.05, 0.1, 0.4],
  "right-wing populism": [0.3, 0.45, 0.75],
  "populism": [0, 0.2, 0.4],
  "centrism": [0.05, -0.05, -0.05],
  "third way": [0.1, -0.1, -0.15],
  "pro-europeanism": [0.1, -0.2, -0.6],
  "euroscepticism": [0.1, 0.2, 0.6],
  "islamism": [0, 0.55, 0.45],
  "islamic democracy": [0.1, 0.3, 0.3],
  "federalism": [0, -0.15, -0.1],
  "regionalism": [0, -0.1, 0.2],
  "agrarianism": [-0.1, 0.1, 0.3],
  "big tent": [0, 0, 0],
  "developmentalism": [-0.1, 0.25, 0.2],
  "pan-africanism": [-0.2, 0.1, 0.3],
  "african socialism": [-0.55, 0.3, 0.3],
};

/**
 * Stated ideologies for governing tickets whose Wikidata item states none the
 * table above maps, keyed as the seed is (country and seat rank), so the party
 * that runs the country does not read as the country's dead center. Used only
 * where the vendored row is empty; each is the ticket's widely documented
 * program, in the table's own words.
 */
export const STATED_IDEOLOGIES = {
  // The Serbian Progressive Party's list, in government since 2012.
  "SRB:1": "national conservatism|populism",
  // Georgian Dream after its 2024 turn away from the EU track.
  "GEO:1": "national conservatism|social conservatism|populism",
  // New Ideas, the governing movement behind the gang crackdown.
  "SLV:1": "populism|nationalism",
  // Popular Force, the largest bloc in Peru's Congress.
  "PER:2": "right-wing populism|conservatism",
  // The United Democratic Alliance, Kenya's governing party.
  "KEN:1": "populism",
};

/** Seated lists named after a living politician, recorded as the party that leads them, because the dataset names no real living person. */
export const LIST_RENAMES = {
  SRB: [
    [/^Aleksandar Vu[cč]i[cć]/i, "Serbian Progressive Party", "SNS"],
    [/^Ivica Da[cč]i[cć]/i, "Socialist Party of Serbia", "SPS"],
  ],
};
