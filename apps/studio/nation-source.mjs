import { objectLiteralSpan } from "./source-patch.mjs";

// Writing one scalar, at one dotted path, into one nation's block in
// packages/world/src/dataset/nations.ts.
//
// The posture patcher this generalizes could get away with a regex over the
// nation's block, because `posture:` appears once in it. A path like
// `stats.military.branchStrength.naval` cannot: `naval` also appears under the
// trade mix on some nations, and `production` appears under both energy and
// agriculture. So each segment of the path is resolved in turn, and each
// resolution is scoped to the *immediate* keys of the object the previous
// segment opened — a key nested deeper is not a candidate, however well its
// name matches.

/**
 * The span of `key`'s value, among the immediate keys of the object literal at
 * [start, end). Returns undefined when the object has no such key at this level.
 *
 * Scanning is brace/quote/comment aware for the same reason the span scanner
 * is: the dataset sources carry a provenance comment above every entry, and an
 * apostrophe in English prose opens a string that never closes.
 *
 * @returns {{keyStart: number, valueStart: number, valueEnd: number} | undefined}
 */
export function immediateKeySpan(source, start, end, key) {
  let depth = 0;
  let inString = false;
  let quote = "";
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = start; i < end; i++) {
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
    if (ch === "{" || ch === "[") {
      depth++;
      continue;
    }
    if (ch === "}" || ch === "]") {
      depth--;
      continue;
    }

    // Depth 1 is the object's own key level: depth 0 is before its opening
    // brace, depth 2 and beyond is inside one of its values.
    if (depth !== 1) continue;

    const rest = source.slice(i, i + key.length + 1);
    if (rest !== `${key}:`) continue;
    // A key, not the tail of a longer identifier — `production` must not match
    // inside `netProduction`.
    const before = source[i - 1];
    if (before !== undefined && /[A-Za-z0-9_$]/.test(before)) continue;

    let valueStart = i + key.length + 1;
    while (valueStart < end && /\s/.test(source[valueStart])) valueStart++;
    return { keyStart: i, valueStart, valueEnd: valueEndFrom(source, valueStart, end) };
  }
  return undefined;
}

/**
 * Where the value beginning at `start` ends: just past its last non-space
 * character, stopping at the comma, closing brace, or line end that follows it.
 *
 * The trailing whitespace is excluded rather than consumed. `posture:
 * "assertive" }` has a space between the value and the brace, and a span that
 * swallowed it would put the replacement flush against the brace — a
 * reformatting of a line the edit was not asked to reformat, spreading a
 * cosmetic diff across every field anyone ever publishes.
 */
function valueEndFrom(source, start, end) {
  if (source[start] === "{" || source[start] === "[") {
    const [, close] = objectLiteralSpan(source, start);
    return close;
  }
  let inString = false;
  let quote = "";
  let stop = end;
  for (let i = start; i < end; i++) {
    const ch = source[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === quote) inString = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = true;
      quote = ch;
      continue;
    }
    if (ch === "," || ch === "}" || ch === "\n") {
      stop = i;
      break;
    }
  }
  while (stop > start && /\s/.test(source[stop - 1])) stop--;
  return stop;
}

/**
 * The scalar currently written at `path`, read back out of source.
 *
 * Staleness is a question about the file, not about whatever the process
 * imported at startup: `@admin/world` is an ES module, so a rebuild triggered
 * by a publish does not change the copy already resident in the publisher's own
 * memory. A second publish in the same session judged against that copy is
 * judging against values one publish out of date.
 *
 * @returns {{ok: true, value: string | number | boolean} | {ok: false, reason: string}}
 */
export function readScalarAtPath(source, start, end, path) {
  const segments = path.split(".");
  let spanStart = start;
  let spanEnd = end;

  for (let depth = 0; depth < segments.length - 1; depth++) {
    const found = immediateKeySpan(source, spanStart, spanEnd, segments[depth]);
    if (!found || source[found.valueStart] !== "{") {
      return { ok: false, reason: `no object at "${segments.slice(0, depth + 1).join(".")}" in this block` };
    }
    [spanStart, spanEnd] = objectLiteralSpan(source, found.valueStart);
  }

  const found = immediateKeySpan(source, spanStart, spanEnd, segments[segments.length - 1]);
  if (!found) return { ok: false, reason: `no "${path}" in this block` };

  const literal = source.slice(found.valueStart, found.valueEnd).trim();
  if (literal === "true") return { ok: true, value: true };
  if (literal === "false") return { ok: true, value: false };
  if (/^"(?:[^"\\]|\\.)*"$/.test(literal)) return { ok: true, value: JSON.parse(literal) };
  // Numeric separators are an authoring convenience the language strips; the
  // value 27_000_000 and the value 27000000 are the same number.
  const numeric = literal.replace(/_/g, "");
  if (/^-?\d+(\.\d+)?(e[-+]?\d+)?$/i.test(numeric)) return { ok: true, value: Number(numeric) };
  return { ok: false, reason: `"${path}" is not a literal scalar in source (reads \`${literal}\`)` };
}

/** How a value is written back into source. Numbers lose any `_` grouping the author used. */
export function literalFor(value) {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return String(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`refusing to write a non-finite number`);
    return String(value);
  }
  throw new Error(`refusing to write a ${typeof value} into dataset source`);
}

/**
 * Rewrites the scalar at `path`, inside the object literal spanning `start` up
 * to `end`, so that it reads `value`.
 *
 * @returns {{ok: true, source: string} | {ok: false, reason: string}}
 */
export function writeScalarAtPath(source, start, end, path, value) {
  const segments = path.split(".");
  let spanStart = start;
  let spanEnd = end;

  for (let depth = 0; depth < segments.length - 1; depth++) {
    const segment = segments[depth];
    const found = immediateKeySpan(source, spanStart, spanEnd, segment);
    if (!found) return { ok: false, reason: `no "${segments.slice(0, depth + 1).join(".")}" in this block` };
    if (source[found.valueStart] !== "{") {
      return { ok: false, reason: `"${segments.slice(0, depth + 1).join(".")}" is not an object in source` };
    }
    [spanStart, spanEnd] = objectLiteralSpan(source, found.valueStart);
  }

  const leaf = segments[segments.length - 1];
  const found = immediateKeySpan(source, spanStart, spanEnd, leaf);
  if (!found) return { ok: false, reason: `no "${path}" in this block — the field is not written out for this nation` };
  if (source[found.valueStart] === "{" || source[found.valueStart] === "[") {
    return { ok: false, reason: `"${path}" is not a scalar in source` };
  }

  // Some fields are authored as a reference to a declared constant rather than
  // as a literal — `id: US_ID`, and anything the dataset later factors out the
  // same way. Overwriting the reference with the value it currently resolves to
  // both loses the indirection the author chose and, where the constant carries
  // a branded cast, stops compiling. The literal it points at is not this
  // patcher's to edit.
  const existing = source.slice(found.valueStart, found.valueEnd);
  if (/^[A-Za-z_$][\w$]*$/.test(existing) && existing !== "true" && existing !== "false") {
    return { ok: false, reason: `"${path}" is written as the constant \`${existing}\` in source, not as a literal` };
  }

  let literal;
  try {
    literal = literalFor(value);
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
  return { ok: true, source: source.slice(0, found.valueStart) + literal + source.slice(found.valueEnd) };
}
