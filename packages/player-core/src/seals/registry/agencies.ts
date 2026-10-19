import type { SealSpec } from "../types.js";
import { seal, USA } from "./build.js";

/*
 * Independent regulators ride the octagon, so a commission reads as a
 * commission before its legend is read; the Federal Reserve keeps the eagle
 * of its own seal, with a star for each reserve bank.
 */
export const REGULATORS: readonly SealSpec[] = [
  seal("INST-FED", "roundel", ["forest", "gold", "gold"], "eagle-displayed", `FEDERAL RESERVE SYSTEM · BOARD OF GOVERNORS`, { accents: { stars: 12 } }),
  seal("INST-SEC", "octagon", ["navy", "gold", "gold"], "column", `SECURITIES AND EXCHANGE COMMISSION · ${USA}`),
  seal("INST-FTC", "octagon", ["navy", "silver", "silver"], "scales", `FEDERAL TRADE COMMISSION · ${USA}`),
  seal("INST-FCC", "octagon", ["federalBlue", "gold", "gold"], "lightning", `FEDERAL COMMUNICATIONS COMMISSION · ${USA}`, { accents: { rays: true } }),
  seal("INST-CFPB", "octagon", ["teal", "white", "white"], "key", `CONSUMER FINANCIAL PROTECTION BUREAU · ${USA}`),
  seal("INST-CFTC", "octagon", ["forest", "gold", "gold"], "wheat", `COMMODITY FUTURES TRADING COMMISSION · ${USA}`),
  seal("INST-FDIC", "octagon", ["navy", "gold", "gold"], "temple", `FEDERAL DEPOSIT INSURANCE CORPORATION · ${USA}`),
  seal("INST-NRC", "octagon", ["navy", "silver", "sky"], "atom", `NUCLEAR REGULATORY COMMISSION · ${USA}`),
  seal("INST-NLRB", "octagon", ["navy", "gold", "gold"], "gear", `NATIONAL LABOR RELATIONS BOARD · ${USA}`),
  seal("INST-EPA", "roundel", ["green", "white", "white"], "leaf", `ENVIRONMENTAL PROTECTION AGENCY · ${USA}`, { accents: { rays: true } }),
];

/* Operating components: each department's colors carry down to its bureaus, with a device of the bureau's own trade. */
export const COMPONENTS: readonly SealSpec[] = [
  seal("INST-CBP", "roundel", ["navy", "silver", "silver"], "eagle-displayed", `CUSTOMS AND BORDER PROTECTION · HOMELAND SECURITY`, { charge: { device: "key", color: "silver", field: "navy" } }),
  seal("INST-ICE", "roundel", ["navy", "silver", "silver"], "eagle-shield", `IMMIGRATION AND CUSTOMS ENFORCEMENT · HOMELAND SECURITY`),
  seal("INST-TSA", "roundel", ["federalBlue", "silver", "white"], "eagle-displayed", `TRANSPORTATION SECURITY ADMINISTRATION · HOMELAND SECURITY`, { charge: { device: "wheel", color: "white", field: "federalBlue" } }),
  seal("INST-USSS", "star", ["navy", "gold", "gold"], "eagle-shield"),
  seal("INST-FEMA", "roundel", ["navy", "gold", "white"], "eagle-displayed", `FEDERAL EMERGENCY MANAGEMENT AGENCY · HOMELAND SECURITY`, { charge: { device: "house", color: "navy", field: "white" } }),
  seal("INST-CISA", "roundel", ["navy", "sky", "sky"], "eagle-displayed", `CYBERSECURITY AND INFRASTRUCTURE SECURITY AGENCY · HOMELAND SECURITY`, { charge: { device: "map-grid", color: "sky", field: "navy" } }),
  seal("INST-CDC", "roundel", ["navy", "white", "white"], "globe", `CENTERS FOR DISEASE CONTROL AND PREVENTION · HEALTH AND HUMAN SERVICES`),
  seal("INST-FDA", "roundel", ["federalBlue", "white", "white"], "flask", `FOOD AND DRUG ADMINISTRATION · HEALTH AND HUMAN SERVICES`),
  seal("INST-CMS", "roundel", ["teal", "white", "white"], "rod-of-asclepius", `CENTERS FOR MEDICARE AND MEDICAID SERVICES · HEALTH AND HUMAN SERVICES`),
  seal("INST-NIH", "roundel", ["navy", "sky", "sky"], "helix", `NATIONAL INSTITUTES OF HEALTH · HEALTH AND HUMAN SERVICES`),
  seal("INST-BIS", "roundel", ["federalBlue", "gold", "gold"], "gear", `BUREAU OF INDUSTRY AND SECURITY · COMMERCE`, { charge: { device: "key", color: "gold", field: "federalBlue" } }),
  seal("INST-NOAA", "roundel", ["federalBlue", "white", "white"], "seabird", `NATIONAL OCEANIC AND ATMOSPHERIC ADMINISTRATION · COMMERCE`),
  seal("INST-OFAC", "roundel", ["forest", "gold", "gold"], "key", `OFFICE OF FOREIGN ASSETS CONTROL · TREASURY`, { accents: { stars: 13 } }),
  seal("INST-IRS", "roundel", ["forest", "white", "white"], "eagle-displayed", `INTERNAL REVENUE SERVICE · TREASURY`, { charge: { device: "scales", color: "forest", field: "white" } }),
  seal("INST-DEA", "roundel", ["forest", "gold", "gold"], "eagle-shield", `DRUG ENFORCEMENT ADMINISTRATION · JUSTICE`),
  seal("INST-ATF", "shield", ["navy", "gold", "gold"], "eagle-shield", `ATF · JUSTICE`, { monogram: "ATF" }),
  seal("INST-USMS", "star", ["black", "gold", "gold"], "eagle-displayed"),
];
