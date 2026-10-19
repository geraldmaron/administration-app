#!/usr/bin/env node
// Every foreign leader is fictional and faithful: an invented person who
// matches the real officeholder's sex, age band, title and party, named the way
// their country names people, and never carrying a real officeholder's name or
// the rare family name of anyone who has led their country.
//
// The gate reads its truth from the research record, not from the module it
// checks. The leader table and its sources (packages/world/sources/leader-table)
// are re-vendored in memory and compared with the committed module, so a hand
// edit or a table changed without re-vendoring fails here. The drawn cast is
// then held to the table on founded campaigns, and every generated name across
// fifty seeds, the American bench included, is checked against the names the
// sources cite (read from the person pages' URLs at gate time) and against the
// officeholder roster (scripts/vendor-officeholders.mjs). Each drawn name is
// read back into a tradition its nation's people carry, from the research
// record's name-traditions.tsv rather than from the banks themselves.
//
// The roster is committed as hashes only. Given the plaintext roster the
// vendor writes outside the repository, the gate also compares words, so a
// hashing mistake cannot hide a match, and checks the committed hashes still
// cover every name on it.
//
// Reads the built packages (packages/*/dist). Environment, for the proof:
//   LEADER_FIDELITY_TABLE     a copy of the leader-table folder to hold the dataset to
//   LEADER_FIDELITY_SOURCES   a sources.md to read the cited names from (default: the table's)
//   LEADER_FIDELITY_SEEDS     how many seeds to draw names over (default 50)
//   LEADER_FIDELITY_ROSTER    a plaintext roster (scripts/vendor-officeholders.mjs --roster) to compare words against
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TABLE = process.env.LEADER_FIDELITY_TABLE ?? path.join(ROOT, "packages/world/sources/leader-table");
const SOURCES = process.env.LEADER_FIDELITY_SOURCES ?? path.join(TABLE, "sources.md");
const NAME_SEEDS = Number(process.env.LEADER_FIDELITY_SEEDS ?? 50);
const FOUNDED_SEEDS = ["leader-fidelity-1", "leader-fidelity-2", "leader-fidelity-3", "leader-fidelity-4", "leader-fidelity-5"];
const SCANNED = ["packages/world/src/dataset/nation-leaders.generated.ts", "packages/world/src/dataset/seed/nation-leaders.tsv"];

const world = await import(path.join(ROOT, "packages/world/dist/index.js"));
const engine = await import(path.join(ROOT, "packages/engine/dist/index.js"));
const vendor = await import(path.join(ROOT, "scripts/vendor-nation-leaders.mjs"));
const roster = await import(path.join(ROOT, "scripts/vendor-officeholders.mjs"));
const ROSTER_FILE = process.env.LEADER_FIDELITY_ROSTER;

/** Roster sizes below which a source came back short rather than complete. */
const ROSTER_FLOORS = { cia: 5000, congress: 535, executive: 80, heads: 4000, international: 30, justices: 100, federal: 300, governors: 45 };

const findings = [];
const fail = (kind, message) => findings.push(`${kind}: ${message}`);

/** The words of every person-like title the sources cite, as ordered pairs a generated name is compared on. */
function citedPairs(sourcesText) {
  const pairs = new Set();
  for (const title of vendor.sourceTitles(sourcesText)) {
    const tokens = vendor.titleNameTokens(title);
    for (let i = 0; i < tokens.length; i += 1) {
      for (let j = 0; j < tokens.length; j += 1) if (i !== j) pairs.add(`${tokens[i]} ${tokens[j]}`);
    }
  }
  return pairs;
}

function carriesCited(name, pairs) {
  const tokens = world.realNameTokens(name);
  for (let i = 0; i < tokens.length; i += 1) {
    for (let j = i + 1; j < tokens.length; j += 1) if (pairs.has(`${tokens[i]} ${tokens[j]}`)) return true;
  }
  return false;
}

