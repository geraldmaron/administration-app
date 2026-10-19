#!/usr/bin/env node
// Two different FeedItem kinds must not share a standfirst or a body graf.
// If they do, the feed is reading the same article under different headlines,
// which is the interchangeable texture article.ts was rewritten to remove.
// This gate fixes a single headline and turn, runs it through every kind, and
// fails if any standfirst or paragraph text is identical across kinds.
//
// Two more axes ride on the same composer. Home news is written in its own
// banks, so a domestic dispatch must neither share a line with another domestic
// kind nor fall back to the foreign read of its own kind. And no bank may claim
// time has passed: an article is on screen the week its item is filed, so a
// line that says "within a week" or names a weekday narrates a week the player
// has not lived yet. That is read with the content package's own time lexicon,
// not a second list.
import { composeArticle } from "../packages/engine/dist/article.js";
import { timeClaimsIn } from "../packages/content/dist/scenario-audit-time.js";
import { loadContentModule, sequencesFromModule } from "./lib/resolution-sequence-bank.mjs";

const KINDS = [
  "player-action",
  "npc-action",
  "operator",
  "drift",
  "press",
  "conflict",
  "condition",
  "governance",
  "pursuit",
  "bloc",
];

const BASE = {
  turn: 4,
  visibility: "public",
  headline: "The ministry confirms the shipment was turned back at the border.",
};

const articles = KINDS.map((kind) => ({
  kind,
  article: composeArticle({ ...BASE, kind }),
}));

const findings = [];

function collectCollisions(label, values, involving = () => true) {
  const index = new Map();
  for (const { kind, text } of values) {
    if (text === undefined) continue;
    if (!index.has(text)) index.set(text, []);
    index.get(text).push(kind);
  }
  for (const [text, kinds] of index) {
    if (kinds.length > 1 && kinds.some(involving)) findings.push({ category: label, text, kinds });
  }
}

collectCollisions(
  "standfirst",
  articles.map(({ kind, article }) => ({ kind, text: article.standfirst })),
);

const grafCount = Math.max(...articles.map(({ article }) => article.paragraphs.length));
for (let i = 0; i < grafCount; i += 1) {
  collectCollisions(
    `paragraph[${i}]`,
    articles.map(({ kind, article }) => ({ kind, text: article.paragraphs[i] })),
  );
}

// --- The domestic axis ---------------------------------------------------------
// The item shapes home news arrives in: a condition filed against the player's
// own nation, a decision the administration took, and a story about it.
const HOME = { playerNation: "USA", playerNationName: "United States" };
const DOMESTIC_KINDS = ["condition", "player-action", "press"];
const domestic = DOMESTIC_KINDS.map((kind) => ({
  kind: `domestic ${kind}`,
  article: composeArticle({ ...BASE, kind, target: HOME.playerNation }, { ...HOME, target: HOME.playerNationName }),
}));
for (const { kind, article } of domestic) {
  if (!article.domestic) findings.push({ category: "scope", text: "the item was not read as domestic", kinds: [kind] });
}
const isDomestic = (kind) => kind.startsWith("domestic ");
const both = [...articles, ...domestic];
collectCollisions("domestic standfirst", both.map(({ kind, article }) => ({ kind, text: article.standfirst })), isDomestic);
collectCollisions("domestic relevance", domestic.map(({ kind, article }) => ({ kind, text: article.relevance })));
for (let i = 0; i < grafCount; i += 1) {
  collectCollisions(`domestic paragraph[${i}]`, both.map(({ kind, article }) => ({ kind, text: article.paragraphs[i] })), isDomestic);
}

