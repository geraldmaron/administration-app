// The smallest SVG writer that keeps attribute order stable, so a face renders
// to identical bytes on every machine and can be snapshot-tested.

type Attr = string | number | undefined;

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export function el(tag: string, attrs: Readonly<Record<string, Attr>>, inner = ""): string {
  const parts = Object.entries(attrs)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([k, v]) => `${k}="${typeof v === "number" ? Math.round(v * 100) / 100 : esc(v)}"`);
  const open = parts.length > 0 ? `<${tag} ${parts.join(" ")}` : `<${tag}`;
  return inner === "" ? `${open}/>` : `${open}>${inner}</${tag}>`;
}

export const path = (d: string, attrs: Readonly<Record<string, Attr>> = {}): string => el("path", { d, ...attrs });

export const group = (inner: string, attrs: Readonly<Record<string, Attr>> = {}): string => (inner === "" ? "" : el("g", attrs, inner));

export const clip = (id: string, d: string): string => el("clipPath", { id }, path(d));
