// The typed walk behind scripts/report-metric-registry.mjs: which top-level
// declarations read and write a registered field, as the type checker resolves
// each access. A property access is attributed to a field by the declaration
// its symbol resolves to, so a read through destructuring, a computed key over
// a literal union, Object.values over a typed record, or a value handed to a
// helper counts, and a same-named property on an unrelated type does not.
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

/** The packages scanned. One program spans them, so a field has one declaration wherever it is read. */
export const PROGRAMS = ["packages/world", "packages/engine", "packages/content", "packages/player-core", "apps/web"];

// Every workspace import resolves to its source rather than its built d.ts.
// Through `dist`, each zod schema's shape is inlined again into every schema
// that embeds it (a nation's stats are declared once under `NationStats` and
// again inside `Nation`), so one field has many declarations and a read of
// `nation.stats.energy.mix` would not resolve to the field `NationStats`
// declares. Through source there is one.
const SOURCE_PATHS = {
  "@admin/world": ["packages/world/src/index.ts"],
  "@admin/world/maps": ["packages/world/src/maps/index.ts"],
  "@admin/engine": ["packages/engine/src/index.ts"],
  "@admin/content": ["packages/content/src/index.ts"],
  "@admin/player-core": ["packages/player-core/src/index.ts"],
  "@admin/design": ["packages/design/src/index.ts"],
  "@admin/contracts": ["packages/contracts/src/index.ts"],
  "@admin/ui-web": ["packages/ui-web/src/index.ts"],
  "@admin/ui-web/portrait": ["packages/ui-web/src/portrait/index.ts"],
  "@admin/ui-web/flags": ["packages/ui-web/src/assets/flags/nation-flag-codes.generated.ts"],
};

// Payload keys a handler does not write where the key says. `applyMetric`
// charges a readiness delta to the force itself and mirrors it back onto the
// panel figure, so a write of the panel figure is a write of the stat too.
export const HANDLER_REROUTES = {
  "MetricSet:militaryReadiness": ["NationStats:military.readiness"],
};

// Handlers that apply whatever payload they are handed. A handler's write is
// its senders' write: crediting `applyMetric` with every metric it merges
// would list one function where forty decide, so its writes are left to the
// sites that build the payload and the handler is named in the report instead.
export const PAYLOAD_HANDLERS = {
  "packages/engine/src/effects.ts#applyMetric": "applies each `metric` effect's deltas; its senders are credited with the keys they send",
};

// Payload types whose keys are named by a type alias rather than declared.
// `MetricDeltas` is a `Record` over `MetricSet`'s keys, and a `Record`'s
// properties have no declaration to resolve to, so a key written into one is
// mapped onto the record it names by its name. Only in the packages that build
// effects: in the player's own packages a `MetricDeltas` is a price restated
// from the engine's projection for the player to read, not a write.
const PAYLOAD_ALIASES = { MetricDeltas: { root: "MetricSet", within: ["packages/engine/src/", "packages/content/src/"] } };

const SKIP_DIRS = new Set(["node_modules", "dist", "__fixtures__"]);
const SKIP_FILE = /(\.test|\.spec)\.tsx?$|\.d\.ts$|routeTree\.gen\.ts$/;

function sourceFiles(root, dir) {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    if (SKIP_DIRS.has(entry.name)) return [];
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(root, rel);
    return /\.tsx?$/.test(entry.name) && !SKIP_FILE.test(entry.name) ? [rel] : [];
  });
}

