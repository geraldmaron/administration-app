// Finding one object literal inside hand-authored TypeScript, safely enough to
// rewrite a number in it.
//
// The dataset sources are prose as much as data — a provenance comment above
// every entry explains its calibration — so a whole-file regex is off the
// table and the literal has to be isolated by brace counting. Which means the
// scanner has to know what a brace is *not*: braces inside strings do not
// nest, and neither do braces or quotes inside comments. That last part is not
// hypothetical. A comment reading "the player's own nation" opens a quote that
// never closes, and a scanner that believes it swallows the rest of the file
// and reports the literal as unbalanced.

/**
 * The [start, end) span of the object literal whose opening brace is at
 * `openBraceIndex`, ignoring braces and quotes inside strings, template
 * literals, and comments.
 *
 * @param {string} source
 * @param {number} openBraceIndex
 * @returns {[number, number]}
 */
export function objectLiteralSpan(source, openBraceIndex) {
  let depth = 0;
  let inString = false;
  let quote = "";
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = openBraceIndex; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === quote) inString = false;
      continue;
    }

    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return [openBraceIndex, i + 1];
    }
  }
  throw new Error("unbalanced braces while scanning an object literal");
}
