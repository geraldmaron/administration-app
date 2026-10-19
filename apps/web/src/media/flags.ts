import { NATION_FLAG_ALPHA2 } from "@admin/ui-web/flags";

// Every nation in the dataset is a real country and every state a real state,
// so every flag is the real one: the vendored artwork under scripts/vendor/
// (flag-icons, MIT, for nations; the states' own public-domain flags), served
// by Vite as one cached file per flag rather than inlined into the bundle.

const NATION_FLAG_FILES = import.meta.glob<string>("../../../../scripts/vendor/nation-flags/*.svg", {
  eager: true,
  import: "default",
  query: "?url&no-inline",
});

const STATE_FLAG_FILES = import.meta.glob<string>("../../../../scripts/vendor/state-flags/*.svg", {
  eager: true,
  import: "default",
  query: "?url&no-inline",
});

function fileUrl(files: Readonly<Record<string, string>>, name: string): string | undefined {
  return Object.entries(files).find(([path]) => path.endsWith(`/${name}.svg`))?.[1];
}

/** The real flag for a nation, or undefined when the dataset names a country the table does not. */
export function nationFlagUrl(nationId: string): string | undefined {
  const alpha2 = NATION_FLAG_ALPHA2[nationId];
  return alpha2 ? fileUrl(NATION_FLAG_FILES, alpha2) : undefined;
}

/** The real flag for a US state or the District, by postal code. */
export function stateFlagUrl(stateId: string): string | undefined {
  return fileUrl(STATE_FLAG_FILES, stateId.toUpperCase());
}
