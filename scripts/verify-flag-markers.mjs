#!/usr/bin/env node
// A durable flag carries the turn it was stamped, or the callbacks written
// against it fire the week they were set.
//
// `campaign.player.flags` is a keyed set of booleans, so a flag on its own says
// *that* something happened and never *when*. `markedFlags` writes the missing
// half: the flag, plus a `flagset:<flag>:<turn>` marker beside it. The content
// layer's two readers both treat a marker-less flag as old by construction —
// `flagAgedAtLeast` returns true when it finds no marker in its window, and the
// flag-age weight boost saturates at 1 — because a flag with no date cannot be
// shown to be recent. That is the safe reading for a flag that genuinely
// predates the record, and a trap for one that was stamped this week: an
// `agedAtLeast: 6` follow-up written against an unmarked flag arrives the same
// week as the thing it follows, at full weight, and reads as a bug.
//
// So the rule is about the emitter, not the reader. Three ways to be legal:
//
//   1. the `set` expression goes through `markedFlags` — the ordinary case;
//   2. every flag in it is SELF_DATED — the turn is already in the key, so a
//      marker would be a second copy of it;
//   3. every flag in it is EPHEMERAL — it is a present-tense fact about the
//      board that the same subsystem clears when it stops being true, not a
//      dated deed anything could wait six weeks on.
//
// MARKER_DEBT is the fourth: sites that are durable, unmarked, and not yet
// fixed. It is a frozen list in the shape of verify-file-size.mjs's LOGIC_DEBT
// — today's debt cannot grow, and each entry carries the edit that retires it.
// A new unmarked durable flag anywhere fails.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SCAN_ROOTS = process.argv[2]
  ? [process.argv[2]]
  : ["packages/engine/src", "packages/content/src"];

/** The turn is part of the flag's own key, so a marker would restate it. */
const SELF_DATED = {
  classStagedFlag: "staged:<class>:<turn> — the turn is the key",
  severityStagedFlag: "staged-severity:<severity>:<turn> — the turn is the key",
  deskClosedFlag: "desk:closed:<turn> — the turn is the key",
  deskDriftFlag: "desk-unanswered:<turn> — the turn is the key, and it is what the next drifting week counts back over",
  coalitionSinceFlag: "coalition-since:<subject>:<turn> — the turn is the key, and it is what bounds how long a shared fear pulls",
};

/**
 * Present-tense facts about the board, cleared by the same subsystem that sets
 * them. Nothing can honestly wait six weeks on one: it is either true now or
 * it is not, and the marker would date a state rather than a deed.
 */
const EPHEMERAL = {
  conditionFlag: "conditions.ts clears it the turn the condition resolves",
  coalitionFlag: "blocs.ts lowers it the turn the coalition falls below the bar",
  compactCallFlag: "compacts.ts lowers a call flag when the call it names decays",
  PRESS_HOSTILE_FLAG: "press.ts recomputes the stance every turn and sets or clears in one expression",
};

/**
 * Sites whose flag is not a deed at all and cannot be named here, because the
 * caller supplies the string. Keyed by file and by the local the expression
 * reads, since there is no builder to classify.
 */
const OPAQUE = {
  "packages/engine/src/god.ts": {
    flag: "god mode stamps whatever flag the developer console names; there is no deed to date, and the campaign records separately that it was governed from outside the fiction",
  },
};

/**
 * Durable, unmarked, and owed a fix. Keyed by file and by the token that names
 * the flag, never by line, because these files move under other work. The
 * value is the edit that retires the entry.
 */
const MARKER_DEBT = {
  "packages/engine/src/peace.ts": {
    termsOfferedFlag: "wrap in markedFlags([...], campaign.turn) — same flag, second writer",
  },
  "packages/engine/src/press-scandal.ts": {
    scandalClosedFlag: "wrap the closing.map(...) result in markedFlags(..., campaign.turn)",
  },
  "packages/engine/src/instruments.ts": {
    "recalled-ambassador:": "wrap in markedFlags([...], ctx.campaign.turn)",
    "severed-relations:": "wrap in markedFlags([...], ctx.campaign.turn)",
    "surveilling:": "wrap in markedFlags([...], ctx.campaign.turn)",
  },
  "packages/engine/src/instruments-economic.ts": {
    "embargo:": "wrap in markedFlags([...], ctx.campaign.turn)",
    securityGuaranteeFlag: "wrap in markedFlags([...], ctx.campaign.turn)",
  },
};

