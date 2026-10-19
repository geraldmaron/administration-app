import type { Nameplate, SealSpec } from "../types.js";
import { seal, type Tincture } from "./build.js";

/*
 * The outlets are invented, so their mastheads are designed freely: a
 * nameplate in the house's face and a small device of what it covers. Print
 * houses set serif names; broadcast and digital set sans.
 */
function masthead(id: string, tincture: Tincture, device: Parameters<typeof seal>[3], nameplate: Nameplate, motto: string): SealSpec {
  return seal(id, "masthead", tincture, device, undefined, { nameplate, accents: { motto } });
}

const PRINT: Nameplate = { face: "serif", caps: false, rule: "double" };
const PRINT_CAPS: Nameplate = { face: "serif", caps: true, rule: "double" };
const BROADCAST: Nameplate = { face: "sans", caps: true, rule: "thick" };
const DIGITAL: Nameplate = { face: "sans", caps: false, rule: "single" };

export const OUTLETS: readonly SealSpec[] = [
  masthead("outlet-washington-chronicle", ["navy", "gold", "gold"], "capitol-dome", PRINT, "The paper of record for the capital"),
  masthead("outlet-capital-register", ["maroon", "cream", "cream"], "column", PRINT_CAPS, "Inside the agencies, every morning"),
  masthead("outlet-national-wire", ["black", "silver", "white"], "lightning", BROADCAST, "First with the facts"),
  masthead("outlet-american-review", ["cream", "maroon", "maroon"], "quill", PRINT, "Opinion and argument, weekly"),
  masthead("outlet-continental-broadcasting", ["federalBlue", "white", "white"], "tower", BROADCAST, "Coast to coast"),
  masthead("outlet-business-record", ["forest", "cream", "cream"], "bar-chart", PRINT_CAPS, "Markets, money and the economy"),
  masthead("outlet-meridian-news", ["navy", "sky", "sky"], "globe", BROADCAST, "News around the clock"),
  masthead("outlet-frontier-channel", ["scarlet", "white", "white"], "mountain", BROADCAST, "America, unfiltered"),
  masthead("outlet-undercurrent", ["teal", "white", "white"], "wave", DIGITAL, "What's moving beneath the news"),
  masthead("outlet-rampart", ["black", "scarlet", "scarlet"], "battlement", { face: "sans", caps: true, rule: "single" }, "Hold the line"),
  masthead("outlet-main-street-radio", ["maroon", "gold", "gold"], "microphone", BROADCAST, "Talk from the heartland"),
  masthead("outlet-american-frequency", ["navy", "scarlet", "white"], "tower", BROADCAST, "On air across America"),
  masthead("outlet-long-table", ["bronze", "cream", "cream"], "lamp", DIGITAL, "Long conversations"),
  masthead("outlet-straight-shot", ["orange", "black", "black"], "star", DIGITAL, "No spin"),
  masthead("outlet-seaboard-courier", ["navy", "silver", "white"], "lighthouse", PRINT, "Serving the Northeast"),
  masthead("outlet-crossroads-herald", ["maroon", "gold", "gold"], "compass-rose", PRINT, "Serving the South"),
  masthead("outlet-western-correspondent", ["bronze", "cream", "cream"], "bison", PRINT, "Serving the West"),
  masthead("outlet-midland-dispatch", ["forest", "gold", "gold"], "wheat", PRINT, "Serving the Midwest"),
];
