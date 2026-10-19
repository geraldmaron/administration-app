#!/usr/bin/env node
// Re-seats packages/world/src/dataset/district-figures.ts on the Clerk of the
// House's member data: each district's holding party comes from the Clerk's
// entry for that seat, and the state's authored lean values (a spread, not a
// measurement) are re-dealt across its districts so the ranking the engine
// reads (Democrats at the low end, Republicans at the high end, independents
// and vacancies between) agrees with who holds which seat. Only parties are
// read from the source; no member's name is kept.
//
//   node scripts/vendor-district-holders.mjs [path-to-MemberData.xml]
//
// With no argument the file is fetched from the Clerk. Rewrites the table in place.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const SOURCE_URL = "https://clerk.house.gov/xml/lists/MemberData.xml";
const TABLE = fileURLToPath(new URL("../packages/world/src/dataset/district-figures.ts", import.meta.url));

async function loadXml(path) {
  if (path) return readFile(path, "utf8");
  const res = await fetch(SOURCE_URL, { headers: { "User-Agent": "Mozilla/5.0 (compatible; data-vendor-script)" } });
  if (!res.ok) throw new Error(`Clerk member data: HTTP ${res.status}`);
  return res.text();
}

function partiesBySeat(xml) {
  const seats = new Map();
  for (const [member] of xml.matchAll(/<member>[\s\S]*?<\/member>/g)) {
    const seat = member.match(/<statedistrict>([^<]+)/)?.[1];
    if (!seat) throw new Error("member entry without a statedistrict");
    const party = member.match(/<party>([^<]+)/)?.[1] ?? "vacant";
    const caucus = member.match(/<caucus>([^<]+)/)?.[1] ?? null;
    seats.set(seat, { party, caucus });
  }
  return seats;
}

const ROW = /^(  \{ id: "([A-Z]{2})-(\w\w)", state: "[A-Z]{2}", number: \d+, population: [\d_]+, lean: )(-?[\d.]+)(, incumbentParty: ")(\w+)(" \},)$/;
const RANK = { D: 0, I: 1, vacant: 1, R: 2 };

function dealState(rows, seats) {
  const leans = rows.map((row) => Number(row.lean)).sort((a, b) => a - b);
  const held = rows.map((row) => {
    const key = row.state + (row.num === "AL" || row.num === "DL" ? "00" : row.num);
    const seat = seats.get(key);
    if (!seat) throw new Error(`no Clerk entry for ${key}`);
    return { row, ...seat };
  });
  const ordered = [...held].sort((a, b) => RANK[a.party] - RANK[b.party] || a.row.num.localeCompare(b.row.num));
  ordered.forEach((entry, index) => {
    const lean = leans[index];
    const party = entry.party === "D" ? "democrat" : entry.party === "R" ? "republican" : entry.party === "I" ? (entry.caucus === "D" ? "democrat" : "republican") : lean < 0 ? "democrat" : "republican";
    entry.row.out = { lean: String(lean), party };
  });
}

const seats = partiesBySeat(await loadXml(process.argv[2]));
const lines = (await readFile(TABLE, "utf8")).split("\n");
const parsed = lines.map((text, index) => {
  const m = text.match(ROW);
  return m ? { index, text, head: m[1], state: m[2], num: m[3], lean: m[4], mid: m[5], tail: m[7], out: null } : null;
});
const byState = new Map();
for (const row of parsed) if (row) byState.set(row.state, [...(byState.get(row.state) ?? []), row]);
for (const rows of byState.values()) dealState(rows, seats);
for (const row of parsed) if (row) lines[row.index] = `${row.head}${row.out.lean}${row.mid}${row.out.party}${row.tail}`;
await writeFile(TABLE, lines.join("\n"));
console.log(`re-seated ${parsed.filter(Boolean).length} districts from ${SOURCE_URL}`);
