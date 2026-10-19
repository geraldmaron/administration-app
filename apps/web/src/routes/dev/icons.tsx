import { createFileRoute, notFound } from "@tanstack/react-router";
import { ICONS, Icon, type IconCategory, type IconName } from "@admin/ui-web";
import { GLYPH_TABLES } from "../../shell/glyphs";

// The icon contact sheet: every registered glyph at the four sizes the design
// uses, on the light and the dark ground, then each domain table with its ids.
// A diagnostic for the people drawing and binding icons, not a screen.
const GALLERY_ENABLED = import.meta.env.DEV;

const SIZES = [16, 20, 24, 32] as const;
const WEIGHTS = ["regular", "duotone", "bold", "fill"] as const;

const names = Object.keys(ICONS) as IconName[];
const categories = [...new Set(names.map((name) => ICONS[name].category))].sort() as IconCategory[];

const sheet = { display: "grid", gap: "var(--space-xl)", padding: "var(--space-xl)", background: "var(--color-ground-base)", color: "var(--color-text-primary)", position: "relative" } as const;
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))", gap: "var(--space-md)" } as const;
const cell = { display: "grid", gap: "var(--space-sm)", padding: "var(--space-md)", border: "1px solid var(--color-border-subtle, currentColor)", borderRadius: "var(--radius-card)" } as const;
const row = { display: "flex", alignItems: "center", gap: "var(--space-md)" } as const;
const dark = { ...row, padding: "var(--space-sm)", borderRadius: "var(--radius-control)", background: "var(--color-ground-base)" } as const;

function GlyphCell({ name }: { readonly name: IconName }) {
  return (
    <figure style={{ ...cell, margin: 0 }}>
      <figcaption><code>{name}</code></figcaption>
      <div style={row}>{SIZES.map((size) => <Icon key={size} name={name} size={size} />)}</div>
      <div data-surface="dark" style={dark}>{SIZES.map((size) => <Icon key={size} name={name} size={size} />)}</div>
    </figure>
  );
}

function WeightRow({ name }: { readonly name: IconName }) {
  return (
    <div style={row}>
      {WEIGHTS.map((weight) => <Icon key={weight} name={name} size={32} weight={weight} label={`${name} ${weight}`} />)}
      <code>{name}</code>
    </div>
  );
}

function MappingTable({ title, table }: { readonly title: string; readonly table: Readonly<Record<string, IconName>> }) {
  const entries = Object.entries(table);
  return (
    <section aria-labelledby={`map-${title}`}>
      <h2 id={`map-${title}`}>{title} ({entries.length})</h2>
      <table>
        <thead><tr><th scope="col">Id</th><th scope="col">Glyph</th><th scope="col">Name</th></tr></thead>
        <tbody>
          {entries.map(([id, glyph]) => (
            <tr key={id}>
              <th scope="row"><code>{id}</code></th>
              <td><Icon name={glyph} size={24} /></td>
              <td><code>{glyph}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function DevIcons() {
  if (!GALLERY_ENABLED) return null;
  const custom = names.filter((name) => ICONS[name].category === "unit" || name === "commodityCrudeOil");
  return (
    <main style={sheet}>
      <h1>Icons ({names.length})</h1>
      <section aria-labelledby="weights">
        <h2 id="weights">Custom glyphs by weight</h2>
        {custom.map((name) => <WeightRow key={name} name={name} />)}
      </section>
      {categories.map((category) => (
        <section key={category} aria-labelledby={`cat-${category}`}>
          <h2 id={`cat-${category}`}>{category} ({names.filter((name) => ICONS[name].category === category).length})</h2>
          <div style={grid}>
            {names.filter((name) => ICONS[name].category === category).map((name) => <GlyphCell key={name} name={name} />)}
          </div>
        </section>
      ))}
      {Object.entries(GLYPH_TABLES).map(([title, table]) => <MappingTable key={title} title={title} table={table} />)}
    </main>
  );
}

export const Route = createFileRoute("/dev/icons")({
  beforeLoad: () => {
    if (!GALLERY_ENABLED) throw notFound();
  },
  component: GALLERY_ENABLED ? DevIcons : () => null,
});
