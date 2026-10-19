// The party systems and schools of the countries the roster carries at thin
// fidelity, from the vendored seed and the stated priors.
//
// A party is a real ticket holding seats in the chamber that makes and unmakes
// governments, named as the Factbook names it and ranked by those seats; its
// beliefs are the mean of the ideologies Wikidata records it stating, placed on
// the game's axes by the priors' table. A school is a university still
// operating in the country, ranked by how widely it is documented; a country
// with none of note takes its region's hub schools, which is where its
// officials actually study. Read by scripts/bake-nations.mjs.
import { readFileSync } from "node:fs";
import path from "node:path";
import { CONTEST_OVERRIDES, IDEOLOGY_BELIEFS, LIST_RENAMES, NAMED_TICKETS, REGION_OF, SCHOOL_HUBS, STATED_IDEOLOGIES } from "./nation-roster-priors.mjs";

const MAX_PARTIES = 3;
const MAX_SCHOOLS = 2;
/** Sitelinks below which a university is too obscure to be where a country's officials come from. */
const SCHOOL_NOTABILITY = 5;
/** Seat share above which a ticket in an unfree contest is the state rather than a competitor. */
const DOMINANT_SEAT_SHARE = 0.6;
/** Governance voice score below which a large majority reads as dominance rather than a landslide. */
const UNFREE_VOICE = -0.5;

function readSeed(seedDir, file) {
  const lines = readFileSync(path.join(seedDir, file), "utf8").split("\n").filter((line) => line && !line.startsWith("#"));
  const columns = lines[0].split("\t");
  return lines.slice(1).map((line) => Object.fromEntries(line.split("\t").map((cell, i) => [columns[i], cell])));
}

const slug = (text) => text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
const round2 = (value) => Math.round(value * 100) / 100;

function beliefsOf(ideologies) {
  const known = ideologies.split("|").map((name) => IDEOLOGY_BELIEFS[name.trim().toLowerCase()]).filter(Boolean);
  if (known.length === 0) return { economicLeftRight: 0, authLibertarian: 0, nationalistGlobalist: 0 };
  const mean = (i) => round2(known.reduce((sum, axes) => sum + axes[i], 0) / known.length);
  return { economicLeftRight: mean(0), authLibertarian: mean(1), nationalistGlobalist: mean(2) };
}

function renamed(iso3, party) {
  const rule = (LIST_RENAMES[iso3] ?? []).find(([pattern]) => pattern.test(party.name));
  return rule ? { ...party, name: rule[1], short: rule[2] } : party;
}

function contestFor(iso3, identity, seated, voice) {
  if (CONTEST_OVERRIDES[iso3]) return CONTEST_OVERRIDES[iso3];
  if (identity.party_system === "none" || seated.length === 0) return "none";
  const total = seated.reduce((sum, party) => sum + Number(party.seats), 0);
  const leader = Number(seated[0].seats) / Math.max(1, total);
  return leader >= DOMINANT_SEAT_SHARE && voice < UNFREE_VOICE ? "dominant-party" : "multiparty";
}

/** NationPartySystem for every roster government the authored table does not cover. */
export function rosterPartySystems(seedDir, seed, authoredIds) {
  const seatedBy = new Map();
  for (const row of readSeed(seedDir, "nation-parties.tsv")) seatedBy.set(row.iso3, [...(seatedBy.get(row.iso3) ?? []), row]);
  const ideologyOf = new Map(readSeed(seedDir, "nation-party-ideologies.tsv").map((row) => [`${row.iso3}:${row.rank}`, row.ideologies]));
  const out = {};
  for (const [iso3, row] of seed) {
    if (authoredIds.has(iso3)) continue;
    const named = (NAMED_TICKETS[iso3] ?? []).map(([name, short], i) => ({ iso3, rank: `named-${i}`, name, short, seats: "0" }));
    const seated = [...(seatedBy.get(iso3) ?? []).map((party) => renamed(iso3, party)), ...named];
    const contest = contestFor(iso3, row.identity, seated, row.wb.wgi_voice?.value ?? 0);
    const parties = contest === "none" ? [] : seated.slice(0, contest === "one-party" ? 1 : MAX_PARTIES).map((party, i) => ({
      id: `party-${iso3.toLowerCase()}-${slug(party.short || party.name)}`,
      name: party.name,
      shortName: party.short || party.name,
      kind: "major",
      beliefs: beliefsOf(ideologyOf.get(`${iso3}:${party.rank}`) || STATED_IDEOLOGIES[`${iso3}:${party.rank}`] || ""),
      cohesion: contest === "multiparty" ? (i === 0 ? 0.7 : 0.65) : i === 0 ? 0.85 : 0.6,
    }));
    if (contest !== "none" && parties.length === 0) throw new Error(`${iso3}: contest "${contest}" but no seated party to name — add a CONTEST_OVERRIDES row`);
    out[iso3] = { contest, parties };
  }
  return out;
}

/** What a school is known for, read off its name; a comprehensive university teaches the statecraft fields. */
function fieldsOf(name) {
  if (/military|defen[cs]e|naval|air force|police/i.test(name)) return ["military-science", "engineering"];
  if (/technolog|technical|polytechnic|engineering/i.test(name)) return ["engineering", "natural-sciences"];
  if (/medic|health/i.test(name)) return ["medicine", "natural-sciences"];
  if (/econom|business|commerce|management|finance/i.test(name)) return ["economics", "public-administration"];
  if (/islamic|theolog|seminar|divinity/i.test(name)) return ["theology", "law"];
  return ["law", "economics", "public-administration", "international-relations"];
}

/** School inputs for roster governments, and the hub countries a government with none of note borrows. */
export function rosterSchools(seedDir, seed, authoredSchoolNations) {
  const byCountry = new Map();
  for (const row of readSeed(seedDir, "nation-universities.tsv")) byCountry.set(row.iso3, [...(byCountry.get(row.iso3) ?? []), row]);
  const schools = [];
  const hubs = {};
  const ids = new Set();
  for (const iso3 of seed.keys()) {
    if (authoredSchoolNations.has(iso3)) continue;
    const notable = (byCountry.get(iso3) ?? []).filter((row) => Number(row.sitelinks) >= SCHOOL_NOTABILITY).slice(0, MAX_SCHOOLS);
    if (notable.length === 0) {
      const region = REGION_OF[iso3];
      if (!SCHOOL_HUBS[region]) throw new Error(`${iso3} has no university of note and ${region} has no school hub in nation-roster-priors.mjs`);
      hubs[iso3] = SCHOOL_HUBS[region];
      continue;
    }
    notable.forEach((row, i) => {
      const id = `SCH-${iso3}-${slug(row.name).toUpperCase().replace(/-/g, "").slice(0, 16)}`;
      if (ids.has(id)) throw new Error(`duplicate school id ${id}`);
      ids.add(id);
      schools.push({ id, name: row.name, nation: iso3, tier: i === 0 ? "national-flagship" : "regional", fields: fieldsOf(row.name) });
    });
  }
  return { schools, hubs };
}
