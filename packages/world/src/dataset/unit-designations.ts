import { fnv1a, mulberry32 } from "./hashing.js";
import { MILITARY_BRANCHES, type MilitaryBranch } from "../schemas/nation.js";

// A resolution beat that names a military unit needs a name that is never
// mistaken for a real one — the same no-real-insignia posture that keeps
// portraits and flags fictional extends to unit identities. So this draws
// from an invented type vocabulary per branch rather than the real
// nomenclature (no "Airborne Division", no "Ranger Regiment"), and the paired
// test checks the output against a checked-in list of famous real units.

const BRANCH_DISPLAY: Record<MilitaryBranch, string> = {
  army: "Army",
  navy: "Navy",
  air: "Air Force",
  marines: "Marine Corps",
  space: "Space Force",
  cyber: "Cyber Command",
};

/**
 * How large the named formation is.
 *
 * `unit` is the battalion, squadron and company scale everything in the game is
 * written at. `formation` is the scale that owns those — a line that puts two
 * battalions across a river cannot be attributed to a battalion, and without
 * this axis it silently was.
 */
export const UNIT_ECHELONS = ["unit", "formation"] as const;
export type UnitEchelon = (typeof UNIT_ECHELONS)[number];

// Fictional type vocabulary per branch and echelon. Deliberately avoids the
// exact real nomenclature a famous unit carries (no "Airborne Division",
// "Ranger Regiment", "Fleet", "Bomb Group", "Task Force") so the generated
// space and the real one do not overlap by construction, not by luck.
//
// Only the two branches that actually maneuver at corps scale carry a
// `formation` vocabulary. Inventing a corps-scale cyber or space formation
// would fill the table symmetrically and name something no prose can honestly
// ask for, so those tiers are empty and the draw excludes them instead.
const UNIT_TYPES_BY_BRANCH: Record<MilitaryBranch, Record<UnitEchelon, readonly string[]>> = {
  army: {
    unit: ["Rifle Battalion", "Armor Battalion", "Field Artillery Battalion", "Sapper Battalion", "Recon Squadron"],
    formation: ["Maneuver Corps", "Combined Arms Corps"],
  },
  navy: {
    unit: ["Frigate Squadron", "Surface Action Group", "Undersea Warfare Squadron", "Logistics Flotilla"],
    formation: [],
  },
  air: {
    unit: ["Interceptor Squadron", "Strike Wing", "Airlift Squadron", "ISR Squadron", "Refueling Wing"],
    formation: [],
  },
  marines: {
    unit: ["Landing Force", "Expeditionary Battalion", "Rotary Wing Squadron", "Reconnaissance Company"],
    formation: ["Expeditionary Corps"],
  },
  space: {
    unit: ["Orbital Delta", "Tracking Squadron", "Missile Warning Squadron"],
    formation: [],
  },
  cyber: {
    unit: ["Network Warfare Battalion", "Cyber Effects Squadron", "Signals Protection Company"],
    formation: [],
  },
};

const MIN_NUMBER = 1;
const MAX_NUMBER = 999;

export type UnitDesignation = {
  readonly branch: MilitaryBranch;
  readonly branchDisplay: string;
  readonly echelon: UnitEchelon;
  readonly number: number;
  readonly type: string;
  /** "319th Interceptor Squadron" — the string a beat's prose actually carries. */
  readonly designation: string;
};

/**
 * What the caller's prose needs the drawn unit to be.
 *
 * A line whose verbs are aviation verbs cannot take an undersea squadron, and
 * an unconstrained draw does not know that. So the constraint travels with the
 * line that needs it and the draw is narrowed here rather than the prose being
 * written down to whatever six branches have in common.
 */
export type UnitDesignationConstraint = {
  /** Absent means any branch. */
  readonly branches?: readonly MilitaryBranch[];
  /** Absent means `unit`, the scale everything is written at by default. */
  readonly echelon?: UnitEchelon;
};

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** The branches that can be drawn at all under one constraint. */
export function branchesFor(constraint: UnitDesignationConstraint): readonly MilitaryBranch[] {
  const echelon = constraint.echelon ?? "unit";
  const asked = constraint.branches ?? MILITARY_BRANCHES;
  return asked.filter((branch) => UNIT_TYPES_BY_BRANCH[branch][echelon].length > 0);
}

/**
 * A deterministic, fictional unit designation: branch + number + type, e.g.
 * "319th Interceptor Squadron". `seedParts` is joined the same way an
 * engine `RngStreams.stream(...keyParts)` call joins a stream key — a caller
 * composes it from the campaign seed plus whatever identifies the draw (a
 * resolution beat id, a step index), so the same call always names the same
 * unit and two different draws in the same campaign do not collide.
 *
 * `constraint` narrows the draw to what the caller's prose can carry. An empty
 * constraint is the old behavior: any branch, at unit scale.
 */
export function generateUnitDesignation(
  constraint: UnitDesignationConstraint,
  ...seedParts: Array<string | number>
): UnitDesignation {
  if (seedParts.length === 0) {
    throw new Error("generateUnitDesignation requires at least one seed part");
  }
  const echelon = constraint.echelon ?? "unit";
  const branches = branchesFor(constraint);
  if (branches.length === 0) {
    throw new Error(`no ${echelon}-scale formation exists for branches ${(constraint.branches ?? []).join(", ") || "(any)"}`);
  }
  const draw = mulberry32(fnv1a(seedParts.join(":")));
  const branch = branches[Math.floor(draw() * branches.length)]!;
  const types = UNIT_TYPES_BY_BRANCH[branch][echelon];
  const type = types[Math.floor(draw() * types.length)]!;
  const number = MIN_NUMBER + Math.floor(draw() * (MAX_NUMBER - MIN_NUMBER + 1));
  return {
    branch,
    branchDisplay: BRANCH_DISPLAY[branch],
    echelon,
    number,
    type,
    designation: `${ordinal(number)} ${type}`,
  };
}