/** The committed module against the table and the sources, re-vendored now. */
function checkFreshness(fresh) {
  for (const problem of fresh.problems) fail("vendor", problem);
  const committed = world.NATION_LEADER_CONSTRAINTS;
  for (const row of fresh.constraints) {
    if (JSON.stringify(committed[row.nation]) !== JSON.stringify(row)) fail("stale table", `${row.nation} differs from packages/world/sources/leader-table; re-run scripts/vendor-nation-leaders.mjs`);
  }
  if (Object.keys(committed).length !== fresh.constraints.length) fail("stale table", "the committed table and the research table hold different nations");
  if (JSON.stringify([...world.REAL_NAME_HASHES]) !== JSON.stringify(fresh.hashes)) fail("stale blocklist", "REAL_NAME_HASHES does not match the names the sources cite; re-run scripts/vendor-nation-leaders.mjs");
  if (world.REAL_NAME_SALT !== fresh.salt) fail("stale blocklist", "REAL_NAME_SALT does not match the vendor script's");
}

function foundCampaign(seedText) {
  const seed = engine.makeCampaignSeed(seedText);
  const pool = engine.generateFoundingPool(seed, world.worldDataset);
  const nation = world.worldDataset.nations.find((n) => n.playable);
  const charter = world.worldDataset.charters[0];
  const cradle = world.worldDataset.cradles.find((c) => c.startingNeighbors.length > 0);
  const cabinet = Object.fromEntries(
    Object.entries(engine.draftCabinetCandidates(charter, nation.id, pool)).map(([role, people]) => [role, people[0].id]),
  );
  return engine.sealFounding(seed, world.worldDataset, {
    nationId: nation.id,
    nationName: nation.identity.name,
    name: "Gate President",
    title: "President",
    charterId: charter.id,
    cradleId: cradle.id,
    flag: world.defaultFlagDesign,
    compactIds: [],
    cabinet,
    leader: { ...engine.defaultLeaderDraft(), name: "Gate President" },
  });
}

const bandOf = (age) => (age >= 80 ? "80+" : `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`);

/**
 * Each government's leader on a founded campaign against the research table.
 *
 * The table records who held each chair on its own date. A campaign opens
 * later: the seal resolves the selections due between the table's date and
 * the oath, so where one changed hands the chair holds an invented successor
 * the table never described. The table's incumbent is drawn either way and
 * stays on the board as the predecessor, so it is the person held to the row,
 * in every government. The seated leader is held to the chair's own record:
 * the table's party where the table still seats it, the party that won the
 * selection where one changed hands. The title is the dataset's for the chair
 * the charter seats first; player-core's roster and dossier read it from there
 * (their own tests hold that).
 */
function checkLeaders(seedText, table, governingByNation) {
  const campaign = foundCampaign(seedText);
  const titles = new Map(table.map((row) => [row.nation_id, world.nationRoleTitle(row.nation_id, world.nationLeadRole(row.nation_id))]));
  for (const row of table) {
    const nation = row.nation_id;
    const lead = engine.leadRoleFor(campaign, nation);
    const incumbent = lead && campaign.people[engine.tableIncumbentId(nation, lead)]?.base;
    const seated = engine.foreignLeaderFor(campaign, nation);
    const person = seated && campaign.people[seated.person]?.base;
    if (!incumbent || !person) {
      fail("no leader", `${seedText} ${nation} ${incumbent ? "seats nobody" : "draws no table incumbent"}`);
      continue;
    }
    const sex = world.parsePortraitRef(incumbent.portraitRef).gender === "feminine" ? "F" : "M";
    const wantedParty = governingByNation.get(nation);
    if (sex !== row.leader_sex) fail("sex", `${seedText} ${nation} incumbent is ${sex}, the table ${row.leader_sex}`);
    if (bandOf(incumbent.age) !== row.leader_age_band) fail("age band", `${seedText} ${nation} incumbent is ${incumbent.age}, the table ${row.leader_age_band}`);
    if (titles.get(nation) !== row.leader_title) fail("title", `${seedText} ${nation} reads "${titles.get(nation)}", the table "${row.leader_title}"`);
    if (incumbent.party !== wantedParty) fail("party", `${seedText} ${nation} incumbent carries ${incumbent.party ?? "no party"}, the table ${wantedParty ?? "none"}`);
    const seat = engine.selectForeignSeat(campaign, nation);
    if (seat?.provenance === "table" && person.id !== incumbent.id) fail("seat", `${seedText} ${nation} seats ${person.id} on the table's own seat, not its incumbent`);
    if (seat?.party !== undefined && person.party !== seat.party) fail("party", `${seedText} ${nation} leader carries ${person.party ?? "no party"}, the seat ${seat.party}`);
  }
  const saudiWomen = Object.values(campaign.people).filter(
    (runtime) =>
      runtime.base.nationality === "SAU" &&
      runtime.base.eligibleRoles[0] !== "role-journalist" &&
      world.parsePortraitRef(runtime.base.portraitRef).gender !== "masculine",
  );
  if (saudiWomen.length > 0) fail("saudi cabinet", `${seedText} draws ${saudiWomen.length} woman or women into the Saudi government`);
}

