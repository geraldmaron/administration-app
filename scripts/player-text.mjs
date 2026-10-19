// The sentences a player reads, lifted out of the source that renders them.
//
// Player text is spread across JSX children, attribute values (aria-label,
// title, placeholder), string literals returned by player-core's composers and
// the glossary's data. Reading it file by file is how "the room" survived in
// six places nobody had read together. This walks the TypeScript syntax tree
// so a comment, an import path, a class name or a union tag is never mistaken
// for a sentence, and a template's holes are kept as `{…}` so a rule can still
// read the words around them.
//
// Shared by verify-player-prose.mjs (the gate) and anything that needs the
// inventory, so the gate and the inventory can never disagree about what text
// is.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

/** The packages whose strings reach a player. Studio, the engine and the corpus bake have their own rules. */
export const PLAYER_ROOTS = ["apps/player/src", "apps/player/app", "packages/ui/src", "apps/web/src", "packages/ui-web/src", "packages/player-core/src"];

const SKIP_DIRS = new Set(["node_modules", "dist", "__fixtures__", "dev"]);
const SKIP_FILE = /\.(test|spec)\.tsx?$|\.generated\.ts$|\.d\.ts$|routeTree\.gen\.ts$/;

// Attributes and keys whose value is machinery, not words: a class, a route, a
// test hook, an icon name.
const MACHINE_ATTRS = new Set([
  "className", "key", "id", "to", "href", "src", "icon", "name", "type", "role", "variant", "tone", "size",
  "data-testid", "htmlFor", "rel", "target", "method", "lang", "dir", "fill", "stroke", "d", "viewBox",
  "transform", "points", "path", "from", "kind", "align", "justify", "layout", "mode", "slot", "as",
  "aria-hidden", "aria-live", "aria-current", "aria-controls", "aria-describedby", "aria-labelledby",
  "aria-expanded", "aria-haspopup", "aria-modal", "aria-sort", "inputMode", "autoComplete", "accept",
  "textAnchor", "dominantBaseline", "strokeLinecap", "strokeLinejoin", "fontWeight", "style", "colorScheme",
]);
const MACHINE_KEYS = new Set([...MACHINE_ATTRS, "route", "screen", "glyph", "accent", "lens", "metric", "ink", "slug", "testId"]);

export function walkFiles(root, dir) {
  const full = path.join(root, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
    if (SKIP_DIRS.has(entry.name)) return [];
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(root, rel);
    return /\.tsx?$/.test(entry.name) && !SKIP_FILE.test(entry.name) ? [rel] : [];
  });
}

/** A string reads as words when it has a run of letters and a space, and is not a path, a token or a CSS value. */
export function looksLikeWords(text) {
  const t = text.trim();
  if (t.length < 2 || !/[A-Za-z]{2}/.test(t)) return false;
  if (/^[a-z0-9]+([-_.:/][a-z0-9{}…]+)+$/.test(t)) return false;
  if (/^(var\(|rgba?\(|#[0-9a-f]{3,8}\b|\d+(px|rem|em|%|ms|s)\b|calc\()/i.test(t)) return false;
  if (/^[a-z][a-zA-Z0-9]*$/.test(t)) return false;
  if (/^[@./]/.test(t) || /\.(js|ts|tsx|css|json|svg|png|webp)$/.test(t)) return false;
  return /\s/.test(t) || /^[A-Z][a-z]+$/.test(t);
}

function parentAttrOrKey(node) {
  let current = node.parent;
  for (let hops = 0; current && hops < 4; hops += 1, current = current.parent) {
    if (ts.isJsxAttribute(current)) return { attr: current.name.getText() };
    if (ts.isPropertyAssignment(current)) return { key: current.name.getText().replace(/^["']|["']$/g, "") };
    if (ts.isJsxExpression(current) || ts.isTemplateExpression(current) || ts.isConditionalExpression(current) || ts.isBinaryExpression(current) || ts.isParenthesizedExpression(current)) continue;
    break;
  }
  return {};
}

function isMachineContext(node) {
  const p = node.parent;
  if (!p) return false;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)) return true;
  if (ts.isLiteralTypeNode(p) || ts.isTypeReferenceNode(p)) return true;
  if (ts.isElementAccessExpression(p) && p.argumentExpression === node) return true;
  if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && ["require", "import", "useRoute", "matchMedia", "querySelector", "getComputedStyle"].includes(p.expression.text)) return true;
  if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && ["getItem", "setItem", "removeItem", "querySelector", "querySelectorAll", "addEventListener", "removeEventListener", "getPropertyValue", "setProperty", "matchMedia", "startsWith", "endsWith", "includes", "split", "replace", "join", "padStart"].includes(p.expression.name.text)) return true;
  if (ts.isBinaryExpression(p) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(p.operatorToken.kind)) return true;
  if (ts.isCaseClause(p)) return true;
  // An error thrown at a programmer, or a console line, is read by an engineer.
  for (let up = p, hops = 0; up && hops < 4; up = up.parent, hops += 1) {
    if (ts.isNewExpression(up) && /Error$/.test(up.expression.getText())) return true;
    if (ts.isThrowStatement(up)) return true;
    if (ts.isCallExpression(up) && /^console\./.test(up.expression.getText())) return true;
  }
  if (ts.isPropertyAssignment(p) && p.name === node) return true;
  const { attr, key } = parentAttrOrKey(node);
  if (attr && (MACHINE_ATTRS.has(attr) || attr.startsWith("on"))) return true;
  if (key && MACHINE_KEYS.has(key)) return true;
  return false;
}

function templateText(node) {
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return node.head.text + node.templateSpans.map((span) => `{…}${span.literal.text}`).join("");
}

/** Every piece of player text in one file, with its line. */
export function extractFile(root, rel) {
  const source = readFileSync(path.join(root, rel), "utf8");
  const sf = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found = [];
  const push = (node, text, kind) => {
    const clean = text.replace(/\s+/g, " ").trim();
    if (!looksLikeWords(clean)) return;
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
    found.push({ file: rel, line, kind, text: clean });
  };
  const visit = (node) => {
    if (ts.isJsxText(node)) {
      push(node, node.text, "jsx");
    } else if (ts.isStringLiteral(node)) {
      if (!isMachineContext(node)) push(node, node.text, "string");
    } else if (ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateExpression(node)) {
      if (!isMachineContext(node) && !(ts.isTaggedTemplateExpression(node.parent))) push(node, templateText(node), "template");
      if (ts.isTemplateExpression(node)) node.templateSpans.forEach((span) => ts.forEachChild(span.expression, visit) || visit(span.expression));
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

export function extractAll(root, roots = PLAYER_ROOTS) {
  return roots.flatMap((dir) => walkFiles(root, dir)).sort().flatMap((rel) => extractFile(root, rel));
}