// Built in memory with no emit and no build info, so the walk never writes a
// `tsconfig.tsbuildinfo` the next `tsc -b` would trust.
function createProgram(root) {
  const base = ts.getParsedCommandLineOfConfigFile(path.join(root, "tsconfig.base.json"), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
  const options = {
    ...base.options,
    jsx: ts.JsxEmit.ReactJSX,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    baseUrl: root,
    paths: SOURCE_PATHS,
    noEmit: true,
    incremental: false,
    composite: false,
    declaration: false,
  };
  const rootNames = scannedFiles(root).map((rel) => path.join(root, rel));
  return ts.createProgram({ rootNames, options });
}

// A proof fixture carries only the packages it plants code in.
const scannedFiles = (root) => PROGRAMS.filter((dir) => existsSync(path.join(root, dir, "src"))).flatMap((dir) => sourceFiles(root, `${dir}/src`));

/** The module a root type is exported from. */
function rootModule(program, root, pkg) {
  return program.getSourceFile(path.join(root, "packages", pkg, "src/index.ts"));
}

function exportedType(checker, moduleFile, name) {
  const moduleSymbol = checker.getSymbolAtLocation(moduleFile);
  const found = moduleSymbol && checker.getExportsOfModule(moduleSymbol).find((s) => s.name === name);
  if (!found) return undefined;
  const symbol = found.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(found) : found;
  return checker.getDeclaredTypeOfSymbol(symbol);
}

const declKey = (decl) => `${decl.getSourceFile().fileName}:${decl.pos}`;

function isRecordLike(checker, type) {
  if (!(type.flags & ts.TypeFlags.Object) || checker.isArrayType(type) || checker.isTupleType(type)) return false;
  return type.getCallSignatures().length === 0 && type.getProperties().length > 0;
}

/** Maps every property declaration under a root type to the `registry:path` ids it stands for. */
function indexRoot(checker, type, registry, prefix, index, depth) {
  if (depth > 6) return;
  for (const prop of type.getProperties()) {
    const id = `${registry}:${prefix}${prop.name}`;
    for (const decl of prop.declarations ?? []) index.set(declKey(decl), new Set([...(index.get(declKey(decl)) ?? []), id]));
    const propType = checker.getNonNullableType(checker.getTypeOfSymbol(prop));
    if (isRecordLike(checker, propType)) indexRoot(checker, propType, registry, `${prefix}${prop.name}.`, index, depth + 1);
  }
}

function buildIndex(root, program, checker, roots) {
  const index = new Map();
  for (const [registry, spec] of Object.entries(roots)) {
    const moduleFile = rootModule(program, root, spec.pkg);
    let type = moduleFile && exportedType(checker, moduleFile, spec.type);
    if (type && spec.property) type = checker.getNonNullableType(checker.getTypeOfSymbol(type.getProperty(spec.property)));
    if (type) indexRoot(checker, type, registry, "", index, 0);
  }
  return index;
}

/** The enclosing top-level declaration's name, the unit `rule-seam-census.json` attributes by. */
export function topLevelName(node) {
  let current = node;
  while (current.parent && !ts.isSourceFile(current.parent)) current = current.parent;
  if (ts.isVariableStatement(current)) {
    const decls = current.declarationList.declarations;
    const decl = decls.find((d) => d.pos <= node.pos && node.end <= d.end) ?? decls[0];
    return ts.isIdentifier(decl.name) ? decl.name.text : "<destructured>";
  }
  if (ts.isExportAssignment(current)) return "default";
  return current.name && ts.isIdentifier(current.name) ? current.name.text : "<module>";
}

// Writes resolve through the schema's own declarations only; reads also
// through the local shapes `aliasLocalShape` mapped.
function idsOfSymbol(ctx, symbol, { reads = true } = {}) {
  const sources = reads ? [ctx.index, ctx.aliases] : [ctx.index];
  return [...new Set((symbol?.declarations ?? []).flatMap((decl) => sources.flatMap((map) => [...(map.get(declKey(decl)) ?? [])])))];
}

/** The record a payload type names by alias (`PAYLOAD_ALIASES`) at this site, if it names one. */
function aliasedRoot(ctx, type) {
  const parts = type.isIntersection() ? [type, ...type.types] : [type];
  const alias = parts.map((part) => PAYLOAD_ALIASES[part.aliasSymbol?.name ?? ""]).find(Boolean);
  return alias && alias.within.some((dir) => ctx.rel.startsWith(dir)) ? alias.root : undefined;
}

// The fields one key of a type stands for: what its declarations resolve to,
// or, on a payload type named by alias, the aliased record's field of that name.
function keyIds(ctx, type, name, options) {
  const ids = idsOfSymbol(ctx, type.getProperty(name), options);
  if (ids.length > 0) return ids;
  const root = aliasedRoot(ctx, type);
  return root && ctx.fields.has(`${root}:${name}`) ? [`${root}:${name}`] : [];
}

// A cast, a non-null assertion or parentheses does not change what is read.
function unwrap(expr) {
  let current = expr;
  while (ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isNonNullExpression(current) || ts.isSatisfiesExpression(current)) current = current.expression;
  return current;
}

function idsOfExpression(ctx, expr) {
  const inner = unwrap(expr);
  if (ts.isPropertyAccessExpression(inner)) return narrow(ctx, idsOfSymbol(ctx, ctx.checker.getSymbolAtLocation(inner.name)), inner.expression).ids;
  if (ts.isElementAccessExpression(inner)) return elementIds(ctx, inner).ids;
  return [];
}

// A declaration several paths share (the six services' order-of-battle
// fields) is narrowed by the path of the object it was read from.
function narrow(ctx, ids, objectExpr) {
  if (ids.length <= 1) return { ids, note: "" };
  const parents = idsOfExpression(ctx, objectExpr);
  const kept = ids.filter((id) => parents.some((p) => id.startsWith(`${p}.`)));
  return kept.length > 0 ? { ids: kept, note: "" } : { ids, note: " (shared)" };
}

function literalKeys(type) {
  const parts = type.isUnion() ? type.types : [type];
  return parts.every((t) => t.isStringLiteral()) ? parts.map((t) => t.value) : undefined;
}

const leavesUnder = (ctx, containers) => [...ctx.fields].filter((id) => containers.some((c) => id.startsWith(`${c}.`)));

// A key typed as a plain string over a registered record reads one of its
// leaves, decided at run time; every leaf under it is listed as read.
function elementIds(ctx, expr) {
  const keys = literalKeys(ctx.checker.getTypeAtLocation(expr.argumentExpression));
  if (!keys) {
    const containers = idsOfExpression(ctx, expr.expression).filter((id) => ctx.containers.has(id));
    return { ids: leavesUnder(ctx, containers), note: " (computed key)" };
  }
  const objectType = ctx.checker.getNonNullableType(ctx.checker.getTypeAtLocation(expr.expression));
  const ids = [...new Set(keys.flatMap((key) => idsOfSymbol(ctx, objectType.getProperty(key))))];
  return narrow(ctx, ids, expr.expression);
}

function isWritten(node) {
  const parent = node.parent;
  if (ts.isBinaryExpression(parent) && parent.left === node) {
    return parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
  }
  return (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) &&
    (parent.operator === ts.SyntaxKind.PlusPlusToken || parent.operator === ts.SyntaxKind.MinusMinusToken);
}

function record(ctx, map, ids, node, note = "") {
  const declaration = `${ctx.rel}#${topLevelName(node)}`;
  if (map === ctx.found.writers && PAYLOAD_HANDLERS[declaration]) return;
  const site = `${declaration}${note}`;
  for (const id of ids.flatMap((i) => (map === ctx.found.writers ? [i, ...(HANDLER_REROUTES[i] ?? [])] : [i]))) {
    if (!ctx.fields.has(id)) continue;
    map.set(id, [...(map.get(id) ?? []), site]);
  }
}

// `deltas.treasury = -spent` on a payload named by alias writes the field the
// alias names; a read of the payload is a read of the payload, not the field.
function visitAccess(ctx, node) {
  const { ids, note } = ts.isPropertyAccessExpression(node)
    ? narrow(ctx, idsOfSymbol(ctx, ctx.checker.getSymbolAtLocation(node.name)), node.expression)
    : elementIds(ctx, node);
  const written = isWritten(node);
  const aliased = written && ids.length === 0 && ts.isPropertyAccessExpression(node)
    ? keyIds(ctx, ctx.checker.getNonNullableType(ctx.checker.getTypeAtLocation(node.expression)), node.name.text, { reads: false })
    : [];
  record(ctx, written ? ctx.found.writers : ctx.found.readers, [...ids, ...aliased], node, note);
}

function visitBinding(ctx, node) {
  const key = node.propertyName ?? node.name;
  if (!ts.isIdentifier(key) && !ts.isStringLiteral(key)) return;
  const parentType = ctx.checker.getNonNullableType(ctx.checker.getTypeAtLocation(node.parent));
  record(ctx, ctx.found.readers, idsOfSymbol(ctx, parentType.getProperty(key.text)), node);
}

function visitIteration(ctx, node) {
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee) || !ts.isIdentifier(callee.expression) || callee.expression.text !== "Object") return;
  if (!["values", "entries"].includes(callee.name.text) || node.arguments.length !== 1) return;
  const containers = idsOfExpression(ctx, node.arguments[0]).filter((id) => ctx.containers.has(id));
  record(ctx, ctx.found.readers, leavesUnder(ctx, containers), node, " (iterates)");
}

