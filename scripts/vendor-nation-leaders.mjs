#!/usr/bin/env node
// Vendors the leader constraint table into the dataset.
//
// The table (packages/world/sources/leader-table/nation-leaders.tsv) is a
// research record and is never read at runtime. This copies the columns the
// engine draws against into packages/world/src/dataset/seed/nation-leaders.tsv
// and bakes them into nation-leaders.generated.ts, parsed by the
// LeaderConstraint schema at load.
//
// Two translations happen here, and each fails loudly rather than guessing:
//
// - Party names become slate ids. `governing_parties` holds English names; each
//   maps to an id on that nation's slate by name, short name or an alias below.
//   A name the slate does not carry must be listed in OFF_SLATE (a junior
//   partner the two-to-three-ticket slate leaves out on purpose); anything else
//   stops the script and prints the name, so a governing party missing from
//   the slate is added to party-systems.ts deliberately. The lead party (the
//   first name) must always resolve: it is the leader's own ticket.
// - The sources' person pages become a blocklist. Every Wikipedia article the
//   sources cite is read as a possible name; its words become salted hashes of
//   every ordered pair, which the engine refuses at draw time. No name is
//   written anywhere under packages/.
//
// Usage: node scripts/vendor-nation-leaders.mjs   (after `pnpm --filter @admin/world run build`)

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TABLE_DIR = path.join(root, "packages/world/sources/leader-table");
const SEED_OUT = path.join(root, "packages/world/src/dataset/seed/nation-leaders.tsv");
const TS_OUT = path.join(root, "packages/world/src/dataset/nation-leaders.generated.ts");

const world = await import(path.join(root, "packages/world/dist/index.js"));
const { worldDataset, realNameTokens, realNameKey } = world;

/** The as-of date the table was closed on; the provenance chip names it. */
const AS_OF = "2026-09-23";
const REAL_NAME_SALT = `leader-table-${AS_OF}`;

/**
 * Rows whose women-in-cabinet share predates the cabinet now sitting, per the
 * table README's "Rows the regional researchers flagged as uncertain". A draw
 * reads these as a prior with a regional floor.
 */
const SHARE_FLAGGED = new Set(["HUN", "GBR", "SVN", "NLD", "DNK", "MLT", "LVA", "IRQ", "BGR", "UKR", "CPV", "BEN"]);

