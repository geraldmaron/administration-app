import type { StateId } from "../schemas/state.js";

// One row per US House district (435 seats, post-2022-reapportionment) plus
// DC's non-voting delegate seat (436 rows total: DC-DL is not one of the 435
// and carries no `number`-indexed seat). Mirrors state-figures.ts's authoring
// style and provenance stance: every figure below is approximate,
// order-of-magnitude-correct public data, not a cited source for any use
// outside this game.
//
// Population is owned at the state level (state-figures.ts); districts are
// shares of it, not independently authored. Each state's district populations
// are built off a Census-equalized
// per-seat share (state population / seat count) with small (~0.3-1%) row-to-row
// variance, mirroring how real post-redistricting districts are drawn to within
// about a percent of the state's ideal district size, then the rounding residual
// is folded onto one district per state so the state's districts sum EXACTLY to
// its state-figures.ts population. DC carries 0 apportioned House seats in this
// dataset (states.ts's houseSeats convention); its full state-figures.ts
// population is instead carried by the single DC-DL delegate row, so the 436
// rows together still sum exactly to the 51-row STATE_FIGURES total
// (334_892_847).
//
// lean (Dem <- -> Rep, Cook-PVI-ish, 2024-cycle-plausible) is authored per
// district, finer than the state average that states.ts carries: districts are
// spread around the state's lean by an urban/rural texture (a state's most
// urban district pulls furthest Democratic, its most rural pulls furthest
// Republican) through a tanh squash rather than a hard clamp, so every district
// in a state gets a distinct lean and none pile up identically at an extreme.
// Spread magnitude scales with seat count, so a single-seat state shows no
// spread (its one district IS the state) and a 40+-seat state shows the full
// range a real delegation does. incumbentParty is the party the Clerk of the
// House's member data lists for that seat (119th Congress, published
// 2026-10-01, opened 2026-10-10; sources/district-holders/sources.md), and a
// state's lean values are dealt to its districts in that order: one party's
// holders at one end, independents and vacancies between, the other party's at
// the far end, so the engine's lean ranking reproduces the roster. The values
// stay a spread, not a measurement, and a seat held against its state's grain
// can sit on the other side of zero from its holder.
// scripts/vendor-district-holders.mjs regenerates both fields. An independent
// seat carries its caucus's party, and a vacancy the party of the lean it was
// dealt, since the source names no holder for either.

export type DistrictFigure = {
  readonly id: string;
  readonly state: StateId;
  readonly number: number;
  readonly population: number;
  readonly lean: number;
  readonly incumbentParty: "democrat" | "republican";
};