function contextualIds(ctx, literal, name) {
  const contextual = ctx.checker.getContextualType(literal);
  if (!contextual) return [];
  const parts = contextual.isUnion() ? contextual.types : [contextual];
  return [...new Set(parts.flatMap((part) => keyIds(ctx, ctx.checker.getNonNullableType(part), name, { reads: false })))];
}

const parentOf = (id) => (id.includes(".") ? id.slice(0, id.lastIndexOf(".")) : id.slice(0, id.indexOf(":")));

/** The patch type an expression fills, when it is a patch (every key optional) over registered fields. */
function patchOf(ctx, expr) {
  const contextual = ctx.checker.getContextualType(expr);
  const type = contextual && ctx.checker.getNonNullableType(contextual);
  const recordLike = type && (type.isIntersection() ? type.types.every((part) => isRecordLike(ctx.checker, part)) : isRecordLike(ctx.checker, type));
  if (!type || type.isUnion() || !recordLike) return undefined;
  const props = type.getProperties();
  if (!props.every((p) => p.flags & ts.SymbolFlags.Optional) || !props.some((p) => keyIds(ctx, type, p.name, { reads: false }).length > 0)) return undefined;
  return { type, props };
}

/** The patch type a non-literal value fills. */
const patchSlot = (ctx, initializer) => (ts.isObjectLiteralExpression(unwrap(initializer)) ? undefined : patchOf(ctx, initializer));

