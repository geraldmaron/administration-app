import type { SealSpec } from "../types.js";
import { seal, USA } from "./build.js";

/*
 * The intelligence community and the armed services. The services keep the
 * colors their members wear (Army black and gold, Navy blue and gold, the
 * Air Force's ultramarine and silver, the Marine Corps' scarlet and gold, the
 * Coast Guard's white with its orange rim) and take the shield.
 */
export const INTELLIGENCE: readonly SealSpec[] = [
  seal("INST-ODNI", "roundel", ["navy", "gold", "gold"], "eagle-displayed", `DIRECTOR OF NATIONAL INTELLIGENCE · ${USA}`, { charge: { device: "star-cluster", color: "gold", field: "navy" }, accents: { rays: true } }),
  seal("INST-CIA", "roundel", ["navy", "silver", "silver"], "compass-rose", `CENTRAL INTELLIGENCE AGENCY · ${USA}`),
  seal("INST-FBI", "roundel", ["navy", "gold", "gold"], "scales", `FEDERAL BUREAU OF INVESTIGATION · DEPARTMENT OF JUSTICE`, { accents: { wreath: true, stars: 13 } }),
  seal("INST-NSA", "roundel", ["navy", "gold", "gold"], "eagle-displayed", `NATIONAL SECURITY AGENCY · ${USA}`, { charge: { device: "key", color: "gold", field: "navy" } }),
  seal("INST-DIA", "roundel", ["black", "gold", "gold"], "torch", `DEFENSE INTELLIGENCE AGENCY · ${USA}`, { accents: { rays: true } }),
  seal("INST-NGA", "roundel", ["federalBlue", "silver", "white"], "map-grid", `NATIONAL GEOSPATIAL-INTELLIGENCE AGENCY · ${USA}`),
  seal("INST-NRO", "roundel", ["black", "silver", "silver"], "satellite", `NATIONAL RECONNAISSANCE OFFICE · ${USA}`, { accents: { stars: 7 } }),
  seal("INST-INR", "roundel", ["navy", "silver", "white"], "lamp", `BUREAU OF INTELLIGENCE AND RESEARCH · DEPARTMENT OF STATE`),
  seal("INST-OIA", "roundel", ["forest", "gold", "gold"], "compass-rose", `OFFICE OF INTELLIGENCE AND ANALYSIS · TREASURY`),
  seal("INST-DHS-IA", "roundel", ["federalBlue", "white", "white"], "compass-rose", `OFFICE OF INTELLIGENCE AND ANALYSIS · HOMELAND SECURITY`),
  seal("INST-NCTC", "roundel", ["black", "gold", "gold"], "globe", `NATIONAL COUNTERTERRORISM CENTER · ${USA}`, { accents: { stars: 5 } }),
  seal("INST-NCSC", "roundel", ["maroon", "gold", "gold"], "key", `NATIONAL COUNTERINTELLIGENCE AND SECURITY CENTER · ${USA}`, { accents: { stars: 13 } }),
  seal("IC-AF", "shield", ["ultramarine", "silver", "silver"], "satellite", `AIR FORCE ISR`, { monogram: "A2" }),
  seal("IC-SPACE", "shield", ["black", "silver", "silver"], "rocket", `SPACE FORCE INTELLIGENCE`, { monogram: "S2" }),
  seal("IC-ARMY", "shield", ["black", "gold", "gold"], "compass-rose", `ARMY INTELLIGENCE`, { monogram: "G2" }),
  seal("IC-USMC", "shield", ["scarlet", "gold", "gold"], "map-grid", `MARINE CORPS ISR`, { monogram: "MCISR" }),
  seal("IC-NAVY", "shield", ["navy", "gold", "gold"], "lighthouse", `NAVAL INTELLIGENCE`, { monogram: "ONI" }),
  seal("IC-USCG", "shield", ["white", "orange", "navy"], "compass-rose", `COAST GUARD INTELLIGENCE`, { monogram: "CG2" }),
  seal("IC-DOE", "roundel", ["black", "gold", "gold"], "atom", `INTELLIGENCE AND COUNTERINTELLIGENCE · DEPARTMENT OF ENERGY`),
];

export const ARMED_FORCES: readonly SealSpec[] = [
  seal("INST-ARMY", "shield", ["black", "gold", "gold"], "star", `DEPARTMENT OF THE ARMY`, { accents: { wreath: true } }),
  seal("INST-NAVY", "shield", ["navy", "gold", "gold"], "anchor", `DEPARTMENT OF THE NAVY`, { accents: { stars: 3 } }),
  seal("INST-AIRFORCE", "shield", ["ultramarine", "silver", "silver"], "winged-star", `DEPARTMENT OF THE AIR FORCE`, { accents: { stars: 3 } }),
  seal("INST-JCS", "roundel", ["purple", "gold", "gold"], "eagle-shield", `JOINT CHIEFS OF STAFF · ${USA}`, { accents: { stars: 4 } }),
];

/* The community's own ids for elements the institution catalog already seals. */
export const INTELLIGENCE_ALIASES: Readonly<Record<string, string>> = {
  "IC-ODNI": "INST-ODNI",
  "IC-CIA": "INST-CIA",
  "IC-NSA": "INST-NSA",
  "IC-DIA": "INST-DIA",
  "IC-NGA": "INST-NGA",
  "IC-NRO": "INST-NRO",
  "IC-FBI": "INST-FBI",
  "IC-DEA": "INST-DEA",
  "IC-DHS": "INST-DHS-IA",
  "IC-INR": "INST-INR",
  "IC-TREASURY": "INST-OIA",
};
