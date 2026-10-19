import { z } from "zod";
import { OrgId, NationId, CradleId, RegionId, CharterId, RoleId, PartyId } from "./ids.js";

// Organization eligibility gates founding compacts. `requiresCradle` is the
// single geographic gate: absent means open from any placement (BRICS,
// OPEC+), a non-empty list means the body is regional and only those
// placements qualify (EU, GCC), and an empty list means invitation-only —
// no placement ever qualifies (G7). Conflicts are declared on both sides so
// the registry cannot rule something out by omission.
// What a body actually binds its members to. Sitting in the same room is not
// one fact: a mutual-defense guarantee, a customs union and a standing summit
// club move different channels of a relationship by different amounts, and a
// membership count that cannot tell them apart reads an economic partner and a
// treaty ally as the same country.
export const OrganizationKind = z.enum(["defense", "economic", "political"]);
export type OrganizationKind = z.infer<typeof OrganizationKind>;

// Whether a body removes the tariffs between its members, and how far: a
// customs union shares one external tariff, a free-trade area only drops the
// internal ones. Most bodies do neither.
export const TradeCompetence = z.enum(["customs-union", "fta", "none"]);
export type TradeCompetence = z.infer<typeof TradeCompetence>;

// Where a defense treaty's promise holds, from the treaty's own text: the
// parties' territory, or a named area. A body without one counts as defense
// wherever a member is attacked, which is how every defense body read before
// the scopes were written.
export const DefenseScope = z.object({
  kind: z.enum(["parties-territory", "area"]),
  area: z.array(RegionId).optional(),
  source: z.string().min(1),
});
export type DefenseScope = z.infer<typeof DefenseScope>;

export const Organization = z.object({
  id: OrgId,
  name: z.string().min(1),
  kind: OrganizationKind,
  members: z.array(NationId),
  conflictsWith: z.array(OrgId),
  // Player-facing /bloc/[id] lead: founding, what the body binds, and standing
  // relevance to the US presidency. Campaign seat is live UI and must not be
  // baked in. Dataset `members` is the in-game roster, not a claim that
  // real-world membership is complete, and history must not invent members
  // absent from that list.
  history: z.string().trim().min(160).max(720),
  requiresCradle: z.array(CradleId).optional(),
  // Absent reads as "none": a body that removes no tariffs between its members.
  tradeCompetence: TradeCompetence.optional(),
  // Read only on a defense body: a scope on any other kind binds nothing.
  defenseScope: DefenseScope.optional(),
});
export type Organization = z.infer<typeof Organization>;

// Placement at founding; sets neighbors, sea lanes,
// threat mix, org eligibility, and where on the earth the founder actually
// sits. `geo` is required, not optional: a cradle that changed region and
// neighbors but left the founder's original coordinates behind would have
// the founder narrate itself into a region it does not visibly occupy.
export const Cradle = z.object({
  id: CradleId,
  name: z.string().min(1),
  region: RegionId,
  startingNeighbors: z.array(NationId),
  geo: z.object({ lat: z.number().min(-85).max(85), lon: z.number().min(-180).max(180) }),
});
export type Cradle = z.infer<typeof Cradle>;

// Charters are the government systems the player
// founds under, as data rather than code branches: institution set, cabinet
// role set, a decision-making constraint, a succession rule, and a removal
// path. Keeping them as data is what lets a new form of government be added
// without touching the code that runs one.
export const RemovalMechanism = z.enum(["impeachment", "no-confidence", "coup", "clerical-council", "electoral-defeat"]);
export type RemovalMechanism = z.infer<typeof RemovalMechanism>;

// What a body *is*, independent of what any charter calls it. Content names
// the function and the founding charter supplies the name, the same way a
// scenario speaker names a role hint rather than a ministry: "the assembly
// will not sit" is true under all ten charters, "the National Assembly will
// not sit" is true under one.
//
// `assembly` is the only kind every charter has, and the dataset validator
// enforces that — a government the player can be removed from always has some
// standing body doing the removing. `executive` and `judiciary` are genuinely
// absent under some charters (a junta has no independent court; a confederal
// council has no single executive seat), which is why content that names them
// has to gate on their presence rather than assume it.
export const InstitutionKind = z.enum(["assembly", "executive", "judiciary"]);
export type InstitutionKind = z.infer<typeof InstitutionKind>;

// A single named seat of power within the charter (e.g. "Assembly",
// "Officer Corps Council") and what it does — the token set an authored
// charter is built from, not a hand-drawn description. `kind` is optional
// because a charter may name a body that fills no general slot (an Electoral
// Commission, a set of Regional Assemblies); such a body is real, but no
// token can reach it, because no other charter has anything like it.
export const Institution = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  kind: InstitutionKind.optional(),
});
export type Institution = z.infer<typeof Institution>;

export const PartyKind = z.enum(["major", "independent"]);
export type PartyKind = z.infer<typeof PartyKind>;

// Same three axes as Person.ideology / AlignmentVector — one space so ticket
// assignment, partyReading, and beliefSplit share a distance vocabulary.
export const PartyBeliefs = z
  .object({
    economicLeftRight: z.number().min(-1).max(1),
    authLibertarian: z.number().min(-1).max(1),
    nationalistGlobalist: z.number().min(-1).max(1),
  })
  .strict();
export type PartyBeliefs = z.infer<typeof PartyBeliefs>;

// Named tickets a legislature actually runs. Absent on a charter that has
// none — a junta does not secretly field Democrats. Two majors map onto
// administration / opposition once the president's ticket is known;
// independent is everyone who caucuses with neither.
export const Party = z.object({
  id: PartyId,
  name: z.string().min(1),
  shortName: z.string().min(1),
  kind: PartyKind,
  /** Where the ticket's members sit on average. Not where all of them sit. */
  beliefs: PartyBeliefs,
  /**
   * How alike this ticket's members read the same act, 0..1.
   *
   * `beliefs` alone cannot tell a party from a bloc. A major party whips: its
   * members read an act close to the platform, so the platform predicts them.
   * Independents are not a party — they are everyone who joined neither — and
   * they are heterogeneous rather than centrist, which is a different fact. A
   * mean near zero with high cohesion would say "this bloc is moderate and
   * votes together"; a mean near zero with low cohesion says "this bloc
   * contains both ends and cancels out", which is the true one and the reason
   * no president can whip it.
   *
   * Every reading taken against a ticket is scaled by this, so a low-cohesion
   * bloc moves little in either direction rather than reliably to the middle.
   */
  cohesion: z.number().min(0).max(1),
});
export type Party = z.infer<typeof Party>;

export const Charter = z.object({
  id: CharterId,
  name: z.string().min(1),
  removalMechanism: RemovalMechanism,
  cabinetRoles: z.array(RoleId).min(1),
  institutions: z.array(Institution).min(1),
  decisionConstraint: z.string().min(1), // the one binding limit on the player's power under this charter
  successionRule: z.string().min(1), // what happens to power absent a removal
  // Role ids are shared vocabulary across charters and the engine; a charter
  // that titles its chairs differently supplies presentation only. Absent
  // titles fall back to the id-derived form.
  roleTitles: z.record(RoleId, z.string().min(1)).optional(),
  parties: z.array(Party).optional(),
});
export type Charter = z.infer<typeof Charter>;