// Every member of a union, so a patch typed as one of several literals (a
// table of writes indexed by a key union) names the keys of all of them.
const members = (types) => types.flatMap((type) => (type.isUnion() ? type.types : [type]));
const patchKeys = (types) => [...new Set(members(types).flatMap((t) => t.getProperties().map((p) => p.name)))];

function memberPropTypes(checker, types, name) {
  return members(types).flatMap((t) => {
    const prop = t.getProperty(name);
    return prop ? [checker.getNonNullableType(checker.getTypeOfSymbol(prop))] : [];
  });
}

// The fields a typed patch writes, followed down through nested records so
// `{ military: { branchStrength: { air } } }` resolves to the leaf it moves.
function typedPatchIds(ctx, slotType, valueTypes, depth) {
  if (depth > 6) return [];
  return patchKeys(valueTypes).flatMap((name) => {
    const slotProp = slotType.getProperty(name);
    if (!slotProp) return [];
    const ids = keyIds(ctx, slotType, name, { reads: false });
    const nested = ids.some((id) => ctx.containers.has(id))
      ? typedPatchIds(ctx, ctx.checker.getNonNullableType(ctx.checker.getTypeOfSymbol(slotProp)), memberPropTypes(ctx.checker, valueTypes, name), depth + 1)
      : [];
    return [...ids.filter((id) => ctx.fields.has(id)), ...nested];
  });
}

