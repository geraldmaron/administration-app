// Measures how the shipped corpus chooses its places and people.
// Reads content/corpus/shards/*.jsonl only. No build, no workspace imports.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const dir = join(root, "content/corpus/shards");
const defs = readdirSync(dir).filter((f) => f.endsWith(".jsonl"))
  .flatMap((f) => readFileSync(join(dir, f), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)));

const count = (pred) => defs.filter(pred).length;
const tally = (key) => defs.reduce((m, d) => { const k = key(d); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const prose = (d) => JSON.stringify([d.subject, d.locus?.descriptor, d.opening, d.replies, d.transmission, d.context]);
const tokens = (d) => [...new Set([...prose(d).matchAll(/\{\{\s*([a-zA-Z]+)\s*\}\}/g)].map((m) => m[1]))];
const home = (d) => d.locus.ground === "home" || d.cast.pick === "none";

const out = {
  total: defs.length,
  retired: count((d) => d.retired),
  ground: tally((d) => d.locus.ground),
  homeDomestic: count(home),
  site: tally((d) => d.locus.site),
  bindCondition: count((d) => d.locus.bind === "condition"),
  authoredCity: count((d) => d.locus.city),
  authoredState: count((d) => d.locus.state),
  authoredSector: count((d) => d.locus.sector),
  homeWithNoPlaceField: count((d) => home(d) && !d.locus.city && !d.locus.state && !d.locus.sector && d.locus.bind !== "condition"),
  homeNonCapitalNoPlaceField: count((d) => home(d) && d.locus.site !== "capital" && !d.locus.city && !d.locus.state && d.locus.bind !== "condition"),
  castPick: tally((d) => d.cast.pick),
  familyRoles: tally((d) => d.family?.role ?? "standalone"),
  families: [...new Set(defs.filter((d) => d.family).map((d) => d.family.id))].length,
  domesticFamilyMembers: count((d) => d.family && home(d)),
  tokenUse: defs.flatMap(tokens).reduce((m, t) => { m[t] = (m[t] ?? 0) + 1; return m; }, {}),
  scenariosUsingAnyPlaceToken: count((d) => tokens(d).some((t) => ["city", "state", "governor", "cityKind"].includes(t))),
  speakerKinds: defs.flatMap((d) => d.opening.map((b) => b.speaker.kind === "cabinet" ? `cabinet:${b.speaker.roleHint}` : b.speaker.kind))
    .reduce((m, k) => { m[k] = (m[k] ?? 0) + 1; return m; }, {}),
  gazetteerReplies: defs.flatMap((d) => d.replies.filter((r) => r.commitment?.gazetteer)).length,
  domesticSignatureReplies: defs.flatMap((d) => d.replies.filter((r) => r.commitment?.domestic)).length,
  stateGrievanceLocusGates: count((d) => d.conditions.some((c) => c.kind === "stateGrievance" && c.scope === "locus")),
  conditionActiveGated: count((d) => d.conditions.some((c) => c.kind === "conditionActive")),
  conditionActiveHomeUnbound: count((d) => home(d) && d.conditions.some((c) => c.kind === "conditionActive") && d.locus.bind !== "condition" && !d.locus.state),
  // Prose that names a non-chair human the dataset seats but no token supplies.
  proseNamesLocalOfficial: count((d) => /\b(governor|mayor|senator|congressman|congresswoman|representative|county executive|sheriff|union president|plant manager)\b/i.test(prose(d))),
  proseNamesGovernorWithoutToken: count((d) => /\bgovernor\b/i.test(prose(d)) && !tokens(d).includes("governor")),
  proseNamesMayor: count((d) => /\bmayor\b/i.test(prose(d))),
  proseNamesSenatorOrMember: count((d) => /\b(senator|congressman|congresswoman|the member for|her district|his district|their district)\b/i.test(prose(d))),
  proseVaguePlace: count((d) => home(d) && /\b(one company town|a company town|the town|a small town|a mid-?sized city|a river town|a coastal town|the county|a county|the valley|a rust belt|the region)\b/i.test(prose(d))),
};
console.log(JSON.stringify(out, null, 2));
if (process.argv.includes("--list-unplaced")) {
  for (const d of defs.filter((d) => home(d) && d.locus.site !== "capital" && !d.locus.city && !d.locus.state && d.locus.bind !== "condition"))
    console.log(`${d.class}\t${d.locus.site}\t${d.id}\t${d.locus.descriptor}`);
}
if (process.argv.includes("--list-families")) {
  for (const d of defs.filter((d) => d.family)) console.log(`${d.family.id}\t${d.family.role}\t${d.id}\t${d.cast.pick}\t${d.locus.ground}\t${d.locus.site}\t${d.locus.bind ?? ""}\t${d.locus.city ?? ""}\t${d.locus.state ?? ""}`);
}
