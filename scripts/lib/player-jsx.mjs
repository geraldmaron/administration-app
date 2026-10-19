// What the player-source ratchets (reading keys, heading levels, spacing
// tokens) share: the universal player's source files, the source with its
// comments blanked, and each JSX opening tag of a component read whole, so a
// gate can ask what props a use passes without a parser.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** Every .ts/.tsx file under the given roots, tests and fixtures left out. */
export function playerFiles(roots) {
  const walk = (dir) => {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (["node_modules", "dist", "__fixtures__", ".expo"].includes(entry.name)) return [];
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? walk(full) : [full];
    });
  };
  return roots.flatMap(walk).filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));
}

/** Source with comments blanked to spaces, so offsets still line up and a commented-out use counts for nothing. */
export function codeOf(file) {
  return readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/.*$/gm, (m, lead) => lead + " ".repeat(m.length - lead.length));
}

/** Each `<Name ...>` opening tag in the source, whole, braces and strings respected. */
export function openTags(code, name) {
  const tags = [];
  const re = new RegExp(`<${name}(?=[\\s/>])`, "g");
  let match;
  while ((match = re.exec(code))) {
    let depth = 0;
    let quote = null;
    let i = match.index + name.length + 1;
    for (; i < code.length; i++) {
      const c = code[i];
      if (quote) {
        if (c === quote && code[i - 1] !== "\\") quote = null;
        continue;
      }
      if (depth > 0 && (c === '"' || c === "'" || c === "`")) quote = c;
      else if (depth === 0 && c === '"') quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    tags.push(code.slice(match.index, i + 1));
  }
  return tags;
}

/** The names a file imports from the design system (`@admin/ui` and its subpaths), aliases resolved to the local name. */
export function designImports(code) {
  const names = new Map();
  for (const match of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']@admin\/ui(?:\/[\w-]+)?["']/g)) {
    for (const part of match[1].split(",")) {
      const spec = part.trim().replace(/^type\s+/, "");
      if (!spec) continue;
      const [imported, local] = spec.split(/\s+as\s+/);
      names.set(local ?? imported, imported);
    }
  }
  return names;
}