const CLOSERS = { "(": ")", "[": "]", "{": "}" };

/** The object literal a `kind: "flag"` sits in, from its `{` to its matching `}`. */
function enclosingLiteral(source, at) {
  let start = at;
  while (start >= 0 && source[start] !== "{") start -= 1;
  if (start < 0) return undefined;
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return undefined;
}

/** One expression from `i`, stopping at the `,` or `}` that ends it. */
function readExpression(text, i) {
  const stack = [];
  let quote;
  for (let j = i; j < text.length; j += 1) {
    const ch = text[j];
    if (quote) {
      if (ch === "\\") j += 1;
      else if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (CLOSERS[ch]) {
      stack.push(CLOSERS[ch]);
      continue;
    }
    if (stack.length > 0 && ch === stack[stack.length - 1]) {
      stack.pop();
      continue;
    }
    if (stack.length === 0 && (ch === "," || ch === "}" || ch === ")" || ch === "]" || ch === ";")) {
      return text.slice(i, j);
    }
  }
  return text.slice(i);
}

/** Every `set:` expression in a flag literal, plus any `set` shorthand resolved from the file. */
function setExpressions(literal, source) {
  const out = [];
  for (const m of literal.matchAll(/\bset\s*:/g)) {
    out.push(readExpression(literal, m.index + m[0].length).trim());
  }
  // `{ kind: "flag", set }` — the array was built above and named `set`.
  if (/\bset\s*[,}]/.test(literal.replace(/\bset\s*:/g, ""))) {
    for (const m of source.matchAll(/\bconst\s+set(?:\s*:[^=]+)?\s*=/g)) {
      out.push(readExpression(source, m.index + m[0].length).trim());
    }
  }
  return out;
}

/**
 * The tokens that name the flags in an expression: the `…Flag(` builders, the
 * SCREAMING_CASE constants, and the literal prefix of a template-built key.
 */