/** The traditions each government's people carry, from the research record. */
function readTraditions() {
  const lines = readFileSync(path.join(TABLE, "name-traditions.tsv"), "utf8").split("\n");
  return new Map(
    lines
      .filter((line) => line && !line.startsWith("#") && !line.startsWith("nation_id\t"))
      .map((line) => {
        const [nation, traditions, lead] = line.split("\t");
        return [nation, { traditions: traditions.split(";"), lead: lead || undefined }];
      }),
  );
}
const TRADITIONS = readTraditions();

/** A drawn name read back into a tradition its nation's people carry, or undefined. */
function readAs(person) {
  const nation = person.nationality;
  const culture = world.nameCultureFor(nation);
  const gender = world.parsePortraitRef(person.portraitRef).gender;
  const role = person.eligibleRoles[0];
  const row = TRADITIONS.get(nation);
  if (!row) return undefined;
  const ids = world.nationLeadRole(nation) === role && row.lead ? [row.lead] : row.traditions;
  const groups = ids.map((id) => world.nameGroupById(id)).filter(Boolean);
  return world.readName(person.name, groups, gender, (group, drawn) => world.surnameFor(nation, culture, drawn, gender), world.royalHouseFor(nation, role));
}

/** The plaintext roster, when the gate is given one, read into word pairs and refused family names. */
function plaintextRoster() {
  if (!ROSTER_FILE) return undefined;
  const people = JSON.parse(readFileSync(ROSTER_FILE, "utf8"));
  const pairs = new Set(people.flatMap((entry) => [...roster.pairsFor(entry)]));
  const heads = people.filter((entry) => entry.source === "heads");
  const presidents = people.filter((entry) => entry.source === "executive");
  return { pairs, surnames: roster.refusedSurnames(heads, presidents) };
}

function carriesPair(name, pairs) {
  const tokens = world.realNameTokens(name);
  for (let i = 0; i < tokens.length; i += 1) {
    for (let j = i + 1; j < tokens.length; j += 1) if (pairs.has(`${tokens[i]}|${tokens[j]}`)) return true;
  }
  return false;
}

/** The committed roster against its own counts and, given the plaintext, against every name on it. */
function checkRoster(plain) {
  for (const [source, floor] of Object.entries(ROSTER_FLOORS)) {
    const held = world.OFFICEHOLDER_ROSTER_COUNTS[source] ?? 0;
    if (held < floor) fail("short roster", `${source} held ${held} people, under the ${floor} a complete roster holds; re-run scripts/vendor-officeholders.mjs`);
  }
  if (!plain) return;
  const names = new Set([...world.REAL_NAME_HASHES, ...world.unpackHashes(world.OFFICEHOLDER_NAME_HASHES)]);
  const missing = [...plain.pairs].filter((pair) => !names.has(world.realNameKey(world.REAL_NAME_SALT, ...pair.split("|"))));
  if (missing.length > 0) fail("stale roster", `${missing.length} name pair(s) on the roster are not in OFFICEHOLDER_NAME_HASHES; re-run scripts/vendor-officeholders.mjs`);
  const surnames = new Set(world.unpackHashes(world.LEADER_SURNAME_HASHES));
  let uncovered = 0;
  for (const [nation, words] of plain.surnames) for (const word of words) if (!surnames.has(world.leaderSurnameKey(world.REAL_NAME_SALT, nation, word))) uncovered += 1;
  if (uncovered > 0) fail("stale roster", `${uncovered} refused family name(s) are not in LEADER_SURNAME_HASHES; re-run scripts/vendor-officeholders.mjs`);
}

/** Whether a person's family name is one of their own country's leaders', by the hashes the draw reads and, given it, the plaintext. */
function carriesLeaderSurname(person, plain) {
  const nation = person.nationality;
  if (nation === "USA" || world.royalHouseFor(nation, person.eligibleRoles[0])) return false;
  const reading = readAs(person);
  if (!reading || world.namesByFather(reading.group.form)) return false;
  if (world.carriesLeaderSurname(nation, reading.second)) return true;
  const refused = plain?.surnames.get(nation);
  return refused ? world.realNameTokens(reading.second).some((word) => refused.has(word)) : false;
}

