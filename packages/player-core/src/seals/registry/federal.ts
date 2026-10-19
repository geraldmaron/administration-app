import type { SealSpec } from "../types.js";
import { seal, USA } from "./build.js";

/** The seal ids for bodies the institution catalog does not carry as institutions. */
export const SEAL_PRESIDENT = "SEAL-PRESIDENT";
export const SEAL_VICE_PRESIDENT = "SEAL-VICE-PRESIDENT";
export const SEAL_WHITE_HOUSE = "SEAL-WHITE-HOUSE";
export const SEAL_HOUSE = "SEAL-HOUSE";
export const SEAL_SENATE = "SEAL-SENATE";
export const SEAL_SUPREME_COURT = "SEAL-SUPREME-COURT";
export const SEAL_COURT_OF_APPEALS = "SEAL-COURT-OF-APPEALS";

const NAVY_GOLD = ["navy", "gold", "gold"] as const;

/* The Presidency, the Congress and the courts: the eagle where the office bears one, the building where the body is its chamber. */
export const CONSTITUTIONAL: readonly SealSpec[] = [
  seal(SEAL_PRESIDENT, "roundel", NAVY_GOLD, "eagle-shield", undefined, { accents: { stars: 50, rays: true } }),
  seal(SEAL_VICE_PRESIDENT, "roundel", ["white", "navy", "navy"], "eagle-shield", `THE VICE PRESIDENT · ${USA}`, { accents: { stars: 1 } }),
  seal("INST-PRESIDENCY", "roundel", ["federalBlue", "gold", "gold"], "eagle-displayed", `EXECUTIVE OFFICE OF THE PRESIDENT · ${USA}`, { charge: { device: "shield-stars-stripes", color: "gold", field: "navy" }, accents: { rays: true } }),
  seal(SEAL_WHITE_HOUSE, "roundel", ["white", "navy", "navy"], "temple", `THE WHITE HOUSE · WASHINGTON`, { accents: { stars: 13 } }),
  seal("INST-OVP", "roundel", ["sky", "navy", "white"], "eagle-displayed", `OFFICE OF THE VICE PRESIDENT · ${USA}`, { accents: { stars: 1 } }),
  seal("INST-CONGRESS", "roundel", ["navy", "gold", "cream"], "capitol-dome", `CONGRESS OF THE ${USA}`, { accents: { stars: 13 } }),
  seal(SEAL_HOUSE, "roundel", ["federalBlue", "gold", "gold"], "eagle-displayed", `HOUSE OF REPRESENTATIVES · ${USA}`, { accents: { stars: 13 } }),
  seal(SEAL_SENATE, "roundel", ["maroon", "gold", "gold"], "shield-stars-stripes", `SENATE · ${USA}`, { accents: { wreath: true } }),
  seal("INST-JUDICIARY", "roundel", ["black", "gold", "gold"], "temple", `FEDERAL JUDICIARY · ${USA}`),
  seal(SEAL_SUPREME_COURT, "roundel", ["black", "gold", "gold"], "eagle-shield", `SUPREME COURT · ${USA}`, { accents: { stars: 1 } }),
  seal(SEAL_COURT_OF_APPEALS, "roundel", ["black", "gold", "gold"], "scales", `UNITED STATES COURTS OF APPEALS · FEDERAL CIRCUITS`),
  seal("INST-STATES", "roundel", ["federalBlue", "silver", "white"], "star-cluster", `THE STATES · E PLURIBUS UNUM`),
  seal("INST-CAREER-SERVICE", "roundel", ["navy", "silver", "silver"], "column", `FEDERAL CAREER SERVICE · ${USA}`),
];

/* The fifteen executive departments, roundels in the order of succession. */
export const DEPARTMENTS: readonly SealSpec[] = [
  seal("INST-STATE", "roundel", ["navy", "gold", "cream"], "eagle-shield", `DEPARTMENT OF STATE · ${USA}`),
  seal("INST-TREASURY", "roundel", ["forest", "gold", "gold"], "scales", `DEPARTMENT OF THE TREASURY · ${USA}`, { charge: { device: "key", color: "gold", field: "forest" }, accents: { stars: 13 } }),
  seal("INST-DOD", "roundel", ["navy", "gold", "gold"], "eagle-displayed", `DEPARTMENT OF DEFENSE · ${USA}`, { charge: { device: "shield-stars-stripes", color: "gold", field: "navy" }, accents: { wreath: true, stars: 13 } }),
  seal("INST-DOJ", "roundel", ["navy", "gold", "gold"], "eagle-displayed", `DEPARTMENT OF JUSTICE · ${USA}`, { charge: { device: "scales", color: "navy", field: "cream" } }),
  seal("INST-INTERIOR", "roundel", ["cream", "forest", "forest"], "bison", `DEPARTMENT OF THE INTERIOR · ${USA}`, { accents: { rays: true } }),
  seal("INST-USDA", "roundel", ["green", "cream", "cream"], "wheat", `DEPARTMENT OF AGRICULTURE · ${USA}`),
  seal("INST-COMMERCE", "roundel", ["federalBlue", "gold", "gold"], "lighthouse", `DEPARTMENT OF COMMERCE · ${USA}`),
  seal("INST-LABOR", "roundel", ["navy", "gold", "gold"], "anvil", `DEPARTMENT OF LABOR · ${USA}`, { accents: { stars: 13 } }),
  seal("INST-HHS", "roundel", ["navy", "silver", "silver"], "rod-of-asclepius", `DEPARTMENT OF HEALTH AND HUMAN SERVICES · ${USA}`, { accents: { wreath: true } }),
  seal("INST-HUD", "roundel", ["federalBlue", "white", "white"], "house", `HOUSING AND URBAN DEVELOPMENT · ${USA}`),
  seal("INST-DOT", "roundel", ["navy", "silver", "white"], "wheel", `DEPARTMENT OF TRANSPORTATION · ${USA}`),
  seal("INST-DOE", "roundel", ["forest", "gold", "gold"], "atom", `DEPARTMENT OF ENERGY · ${USA}`, { accents: { rays: true } }),
  seal("INST-ED", "roundel", ["navy", "gold", "gold"], "lamp", `DEPARTMENT OF EDUCATION · ${USA}`, { accents: { rays: true } }),
  seal("INST-VA", "roundel", ["navy", "gold", "gold"], "star", `DEPARTMENT OF VETERANS AFFAIRS · ${USA}`, { accents: { wreath: true } }),
  seal("INST-DHS", "roundel", ["federalBlue", "white", "white"], "eagle-displayed", `DEPARTMENT OF HOMELAND SECURITY · ${USA}`, { charge: { device: "shield-stars-stripes", color: "white", field: "navy" } }),
];

/* Offices of the Executive Office of the President. */
export const EXECUTIVE_OFFICES: readonly SealSpec[] = [
  seal("INST-NSC", "roundel", ["navy", "gold", "gold"], "eagle-displayed", `NATIONAL SECURITY COUNCIL · ${USA}`, { charge: { device: "compass-rose", color: "gold", field: "navy" } }),
  seal("INST-OMB", "roundel", ["navy", "silver", "white"], "open-book", `OFFICE OF MANAGEMENT AND BUDGET · EXECUTIVE OFFICE OF THE PRESIDENT`),
  seal("INST-USTR", "roundel", ["federalBlue", "gold", "gold"], "ship", `UNITED STATES TRADE REPRESENTATIVE · EXECUTIVE OFFICE OF THE PRESIDENT`),
];