/** Whether a property sits in an effect literal: an object whose `kind` is a string literal. */
const inEffect = (node) => node.parent.properties.some((p) =>
  ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === "kind" && ts.isStringLiteralLike(unwrap(p.initializer)));

// A patch handed over whole (`deltas: cost`, `setStats: patch`). When its own
// type names fewer keys than the slot admits (`NextEconomy` into a stat patch)
// those keys are what it writes. When it admits every key, the site cannot say
// which it writes, and, when the slot is an effect's payload, it is named as
// leaky; a whole patch carried in a projection's `cost` is a price on its way
// to an effect, which is where it is counted.
function visitPatch(ctx, node, initializer) {
  const slot = patchSlot(ctx, initializer);
  if (!slot) return;
  const valueType = ctx.checker.getNonNullableType(ctx.checker.getTypeAtLocation(initializer));
  const keys = patchKeys([valueType]).filter((name) => slot.type.getProperty(name));
  const typeName = ctx.checker.typeToString(valueType, undefined, ts.TypeFormatFlags.NoTruncation);
  if (keys.length > 0 && keys.length < slot.props.length) {
    const shortName = typeName.length > 40 ? "a narrower patch" : typeName;
    record(ctx, ctx.found.writers, typedPatchIds(ctx, slot.type, [valueType], 0), node, ` (typed ${shortName})`);
    return;
  }
  if (!inEffect(node)) return;
  const containers = [...new Set(slot.props.flatMap((p) => keyIds(ctx, slot.type, p.name, { reads: false })).map(parentOf))].sort().join(", ");
  const shown = typeName.length > 60 ? `${typeName.slice(0, 57)}...` : typeName;
  ctx.found.leaky.push(`${ctx.rel}#${topLevelName(node)}: opaque patch of ${containers} (typed ${shown})`);
}

// `{ ...COST, standing: -0.01 }`: a spread into a patch writes the keys its
// type names when that is fewer than the patch admits. A spread of the whole
// record (`{ ...stats.economy, growth }`) copies today's values forward and
// decides nothing, so it is neither a writer nor a leak.
function visitSpread(ctx, node) {
  const slot = patchOf(ctx, node.parent);
  if (!slot) return;
  const valueType = ctx.checker.getNonNullableType(ctx.checker.getTypeAtLocation(node.expression));
  const keys = patchKeys([valueType]).filter((name) => slot.type.getProperty(name));
  if (keys.length === 0 || keys.length >= slot.props.length) return;
  record(ctx, ctx.found.writers, typedPatchIds(ctx, slot.type, [valueType], 0), node, " (spread)");
}

/** Dotted paths in scope of a node, typed as a union of string literals: `path: PolicyStatPath`. */
function pathUnions(ctx, node) {
  let fn = node.parent;
  while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
  if (!fn) return [];
  const found = [];
  const consider = (decl) => {
    if (!ts.isIdentifier(decl.name)) return;
    const keys = literalKeys(ctx.checker.getTypeAtLocation(decl.name));
    if (!keys || !keys.every((key) => key.includes("."))) return;
    const typeName = decl.type ? decl.type.getText() : ctx.checker.typeToString(ctx.checker.getTypeAtLocation(decl.name));
    found.push({ name: typeName.length > 40 ? decl.name.text : typeName, paths: keys });
  };
  fn.parameters.forEach(consider);
  const walk = (child) => {
    if (ts.isVariableDeclaration(child) || ts.isBindingElement(child)) consider(child);
    if (!ts.isFunctionLike(child)) ts.forEachChild(child, walk);
  };
  if (fn.body) ts.forEachChild(fn.body, walk);
  return found;
}

