#!/usr/bin/env node
// Proves verify-rule-seams.mjs catches every way a world rule's description can
// quietly stop being true.
//
// Each case is a miniature engine tree, the way verify-foreign-truth-proof.mjs
// builds its trees, and each plants a writer somebody would actually write: a
// founding edge emitted from a copy of founding.ts, a second hand on the week's
// actor slots, a debt payment made outside the booking step, a vote counted
// beside the one vote path, a flag read where a seam should be, a second reader
// of a rule, and a paid entry sold under a key the contracts package does not
// have. Every one must fail, and the clean tree must pass.
//
// The registry and the contracts file are fixtures too, because clauses 1 and 5
// are rules about what those two files say, and the real ones say the right
// thing — which is exactly why they cannot prove the gate.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.rule-seams-proof-${process.pid}`);

function run(target, extra = [], env = {}) {
  const argv = ["scripts/verify-rule-seams.mjs", ...(target ? [target] : []), ...extra];
  try {
    return { passed: true, output: execFileSync("node", argv, { cwd: root, stdio: "pipe", env: { ...process.env, ...env } }).toString() };
  } catch (err) {
    return { passed: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function writeTree(dir, files) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), body);
  }
}

// --- The clean tree ----------------------------------------------------------

const registry = ({ entitlement = "god-mode", locked = '"Part of the God mode DLC in the Steam desktop build."' } = {}) => `
import type { Campaign } from "./state.js";

export const RULES = {
  "information.omniscient": {
    id: "information.omniscient",
    kind: "view",
    tier: "paid",
    values: [false, true],
    statuses: ["standard", "sandbox"],
    harder: [false, false],
    seam: "rules.ts#omniscientRead",
    readers: ["state-selectors.ts#hasIntelOnNation"],
    seamClass: "read-only",
    influence: "force",
    entitlement: ${JSON.stringify(entitlement)},
    copy: { name: "Omniscience", holds: "Every file is legible.", costs: "Never ranked.", locked: ${locked} },
  },
};

export function ruleValue(campaign: Campaign, id: string) {
  return campaign.rules?.values?.[id] ?? RULES[id].values[0];
}

export function omniscientRead(campaign: Campaign) {
  return ruleValue(campaign, "information.omniscient");
}

export function campaignStatus(campaign: Campaign) {
  return { status: campaign.godMode?.enabled === true ? "sandbox" : "standard", challenge: false };
}
`;

const SELECTORS = `
import { campaignStatus, omniscientRead } from "./rules.js";

export function hasIntelOnNation(campaign, nation) {
  if (omniscientRead(campaign)) return true;
  return outreads(campaign, nation);
}

function outreads(campaign, nation) {
  return false;
}

export function isRankable(campaign) {
  return campaignStatus(campaign).status === "standard";
}
`;

const CONTRACTS = (keys = '"god-mode"', platforms = '"steam"') =>
  `export type EntitlementKey = ${keys};\nexport type StorePlatform = ${platforms};\n`;

const census = (sites = []) => JSON.stringify({ sites }, null, 2);

const CLEAN = {
  "engine/rules.ts": registry(),
  "engine/state-selectors.ts": SELECTORS,
  "contracts.ts": CONTRACTS(),
  "census.json": census(),
};

// --- The planted writers -----------------------------------------------------

const PLANTED_FOUNDING = `
export function sealFounding(campaign) {
  return [{ kind: "relationship", from: "USA", to: "CHN", deltas: { trust: -0.2, tension: 0.2 } }];
}
`;

const PLANTED_SLOTS = `
export function openWeek(campaign) {
  return { ...campaign, week: { day: 1, actors: ["CHN", "RUS"] } };
}
`;

const PLANTED_DEBT = `
export function quietlyPayDown(campaign) {
  return { kind: "nationStat", nation: "USA", setStats: { economy: { debt: 0 } } };
}
`;

const PLANTED_VOTE = `
import { countVote } from "./congress.js";

export function projectPassage(campaign, act) {
  return countVote(campaign.congress, "house", 0.5, 218, campaign.states);
}
`;

const PLANTED_FLAG = `
import { isGodMode } from "./state.js";

export function fiscalPhase(campaign) {
  if (isGodMode(campaign)) return [];
  return [];
}
`;

// The hole a file-level allow list would leave: a second reader of the status,
// in the one file that is allowed to have the first.
const PLANTED_STATUS = `${SELECTORS}
export function isHeadline(campaign) {
  return campaignStatus(campaign).status === "sandbox";
}
`;

const PLANTED_RULE_READER = `
import { ruleValue } from "./rules.js";

export function feedVisibility(campaign, outcome) {
  if (ruleValue(campaign, "information.omniscient")) return "intelligence";
  return "public";
}
`;

const PLANTED_SEAM_READER = `
import { omniscientRead } from "./rules.js";

export function nationVitals(campaign, nation) {
  return omniscientRead(campaign) ? "full" : "fogged";
}
`;

// --- Run ---------------------------------------------------------------------

const problems = [];
function expect(label, files, wantPass, pattern, { extra = [], env = {} } = {}) {
  writeTree(fixtureDir, { ...CLEAN, ...files });
  const { passed, output } = run(fixtureDir, extra, env);
  if (passed !== wantPass) problems.push(`${label}: expected the gate to ${wantPass ? "pass" : "fail"}.\n${output}`);
  else if (!pattern.test(output)) problems.push(`${label}: the verdict did not say what it should.\n${output}`);
  else console.log(`OK: ${label}`);
}