/** Every generated name across the seeds: no officeholder's, no leader's family name, each one tradition its people carry. */
function checkNames(pairs, plain) {
  let people = 0;
  for (let index = 0; index < NAME_SEEDS; index += 1) {
    const streams = engine.createRngStreams(engine.makeCampaignSeed(`leader-fidelity-names-${index}`));
    const pool = engine.generateWorldPool(world.worldDataset.nations, world.personPoolSpecs, streams, world.worldDataset.charters);
    for (const person of pool) {
      people += 1;
      if (carriesCited(person.name, pairs)) fail("real name", `${person.id} (seed ${index}) carries the name of an officeholder the sources cite`);
      if (world.carriesRealName(person.name) || (plain && carriesPair(person.name, plain.pairs))) {
        fail("real name", `${person.id} (seed ${index}) carries the name of an officeholder on the roster`);
      }
      if (index >= 5) continue;
      if (person.nationality !== "USA" && !readAs(person)) {
        fail("mixed name", `${person.id} "${person.name}" is not one tradition its country's people carry, with its surname in its carrier's form`);
      }
      if (carriesLeaderSurname(person, plain)) fail("leader surname", `${person.id} "${person.name}" carries the family name of one of its country's leaders`);
    }
  }
  return people;
}

/** How the table's surname rule writes a name, against the tradition the lead chair is drawn from. */
function checkNameForms() {
  for (const row of Object.values(world.NATION_LEADER_CONSTRAINTS)) {
    const nation = row.nation;
    if (world.ROYAL_HOUSES[nation]) continue;
    const traditions = TRADITIONS.get(nation);
    if (!traditions) {
      fail("name form", `${nation} is not in name-traditions.tsv`);
      continue;
    }
    const lead = world.nameGroupById(traditions.lead ?? traditions.traditions[0]);
    const form = lead?.form ?? "given-family";
    if (form !== row.nameForm) fail("name form", `${nation}'s surname rule writes names "${row.nameForm}", but its lead chair is named "${form}"`);
  }
}

/** No cited name, as two consecutive words, anywhere in the vendored files. */
function checkNoNamesVendored(sourcesText) {
  const bigrams = new Set();
  for (const title of vendor.sourceTitles(sourcesText)) {
    const tokens = vendor.titleNameTokens(title);
    for (let i = 0; i + 1 < tokens.length; i += 1) bigrams.add(`${tokens[i]} ${tokens[i + 1]}`);
  }
  for (const file of SCANNED) {
    const tokens = world.realNameTokens(readFileSync(path.join(ROOT, file), "utf8"));
    for (let i = 0; i + 1 < tokens.length; i += 1) {
      if (bigrams.has(`${tokens[i]} ${tokens[i + 1]}`)) fail("name in packages", `${file} carries a cited name`);
    }
  }
}

const sourcesText = readFileSync(SOURCES, "utf8");
const fresh = vendor.vendorTable(TABLE);
checkFreshness(fresh);
const table = vendor.parseTsv(path.join(TABLE, "nation-leaders.tsv")).filter((row) => row.leader_sex !== "player");
const governingByNation = new Map(fresh.constraints.map((row) => [row.nation, row.governing[0]]));
for (const seedText of FOUNDED_SEEDS) checkLeaders(seedText, table, governingByNation);
const plain = plaintextRoster();
checkRoster(plain);
checkNameForms();
const people = checkNames(citedPairs(sourcesText), plain);
checkNoNamesVendored(sourcesText);

if (findings.length > 0) {
  // Every finding, never a head of them: the proof reads this output for the
  // break it planted, and a cut hides it behind whatever failed first.
  console.error(`verify-leader-fidelity: ${findings.length} finding(s)`);
  for (const finding of findings) console.error(`  ${finding}`);
  process.exit(1);
}
console.log(
  `verify-leader-fidelity: ${table.length} governments held to the table on ${FOUNDED_SEEDS.length} founded campaigns; ` +
    `${people} generated names over ${NAME_SEEDS} seeds carry no officeholder's name, cited or on the roster` +
    (plain ? ` (words compared against ${plain.pairs.size} roster pairs)` : " (roster compared by hash; no plaintext roster given)"),
);