// `{ [group]: { [field]: next } }`: a patch whose keys are computed at run
// time. The key is split from a dotted path typed as a literal union, so the
// paths in scope are resolved against the patch and each field they reach is
// credited. A computed patch with no such path in scope cannot say what it
// writes and is named as a blind site.
function visitComputedPatch(ctx, literal) {
  if (!literal.properties.some((p) => p.name && ts.isComputedPropertyName(p.name))) return;
  if (ts.isPropertyAssignment(literal.parent) && ts.isComputedPropertyName(literal.parent.name)) return;
  const slot = patchOf(ctx, literal);
  if (!slot) return;
  const unions = pathUnions(ctx, literal).map(({ name, paths }) => ({
    name,
    ids: paths.flatMap((dotted) => {
      const [head, ...rest] = dotted.split(".");
      return keyIds(ctx, slot.type, head, { reads: false }).map((id) => fieldAt(ctx, id, rest));
    }).filter(Boolean),
  })).filter((union) => union.ids.length > 0);
  if (unions.length > 0) {
    record(ctx, ctx.found.writers, [...new Set(unions.flatMap((u) => u.ids))], literal, ` (computed key over ${unions.map((u) => u.name).join(", ")})`);
    return;
  }
  const containers = [...new Set(slot.props.flatMap((p) => keyIds(ctx, slot.type, p.name, { reads: false })).map(parentOf))].sort().join(", ");
  ctx.found.computed.push(`${ctx.rel}#${topLevelName(literal)}: computed key into ${containers}`);
}

function visitProperty(ctx, node) {
  const literal = node.parent;
  if (!ts.isObjectLiteralExpression(literal) || (!ts.isIdentifier(node.name) && !ts.isStringLiteral(node.name))) return;
  // The schema's own `z.object({ ... })` keys are the declarations, not writes.
  if (ctx.index.has(declKey(node))) return;
  record(ctx, ctx.found.writers, contextualIds(ctx, literal, node.name.text), node);
  visitPatch(ctx, node, ts.isPropertyAssignment(node) ? node.initializer : node.name);
}

// A helper handed a field, or a record of fields, as an argument reads it
// through a parameter of its own: `populationIdentity(..., demography.birthRate)`
// takes a number, `ideologyCloseness(person.ideology, ...)` a locally declared
// vector. Those reads resolve to the parameter, not the field, so a call is
// followed one level:
//
//   - an argument that is a registered path (`person.ideology`): the caller is
//     listed as reading the leaves the helper reads off it `(through name)`,
//     and the helper, when its parameter type is its own, is noted as reading
//     what it was handed;
//   - an argument whose type is a registered record (`actor: NationStats`):
//     the caller is noted as reading the leaves the helper reads off it.
//
// A note (`throughCall`) confirms a claim naming that site and is not listed
// as a reader: a `round3` handed a field, or every caller of a helper that
// takes a nation's stats, is not what a reader of the field means.
function calleeOf(ctx, call) {
  const expr = unwrap(call.expression);
  let symbol = ctx.checker.getSymbolAtLocation(ts.isPropertyAccessExpression(expr) ? expr.name : expr);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = ctx.checker.getAliasedSymbol(symbol);
  const decl = symbol?.valueDeclaration;
  const fn = decl && ts.isVariableDeclaration(decl) && decl.initializer ? unwrap(decl.initializer) : decl;
  if (!fn || !(ts.isFunctionDeclaration(fn) || ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) || ts.isMethodDeclaration(fn)) || !fn.body) return undefined;
  const rel = ctx.scanned.get(fn.getSourceFile().fileName);
  return rel ? { fn, site: `${rel}#${topLevelName(fn)}` } : undefined;
}

