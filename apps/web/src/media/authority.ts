/** Existing institution artwork, shared by the operating picture and its evidence panel. */
export const executiveSeal = new URL("../../../../assets/player/seals/seal-executive.png", import.meta.url).href;
export const cabinetSeal = new URL("../../../../assets/player/seals/seal-cabinet.png", import.meta.url).href;

export type InstitutionArtwork = { readonly src: string; readonly name: string };
const ART: Readonly<Record<string, InstitutionArtwork>> = {
  "INST-USDA": { src: new URL("../../../../assets/player/institutions/usda.jpg", import.meta.url).href, name: "Department of Agriculture" },
  "INST-COMMERCE": { src: new URL("../../../../assets/player/institutions/commerce.jpg", import.meta.url).href, name: "Department of Commerce" },
  "INST-DOD": { src: new URL("../../../../assets/player/institutions/dod.jpg", import.meta.url).href, name: "Department of Defense" },
  "INST-ED": { src: new URL("../../../../assets/player/institutions/ed.jpg", import.meta.url).href, name: "Department of Education" },
  "INST-DOE": { src: new URL("../../../../assets/player/institutions/doe.jpg", import.meta.url).href, name: "Department of Energy" },
  "INST-HHS": { src: new URL("../../../../assets/player/institutions/hhs.jpg", import.meta.url).href, name: "Department of Health and Human Services" },
  "INST-DHS": { src: new URL("../../../../assets/player/institutions/dhs.jpg", import.meta.url).href, name: "Department of Homeland Security" },
  "INST-HUD": { src: new URL("../../../../assets/player/institutions/hud.jpg", import.meta.url).href, name: "Department of Housing and Urban Development" },
  "INST-DOJ": { src: new URL("../../../../assets/player/institutions/doj.jpg", import.meta.url).href, name: "Department of Justice" },
  "INST-LABOR": { src: new URL("../../../../assets/player/institutions/labor.jpg", import.meta.url).href, name: "Department of Labor" },
  "INST-STATE": { src: new URL("../../../../assets/player/institutions/state.jpg", import.meta.url).href, name: "Department of State" },
  "INST-INTERIOR": { src: new URL("../../../../assets/player/institutions/interior.jpg", import.meta.url).href, name: "Department of the Interior" },
  "INST-TREASURY": { src: new URL("../../../../assets/player/institutions/treasury.jpg", import.meta.url).href, name: "Department of the Treasury" },
  "INST-DOT": { src: new URL("../../../../assets/player/institutions/dot.jpg", import.meta.url).href, name: "Department of Transportation" },
  "INST-VA": { src: new URL("../../../../assets/player/institutions/va.jpg", import.meta.url).href, name: "Department of Veterans Affairs" },
};
/** Exact institution identity only; never give an agency an unrelated department seal. */
export function institutionArtwork(identity: string): InstitutionArtwork | undefined {
  return ART[identity] ?? Object.values(ART).find((art) => art.name === identity);
}