/** Table party names whose slate entry is written differently. */
const ALIASES = {
  AGO: { "People's Movement for the Liberation of Angola (MPLA)": "party-ago-mpla" },
  AND: { "Democrats for Andorra": "party-and-democrats-for-andorra-da-and-its" },
  ARG: { "La Libertad Avanza": "party-arg-lla" },
  ARM: { "Civil Contract": "party-arm-civil-contract-party" },
  AUT: {
    "Austrian People's Party": "party-aut-ovp",
    "Social Democratic Party of Austria": "party-aut-spo",
  },
  AZE: { "New Azerbaijan Party": "party-aze-yap" },
  BEN: { "Republican Bloc": "party-ben-br" },
  BIH: { "Croatian Democratic Union of BiH": "party-bih-hdz-bih", "Social Democratic Party of BiH": "party-bih-sdp" },
  COG: { "Congolese Party of Labor": "party-cog-pct" },
  COL: { "Democratic Center": "party-col-cd", "Liberal Party": "party-col-liberal" },
  CPV: { "African Party for the Independence of Cape Verde": "party-cpv-paicv" },
  DEU: { "Christian Social Union in Bavaria": "party-deu-union" },
  DJI: { "People's Rally for Progress": "party-dji-ump" },
  DMA: { "Dominica Labour Party": "party-dma-dlp" },
  DZA: { "National Rally for Democracy": "party-dza-rnd" },
  DOM: { "Modern Revolutionary Party": "party-dom-modern-revolutionary-party-prm-a" },
  EST: { "Estonian Reform Party": "party-est-reform-party" },
  FIN: { "Finns Party": "party-fin-ps" },
  GNQ: { "Democratic Party of Equatorial Guinea": "party-gnq-democratic-party-of-equatorial-g" },
  HND: { "National Party of Honduras": "party-hnd-pn" },
  IDN: { Golkar: "party-idn-golkar" },
  KNA: { "Saint Kitts and Nevis Labour Party": "party-kna-sknlp" },
  LBN: { "Lebanese Forces": "party-lbn-strong-republic", "Amal Movement": "party-lbn-development-and-liberation" },
  LTU: { "Social Democratic Party of Lithuania": "party-ltu-lsdp" },
  LVA: {
    "United List": "party-lva-united-list-latvian-green-party-",
    "Union of Greens and Farmers": "party-lva-zzs",
  },
  MDA: { "Party of Action and Solidarity": "party-mda-pas" },
  MKD: { "VMRO-DPMNE": "party-mkd-led-by-vmro-dpmne" },
  MNE: { "Europe Now Movement": "party-mne-evropa-sad" },
  MUS: {
    "Labour Party": "party-mus-alliance-for-change-adc",
    "New Democrats": "party-mus-alliance-for-change-adc",
    "Rezistans ek Alternativ": "party-mus-alliance-for-change-adc",
  },
  MYS: { "Pakatan Harapan": "party-mys-ph", "Barisan Nasional": "party-mys-bn" },
  NAM: { SWAPO: "party-nam-swapo-party" },
  NOR: { "Labour Party": "party-nor-ap" },
  NZL: { "New Zealand National Party": "party-nzl-national-party" },
  PNG: { "Pangu Pati": "party-png-pangu", "United Resources Party": "party-png-urp" },
  PRT: {
    "Social Democratic Party": "party-prt-cds-pp",
    "CDS – People's Party": "party-prt-cds-pp",
  },
  PRY: { "Colorado Party (National Republican Association)": "party-pry-anr" },
  ROU: { "National Liberal Party": "party-rou-pnl" },
  SLV: { "Nuevas Ideas": "party-slv-n" },
  SMR: {
    "Sammarinese Christian Democratic Party": "party-smr-pdcs",
    "Libera–Socialist Party": "party-smr-ps",
  },
  SVK: {
    "Direction – Social Democracy": "party-svk-smer-sd",
    "Voice – Social Democracy": "party-svk-hlas-voice-sd",
  },
  SVN: { "New Slovenia": "party-svn-nsi" },
  TLS: { "National Congress for Timorese Reconstruction": "party-tls-cnrt" },
  TZA: { "Chama Cha Mapinduzi": "party-tza-ccm" },
  UZB: { "Liberal Democratic Party of Uzbekistan": "party-uzb-uzlidep" },
  WSM: { "Fa'atuatua i le Atua Samoa ua Tasi (FAST)": "party-wsm-fast" },
  XKX: { Vetëvendosje: "party-xkx-self-determination-movement-lvv-" },
};

/**
 * Junior partners the country's slate does not carry. A slate is the two or
 * three tickets that decide who governs (party-systems.ts), not a register, so
 * a fifth coalition partner is left off it on purpose and simply dropped from
 * the governing set here.
 */