// The property paths read off one reference to a parameter: `p.a.b`, `p["a"]`,
// or the names a `const { a, b } = p` takes. An empty path is the value itself.
function pathsFrom(node) {
  const path = [];
  let current = node;
  for (;;) {
    const parent = current.parent;
    if (ts.isNonNullExpression(parent) || ts.isParenthesizedExpression(parent)) current = parent;
    else if (ts.isPropertyAccessExpression(parent) && parent.expression === current) (path.push(parent.name.text), (current = parent));
    else if (ts.isElementAccessExpression(parent) && parent.expression === current && ts.isStringLiteralLike(parent.argumentExpression)) {
      path.push(parent.argumentExpression.text);
      current = parent;
    } else break;
  }
  const parent = current.parent;
  if (ts.isVariableDeclaration(parent) && parent.initializer === current && ts.isObjectBindingPattern(parent.name)) return bindingPaths(parent.name, path);
  return [path];
}

function bindingPaths(pattern, prefix) {
  return pattern.elements.flatMap((element) => {
    const key = element.propertyName ?? element.name;
    return ts.isIdentifier(key) || ts.isStringLiteral(key) ? [[...prefix, key.text]] : [];
  });
}

function parameterPaths(ctx, fn, index) {
  const cacheKey = `${declKey(fn)}:${index}`;
  if (ctx.paramPaths.has(cacheKey)) return ctx.paramPaths.get(cacheKey);
  const param = fn.parameters[index];
  let paths = [];
  if (param && !param.dotDotDotToken && ts.isObjectBindingPattern(param.name)) paths = bindingPaths(param.name, []);
  else if (param && !param.dotDotDotToken && ts.isIdentifier(param.name)) {
    const symbol = ctx.checker.getSymbolAtLocation(param.name);
    const walk = (node) => {
      if (ts.isIdentifier(node) && node !== param.name && ctx.checker.getSymbolAtLocation(node) === symbol) paths.push(...pathsFrom(node));
      ts.forEachChild(node, walk);
    };
    walk(fn.body);
  }
  ctx.paramPaths.set(cacheKey, paths);
  return paths;
}

/** The registered field a path read off a registered record reaches, if it reaches one. */
function fieldAt(ctx, id, path) {
  let current = id;
  for (const segment of path) {
    const next = `${current}.${segment}`;
    if (ctx.fields.has(next)) return next;
    if (!ctx.containers.has(next)) return undefined;
    current = next;
  }
  return ctx.fields.has(current) ? current : undefined;
}

function ownParameterType(ctx, fn, index) {
  const param = fn.parameters[index];
  if (!param) return false;
  const type = ctx.checker.getNonNullableType(ctx.checker.getTypeAtLocation(param));
  return !type.getProperties().some((prop) => idsOfSymbol(ctx, prop).length > 0);
}

// The fields a path read off an argument reaches. An argument that is itself a
// registered path (`person.ideology`) resolves by id; one whose type is a
// registered record (`actor: NationStats`) resolves by the record's own
// properties.
function argumentLeaves(ctx, arg, ids, path) {
  if (ids.length > 0) return ids.map((id) => fieldAt(ctx, id, path));
  if (path.length === 0) return [];
  const type = ctx.checker.getNonNullableType(ctx.checker.getTypeAtLocation(arg));
  return idsOfSymbol(ctx, type.getProperty(path[0])).map((id) => fieldAt(ctx, id, path.slice(1)));
}

const noteCall = (ctx, leaves, site) => {
  for (const leaf of leaves) ctx.found.throughCall.set(leaf, [...(ctx.found.throughCall.get(leaf) ?? []), site]);
};

function visitCall(ctx, call) {
  const callee = calleeOf(ctx, call);
  if (!callee) return;
  call.arguments.forEach((arg, index) => {
    const ids = idsOfExpression(ctx, arg);
    const paths = parameterPaths(ctx, callee.fn, index);
    const leaves = [...new Set(paths.flatMap((path) => argumentLeaves(ctx, arg, ids, path)).filter(Boolean))];
    if (leaves.length === 0) return;
    if (ids.length === 0) return noteCall(ctx, leaves, `${ctx.rel}#${topLevelName(call)}`);
    if (ownParameterType(ctx, callee.fn, index)) noteCall(ctx, leaves, callee.site);
    record(ctx, ctx.found.readers, leaves.filter((leaf) => !ids.includes(leaf)), call, ` (through ${callee.site.split("#")[1]})`);
  });
}

