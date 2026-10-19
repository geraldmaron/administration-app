// A small reader for this repository's stylesheets: every style rule with the
// at-rules it sits inside, its selector and its declarations. It is not a
// general CSS parser. It knows comments, strings, blocks and declarations,
// which is all the architecture gate asks of a sheet, and it fails loudly on
// a brace it cannot place rather than guessing.

/** Comments become spaces of the same length, so offsets and lines still match the file. */
function blankComments(text) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("/*", i)) {
      const end = text.indexOf("*/", i + 2);
      if (end < 0) throw new Error("unterminated comment");
      out += text.slice(i, end + 2).replace(/[^\n]/g, " ");
      i = end + 2;
      continue;
    }
    const quote = text[i];
    if (quote === '"' || quote === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== quote) j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    out += text[i];
    i += 1;
  }
  return out;
}

function lineAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

function declarationsOf(body) {
  const declarations = [];
  for (const raw of body.split(";")) {
    const text = raw.trim();
    if (!text) continue;
    const colon = text.indexOf(":");
    if (colon < 0) continue;
    const property = text.slice(0, colon).trim().toLowerCase();
    let value = text.slice(colon + 1).trim();
    const important = /!\s*important\s*$/i.test(value);
    if (important) value = value.replace(/!\s*important\s*$/i, "").trim();
    declarations.push({ property, value, important });
  }
  return declarations;
}

/**
 * Every style rule in a sheet, in source order:
 * `{ selector, declarations, context, line }`, where context is the at-rule
 * preludes the rule sits inside, outermost first (`["@layer rooms",
 * "@media (max-width: 40em)"]`). Statements that are not rules
 * (`@import`, `@layer a, b;`) come back as `{ statement, context, line }`.
 */
export function readRules(source) {
  const text = blankComments(source);
  const rules = [];
  const stack = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== ch) j += text[j] === "\\" ? 2 : 1;
      i = j;
      continue;
    }
    if (ch === ";" && text.slice(start, i).trim().startsWith("@")) {
      rules.push({ statement: text.slice(start, i).trim(), context: stack.map((frame) => frame.prelude), line: lineAt(text, start) });
      start = i + 1;
      continue;
    }
    if (ch === "{") {
      const prelude = text.slice(start, i).trim();
      if (prelude.startsWith("@") && !/^@(font-face|page|property|counter-style|font-feature-values)\b/.test(prelude) && !/^@keyframes\b|^@-webkit-keyframes\b/.test(prelude)) {
        stack.push({ prelude, kind: "group", line: lineAt(text, start) });
        start = i + 1;
        continue;
      }
      // A rule's body (or a descriptor block, or keyframes) runs to its matching brace.
      let depth = 1;
      let j = i + 1;
      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth += 1;
        else if (text[j] === "}") depth -= 1;
        j += 1;
      }
      if (depth !== 0) throw new Error(`unclosed block at line ${lineAt(text, start)}`);
      const body = text.slice(i + 1, j - 1);
      const context = stack.map((frame) => frame.prelude);
      if (prelude.startsWith("@")) rules.push({ atBlock: prelude, context, line: lineAt(text, start) });
      else rules.push({ selector: prelude.replace(/\s+/g, " "), declarations: declarationsOf(body), context, line: lineAt(text, start) });
      i = j - 1;
      start = j;
      continue;
    }
    if (ch === "}") {
      if (stack.length === 0) throw new Error(`unmatched "}" at line ${lineAt(text, i)}`);
      stack.pop();
      start = i + 1;
    }
  }
  if (stack.length > 0) throw new Error(`unclosed ${stack.at(-1).prelude} from line ${stack.at(-1).line}`);
  if (text.slice(start).trim()) throw new Error(`trailing text after the last rule: "${text.slice(start).trim().slice(0, 40)}"`);
  return rules;
}

/** The cascade layer an entry sits in, nested names joined (`rooms.legacy`), or undefined when it sits in none. */
export function layerOf(entry) {
  const names = entry.context.flatMap((prelude) => {
    const match = /^@layer\s+([A-Za-z0-9_.-]+)$/.exec(prelude);
    return match ? [match[1]] : [];
  });
  return names.length > 0 ? names.join(".") : undefined;
}