const OFF_SLATE = {
  AND: ["Committed Citizens"],
  AUT: ["NEOS"],
  BEL: ["Les Engagés", "Vooruit", "Christian Democratic and Flemish"],
  BIH: ["People and Justice", "Our Party"],
  BRA: [
    "Brazilian Socialist Party",
    "Social Democratic Party",
    "Democratic Labour Party",
    "Communist Party of Brazil",
    "Socialism and Liberty Party",
    "Green Party",
    "Sustainability Network",
  ],
  CHE: ["The Center"],
  COD: ["Sacred Union of the Nation"],
  CHL: ["National Renewal", "Evópoli", "Radical Party", "Christian Conservative Party"],
  COL: ["National Salvation Movement", "Conservative Party", "Radical Change", "We Believe"],
  CYP: ["Democratic Alignment"],
  CZE: ["Freedom and Direct Democracy", "Motorists for Themselves"],
  DNK: ["Green Left", "Moderates", "Danish Social Liberal Party"],
  ESP: ["Sumar"],
  EST: ["Estonia 200"],
  FIN: ["Swedish People's Party of Finland", "Christian Democrats"],
  FJI: ["Social Democratic Liberal Party"],
  FRA: ["Democratic Movement", "Horizons", "Union of Democrats and Independents", "The Republicans (dissident members)"],
  IDN: ["National Awakening Party", "National Mandate Party", "Democratic Party"],
  IND: ["Telugu Desam Party", "Janata Dal (United)", "Lok Janshakti Party (RV)", "Janata Dal (Secular)"],
  IRQ: ["Patriotic Union of Kurdistan", "New Generation Movement", "Sovereignty Party (Siyada)"],
  ISL: ["Liberal Reform Party", "People's Party"],
  ISR: ["Otzma Yehudit", "Religious Zionist Party"],
  ITA: ["League", "Forza Italia", "Us Moderates"],
  LBN: ["Hezbollah", "Progressive Socialist Party", "Kataeb Party", "Armenian Revolutionary Federation"],
  LSO: ["Alliance of Democrats", "Movement for Economic Change"],
  LTU: ['Union of Democrats "For Lithuania"', "Lithuanian Farmers and Greens Union–Christian Families Alliance"],
  LVA: ["National Alliance"],
  MEX: ["Labor Party", "Ecologist Green Party of Mexico"],
  MKD: ["VLEN Coalition", "For Our Macedonia"],
  MNE: [
    "Democratic Montenegro",
    "New Serb Democracy",
    "Bosniak Party",
    "Socialist People's Party",
    "Albanian Forum",
    "Albanian Alliance",
  ],
  MNG: ["National Coalition"],
  MRT: ["National Democratic Alliance", "El Islah", "Union for Democracy and Progress"],
  MUS: ["Mauritian Militant Movement", "Rodrigues People's Organization", "Alliance Liberation"],
  MWI: ["Alliance for Democracy"],
  MYS: ["Gabungan Parti Sarawak", "Gabungan Rakyat Sabah"],
  NLD: ["Christian Democratic Appeal"],
  NZL: ["ACT New Zealand", "New Zealand First"],
  PAK: [
    "Muttahida Qaumi Movement-Pakistan",
    "Pakistan Muslim League (Q)",
    "Istehkam-e-Pakistan Party",
    "Balochistan Awami Party",
  ],
  PHL: ["Nationalist People's Coalition", "Nacionalista Party", "National Unity Party"],
  PNG: ["National Alliance Party", "People's Party", "Social Democratic Party"],
  POL: ["Polish People's Party", "Poland 2050", "New Left", "Center"],
  ROU: ["Save Romania Union", "Democratic Alliance of Hungarians in Romania"],
  SMR: ["Party of Socialists and Democrats", "Reformist Alliance"],
  SRB: [
    "Party of United Pensioners of Serbia",
    "Social Democratic Party of Serbia",
    "Serbian Party Oathkeepers",
    "Serbian People's Party",
    "Justice and Reconciliation Party",
  ],
  SUR: [
    "General Liberation and Development Party",
    "Pertjajah Luhur",
    "Alternative 2020",
    "Brotherhood and Unity in Politics",
  ],
  SVK: ["Slovak National Party"],
  SVN: ["Slovenian People's Party", "FOKUS", "Democrats"],
  SWE: ["Christian Democrats", "Liberals (caretaker government)"],
  THA: ["Prachachat Party", "Palang Pracharath Party"],
  VUT: ["Reunification Movement for Change", "Land and Justice Party"],
  XKX: ["non-majority community parties"],
  YEM: ["National Resistance", "Giants Brigades"],
  ZAF: [
    "Inkatha Freedom Party",
    "Patriotic Alliance",
    "GOOD",
    "Pan Africanist Congress of Azania",
    "Freedom Front Plus",
    "United Democratic Movement",
    "Rise Mzansi",
    "Al Jama-ah",
  ],
};