function flagTokens(expression) {
  const tokens = new Set();
  for (const m of expression.matchAll(/\b([A-Za-z_$][\w$]*Flag)\s*\(/g)) tokens.add(m[1]);
  // Only a constant that says it is a flag. A threshold like MIN_COALITION
  // sits in the same expression and names no flag at all.
  for (const m of expression.matchAll(/\b([A-Z][A-Z0-9_]*FLAG[A-Z0-9_]*)\b/g)) tokens.add(m[1]);
  for (const m of expression.matchAll(/`([a-z][a-z0-9-]*:)/g)) tokens.add(m[1]);
  return [...tokens];
}

// Names that appear in a set expression and never name a flag.
const NOT_A_FLAG = new Set(["map", "filter", "flatMap", "new", "Set", "id", "of", "in", "const", "let", "return"]);

/** The file-local names an expression reads, for a site that names no builder. */
function localNames(expression) {
  const names = new Set();
  for (const m of expression.matchAll(/\b([a-z][\w$]*)\b/g)) {
    if (NOT_A_FLAG.has(m[1])) continue;
    names.add(m[1]);
  }
  return [...names];
}

/**
 * The builders behind a site that names none directly, followed through the
 * locals it reads. `raise` is pushed a `flag` that is `compactCallFlag(...)`,
 * two hops from the effect — and a gate that gave up after zero hops would
 * pass every site that built its array a few lines earlier.
 */
function resolvedTokens(expression, source) {
  let frontier = localNames(expression);
  const seen = new Set(frontier);
  const tokens = new Set();
  const marked = new Set();
  const unmarked = new Set();
  for (let hop = 0; hop < 3 && frontier.length > 0; hop += 1) {
    const next = [];
    for (const name of frontier) {
      const pattern = new RegExp(`\\b(?:const|let)\\s+${name}\\b[^=]*=|\\b${name}\\.push\\(`, "g");
      for (const m of source.matchAll(pattern)) {
        const bound = readExpression(source, m.index + m[0].length);
        const found = flagTokens(bound);
        for (const token of found) {
          tokens.add(token);
          if (bound.includes("markedFlags(")) marked.add(token);
          else unmarked.add(token);
        }
        if (found.length > 0) continue;
        for (const local of localNames(bound)) {
          if (seen.has(local)) continue;
          seen.add(local);
          next.push(local);
        }
      }
    }
    frontier = next;
  }
  return { tokens: [...tokens], marked, unmarked, unresolved: tokens.size > 0 ? [] : localNames(expression) };
}

function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === "__fixtures__" || entry.name === "dist" || entry.name === "node_modules") continue;
        walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
        out.push(path.relative(root, path.join(dir, entry.name)));
      }
    }
  };
  for (const scanRoot of SCAN_ROOTS) walk(path.join(root, scanRoot));
  return out;
}

const violations = [];
const spent = new Set();
let sitesSeen = 0;

for (const relPath of sourceFiles()) {
  const source = readFileSync(path.join(root, relPath), "utf8");
  const debt = MARKER_DEBT[relPath] ?? {};
  for (const m of source.matchAll(/kind:\s*"flag"/g)) {
    const literal = enclosingLiteral(source, m.index);
    if (literal === undefined) continue;
    const expressions = setExpressions(literal, source);
    if (expressions.length === 0) continue; // a clear-only effect sets nothing
    sitesSeen += 1;
    if (expressions.some((expression) => expression.includes("markedFlags("))) continue;
    const expression = expressions.join(" ");
    const direct = flagTokens(expression);
    const opaque = OPAQUE[relPath] ?? {};
    const { tokens, marked, unmarked, unresolved } = direct.length > 0 ? { tokens: direct, marked: new Set(), unmarked: new Set(direct), unresolved: [] } : resolvedTokens(expression, source);
    // A site the scan cannot name is not a site the scan may forgive: an
    // emitter whose flag is a bare local has to be recorded, or the gate is
    // passing on ignorance.
    if (tokens.length === 0) {
      const named = unresolved.filter((name) => name in opaque);
      if (named.length === 0) {
        violations.push(
          `${relPath}: sets a flag this check cannot name (${unresolved.join(", ") || "no readable token"}) — ` +
            "stamp it through markedFlags, or record it in OPAQUE with the reason it carries no deed",
        );
      }
      continue;
    }
    for (const token of tokens) {
      if (marked.has(token) && !unmarked.has(token)) continue;
      if (token in SELF_DATED || token in EPHEMERAL) continue;
      if (token in debt) {
        spent.add(`${relPath}::${token}`);
        continue;
      }
      violations.push(
        `${relPath}: sets "${token}" as a durable flag with no turn marker — ` +
          "wrap the set in markedFlags(flags, turn), or record it in SELF_DATED or EPHEMERAL with the reason",
      );
    }
  }
}

// A gate that cannot shrink is a gate nobody ever finishes. An entry whose site
// was fixed, or whose file is gone, fails here — the same rule LOGIC_DEBT's
// stale-path check applies, one level down.
for (const [relPath, tokens] of Object.entries(MARKER_DEBT)) {
  if (!existsSync(path.join(root, relPath))) {
    violations.push(`${relPath}: named in MARKER_DEBT but does not exist — remove the entry`);
    continue;
  }
  for (const token of Object.keys(tokens)) {
    if (spent.has(`${relPath}::${token}`)) continue;
    violations.push(
      `${relPath}: MARKER_DEBT forgives "${token}", which no longer sets an unmarked durable flag — remove the entry`,
    );
  }
}

// A run that found nothing has not proved anything: an emitter shape that moved
// out from under the scan would report a clean tree forever.
if (sitesSeen === 0) {
  console.error("FAIL: verify-flag-markers found no flag-setting effect at all — the scan is looking at the wrong shape.");
  process.exit(1);
}

if (violations.length > 0) {
  console.error(`FAIL: ${violations.length} durable flag(s) are stamped without their turn:\n`);
  for (const v of violations) console.error(`  ${v}`);
  console.error(
    "\nA flag with no marker reads as old by construction, so the first `agedAtLeast` callback written " +
      "against it fires the week it was set. Stamp it through markedFlags.",
  );
  process.exit(1);
}

console.log(`OK: ${sitesSeen} flag-setting site(s) either stamp their turn, are self-dated, are cleared by their own subsystem, or are recorded debt.`);
