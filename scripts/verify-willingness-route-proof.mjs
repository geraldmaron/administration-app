#!/usr/bin/env node
// Proves verify-willingness-route.mjs catches every way a decision can stop
// going through `weigh`.
//
// Each case is a miniature engine tree and plants something somebody would
// actually write: a flat chance keyed "will" in a copy of engagement.ts, an
// unlisted hazard in a copy of foreign-politics.ts, a direct riskTolerance read
// in a copy of npc-agent.ts, a question with no builder outside the pending
// list, the retired join key with no retiring entry, and a closing run with
// work still pending. Every one must fail, and the clean tree must pass.
//
// The pending and hazard lists are fixtures too, because the gate's rules are
// about what those files say, and the real ones say the right thing — which
// is exactly why they cannot prove the gate.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fixtureDir = path.join(root, `.willingness-route-proof-${process.pid}`);

function run(target, extra = []) {
  const argv = ["scripts/verify-willingness-route.mjs", target, ...extra];
  try {
    return { passed: true, output: execFileSync("node", argv, { cwd: root, stdio: "pipe" }).toString() };
  } catch (err) {
    return { passed: false, output: `${err.stdout ?? ""}${err.stderr ?? ""}` };
  }
}

function writeTree(dir, files) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), typeof body === "string" ? body : `${JSON.stringify(body, null, 2)}\n`);
  }
}

// --- The clean tree ----------------------------------------------------------

const WILLINGNESS = `
export type Question =
  | "governor-consent"
  | "join-war";

export function willDraw(streams, question, ...subject) {
  return streams.stream("will", question, ...subject).next();
}

export function weigh(question, terms, options) {
  return { question, terms, ...options };
}
`;

const GOVERNORS = `
import { weigh, willDraw } from "./willingness.js";

export function governorWillingness(campaign, state, streams) {
  const draw = willDraw(streams, "governor-consent", state);
  return weigh("governor-consent", [], { threshold: 0, noiseBound: 0.1, noise: draw });
}
`;

const GOVERNORS_TEST = `
it("stamps the decision", () => {
  expect(packet.provenance.decision.question).toBe("governor-consent");
});
`;

const NPC_TURN = `
export function takesInitiative(campaign, actor, streams) {
  return streams.stream("npc-initiative", actor, campaign.turn).next() < 0.3;
}
`;

const NPC_AGENT = `
import { liveTemperament } from "./temperament.js";

function escalationFit(rung, campaign, nation) {
  const temperament = liveTemperament(campaign, nation);
  return 1 - Math.abs(rung / 5 - temperament.aggression);
}
`;

const WAR_JOIN = `
export function allyJoinEffects(campaign, conflict, streams) {
  return streams.stream("conflict-join", conflict.id, campaign.turn).next();
}
`;

const PENDING = { questions: { "join-war": "5C.1" }, temperamentReads: {} };

const HAZARDS = {
  draws: [
    { file: "npc-turn.ts", key: "npc-initiative", kind: "initiative", terms: ["opportunism"], status: "live", owner: "5A" },
    { file: "war-join.ts", key: "conflict-join", kind: "join", terms: ["trust"], status: "retiring", owner: "5C.1" },
  ],
};

const clean = {
  "engine/willingness.ts": WILLINGNESS,
  "engine/governors.ts": GOVERNORS,
  "engine/governors.test.ts": GOVERNORS_TEST,
  "engine/npc-turn.ts": NPC_TURN,
  "engine/npc-agent.ts": NPC_AGENT,
  "engine/war-join.ts": WAR_JOIN,
  "willingness-pending.json": PENDING,
  "hazard-draws.json": HAZARDS,
};

// --- The planted cases -------------------------------------------------------

const cases = [
  {
    name: "a flat chance keyed \"will\" in a copy of engagement.ts",
    files: {
      ...clean,
      "engine/engagement.ts": `
export function takesTheCall(campaign, target, streams) {
  return streams.stream("will", "engagement", target).next() < 0.4;
}
`,
    },
    expect: /engagement\.ts draws from the "will" stream/,
  },
  {
    name: "an unlisted hazard draw in a copy of foreign-politics.ts",
    files: {
      ...clean,
      "engine/foreign-politics.ts": `
export function coupThisWeek(campaign, nation, streams) {
  return streams.stream("coup-roll", nation, campaign.turn).next() < 0.02;
}
`,
    },
    expect: /foreign-politics\.ts draws stream\("coup-roll"\) in an actor decision module/,
  },
  {
    name: "a direct riskTolerance read in a copy of npc-agent.ts",
    files: {
      ...clean,
      "engine/npc-agent.ts": `
function escalationFit(rung, actor) {
  const appetite = actor.traits.riskTolerance * 0.6 + actor.traits.aggression * 0.4;
  return 1 - Math.abs(rung / 5 - appetite);
}
`,
    },
    expect: /npc-agent\.ts reads riskTolerance, aggression off a nation's traits/,
  },
  {
    name: "a temperament field destructured off the traits in a copy of npc-turn.ts",
    files: {
      ...clean,
      "engine/npc-turn.ts": `
export function initiativeRate(campaign, actor) {
  const { opportunism, isolationism } = campaign.nations[actor].traits;
  return opportunism * 0.5 - isolationism * 0.3;
}
`,
    },
    expect: /npc-turn\.ts reads isolationism off a nation's traits/,
  },
  {
    name: "a question with no builder outside the pending list",
    files: { ...clean, "willingness-pending.json": { questions: {}, temperamentReads: {} } },
    expect: /question "join-war" has no builder that calls weigh/,
  },
  {
    name: "the retired join key with no retiring entry",
    files: {
      ...clean,
      "hazard-draws.json": {
        draws: [
          HAZARDS.draws[0],
          { file: "war-join.ts", key: "conflict-join", kind: "join", terms: ["trust"], status: "live", owner: "5C.1" },
        ],
      },
    },
    expect: /war-join\.ts still uses the retired key "conflict-join"/,
  },
  {
    name: "a listed draw that no longer exists",
    files: {
      ...clean,
      "hazard-draws.json": {
        draws: [...HAZARDS.draws, { file: "operators.ts", key: "operator-act", kind: "act", terms: ["host"], status: "live", owner: "5C.2" }],
      },
    },
    expect: /lists operators\.ts#operator-act as live and no such draw exists/,
  },
];

// --- Run ---------------------------------------------------------------------

const failures = [];
try {
  const cleanDir = path.join(fixtureDir, "clean");
  writeTree(cleanDir, clean);
  const cleanRun = run(cleanDir);
  if (!cleanRun.passed) failures.push(`the clean tree failed:\n${cleanRun.output}`);

  const closingRun = run(cleanDir, ["--closing"]);
  if (closingRun.passed) failures.push("--closing passed with a pending question and a retiring draw");
  else if (!/closing: question "join-war" is still pending/.test(closingRun.output)) {
    failures.push(`--closing failed for the wrong reason:\n${closingRun.output}`);
  }

  cases.forEach((planted, index) => {
    const dir = path.join(fixtureDir, `case-${index}`);
    writeTree(dir, planted.files);
    const result = run(dir);
    if (result.passed) failures.push(`${planted.name}: the gate passed`);
    else if (!planted.expect.test(result.output)) failures.push(`${planted.name}: failed for the wrong reason:\n${result.output}`);
  });
} finally {
  rmSync(fixtureDir, { recursive: true, force: true });
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}
console.log(`verify-willingness-route-proof: ok (clean tree passes, --closing and ${cases.length} planted cases fail)`);