/**
 * How a nation's surname rule writes a name, read off the rule's own words.
 * Each pattern names the rule it matches; a rule none of them matches writes
 * the given name first and the family name after, which is what "same for
 * both sexes" and the other family-name rules describe.
 */
const NAME_FORM_RULES = [
  { form: "family-given", rule: /family name first|Chinese family name first/ },
  { form: "malay-patronymic", rule: /Malay patronymic/ },
  { form: "mauritanian-patronymic", rule: /Ould \(son of\)/ },
  { form: "patronymic", rule: /^patronymic|patronymic chain|father's given name (?:commonly )?serves as|father's given name used as surname|followed by father's name/ },
];

/**
 * Nations whose rule is how the language writes a name, not how an
 * English-language page does. Hungarian puts the family name first, and every
 * English-language paper and every screen here puts it last.
 */
const WRITTEN_IN_ENGLISH_ORDER = new Set(["HUN"]);

function nameFormFor(row) {
  if (WRITTEN_IN_ENGLISH_ORDER.has(row.nation_id)) return "given-family";
  return NAME_FORM_RULES.find(({ rule }) => rule.test(row.surname_rule))?.form ?? "given-family";
}

/** A leader the table records as sitting without a party: the "none (...)" rows, and an independent. */
const PARTYLESS = /^(none|Independent) \(/;

/**
 * A party name as the matcher compares it. British spellings fold to American
 * ones, so the aliases below can be written in the game's English and still
 * match the table's verbatim British-spelled party names.
 */
const norm = (text) =>
  text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/labo(u)r/g, "labor")
    .replace(/cent(re)\b/g, "center")
    .replace(/organi(s)ation/g, "organization")
    .replace(/\s+/g, " ")
    .trim();

const normalizedKeys = (record) => new Map(Object.entries(record).map(([key, value]) => [norm(key), value]));

export function parseTsv(file) {
  const [header, ...lines] = readFileSync(file, "utf8").trim().split("\n");
  const columns = header.split("\t");
  return lines.map((line) => Object.fromEntries(line.split("\t").map((cell, i) => [columns[i], cell])));
}

function slateFor(nation) {
  const record = worldDataset.nations.find((entry) => entry.id === nation);
  if (!record) throw new Error(`${nation}: not a nation in the dataset`);
  return record.partySystem.parties;
}

/** The slate id a table party name names, or undefined. */
function matchParty(nation, name, slate) {
  const wanted = norm(name);
  const aliased = normalizedKeys(ALIASES[nation] ?? {}).get(wanted);
  if (aliased) return aliased;
  const parenthetical = /\(([^)]+)\)\s*$/.exec(name)?.[1];
  const bare = norm(name.replace(/\s*\([^)]*\)\s*$/, ""));
  for (const party of slate) {
    const names = [party.name, party.shortName].filter(Boolean).map(norm);
    if (names.includes(wanted) || names.includes(bare)) return party.id;
    if (parenthetical && names.includes(norm(parenthetical))) return party.id;
  }
  return undefined;
}

function governingFor(row, problems) {
  const nation = row.nation_id;
  if (PARTYLESS.test(row.governing_parties)) return { governing: [], partyless: true };
  const slate = slateFor(nation);
  const names = row.governing_parties.split(";").map((part) => part.trim()).filter(Boolean);
  const offSlate = new Set((OFF_SLATE[nation] ?? []).map(norm));
  const ids = [];
  names.forEach((name, index) => {
    const id = matchParty(nation, name, slate);
    if (id) {
      if (!ids.includes(id)) ids.push(id);
      return;
    }
    if (index === 0) problems.push(`${nation}: the leader's own party "${name}" is not on the slate`);
    else if (!offSlate.has(norm(name))) problems.push(`${nation}: "${name}" is neither on the slate nor listed OFF_SLATE`);
  });
  return { governing: ids, partyless: false };
}