function visit(ctx, node) {
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) visitAccess(ctx, node);
  else if (ts.isBindingElement(node) && ts.isObjectBindingPattern(node.parent)) visitBinding(ctx, node);
  else if (ts.isCallExpression(node)) (visitIteration(ctx, node), visitCall(ctx, node));
  else if (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) visitProperty(ctx, node);
  else if (ts.isSpreadAssignment(node)) visitSpread(ctx, node);
  else if (ts.isObjectLiteralExpression(node)) visitComputedPatch(ctx, node);
  ts.forEachChild(node, (child) => visit(ctx, child));
}

// `const metrics: WarfightingMetrics = bands.militaryMetrics ?? fallback`
// copies a registered record into a shape declared locally, and every read
// after it resolves to the local declaration. A typed declaration initialized
// from a registered record maps its own properties onto the record's by name,
// for reads only: the fallback literal beside it is not a write of the field.
function aliasProps(ctx, type, containers, depth) {
  if (depth > 4) return;
  for (const prop of type.getProperties()) {
    const ids = containers.map((c) => `${c}.${prop.name}`).filter((id) => ctx.fields.has(id) || ctx.containers.has(id));
    if (ids.length === 0) continue;
    for (const decl of prop.declarations ?? []) ctx.aliases.set(declKey(decl), new Set([...(ctx.aliases.get(declKey(decl)) ?? []), ...ids]));
    const propType = ctx.checker.getNonNullableType(ctx.checker.getTypeOfSymbol(prop));
    if (isRecordLike(ctx.checker, propType)) aliasProps(ctx, propType, ids.filter((id) => ctx.containers.has(id)), depth + 1);
  }
}

function aliasLocalShape(ctx, node) {
  if (!node.type || !node.initializer) return;
  let init = unwrap(node.initializer);
  if (ts.isBinaryExpression(init) && init.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) init = unwrap(init.left);
  const containers = idsOfExpression(ctx, init).filter((id) => ctx.containers.has(id));
  if (containers.length > 0) aliasProps(ctx, ctx.checker.getNonNullableType(ctx.checker.getTypeFromTypeNode(node.type)), containers, 0);
}

function aliasPass(ctx, node) {
  if (ts.isVariableDeclaration(node)) aliasLocalShape(ctx, node);
  ts.forEachChild(node, (child) => aliasPass(ctx, child));
}

/**
 * Walks every scanned package and returns what it finds: readers, writers,
 * the sites that read a field one call deep, leaky sites, and every path declared under the roots.
 */
export function scanSources(root, roots, fields) {
  const program = createProgram(root);
  const checker = program.getTypeChecker();
  const index = buildIndex(root, program, checker, roots);
  const containers = new Set([...index.values()].flatMap((ids) => [...ids]).filter((id) => [...fields].some((f) => f.startsWith(`${id}.`))));
  const found = { readers: new Map(), writers: new Map(), throughCall: new Map(), leaky: [], computed: [] };
  const aliases = new Map();
  const files = scannedFiles(root).map((rel) => ({ rel, file: program.getSourceFile(path.join(root, rel)) }));
  const scanned = new Map(files.filter(({ file }) => file).map(({ rel, file }) => [file.fileName, rel]));
  const shared = { checker, index, aliases, containers, fields, found, scanned, paramPaths: new Map() };
  for (const { rel, file } of files) if (file) aliasPass({ ...shared, rel }, file);
  for (const { rel, file } of files) if (file) visit({ ...shared, rel }, file);
  const declared = new Set([...index.values()].flatMap((ids) => [...ids]));
  const unindexed = [...fields].filter((id) => !declared.has(id)).sort();
  return { ...found, unindexed, declared: [...declared].sort() };
}