export const DISTRICT_FIGURES: readonly DistrictFigure[] = [
  // Alabama
  { id: "AL-01", state: "AL", number: 1, population: 731_970, lean: 0.078, incumbentParty: "republican" },
  { id: "AL-02", state: "AL", number: 2, population: 727_081, lean: -0.297, incumbentParty: "democrat" },
  { id: "AL-03", state: "AL", number: 3, population: 732_992, lean: 0.264, incumbentParty: "republican" },
  { id: "AL-04", state: "AL", number: 4, population: 726_059, lean: 0.432, incumbentParty: "republican" },
  { id: "AL-05", state: "AL", number: 5, population: 734_014, lean: 0.574, incumbentParty: "republican" },
  { id: "AL-06", state: "AL", number: 6, population: 725_037, lean: 0.689, incumbentParty: "republican" },
  { id: "AL-07", state: "AL", number: 7, population: 731_315, lean: -0.114, incumbentParty: "democrat" },
  // Alaska
  { id: "AK-AL", state: "AK", number: 0, population: 733_406, lean: 0.16, incumbentParty: "republican" },
  // Arizona
  { id: "AZ-01", state: "AZ", number: 1, population: 828_181, lean: -0.134, incumbentParty: "republican" },
  { id: "AZ-02", state: "AZ", number: 2, population: 822_649, lean: 0.036, incumbentParty: "republican" },
  { id: "AZ-03", state: "AZ", number: 3, population: 829_337, lean: -0.57, incumbentParty: "democrat" },
  { id: "AZ-04", state: "AZ", number: 4, population: 821_493, lean: -0.444, incumbentParty: "democrat" },
  { id: "AZ-05", state: "AZ", number: 5, population: 830_493, lean: 0.204, incumbentParty: "republican" },
  { id: "AZ-06", state: "AZ", number: 6, population: 820_337, lean: 0.361, incumbentParty: "republican" },
  { id: "AZ-07", state: "AZ", number: 7, population: 828_181, lean: -0.297, incumbentParty: "democrat" },
  { id: "AZ-08", state: "AZ", number: 8, population: 822_649, lean: 0.5, incumbentParty: "republican" },
  { id: "AZ-09", state: "AZ", number: 9, population: 828_024, lean: 0.617, incumbentParty: "republican" },
  // Arkansas
  { id: "AR-01", state: "AR", number: 1, population: 769_234, lean: -0.125, incumbentParty: "republican" },
  { id: "AR-02", state: "AR", number: 2, population: 764_095, lean: 0.149, incumbentParty: "republican" },
  { id: "AR-03", state: "AR", number: 3, population: 770_308, lean: 0.402, incumbentParty: "republican" },
  { id: "AR-04", state: "AR", number: 4, population: 764_095, lean: 0.606, incumbentParty: "republican" },
  // California
  { id: "CA-01", state: "CA", number: 1, population: 751_153, lean: 0.31, incumbentParty: "republican" },
  { id: "CA-02", state: "CA", number: 2, population: 746_135, lean: -0.761, incumbentParty: "democrat" },
  { id: "CA-03", state: "CA", number: 3, population: 752_201, lean: 0.283, incumbentParty: "republican" },
  { id: "CA-04", state: "CA", number: 4, population: 745_087, lean: -0.748, incumbentParty: "democrat" },
  { id: "CA-05", state: "CA", number: 5, population: 753_250, lean: 0.337, incumbentParty: "republican" },
  { id: "CA-06", state: "CA", number: 6, population: 744_038, lean: -0.735, incumbentParty: "democrat" },
  { id: "CA-07", state: "CA", number: 7, population: 751_153, lean: -0.721, incumbentParty: "democrat" },
  { id: "CA-08", state: "CA", number: 8, population: 746_135, lean: -0.706, incumbentParty: "democrat" },
  { id: "CA-09", state: "CA", number: 9, population: 752_201, lean: -0.691, incumbentParty: "democrat" },
  { id: "CA-10", state: "CA", number: 10, population: 745_087, lean: -0.675, incumbentParty: "democrat" },
  { id: "CA-11", state: "CA", number: 11, population: 753_250, lean: -0.658, incumbentParty: "democrat" },
  { id: "CA-12", state: "CA", number: 12, population: 744_038, lean: -0.64, incumbentParty: "democrat" },
  { id: "CA-13", state: "CA", number: 13, population: 751_153, lean: -0.622, incumbentParty: "democrat" },
  { id: "CA-14", state: "CA", number: 14, population: 746_135, lean: -0.604, incumbentParty: "democrat" },
  { id: "CA-15", state: "CA", number: 15, population: 752_201, lean: -0.584, incumbentParty: "democrat" },
  { id: "CA-16", state: "CA", number: 16, population: 745_087, lean: -0.564, incumbentParty: "democrat" },
  { id: "CA-17", state: "CA", number: 17, population: 753_250, lean: -0.543, incumbentParty: "democrat" },
  { id: "CA-18", state: "CA", number: 18, population: 744_038, lean: -0.522, incumbentParty: "democrat" },
  { id: "CA-19", state: "CA", number: 19, population: 751_153, lean: -0.5, incumbentParty: "democrat" },
  { id: "CA-20", state: "CA", number: 20, population: 746_135, lean: 0.364, incumbentParty: "republican" },
  { id: "CA-21", state: "CA", number: 21, population: 752_201, lean: -0.477, incumbentParty: "democrat" },
  { id: "CA-22", state: "CA", number: 22, population: 745_087, lean: 0.389, incumbentParty: "republican" },
  { id: "CA-23", state: "CA", number: 23, population: 753_250, lean: 0.414, incumbentParty: "republican" },
  { id: "CA-24", state: "CA", number: 24, population: 744_038, lean: -0.453, incumbentParty: "democrat" },
  { id: "CA-25", state: "CA", number: 25, population: 751_153, lean: -0.429, incumbentParty: "democrat" },
  { id: "CA-26", state: "CA", number: 26, population: 746_135, lean: -0.404, incumbentParty: "democrat" },
  { id: "CA-27", state: "CA", number: 27, population: 752_201, lean: -0.379, incumbentParty: "democrat" },
  { id: "CA-28", state: "CA", number: 28, population: 745_087, lean: -0.353, incumbentParty: "democrat" },
  { id: "CA-29", state: "CA", number: 29, population: 753_250, lean: -0.327, incumbentParty: "democrat" },
  { id: "CA-30", state: "CA", number: 30, population: 744_038, lean: -0.3, incumbentParty: "democrat" },
  { id: "CA-31", state: "CA", number: 31, population: 751_153, lean: -0.272, incumbentParty: "democrat" },
  { id: "CA-32", state: "CA", number: 32, population: 746_135, lean: -0.244, incumbentParty: "democrat" },
  { id: "CA-33", state: "CA", number: 33, population: 752_201, lean: -0.216, incumbentParty: "democrat" },
  { id: "CA-34", state: "CA", number: 34, population: 745_087, lean: -0.187, incumbentParty: "democrat" },
  { id: "CA-35", state: "CA", number: 35, population: 753_250, lean: -0.158, incumbentParty: "democrat" },
  { id: "CA-36", state: "CA", number: 36, population: 744_038, lean: -0.128, incumbentParty: "democrat" },
  { id: "CA-37", state: "CA", number: 37, population: 751_153, lean: -0.099, incumbentParty: "democrat" },
  { id: "CA-38", state: "CA", number: 38, population: 746_135, lean: -0.069, incumbentParty: "democrat" },
  { id: "CA-39", state: "CA", number: 39, population: 752_201, lean: -0.039, incumbentParty: "democrat" },
  { id: "CA-40", state: "CA", number: 40, population: 745_087, lean: 0.439, incumbentParty: "republican" },
  { id: "CA-41", state: "CA", number: 41, population: 753_250, lean: 0.463, incumbentParty: "republican" },
  { id: "CA-42", state: "CA", number: 42, population: 744_038, lean: -0.009, incumbentParty: "democrat" },
  { id: "CA-43", state: "CA", number: 43, population: 751_153, lean: 0.021, incumbentParty: "democrat" },
  { id: "CA-44", state: "CA", number: 44, population: 746_135, lean: 0.051, incumbentParty: "democrat" },
  { id: "CA-45", state: "CA", number: 45, population: 752_201, lean: 0.081, incumbentParty: "democrat" },
  { id: "CA-46", state: "CA", number: 46, population: 745_087, lean: 0.111, incumbentParty: "democrat" },
  { id: "CA-47", state: "CA", number: 47, population: 753_250, lean: 0.14, incumbentParty: "democrat" },
  { id: "CA-48", state: "CA", number: 48, population: 744_038, lean: 0.486, incumbentParty: "republican" },
  { id: "CA-49", state: "CA", number: 49, population: 751_153, lean: 0.169, incumbentParty: "democrat" },
  { id: "CA-50", state: "CA", number: 50, population: 746_135, lean: 0.198, incumbentParty: "democrat" },
  { id: "CA-51", state: "CA", number: 51, population: 752_201, lean: 0.227, incumbentParty: "democrat" },
  { id: "CA-52", state: "CA", number: 52, population: 758_744, lean: 0.255, incumbentParty: "democrat" },
  // Colorado
  { id: "CO-01", state: "CO", number: 1, population: 736_905, lean: -0.606, incumbentParty: "democrat" },
  { id: "CO-02", state: "CO", number: 2, population: 731_983, lean: -0.479, incumbentParty: "democrat" },
  { id: "CO-03", state: "CO", number: 3, population: 737_934, lean: 0.018, incumbentParty: "republican" },
  { id: "CO-04", state: "CO", number: 4, population: 730_954, lean: 0.195, incumbentParty: "republican" },
  { id: "CO-05", state: "CO", number: 5, population: 738_962, lean: 0.361, incumbentParty: "republican" },
  { id: "CO-06", state: "CO", number: 6, population: 729_925, lean: -0.329, incumbentParty: "democrat" },
  { id: "CO-07", state: "CO", number: 7, population: 736_905, lean: -0.161, incumbentParty: "democrat" },
  { id: "CO-08", state: "CO", number: 8, population: 734_042, lean: 0.506, incumbentParty: "republican" },
  // Connecticut
  { id: "CT-01", state: "CT", number: 1, population: 725_605, lean: -0.533, incumbentParty: "democrat" },
  { id: "CT-02", state: "CT", number: 2, population: 720_758, lean: -0.345, incumbentParty: "democrat" },
  { id: "CT-03", state: "CT", number: 3, population: 726_618, lean: -0.125, incumbentParty: "democrat" },
  { id: "CT-04", state: "CT", number: 4, population: 719_745, lean: 0.108, incumbentParty: "democrat" },
  { id: "CT-05", state: "CT", number: 5, population: 724_450, lean: 0.329, incumbentParty: "democrat" },
  // Delaware
  { id: "DE-AL", state: "DE", number: 0, population: 1_031_890, lean: -0.14, incumbentParty: "democrat" },
  // District of Columbia
  { id: "DC-DL", state: "DC", number: 0, population: 678_972, lean: -0.76, incumbentParty: "democrat" },
  // Florida
  { id: "FL-01", state: "FL", number: 1, population: 809_948, lean: -0.252, incumbentParty: "republican" },
  { id: "FL-02", state: "FL", number: 2, population: 804_537, lean: -0.198, incumbentParty: "republican" },
  { id: "FL-03", state: "FL", number: 3, population: 811_078, lean: -0.143, incumbentParty: "republican" },
  { id: "FL-04", state: "FL", number: 4, population: 803_407, lean: -0.087, incumbentParty: "republican" },
  { id: "FL-05", state: "FL", number: 5, population: 812_209, lean: -0.031, incumbentParty: "republican" },
  { id: "FL-06", state: "FL", number: 6, population: 802_276, lean: 0.026, incumbentParty: "republican" },
  { id: "FL-07", state: "FL", number: 7, population: 809_948, lean: 0.082, incumbentParty: "republican" },
  { id: "FL-08", state: "FL", number: 8, population: 804_537, lean: 0.138, incumbentParty: "republican" },
  { id: "FL-09", state: "FL", number: 9, population: 811_078, lean: -0.611, incumbentParty: "democrat" },
  { id: "FL-10", state: "FL", number: 10, population: 803_407, lean: -0.575, incumbentParty: "democrat" },
  { id: "FL-11", state: "FL", number: 11, population: 812_209, lean: 0.193, incumbentParty: "republican" },
  { id: "FL-12", state: "FL", number: 12, population: 802_276, lean: 0.247, incumbentParty: "republican" },
  { id: "FL-13", state: "FL", number: 13, population: 809_948, lean: 0.3, incumbentParty: "republican" },
  { id: "FL-14", state: "FL", number: 14, population: 804_537, lean: -0.535, incumbentParty: "democrat" },
  { id: "FL-15", state: "FL", number: 15, population: 811_078, lean: 0.35, incumbentParty: "republican" },
  { id: "FL-16", state: "FL", number: 16, population: 803_407, lean: 0.399, incumbentParty: "republican" },
  { id: "FL-17", state: "FL", number: 17, population: 812_209, lean: 0.445, incumbentParty: "republican" },
  { id: "FL-18", state: "FL", number: 18, population: 802_276, lean: 0.49, incumbentParty: "republican" },
  { id: "FL-19", state: "FL", number: 19, population: 809_948, lean: 0.532, incumbentParty: "republican" },
  { id: "FL-20", state: "FL", number: 20, population: 804_537, lean: -0.304, incumbentParty: "democrat" },
  { id: "FL-21", state: "FL", number: 21, population: 811_078, lean: 0.571, incumbentParty: "republican" },
  { id: "FL-22", state: "FL", number: 22, population: 803_407, lean: -0.494, incumbentParty: "democrat" },
  { id: "FL-23", state: "FL", number: 23, population: 812_209, lean: -0.45, incumbentParty: "democrat" },
  { id: "FL-24", state: "FL", number: 24, population: 802_276, lean: -0.403, incumbentParty: "democrat" },
  { id: "FL-25", state: "FL", number: 25, population: 809_948, lean: -0.355, incumbentParty: "democrat" },
  { id: "FL-26", state: "FL", number: 26, population: 804_537, lean: 0.608, incumbentParty: "republican" },
  { id: "FL-27", state: "FL", number: 27, population: 811_078, lean: 0.642, incumbentParty: "republican" },
  { id: "FL-28", state: "FL", number: 28, population: 811_343, lean: 0.675, incumbentParty: "republican" },
  // Georgia
  { id: "GA-01", state: "GA", number: 1, population: 790_164, lean: -0.14, incumbentParty: "republican" },
  { id: "GA-02", state: "GA", number: 2, population: 784_886, lean: -0.622, incumbentParty: "democrat" },
  { id: "GA-03", state: "GA", number: 3, population: 791_267, lean: -0.023, incumbentParty: "republican" },
  { id: "GA-04", state: "GA", number: 4, population: 783_783, lean: -0.545, incumbentParty: "democrat" },
  { id: "GA-05", state: "GA", number: 5, population: 792_370, lean: -0.457, incumbentParty: "democrat" },
  { id: "GA-06", state: "GA", number: 6, population: 782_680, lean: -0.359, incumbentParty: "democrat" },
  { id: "GA-07", state: "GA", number: 7, population: 790_164, lean: 0.095, incumbentParty: "republican" },
  { id: "GA-08", state: "GA", number: 8, population: 784_886, lean: 0.209, incumbentParty: "republican" },
  { id: "GA-09", state: "GA", number: 9, population: 791_267, lean: 0.319, incumbentParty: "republican" },
  { id: "GA-10", state: "GA", number: 10, population: 783_783, lean: 0.42, incumbentParty: "republican" },
  { id: "GA-11", state: "GA", number: 11, population: 792_370, lean: 0.512, incumbentParty: "republican" },
  { id: "GA-12", state: "GA", number: 12, population: 782_680, lean: 0.594, incumbentParty: "republican" },
  { id: "GA-13", state: "GA", number: 13, population: 790_164, lean: -0.253, incumbentParty: "democrat" },
  { id: "GA-14", state: "GA", number: 14, population: 788_763, lean: 0.665, incumbentParty: "republican" },
  // Hawaii
  { id: "HI-01", state: "HI", number: 1, population: 719_722, lean: -0.506, incumbentParty: "democrat" },
  { id: "HI-02", state: "HI", number: 2, population: 715_416, lean: 0.054, incumbentParty: "democrat" },
  // Idaho
  { id: "ID-01", state: "ID", number: 1, population: 985_310, lean: 0.018, incumbentParty: "republican" },
  { id: "ID-02", state: "ID", number: 2, population: 979_416, lean: 0.558, incumbentParty: "republican" },
  // Illinois
  { id: "IL-01", state: "IL", number: 1, population: 740_432, lean: -0.712, incumbentParty: "democrat" },
  { id: "IL-02", state: "IL", number: 2, population: 735_486, lean: -0.661, incumbentParty: "democrat" },
  { id: "IL-03", state: "IL", number: 3, population: 741_465, lean: -0.604, incumbentParty: "democrat" },
  { id: "IL-04", state: "IL", number: 4, population: 734_452, lean: -0.54, incumbentParty: "democrat" },
  { id: "IL-05", state: "IL", number: 5, population: 742_499, lean: -0.469, incumbentParty: "democrat" },
  { id: "IL-06", state: "IL", number: 6, population: 733_419, lean: -0.391, incumbentParty: "democrat" },
  { id: "IL-07", state: "IL", number: 7, population: 740_432, lean: -0.307, incumbentParty: "democrat" },
  { id: "IL-08", state: "IL", number: 8, population: 735_486, lean: -0.218, incumbentParty: "democrat" },
  { id: "IL-09", state: "IL", number: 9, population: 741_465, lean: -0.125, incumbentParty: "democrat" },
  { id: "IL-10", state: "IL", number: 10, population: 734_452, lean: -0.03, incumbentParty: "democrat" },
  { id: "IL-11", state: "IL", number: 11, population: 742_499, lean: 0.065, incumbentParty: "democrat" },
  { id: "IL-12", state: "IL", number: 12, population: 733_419, lean: 0.42, incumbentParty: "republican" },
  { id: "IL-13", state: "IL", number: 13, population: 740_432, lean: 0.16, incumbentParty: "democrat" },
  { id: "IL-14", state: "IL", number: 14, population: 735_486, lean: 0.251, incumbentParty: "democrat" },
  { id: "IL-15", state: "IL", number: 15, population: 741_465, lean: 0.496, incumbentParty: "republican" },
  { id: "IL-16", state: "IL", number: 16, population: 734_452, lean: 0.564, incumbentParty: "republican" },
  { id: "IL-17", state: "IL", number: 17, population: 742_348, lean: 0.338, incumbentParty: "democrat" },
  // Indiana
  { id: "IN-01", state: "IN", number: 1, population: 764_753, lean: -0.451, incumbentParty: "democrat" },
  { id: "IN-02", state: "IN", number: 2, population: 759_645, lean: -0.143, incumbentParty: "republican" },
  { id: "IN-03", state: "IN", number: 3, population: 765_821, lean: 0.027, incumbentParty: "republican" },
  { id: "IN-04", state: "IN", number: 4, population: 758_577, lean: 0.195, incumbentParty: "republican" },
  { id: "IN-05", state: "IN", number: 5, population: 766_888, lean: 0.353, incumbentParty: "republican" },
  { id: "IN-06", state: "IN", number: 6, population: 757_510, lean: 0.493, incumbentParty: "republican" },
  { id: "IN-07", state: "IN", number: 7, population: 764_753, lean: -0.305, incumbentParty: "democrat" },
  { id: "IN-08", state: "IN", number: 8, population: 759_645, lean: 0.611, incumbentParty: "republican" },
  { id: "IN-09", state: "IN", number: 9, population: 764_607, lean: 0.707, incumbentParty: "republican" },
  // Iowa
  { id: "IA-01", state: "IA", number: 1, population: 804_156, lean: -0.297, incumbentParty: "republican" },
  { id: "IA-02", state: "IA", number: 2, population: 798_785, lean: -0.03, incumbentParty: "republican" },
  { id: "IA-03", state: "IA", number: 3, population: 805_279, lean: 0.241, incumbentParty: "republican" },
  { id: "IA-04", state: "IA", number: 4, population: 798_784, lean: 0.479, incumbentParty: "republican" },
  // Kansas
  { id: "KS-01", state: "KS", number: 1, population: 737_341, lean: 0.042, incumbentParty: "republican" },
  { id: "KS-02", state: "KS", number: 2, population: 732_416, lean: 0.308, incumbentParty: "republican" },
  { id: "KS-03", state: "KS", number: 3, population: 738_371, lean: -0.23, incumbentParty: "democrat" },
  { id: "KS-04", state: "KS", number: 4, population: 732_418, lean: 0.533, incumbentParty: "republican" },
  // Kentucky
  { id: "KY-01", state: "KY", number: 1, population: 756_622, lean: -0.025, incumbentParty: "republican" },
  { id: "KY-02", state: "KY", number: 2, population: 751_568, lean: 0.182, incumbentParty: "republican" },
  { id: "KY-03", state: "KY", number: 3, population: 757_678, lean: -0.23, incumbentParty: "democrat" },
  { id: "KY-04", state: "KY", number: 4, population: 750_512, lean: 0.373, incumbentParty: "republican" },
  { id: "KY-05", state: "KY", number: 5, population: 758_734, lean: 0.538, incumbentParty: "republican" },
  { id: "KY-06", state: "KY", number: 6, population: 751_040, lean: 0.67, incumbentParty: "republican" },
  // Louisiana
  { id: "LA-01", state: "LA", number: 1, population: 764_578, lean: 0.111, incumbentParty: "republican" },
  { id: "LA-02", state: "LA", number: 2, population: 759_471, lean: -0.297, incumbentParty: "democrat" },
  { id: "LA-03", state: "LA", number: 3, population: 765_645, lean: 0.31, incumbentParty: "republican" },
  { id: "LA-04", state: "LA", number: 4, population: 758_403, lean: 0.485, incumbentParty: "republican" },
  { id: "LA-05", state: "LA", number: 5, population: 766_712, lean: 0.628, incumbentParty: "republican" },
  { id: "LA-06", state: "LA", number: 6, population: 758_940, lean: -0.097, incumbentParty: "democrat" },
  // Maine
  { id: "ME-01", state: "ME", number: 1, population: 699_955, lean: -0.329, incumbentParty: "democrat" },
  { id: "ME-02", state: "ME", number: 2, population: 695_767, lean: 0.264, incumbentParty: "democrat" },
  // Maryland
  { id: "MD-01", state: "MD", number: 1, population: 774_849, lean: 0.361, incumbentParty: "republican" },
  { id: "MD-02", state: "MD", number: 2, population: 769_673, lean: -0.707, incumbentParty: "democrat" },
  { id: "MD-03", state: "MD", number: 3, population: 775_930, lean: -0.606, incumbentParty: "democrat" },
  { id: "MD-04", state: "MD", number: 4, population: 768_591, lean: -0.479, incumbentParty: "democrat" },
  { id: "MD-05", state: "MD", number: 5, population: 777_012, lean: -0.329, incumbentParty: "democrat" },
  { id: "MD-06", state: "MD", number: 6, population: 767_510, lean: -0.161, incumbentParty: "democrat" },
  { id: "MD-07", state: "MD", number: 7, population: 774_849, lean: 0.018, incumbentParty: "democrat" },
  { id: "MD-08", state: "MD", number: 8, population: 771_839, lean: 0.195, incumbentParty: "democrat" },
  // Massachusetts
  { id: "MA-01", state: "MA", number: 1, population: 780_267, lean: -0.742, incumbentParty: "democrat" },
  { id: "MA-02", state: "MA", number: 2, population: 775_055, lean: -0.654, incumbentParty: "democrat" },
  { id: "MA-03", state: "MA", number: 3, population: 781_356, lean: -0.546, incumbentParty: "democrat" },
  { id: "MA-04", state: "MA", number: 4, population: 773_966, lean: -0.414, incumbentParty: "democrat" },
  { id: "MA-05", state: "MA", number: 5, population: 782_445, lean: -0.264, incumbentParty: "democrat" },
  { id: "MA-06", state: "MA", number: 6, population: 772_876, lean: -0.099, incumbentParty: "democrat" },
  { id: "MA-07", state: "MA", number: 7, population: 780_267, lean: 0.072, incumbentParty: "democrat" },
  { id: "MA-08", state: "MA", number: 8, population: 775_055, lean: 0.238, incumbentParty: "democrat" },
  { id: "MA-09", state: "MA", number: 9, population: 780_112, lean: 0.392, incumbentParty: "democrat" },
  // Michigan
  { id: "MI-01", state: "MI", number: 1, population: 774_413, lean: 0.018, incumbentParty: "republican" },
  { id: "MI-02", state: "MI", number: 2, population: 769_240, lean: 0.144, incumbentParty: "republican" },
  { id: "MI-03", state: "MI", number: 3, population: 775_494, lean: -0.633, incumbentParty: "democrat" },
  { id: "MI-04", state: "MI", number: 4, population: 768_159, lean: 0.266, incumbentParty: "republican" },
  { id: "MI-05", state: "MI", number: 5, population: 776_575, lean: 0.38, incumbentParty: "republican" },
  { id: "MI-06", state: "MI", number: 6, population: 767_078, lean: -0.551, incumbentParty: "democrat" },
  { id: "MI-07", state: "MI", number: 7, population: 774_413, lean: 0.484, incumbentParty: "republican" },
  { id: "MI-08", state: "MI", number: 8, population: 769_240, lean: -0.456, incumbentParty: "democrat" },
  { id: "MI-09", state: "MI", number: 9, population: 775_494, lean: 0.575, incumbentParty: "republican" },
  { id: "MI-10", state: "MI", number: 10, population: 768_159, lean: 0.654, incumbentParty: "republican" },
  { id: "MI-11", state: "MI", number: 11, population: 776_575, lean: -0.349, incumbentParty: "democrat" },
  { id: "MI-12", state: "MI", number: 12, population: 767_078, lean: -0.233, incumbentParty: "democrat" },
  { id: "MI-13", state: "MI", number: 13, population: 775_343, lean: -0.109, incumbentParty: "democrat" },
  // Minnesota
  { id: "MN-01", state: "MN", number: 1, population: 719_391, lean: 0.018, incumbentParty: "republican" },
  { id: "MN-02", state: "MN", number: 2, population: 714_585, lean: -0.606, incumbentParty: "democrat" },
  { id: "MN-03", state: "MN", number: 3, population: 720_395, lean: -0.479, incumbentParty: "democrat" },
  { id: "MN-04", state: "MN", number: 4, population: 713_581, lean: -0.329, incumbentParty: "democrat" },
  { id: "MN-05", state: "MN", number: 5, population: 721_399, lean: -0.161, incumbentParty: "democrat" },
  { id: "MN-06", state: "MN", number: 6, population: 712_577, lean: 0.195, incumbentParty: "republican" },
  { id: "MN-07", state: "MN", number: 7, population: 719_391, lean: 0.361, incumbentParty: "republican" },
  { id: "MN-08", state: "MN", number: 8, population: 716_596, lean: 0.506, incumbentParty: "republican" },
  // Mississippi
  { id: "MS-01", state: "MS", number: 1, population: 737_127, lean: 0.06, incumbentParty: "republican" },
  { id: "MS-02", state: "MS", number: 2, population: 732_203, lean: -0.213, incumbentParty: "democrat" },
  { id: "MS-03", state: "MS", number: 3, population: 738_156, lean: 0.324, incumbentParty: "republican" },
  { id: "MS-04", state: "MS", number: 4, population: 732_204, lean: 0.546, incumbentParty: "republican" },
  // Missouri
  { id: "MO-01", state: "MO", number: 1, population: 776_843, lean: -0.422, incumbentParty: "democrat" },
  { id: "MO-02", state: "MO", number: 2, population: 771_653, lean: -0.09, incumbentParty: "republican" },
  { id: "MO-03", state: "MO", number: 3, population: 777_927, lean: 0.09, incumbentParty: "republican" },
  { id: "MO-04", state: "MO", number: 4, population: 770_569, lean: 0.264, incumbentParty: "republican" },
  { id: "MO-05", state: "MO", number: 5, population: 779_011, lean: -0.264, incumbentParty: "democrat" },
  { id: "MO-06", state: "MO", number: 6, population: 769_485, lean: 0.422, incumbentParty: "republican" },
  { id: "MO-07", state: "MO", number: 7, population: 776_843, lean: 0.558, incumbentParty: "republican" },
  { id: "MO-08", state: "MO", number: 8, population: 773_825, lean: 0.67, incumbentParty: "republican" },
  // Montana
  { id: "MT-01", state: "MT", number: 1, population: 568_105, lean: -0.108, incumbentParty: "republican" },
  { id: "MT-02", state: "MT", number: 2, population: 564_707, lean: 0.465, incumbentParty: "republican" },
  // Nebraska
  { id: "NE-01", state: "NE", number: 1, population: 661_437, lean: -0.125, incumbentParty: "republican" },
  { id: "NE-02", state: "NE", number: 2, population: 657_019, lean: 0.23, incumbentParty: "republican" },
  { id: "NE-03", state: "NE", number: 3, population: 659_923, lean: 0.533, incumbentParty: "republican" },
  // Nevada
  { id: "NV-01", state: "NV", number: 1, population: 800_940, lean: -0.377, incumbentParty: "democrat" },
  { id: "NV-02", state: "NV", number: 2, population: 795_589, lean: 0.407, incumbentParty: "republican" },
  { id: "NV-03", state: "NV", number: 3, population: 802_058, lean: -0.119, incumbentParty: "democrat" },
  { id: "NV-04", state: "NV", number: 4, population: 795_589, lean: 0.155, incumbentParty: "democrat" },
  // New Hampshire
  { id: "NH-01", state: "NH", number: 1, population: 703_130, lean: -0.313, incumbentParty: "democrat" },
  { id: "NH-02", state: "NH", number: 2, population: 698_924, lean: 0.28, incumbentParty: "democrat" },
  // New Jersey
  { id: "NJ-01", state: "NJ", number: 1, population: 776_559, lean: -0.703, incumbentParty: "democrat" },
  { id: "NJ-02", state: "NJ", number: 2, population: 771_371, lean: 0.362, incumbentParty: "republican" },
  { id: "NJ-03", state: "NJ", number: 3, population: 777_643, lean: -0.625, incumbentParty: "democrat" },
  { id: "NJ-04", state: "NJ", number: 4, population: 770_287, lean: 0.476, incumbentParty: "republican" },
  { id: "NJ-05", state: "NJ", number: 5, population: 778_727, lean: -0.533, incumbentParty: "democrat" },
  { id: "NJ-06", state: "NJ", number: 6, population: 769_203, lean: -0.427, incumbentParty: "democrat" },
  { id: "NJ-07", state: "NJ", number: 7, population: 776_559, lean: 0.576, incumbentParty: "republican" },
  { id: "NJ-08", state: "NJ", number: 8, population: 771_371, lean: -0.306, incumbentParty: "democrat" },
  { id: "NJ-09", state: "NJ", number: 9, population: 777_643, lean: -0.176, incumbentParty: "democrat" },
  { id: "NJ-10", state: "NJ", number: 10, population: 770_287, lean: -0.038, incumbentParty: "democrat" },
  { id: "NJ-11", state: "NJ", number: 11, population: 778_727, lean: 0.1, incumbentParty: "democrat" },
  { id: "NJ-12", state: "NJ", number: 12, population: 772_464, lean: 0.235, incumbentParty: "democrat" },
  // New Mexico
  { id: "NM-01", state: "NM", number: 1, population: 706_904, lean: -0.392, incumbentParty: "democrat" },
  { id: "NM-02", state: "NM", number: 2, population: 702_182, lean: -0.054, incumbentParty: "democrat" },
  { id: "NM-03", state: "NM", number: 3, population: 705_285, lean: 0.297, incumbentParty: "democrat" },
  // New York
  { id: "NY-01", state: "NY", number: 1, population: 754_997, lean: 0.214, incumbentParty: "republican" },
  { id: "NY-02", state: "NY", number: 2, population: 749_954, lean: 0.272, incumbentParty: "republican" },
  { id: "NY-03", state: "NY", number: 3, population: 756_051, lean: -0.738, incumbentParty: "democrat" },
  { id: "NY-04", state: "NY", number: 4, population: 748_900, lean: -0.708, incumbentParty: "democrat" },
  { id: "NY-05", state: "NY", number: 5, population: 757_105, lean: -0.676, incumbentParty: "democrat" },
  { id: "NY-06", state: "NY", number: 6, population: 747_846, lean: -0.642, incumbentParty: "democrat" },
  { id: "NY-07", state: "NY", number: 7, population: 754_997, lean: -0.604, incumbentParty: "democrat" },
  { id: "NY-08", state: "NY", number: 8, population: 749_954, lean: -0.564, incumbentParty: "democrat" },
  { id: "NY-09", state: "NY", number: 9, population: 756_051, lean: -0.521, incumbentParty: "democrat" },
  { id: "NY-10", state: "NY", number: 10, population: 748_900, lean: -0.475, incumbentParty: "democrat" },
  { id: "NY-11", state: "NY", number: 11, population: 757_105, lean: 0.328, incumbentParty: "republican" },
  { id: "NY-12", state: "NY", number: 12, population: 747_846, lean: -0.426, incumbentParty: "democrat" },
  { id: "NY-13", state: "NY", number: 13, population: 754_997, lean: -0.375, incumbentParty: "democrat" },
  { id: "NY-14", state: "NY", number: 14, population: 749_954, lean: -0.321, incumbentParty: "democrat" },
  { id: "NY-15", state: "NY", number: 15, population: 756_051, lean: -0.265, incumbentParty: "democrat" },
  { id: "NY-16", state: "NY", number: 16, population: 748_900, lean: -0.208, incumbentParty: "democrat" },
  { id: "NY-17", state: "NY", number: 17, population: 757_105, lean: 0.381, incumbentParty: "republican" },
  { id: "NY-18", state: "NY", number: 18, population: 747_846, lean: -0.148, incumbentParty: "democrat" },
  { id: "NY-19", state: "NY", number: 19, population: 754_997, lean: -0.088, incumbentParty: "democrat" },
  { id: "NY-20", state: "NY", number: 20, population: 749_954, lean: -0.027, incumbentParty: "democrat" },
  { id: "NY-21", state: "NY", number: 21, population: 756_051, lean: 0.432, incumbentParty: "republican" },
  { id: "NY-22", state: "NY", number: 22, population: 748_900, lean: 0.034, incumbentParty: "democrat" },
  { id: "NY-23", state: "NY", number: 23, population: 757_105, lean: 0.481, incumbentParty: "republican" },
  { id: "NY-24", state: "NY", number: 24, population: 747_846, lean: 0.526, incumbentParty: "republican" },
  { id: "NY-25", state: "NY", number: 25, population: 754_997, lean: 0.095, incumbentParty: "democrat" },
  { id: "NY-26", state: "NY", number: 26, population: 756_807, lean: 0.155, incumbentParty: "democrat" },
  // North Carolina
  { id: "NC-01", state: "NC", number: 1, population: 776_285, lean: -0.611, incumbentParty: "democrat" },
  { id: "NC-02", state: "NC", number: 2, population: 771_099, lean: -0.532, incumbentParty: "democrat" },
  { id: "NC-03", state: "NC", number: 3, population: 777_368, lean: -0.236, incumbentParty: "republican" },
  { id: "NC-04", state: "NC", number: 4, population: 770_016, lean: -0.443, incumbentParty: "democrat" },
  { id: "NC-05", state: "NC", number: 5, population: 778_452, lean: -0.122, incumbentParty: "republican" },
  { id: "NC-06", state: "NC", number: 6, population: 768_932, lean: -0.005, incumbentParty: "republican" },
  { id: "NC-07", state: "NC", number: 7, population: 776_285, lean: 0.112, incumbentParty: "republican" },
  { id: "NC-08", state: "NC", number: 8, population: 771_099, lean: 0.227, incumbentParty: "republican" },
  { id: "NC-09", state: "NC", number: 9, population: 777_368, lean: 0.335, incumbentParty: "republican" },
  { id: "NC-10", state: "NC", number: 10, population: 770_016, lean: 0.435, incumbentParty: "republican" },
  { id: "NC-11", state: "NC", number: 11, population: 778_452, lean: 0.525, incumbentParty: "republican" },
  { id: "NC-12", state: "NC", number: 12, population: 768_932, lean: -0.343, incumbentParty: "democrat" },
  { id: "NC-13", state: "NC", number: 13, population: 776_285, lean: 0.605, incumbentParty: "republican" },
  { id: "NC-14", state: "NC", number: 14, population: 774_902, lean: 0.675, incumbentParty: "republican" },
  // North Dakota
  { id: "ND-AL", state: "ND", number: 0, population: 783_926, lean: 0.4, incumbentParty: "republican" },
  // Ohio
  { id: "OH-01", state: "OH", number: 1, population: 788_086, lean: -0.576, incumbentParty: "democrat" },
  { id: "OH-02", state: "OH", number: 2, population: 782_822, lean: -0.11, incumbentParty: "republican" },
  { id: "OH-03", state: "OH", number: 3, population: 789_186, lean: -0.499, incumbentParty: "democrat" },
  { id: "OH-04", state: "OH", number: 4, population: 781_722, lean: -0.001, incumbentParty: "republican" },
  { id: "OH-05", state: "OH", number: 5, population: 790_286, lean: 0.108, incumbentParty: "republican" },
  { id: "OH-06", state: "OH", number: 6, population: 780_622, lean: 0.214, incumbentParty: "republican" },
  { id: "OH-07", state: "OH", number: 7, population: 788_086, lean: 0.315, incumbentParty: "republican" },
  { id: "OH-08", state: "OH", number: 8, population: 782_822, lean: 0.41, incumbentParty: "republican" },
  { id: "OH-09", state: "OH", number: 9, population: 789_186, lean: -0.412, incumbentParty: "democrat" },
  { id: "OH-10", state: "OH", number: 10, population: 781_722, lean: 0.497, incumbentParty: "republican" },
  { id: "OH-11", state: "OH", number: 11, population: 790_286, lean: -0.318, incumbentParty: "democrat" },
  { id: "OH-12", state: "OH", number: 12, population: 780_622, lean: 0.575, incumbentParty: "republican" },
  { id: "OH-13", state: "OH", number: 13, population: 788_086, lean: -0.216, incumbentParty: "democrat" },
  { id: "OH-14", state: "OH", number: 14, population: 782_822, lean: 0.643, incumbentParty: "republican" },
  { id: "OH-15", state: "OH", number: 15, population: 789_579, lean: 0.703, incumbentParty: "republican" },
  // Oklahoma
  { id: "OK-01", state: "OK", number: 1, population: 813_196, lean: -0.108, incumbentParty: "republican" },
  { id: "OK-02", state: "OK", number: 2, population: 807_764, lean: 0.125, incumbentParty: "republican" },
  { id: "OK-03", state: "OK", number: 3, population: 814_331, lean: 0.345, incumbentParty: "republican" },
  { id: "OK-04", state: "OK", number: 4, population: 806_629, lean: 0.533, incumbentParty: "republican" },
  { id: "OK-05", state: "OK", number: 5, population: 811_904, lean: 0.679, incumbentParty: "republican" },
  // Oregon
  { id: "OR-01", state: "OR", number: 1, population: 707_676, lean: -0.558, incumbentParty: "democrat" },
  { id: "OR-02", state: "OR", number: 2, population: 702_948, lean: 0.392, incumbentParty: "republican" },
  { id: "OR-03", state: "OR", number: 3, population: 708_663, lean: -0.398, incumbentParty: "democrat" },
  { id: "OR-04", state: "OR", number: 4, population: 701_961, lean: -0.209, incumbentParty: "democrat" },
  { id: "OR-05", state: "OR", number: 5, population: 709_651, lean: -0.004, incumbentParty: "democrat" },
  { id: "OR-06", state: "OR", number: 6, population: 702_459, lean: 0.202, incumbentParty: "democrat" },
  // Pennsylvania
  { id: "PA-01", state: "PA", number: 1, population: 764_738, lean: -0.06, incumbentParty: "republican" },
  { id: "PA-02", state: "PA", number: 2, population: 759_630, lean: -0.622, incumbentParty: "democrat" },
  { id: "PA-03", state: "PA", number: 3, population: 765_806, lean: -0.56, incumbentParty: "democrat" },
  { id: "PA-04", state: "PA", number: 4, population: 758_562, lean: -0.491, incumbentParty: "democrat" },
  { id: "PA-05", state: "PA", number: 5, population: 766_873, lean: -0.415, incumbentParty: "democrat" },
  { id: "PA-06", state: "PA", number: 6, population: 757_495, lean: -0.333, incumbentParty: "democrat" },
  { id: "PA-07", state: "PA", number: 7, population: 764_738, lean: 0.036, incumbentParty: "republican" },
  { id: "PA-08", state: "PA", number: 8, population: 759_630, lean: 0.131, incumbentParty: "republican" },
  { id: "PA-09", state: "PA", number: 9, population: 765_806, lean: 0.223, incumbentParty: "republican" },
  { id: "PA-10", state: "PA", number: 10, population: 758_562, lean: 0.312, incumbentParty: "republican" },
  { id: "PA-11", state: "PA", number: 11, population: 766_873, lean: 0.396, incumbentParty: "republican" },
  { id: "PA-12", state: "PA", number: 12, population: 757_495, lean: -0.246, incumbentParty: "democrat" },
  { id: "PA-13", state: "PA", number: 13, population: 764_738, lean: 0.473, incumbentParty: "republican" },
  { id: "PA-14", state: "PA", number: 14, population: 759_630, lean: 0.544, incumbentParty: "republican" },
  { id: "PA-15", state: "PA", number: 15, population: 765_806, lean: 0.608, incumbentParty: "republican" },
  { id: "PA-16", state: "PA", number: 16, population: 758_562, lean: 0.665, incumbentParty: "republican" },
  { id: "PA-17", state: "PA", number: 17, population: 766_739, lean: -0.154, incumbentParty: "democrat" },
  // Rhode Island
  { id: "RI-01", state: "RI", number: 1, population: 549_625, lean: -0.422, incumbentParty: "democrat" },
  { id: "RI-02", state: "RI", number: 2, population: 546_337, lean: 0.161, incumbentParty: "democrat" },
  // South Carolina
  { id: "SC-01", state: "SC", number: 1, population: 769_953, lean: -0.235, incumbentParty: "republican" },
  { id: "SC-02", state: "SC", number: 2, population: 764_810, lean: -0.048, incumbentParty: "republican" },
  { id: "SC-03", state: "SC", number: 3, population: 771_028, lean: 0.143, incumbentParty: "republican" },
  { id: "SC-04", state: "SC", number: 4, population: 763_735, lean: 0.324, incumbentParty: "republican" },
  { id: "SC-05", state: "SC", number: 5, population: 772_102, lean: 0.484, incumbentParty: "republican" },
  { id: "SC-06", state: "SC", number: 6, population: 762_660, lean: -0.407, incumbentParty: "democrat" },
  { id: "SC-07", state: "SC", number: 7, population: 769_267, lean: 0.617, incumbentParty: "republican" },
  // South Dakota
  { id: "SD-AL", state: "SD", number: 0, population: 919_318, lean: 0.32, incumbentParty: "republican" },
  // Tennessee
  { id: "TN-01", state: "TN", number: 1, population: 794_207, lean: -0.255, incumbentParty: "republican" },
  { id: "TN-02", state: "TN", number: 2, population: 788_902, lean: -0.09, incumbentParty: "republican" },
  { id: "TN-03", state: "TN", number: 3, population: 795_316, lean: 0.081, incumbentParty: "republican" },
  { id: "TN-04", state: "TN", number: 4, population: 787_794, lean: 0.247, incumbentParty: "republican" },
  { id: "TN-05", state: "TN", number: 5, population: 796_425, lean: 0.399, incumbentParty: "republican" },
  { id: "TN-06", state: "TN", number: 6, population: 786_685, lean: 0.533, incumbentParty: "republican" },
  { id: "TN-07", state: "TN", number: 7, population: 794_207, lean: 0.644, incumbentParty: "republican" },
  { id: "TN-08", state: "TN", number: 8, population: 788_902, lean: 0.733, incumbentParty: "republican" },
  { id: "TN-09", state: "TN", number: 9, population: 794_051, lean: -0.407, incumbentParty: "democrat" },
  // Texas
  { id: "TX-01", state: "TX", number: 1, population: 805_126, lean: -0.096, incumbentParty: "republican" },
  { id: "TX-02", state: "TX", number: 2, population: 799_748, lean: -0.055, incumbentParty: "republican" },
  { id: "TX-03", state: "TX", number: 3, population: 806_250, lean: -0.013, incumbentParty: "republican" },
  { id: "TX-04", state: "TX", number: 4, population: 798_624, lean: 0.028, incumbentParty: "republican" },
  { id: "TX-05", state: "TX", number: 5, population: 807_374, lean: 0.069, incumbentParty: "republican" },
  { id: "TX-06", state: "TX", number: 6, population: 797_500, lean: 0.11, incumbentParty: "republican" },
  { id: "TX-07", state: "TX", number: 7, population: 805_126, lean: -0.588, incumbentParty: "democrat" },
  { id: "TX-08", state: "TX", number: 8, population: 799_748, lean: 0.151, incumbentParty: "republican" },
  { id: "TX-09", state: "TX", number: 9, population: 806_250, lean: -0.561, incumbentParty: "democrat" },
  { id: "TX-10", state: "TX", number: 10, population: 798_624, lean: 0.191, incumbentParty: "republican" },
  { id: "TX-11", state: "TX", number: 11, population: 807_374, lean: 0.231, incumbentParty: "republican" },
  { id: "TX-12", state: "TX", number: 12, population: 797_500, lean: 0.269, incumbentParty: "republican" },
  { id: "TX-13", state: "TX", number: 13, population: 805_126, lean: 0.307, incumbentParty: "republican" },
  { id: "TX-14", state: "TX", number: 14, population: 799_748, lean: 0.344, incumbentParty: "republican" },
  { id: "TX-15", state: "TX", number: 15, population: 806_250, lean: 0.38, incumbentParty: "republican" },
  { id: "TX-16", state: "TX", number: 16, population: 798_624, lean: -0.532, incumbentParty: "democrat" },
  { id: "TX-17", state: "TX", number: 17, population: 807_374, lean: 0.415, incumbentParty: "republican" },
  { id: "TX-18", state: "TX", number: 18, population: 797_500, lean: -0.501, incumbentParty: "democrat" },
  { id: "TX-19", state: "TX", number: 19, population: 805_126, lean: 0.449, incumbentParty: "republican" },
  { id: "TX-20", state: "TX", number: 20, population: 799_748, lean: -0.47, incumbentParty: "democrat" },
  { id: "TX-21", state: "TX", number: 21, population: 806_250, lean: 0.481, incumbentParty: "republican" },
  { id: "TX-22", state: "TX", number: 22, population: 798_624, lean: 0.512, incumbentParty: "republican" },
  { id: "TX-23", state: "TX", number: 23, population: 807_374, lean: -0.137, incumbentParty: "democrat" },
  { id: "TX-24", state: "TX", number: 24, population: 797_500, lean: 0.542, incumbentParty: "republican" },
  { id: "TX-25", state: "TX", number: 25, population: 805_126, lean: 0.57, incumbentParty: "republican" },
  { id: "TX-26", state: "TX", number: 26, population: 799_748, lean: 0.598, incumbentParty: "republican" },
  { id: "TX-27", state: "TX", number: 27, population: 806_250, lean: 0.624, incumbentParty: "republican" },
  { id: "TX-28", state: "TX", number: 28, population: 798_624, lean: -0.437, incumbentParty: "democrat" },
  { id: "TX-29", state: "TX", number: 29, population: 807_374, lean: -0.403, incumbentParty: "democrat" },
  { id: "TX-30", state: "TX", number: 30, population: 797_500, lean: -0.368, incumbentParty: "democrat" },
  { id: "TX-31", state: "TX", number: 31, population: 805_126, lean: 0.648, incumbentParty: "republican" },
  { id: "TX-32", state: "TX", number: 32, population: 799_748, lean: -0.331, incumbentParty: "democrat" },
  { id: "TX-33", state: "TX", number: 33, population: 806_250, lean: -0.294, incumbentParty: "democrat" },
  { id: "TX-34", state: "TX", number: 34, population: 798_624, lean: -0.256, incumbentParty: "democrat" },
  { id: "TX-35", state: "TX", number: 35, population: 807_374, lean: -0.217, incumbentParty: "democrat" },
  { id: "TX-36", state: "TX", number: 36, population: 797_500, lean: 0.672, incumbentParty: "republican" },
  { id: "TX-37", state: "TX", number: 37, population: 805_126, lean: -0.177, incumbentParty: "democrat" },
  { id: "TX-38", state: "TX", number: 38, population: 810_443, lean: 0.694, incumbentParty: "republican" },
  // Utah
  { id: "UT-01", state: "UT", number: 1, population: 856_996, lean: -0.178, incumbentParty: "republican" },
  { id: "UT-02", state: "UT", number: 2, population: 851_272, lean: 0.096, incumbentParty: "republican" },
  { id: "UT-03", state: "UT", number: 3, population: 858_193, lean: 0.356, incumbentParty: "republican" },
  { id: "UT-04", state: "UT", number: 4, population: 851_273, lean: 0.57, incumbentParty: "republican" },
  // Vermont
  { id: "VT-AL", state: "VT", number: 0, population: 647_464, lean: -0.32, incumbentParty: "democrat" },
  // Virginia
  { id: "VA-01", state: "VA", number: 1, population: 794_713, lean: 0.099, incumbentParty: "republican" },
  { id: "VA-02", state: "VA", number: 2, population: 789_404, lean: 0.247, incumbentParty: "republican" },
  { id: "VA-03", state: "VA", number: 3, population: 795_822, lean: -0.675, incumbentParty: "democrat" },
  { id: "VA-04", state: "VA", number: 4, population: 788_295, lean: -0.582, incumbentParty: "democrat" },
  { id: "VA-05", state: "VA", number: 5, population: 796_932, lean: 0.384, incumbentParty: "republican" },
  { id: "VA-06", state: "VA", number: 6, population: 787_186, lean: 0.506, incumbentParty: "republican" },
  { id: "VA-07", state: "VA", number: 7, population: 794_713, lean: -0.472, incumbentParty: "democrat" },
  { id: "VA-08", state: "VA", number: 8, population: 789_404, lean: -0.345, incumbentParty: "democrat" },
  { id: "VA-09", state: "VA", number: 9, population: 795_822, lean: 0.611, incumbentParty: "republican" },
  { id: "VA-10", state: "VA", number: 10, population: 788_295, lean: -0.204, incumbentParty: "democrat" },
  { id: "VA-11", state: "VA", number: 11, population: 795_112, lean: -0.054, incumbentParty: "democrat" },
  // Washington
  { id: "WA-01", state: "WA", number: 1, population: 783_632, lean: -0.707, incumbentParty: "democrat" },
  { id: "WA-02", state: "WA", number: 2, population: 778_397, lean: -0.616, incumbentParty: "democrat" },
  { id: "WA-03", state: "WA", number: 3, population: 784_726, lean: -0.504, incumbentParty: "democrat" },
  { id: "WA-04", state: "WA", number: 4, population: 777_303, lean: 0.405, incumbentParty: "republican" },
  { id: "WA-05", state: "WA", number: 5, population: 785_819, lean: 0.533, incumbentParty: "republican" },
  { id: "WA-06", state: "WA", number: 6, population: 776_210, lean: -0.371, incumbentParty: "democrat" },
  { id: "WA-07", state: "WA", number: 7, population: 783_632, lean: -0.222, incumbentParty: "democrat" },
  { id: "WA-08", state: "WA", number: 8, population: 778_397, lean: -0.062, incumbentParty: "democrat" },
  { id: "WA-09", state: "WA", number: 9, population: 784_726, lean: 0.102, incumbentParty: "democrat" },
  { id: "WA-10", state: "WA", number: 10, population: 780_038, lean: 0.26, incumbentParty: "democrat" },
  // West Virginia
  { id: "WV-01", state: "WV", number: 1, population: 887_690, lean: 0.09, incumbentParty: "republican" },
  { id: "WV-02", state: "WV", number: 2, population: 882_381, lean: 0.606, incumbentParty: "republican" },
  // Wisconsin
  { id: "WI-01", state: "WI", number: 1, population: 741_086, lean: -0.23, incumbentParty: "republican" },
  { id: "WI-02", state: "WI", number: 2, population: 736_135, lean: -0.533, incumbentParty: "democrat" },
  { id: "WI-03", state: "WI", number: 3, population: 742_120, lean: -0.054, incumbentParty: "republican" },
  { id: "WI-04", state: "WI", number: 4, population: 735_101, lean: -0.392, incumbentParty: "democrat" },
  { id: "WI-05", state: "WI", number: 5, population: 743_154, lean: 0.125, incumbentParty: "republican" },
  { id: "WI-06", state: "WI", number: 6, population: 734_066, lean: 0.297, incumbentParty: "republican" },
  { id: "WI-07", state: "WI", number: 7, population: 741_086, lean: 0.451, incumbentParty: "republican" },
  { id: "WI-08", state: "WI", number: 8, population: 738_207, lean: 0.582, incumbentParty: "republican" },
  // Wyoming
  { id: "WY-AL", state: "WY", number: 0, population: 584_057, lean: 0.5, incumbentParty: "republican" },
];

// Computed totals, checked against STATE_FIGURES in state-figures.ts:
//   435 numbered/at-large district rows, one per states.ts houseSeats seat.
//   Each state's district populations sum exactly to STATE_FIGURES[state].population.
//   The 435 district populations + DC-DL's population sum to 334_892_847,
//   the same total STATE_FIGURES' 51 rows sum to.
//   incumbentParty: 220 republican / 216 democrat across all 436 rows.