try {
  expect("a tree whose one rule has one seam and one declared reader", {}, true, /1 rule\(s\) on 1 seam\(s\)/);

  expect(
    "a founding edge toward the United States emitted from a copy of founding.ts",
    { "engine/founding.ts": PLANTED_FOUNDING },
    false,
    /unclassified founding-edge site: founding\.ts#sealFounding/,
  );

  expect(
    "a second hand on the week's actor slots",
    { "engine/turn-loop.ts": PLANTED_SLOTS },
    false,
    /unclassified npc-actor-slot site: turn-loop\.ts#openWeek/,
  );

  expect(
    "a debt payment written outside the booking step",
    { "engine/operators.ts": PLANTED_DEBT },
    false,
    /unclassified us-debt-writer site: operators\.ts#quietlyPayDown/,
  );

  expect(
    "the same debt writer once it is classified",
    {
      "engine/operators.ts": PLANTED_DEBT,
      "census.json": census([
        { class: "us-debt-writer", site: "operators.ts#quietlyPayDown", disposition: "clamped", reason: "Re-booked on the books day." },
      ]),
    },
    true,
    /us-debt-writer 1/,
  );

  expect(
    "a vote counted beside the one vote path, once VOTE-1 has landed",
    {
      "engine/bill-stages.ts": PLANTED_VOTE,
      "census.json": census([
        { class: "congressional-decision", site: "bill-stages.ts#projectPassage", disposition: "reader", reason: "Counts through the counter module." },
        { class: "projection", site: "bill-stages.ts#projectPassage", disposition: "projection", reason: "The count the floor will run." },
      ]),
    },
    false,
    /bill-stages\.ts#projectPassage counts a vote itself: go through voteOn/,
    { env: { RULE_SEAMS_VOTE_1: "1" } },
  );

  expect(
    "the flag read back where a seam belongs",
    { "engine/fiscal.ts": PLANTED_FLAG },
    false,
    /fiscal\.ts#fiscalPhase reads isGodMode\(\) directly/,
  );

  expect(
    "a second reader of the campaign's status, in the file allowed the first",
    { "engine/state-selectors.ts": PLANTED_STATUS },
    false,
    /state-selectors\.ts#isHeadline reads campaignStatus\(\) directly/,
  );

  expect(
    "a second reader of a rule's own value",
    { "engine/npc-turn.ts": PLANTED_RULE_READER },
    false,
    /npc-turn\.ts#feedVisibility calls ruleValue, and no rule declares it a seam or a reader/,
  );

  expect(
    "a second reader of the rule's seam helper",
    { "engine/nation-vitals.ts": PLANTED_SEAM_READER },
    false,
    /nation-vitals\.ts#nationVitals reaches the seam omniscientRead\(\) for "information\.omniscient"/,
  );

  expect(
    "a paid rule sold under a key the contracts package does not have",
    { "engine/rules.ts": registry({ entitlement: "world-rules" }) },
    false,
    /names the key "world-rules", not "god-mode"/,
  );

  expect(
    "a paid rule with nothing to say when it is locked",
    { "engine/rules.ts": registry({ locked: "undefined" }) },
    false,
    /has no copy\.locked/,
  );

  expect("a second entitlement key", { "contracts.ts": CONTRACTS('"god-mode" | "world-rules"') }, false, /exactly one key/);
  expect("a second storefront", { "contracts.ts": CONTRACTS('"god-mode"', '"steam" | "epic"') }, false, /exactly one storefront/);

  expect(
    "a rule that names no seam at all",
    { "engine/rules.ts": registry().replace('seam: "rules.ts#omniscientRead",', "") },
    false,
    /names no seam/,
  );

  expect("an empty tree", { "engine/rules.ts": "export const NOTHING = 1;\n" }, false, /registry is empty or unreadable/);

  // A workstream's own run: the sites its brief names are reported, and any
  // other unclassified site still fails.
  const expectList = path.join(fixtureDir, "expected.txt");
  writeTree(fixtureDir, { ...CLEAN, "engine/founding.ts": PLANTED_FOUNDING });
  writeFileSync(expectList, "founding-edge founding.ts#sealFounding\n");
  {
    const { passed, output } = run(fixtureDir, ["--expect", expectList]);
    if (!passed) problems.push(`--expect on a site the brief names: expected the gate to pass.\n${output}`);
    else if (!/EXPECTED — unclassified founding-edge site founding\.ts#sealFounding/.test(output)) {
      problems.push(`--expect on a site the brief names: the verdict did not name it.\n${output}`);
    } else console.log("OK: --expect reports a brief's own new site and passes");
  }
  writeTree(fixtureDir, { ...CLEAN, "engine/founding.ts": PLANTED_FOUNDING, "engine/operators.ts": PLANTED_DEBT });
  writeFileSync(expectList, "founding-edge founding.ts#sealFounding\n");
  {
    const { passed, output } = run(fixtureDir, ["--expect", expectList]);
    if (passed) problems.push(`--expect does not forgive an unannounced site: expected the gate to fail.\n${output}`);
    else if (!/unclassified us-debt-writer site: operators\.ts#quietlyPayDown/.test(output)) {
      problems.push(`--expect does not forgive an unannounced site: the verdict did not name it.\n${output}`);
    } else console.log("OK: --expect still fails on a site nobody announced");
  }
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nverify-rule-seams-proof: FAIL — ${problems.length} fixture(s) did not behave:\n`);
  for (const problem of problems) console.error(`  - ${problem}\n`);
  process.exit(1);
}
console.log("\nProof complete. Running the gate on the real tree:\n");
const real = run(undefined);
process.stdout.write(real.output);
process.exit(real.passed ? 0 : 1);