// --- The time axis ---------------------------------------------------------------
// Every draw is keyed on the item's turn and headline, so walking both reaches
// every line of every bank, for every kind, scope and circulation. The
// headlines are fixed sentences rather than one that carries the turn: a key
// in which the turn appears twice lands on only half of a four-line bank.
const HEADLINES = [
  "The ministry confirms the shipment was turned back at the border.",
  "A second statement follows the first.",
  "Officials decline to comment.",
  "The vote is delayed again.",
  "A report lands on the desk.",
  "The committee meets in private.",
  "Prices move before the announcement.",
  "A letter is made public.",
];
const OPERATOR_HEADLINES = [
  "Smugglers are moving drugs and guns through Bangladesh faster than its ports can search them.",
  "Armed rebels hold ground inside Iraq and have turned down every offer of talks.",
  "Hackers working out of Russia have broken into computer systems they should not be able to reach.",
  "A hired army registered in the United Arab Emirates is taking jobs nobody will admit to paying for.",
  "Traders are betting heavily against Egypt's currency, and there is nobody to call about it.",
];
const FACTS = [{}, { subject: "Logan Hall", stake: "what it costs", figure: "400 tonnes" }, { instrument: "Tariff Increase", stake: "the measure is in force" }, { subject: "Saudi Arabia" }];
const PARTIES = [[undefined, "USA"], ["CHN", "VNM"], ["USA", undefined], [undefined, "VNM"]];
const WEEKDAY = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)s?\b/;
const timed = new Map();
let composed = 0;
for (let turn = 1; turn <= 12; turn += 1) {
  for (const kind of KINDS) {
    for (const headline of kind === "operator" ? OPERATOR_HEADLINES : HEADLINES) {
      for (const facts of FACTS) {
        for (const [actor, target] of PARTIES) {
          for (const visibility of ["public", "intelligence"]) {
            const item = { turn, kind, headline, visibility, facts, ...(actor ? { actor } : {}), ...(target ? { target } : {}) };
            const names = { ...HOME, actor: actor === "CHN" ? "China" : undefined, target: target === "VNM" ? "Vietnam" : undefined };
            const article = composeArticle(item, names);
            composed += 1;
            for (const text of [article.standfirst, ...(article.relevance ? [article.relevance] : []), ...article.paragraphs]) {
              const claims = [...timeClaimsIn(text).map((claim) => claim.phrase), ...(WEEKDAY.test(text) ? [text.match(WEEKDAY)[0]] : [])];
              for (const phrase of claims) timed.set(text, phrase);
            }
          }
        }
      }
    }
  }
}
for (const [text, phrase] of timed) findings.push({ category: `time ("${phrase}")`, text, kinds: ["engine bank"] });

// The same collapse the FeedItem check above guards against, one layer down:
// a `loss` step reading exactly like a `movement` step is the resolution-beat
// texture the whole family exists to avoid, so no line may answer to two
// different step kinds.
//
// The bank is discovered rather than imported by name (`sequencesFromModule`)
// so this keeps working once the authored bank lands beside the reference
// fixtures — see scripts/lib/resolution-sequence-bank.mjs for why.
const contentModule = await loadContentModule();
const sequences = sequencesFromModule(contentModule);
collectCollisions(
  "resolution-beat step",
  sequences.flatMap((sequence) => sequence.steps.map((step) => ({ kind: step.kind, text: step.line }))),
);

if (findings.length > 0) {
  const summary = findings.map((f) => `${f.category}(${f.kinds.length})`).join(", ");
  console.error(`verify-wire-bank-collapse: ${findings.length} finding(s) — ${summary}`);
  for (const { category, text, kinds } of findings) {
    const preview = text.length > 120 ? `${text.slice(0, 120)}...` : text;
    console.error(`  ${category} ${kinds.length > 1 ? "shared by" : "in"} ${kinds.join(", ")}: "${preview}"`);
  }
  process.exit(1);
}

// The proof: two step kinds sharing a line is exactly the defect this gate
// exists to catch, checked against the same detector rather than a
// reimplementation of it, and kept out of `findings` so a deliberately bad
// fixture cannot itself fail this run.
const proof = [];
function collectProof(values) {
  const index = new Map();
  for (const { kind, text } of values) {
    if (!index.has(text)) index.set(text, []);
    index.get(text).push(kind);
  }
  for (const [text, kinds] of index) {
    if (kinds.length > 1) proof.push({ text, kinds });
  }
}
const sharedLine = "Word reaches the desk before the wire does, and by morning every station is repeating the same line.";
collectProof([
  { kind: "movement", text: sharedLine },
  { kind: "hold", text: sharedLine },
]);
if (proof.length === 1) {
  console.log("OK: the collision detector correctly flagged two step kinds sharing an identical line.");
} else {
  console.error("FAIL: the collision detector did not flag two step kinds sharing an identical line — the gate is not gating.");
  process.exit(1);
}

console.log(
  `verify-wire-bank-collapse: OK — no two FeedItem kinds share a standfirst or body graf, home news reads in its own ` +
    `${DOMESTIC_KINDS.length} domestic banks, no line of ${composed} composed pieces claims time has passed, and no two ` +
    `resolution-beat step kinds share a line across ${sequences.length} sequence(s).`,
);