function constraintFor(row, problems) {
  const { governing, partyless } = governingFor(row, problems);
  const share = Number(row.women_cabinet_share);
  if (!Number.isFinite(share)) problems.push(`${row.nation_id}: women_cabinet_share "${row.women_cabinet_share}" is not a number`);
  if (row.as_of !== AS_OF) problems.push(`${row.nation_id}: as_of ${row.as_of}, expected ${AS_OF}`);
  return {
    nation: row.nation_id,
    asOf: row.as_of,
    seat: row.leader_seat,
    title: row.leader_title,
    sex: row.leader_sex,
    ageBand: row.leader_age_band,
    secondSeatTitle: row.second_seat_title,
    regime: row.regime_type,
    nameCulture: row.name_culture,
    nameForm: nameFormFor(row),
    governing,
    partyless,
    womenCabinetShare: Math.round((share / 100) * 1000) / 1000,
    shareFlagged: SHARE_FLAGGED.has(row.nation_id),
  };
}

/** Every article title the sources cite, decoded; the gate reads the same list. */
export function sourceTitles(sourcesText) {
  const titles = new Set();
  for (const match of sourcesText.matchAll(/wikipedia\.org\/(?:wiki\/|w\/index\.php\?title=)([^\s)|>&#]+)/g)) {
    let title = match[1];
    try {
      title = decodeURIComponent(title);
    } catch {
      // A malformed escape stays as written; its words are still words.
    }
    titles.add(title.replace(/_/g, " "));
  }
  return [...titles].sort();
}

/**
 * Words that make a title an institution, an event or a list rather than a
 * person. What is left of a title after these go is read as a name; a title
 * that is all institution leaves nothing, and a stray pair from one that is
 * not ("United Arab Emirates") costs a redraw nobody will ever hit.
 */
const NOT_A_NAME = new Set(
  (
    "cabinet government governo gouvernement ministry administration presidency election elections referendum " +
    "politics list index next president prime minister council parliament party movement supreme leader king " +
    "emir sultan governor general national assembly agreement constitutional republic transitional sovereignty " +
    "unity peace secretary state congress legislative crisis house first second third fourth fifth ministers " +
    "presente women vice leadership foreign political affairs current heads economist democracy in and " +
    // Offices that are not names: a regent's title, and Samoa's head of state, O le Ao o le Malo.
    "hereditary prince princess crown regent reigning ao malo"
  ).split(" "),
);
const ROMAN = /^(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|xv|xxv)$/;

/** The name words a cited title carries, or none. */
export function titleNameTokens(title) {
  if (/\d/.test(title)) return [];
  const withoutQualifier = title.replace(/\s*\([^)]*\)?\s*$/, "").replace(/'s\b/g, "");
  const tokens = realNameTokens(withoutQualifier).filter(
    (token) => token.length > 1 && !NOT_A_NAME.has(token) && !ROMAN.test(token),
  );
  return tokens.length >= 2 && tokens.length <= 6 ? tokens : [];
}

/** Every ordered pair, both ways round, of every cited name, hashed. */
export function realNameHashes(sourcesText, salt) {
  const keys = new Set();
  for (const title of sourceTitles(sourcesText)) {
    const tokens = titleNameTokens(title);
    for (let i = 0; i < tokens.length; i += 1) {
      for (let j = 0; j < tokens.length; j += 1) {
        if (i !== j) keys.add(realNameKey(salt, tokens[i], tokens[j]));
      }
    }
  }
  return [...keys].sort((a, b) => a - b);
}

const SEED_COLUMNS = [
  "nation_id",
  "as_of",
  "leader_seat",
  "leader_title",
  "leader_sex",
  "leader_age_band",
  "second_seat_title",
  "regime_type",
  "name_culture",
  "name_form",
  "governing_party_ids",
  "women_cabinet_share",
  "share_flagged",
];

function seedTsv(constraints) {
  const header = [
    "# Nation leader constraints, vendored by scripts/vendor-nation-leaders.mjs — do not edit by hand.",
    `# source: packages/world/sources/leader-table/nation-leaders.tsv (as of ${AS_OF}); never rendered to a player`,
    "# governing_party_ids: the table's party names mapped to this nation's slate ids, largest first; empty for a partyless government",
    "# name_form: how the table's surname rule writes a name, read off the rule by scripts/vendor-nation-leaders.mjs",
    "# women_cabinet_share: the table's percent as a fraction; share_flagged marks a share that predates the sitting cabinet",
    SEED_COLUMNS.join("\t"),
  ];
  const lines = constraints.map((c) =>
    [
      c.nation,
      c.asOf,
      c.seat,
      c.title,
      c.sex,
      c.ageBand,
      c.secondSeatTitle,
      c.regime,
      c.nameCulture,
      c.nameForm,
      c.governing.join(";"),
      c.womenCabinetShare,
      c.shareFlagged ? "yes" : "no",
    ].join("\t"),
  );
  return `${[...header, ...lines].join("\n")}\n`;
}

function generatedModule(constraints, hashes) {
  const rows = constraints.map((c) => `  ${JSON.stringify(c)},`);
  const hashLines = [];
  for (let i = 0; i < hashes.length; i += 12) hashLines.push(`  ${hashes.slice(i, i + 12).join(", ")},`);
  return [
    'import { LeaderConstraint } from "../schemas/leader-constraint.js";',
    "",
    "// Generated from the leader constraint table (packages/world/sources/leader-table)",
    "// by scripts/vendor-nation-leaders.mjs; edit the table and re-vendor rather than this file.",
    "// The same rows are in seed/nation-leaders.tsv, for a reader.",
    "",
    `export const LEADER_TABLE_AS_OF = ${JSON.stringify(AS_OF)};`,
    "",
    "// prettier-ignore",
    "const ROWS: readonly unknown[] = [",
    ...rows,
    "];",
    "",
    "export const NATION_LEADER_CONSTRAINTS: Readonly<Record<string, LeaderConstraint>> = Object.fromEntries(",
    "  ROWS.map((row) => LeaderConstraint.parse(row)).map((row) => [row.nation as string, row] as const),",
    ");",
    "",
    "/**",
    " * Salted hashes of every ordered pair of words in the names of the people the",
    " * table's sources cite, sitting officeholders among them. The draw refuses a",
    " * name that carries one (`carriesRealName`); the list holds numbers, never names,",
    " * and scripts/verify-leader-fidelity.mjs re-derives it from the sources.",
    " */",
    `export const REAL_NAME_SALT = ${JSON.stringify(REAL_NAME_SALT)};`,
    "",
    "// prettier-ignore",
    "export const REAL_NAME_HASHES: readonly number[] = [",
    ...hashLines,
    "];",
    "",
  ].join("\n");
}

/**
 * The table as the dataset should carry it, computed and not written: the gate
 * compares this against the committed module, so a hand edit or a table
 * changed without re-vendoring fails there rather than shipping.
 */
export function vendorTable(tableDir = TABLE_DIR) {
  const rows = parseTsv(path.join(tableDir, "nation-leaders.tsv")).filter((row) => row.leader_sex !== "player");
  const problems = [];
  const constraints = rows.map((row) => constraintFor(row, problems)).sort((a, b) => a.nation.localeCompare(b.nation));
  const hashes = realNameHashes(readFileSync(path.join(tableDir, "sources.md"), "utf8"), REAL_NAME_SALT);
  return { constraints, hashes, problems, salt: REAL_NAME_SALT };
}

function main() {
  const { constraints, hashes, problems } = vendorTable();
  if (problems.length > 0) {
    console.error(`vendor-nation-leaders: ${problems.length} problem(s)\n${problems.map((p) => `  ${p}`).join("\n")}`);
    process.exit(1);
  }
  writeFileSync(SEED_OUT, seedTsv(constraints));
  writeFileSync(TS_OUT, generatedModule(constraints, hashes));
  console.log(`${constraints.length} leader constraint(s), ${hashes.length} real-name hash(es) -> ${path.relative(root, TS_OUT)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
