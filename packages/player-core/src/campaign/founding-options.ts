import {
  composeLeader,
  defaultLeaderDraft,
  draftCabinetCandidates,
  generateFoundingPool,
  leaderHookContributions,
  makeCampaignSeed,
  openingElectorate,
  openingPosition,
  resolveFoundingFields,
  runningMateCandidates,
  seatedPeople,
  staffCandidates,
  ticketPresident,
  type Campaign,
  type CampaignSeed,
  type CandidateFit,
  type FoundingChoices,
  type LeaderDraft,
  type LegacyFoundingFields,
  type OpeningPosition,
  type RunningMateCandidate,
} from "@admin/engine";
import {
  defaultFlagDesign,
  worldDataset,
  type Charter,
  type Cradle,
  type Nation,
  type Person,
  type RoleId,
  type WhiteHouseStaffRoleId,
} from "@admin/world";
import { roleTitle } from "../format/figures";

// Everything the founding screen offers is derived from the shipped dataset —
// the shell authors no nations, charters or cradles of its own, so a
// dataset change is immediately visible in the flow with no screen edit.

export type FoundingOptions = {
  readonly seed: CampaignSeed;
  readonly nations: readonly Nation[];
  readonly charters: readonly Charter[];
  readonly cradles: readonly Cradle[];
  readonly pool: readonly Person[];
};

export function foundingOptions(seed: CampaignSeed): FoundingOptions {
  return {
    seed,
    nations: worldDataset.nations.filter((nation) => nation.playable),
    charters: worldDataset.charters,
    cradles: worldDataset.cradles,
    pool: generateFoundingPool(seed, worldDataset),
  };
}

export function charterFor(options: FoundingOptions, charterId: string | undefined): Charter | undefined {
  return options.charters.find((charter) => charter.id === charterId);
}

/**
 * The charter a campaign in play was founded under.
 *
 * Throws rather than falling back to the first charter: the removal arc's
 * mechanism, its narration and its thresholds all come from here, so a silent
 * substitution would hand the player a different constitution's fail state.
 */
export function charterOf(campaign: Campaign): Charter {
  const charter = worldDataset.charters.find((c) => c.id === campaign.founding.charter);
  if (!charter) {
    throw new Error(`This campaign was founded under charter "${campaign.founding.charter}", which the dataset no longer defines.`);
  }
  return charter;
}

/**
 * Whether the world this campaign was founded in still exists.
 *
 * A save can be perfectly intact — right format version, right shape, checksum
 * good — and still be unopenable, because the dataset moved out from under it.
 * A campaign founded under a charter the dataset no longer carries comes back off
 * the device referring to a constitution and a country that are gone.
 *
 * It has to be caught at load. Before this, the first thing to ask for the
 * charter threw — from inside a render, three components deep — and the whole
 * app came down with a stack trace on a save the library had already listed as
 * healthy. The player's real position is that this campaign cannot be
 * continued, which is a sentence the library can say.
 */
export function retiredWorldReason(campaign: Campaign): string | undefined {
  if (!worldDataset.charters.some((charter) => charter.id === campaign.founding.charter)) {
    return `This game was started under "${campaign.founding.charter}", a constitution this version no longer includes, so it can't be continued.`;
  }
  if (!worldDataset.nations.some((nation) => (nation.id as string) === (campaign.founding.nation as string))) {
    return `This game was started as "${campaign.founding.nation}", a country this version no longer includes, so it can't be continued.`;
  }
  return undefined;
}

/**
 * The shortlist per cabinet chair, ranked by fit to the President the player
 * is drafting, which is the order the quick oath seats from. A caller that has
 * not asked for a President yet gets the one the founding opens on, so its
 * lists and `openingChoices`' preselected chairs are always the same ranking.
 */
export function cabinetSlate(
  options: FoundingOptions,
  charter: Charter,
  nation: Nation,
  president: Pick<LeaderDraft, "party" | "ideology"> = defaultLeaderDraft(),
): Readonly<Record<RoleId, readonly Person[]>> {
  return draftCabinetCandidates(charter, nation.id, options.pool, president);
}

/** The composed President, where the draft composes yet, for anything that reads where they are from. */
function composedLeader(options: FoundingOptions, draft: LeaderDraft): Person | undefined {
  const nation = options.nations[0];
  const charter = nation ? charterFor(options, nation.identity.government as string) : undefined;
  const leadRole = charter?.cabinetRoles[0];
  if (!nation || !leadRole) return undefined;
  const composed = composeLeader(draft, nation.id, nation.identity.name, leadRole, charter?.parties ?? []);
  return composed.ok ? composed.person : undefined;
}

/** Everyone the choices already place in a post, so a slate does not offer them again. */
function placedBy(choices: Pick<FoundingChoices, "cabinet" | "runningMate" | "staff">): ReadonlySet<string> {
  return new Set<string>([
    ...Object.values(choices.cabinet).map((id) => id as string),
    ...(choices.runningMate ? [choices.runningMate as string] : []),
    ...Object.values(choices.staff ?? {}).map((id) => id as string),
  ]);
}

/**
 * The running-mate shortlist for the President being drafted, best-balanced
 * first, leaving out anyone already named for another post.
 */
export function runningMateSlate(
  options: FoundingOptions,
  choices: Pick<FoundingChoices, "leader" | "cabinet" | "runningMate" | "staff">,
): readonly RunningMateCandidate[] {
  const nation = options.nations[0];
  if (!nation) return [];
  const president = ticketPresident(choices.leader, composedLeader(options, choices.leader));
  return runningMateCandidates(options.pool, nation.id, president, placedBy({ cabinet: choices.cabinet, staff: choices.staff }));
}

/** The shortlist for one White House post, best fit first, leaving out anyone named for another post. */
export function staffSlate(
  options: FoundingOptions,
  choices: Pick<FoundingChoices, "leader" | "cabinet" | "runningMate" | "staff">,
  post: WhiteHouseStaffRoleId,
): readonly CandidateFit[] {
  const nation = options.nations[0];
  if (!nation) return [];
  const others = Object.fromEntries(Object.entries(choices.staff ?? {}).filter(([role]) => role !== post));
  return staffCandidates(options.pool, nation.id, choices.leader, post, placedBy({ ...choices, staff: others }));
}

function firstCandidatePerSeat(
  slate: Readonly<Record<RoleId, readonly Person[]>>,
): Readonly<Record<RoleId, Person["id"]>> {
  const entries = Object.entries(slate).flatMap(([role, candidates]) => {
    const first = candidates[0];
    return first ? [[role, first.id] as const] : [];
  });
  return Object.fromEntries(entries) as Record<RoleId, Person["id"]>;
}

export const DEFAULT_SEED = makeCampaignSeed("opening");

/**
 * The slate setup opens on: the playable nation, the constitution it names,
 * the homeland cradle, no elective compacts, and the strongest available
 * candidate per seat. The player edits the biography and the Cabinet; the rest
 * is what they inherit on taking office.
 */
export function openingChoices(options: FoundingOptions): FoundingChoices & LegacyFoundingFields {
  const nation = options.nations[0];
  // The nation names its own constitution, and it is not a choice: the
  // dataset ships one playable nation and the charter it governs under.
  const charter =
    options.charters.find((c) => c.id === (nation?.identity.government as string)) ?? options.charters[0];
  const cradle = options.cradles[0];
  if (!nation || !charter || !cradle) {
    throw new Error("The shipped dataset has no playable nation, charter, or cradle to found under.");
  }
  const leader = defaultLeaderDraft();
  // The quick oath's cabinet: the best fit for the President the screen opens
  // on, which is the first name on every shortlist.
  const slate = cabinetSlate(options, charter, nation, leader);
  const leadRole = charter.cabinetRoles[0];
  return {
    nationId: nation.id,
    nationName: nation.identity.name,
    // The player's name lives on the leader draft. This field is what the seal
    // records, and it is written from the composed leader rather than read from
    // here — kept only so the founding contract has one shape before and after.
    name: "",
    title: roleTitle(leadRole ?? "", charter.roleTitles),
    charterId: charter.id,
    cradleId: cradle.id,
    compactIds: [],
    cabinet: firstCandidatePerSeat(slate),
    flag: defaultFlagDesign,
    leader,
  };
}

/**
 * What the campaign would open on if it were sealed right now — recomputed on
 * every keystroke of the founding screen, which is what makes the cabinet a
 * choice with a visible price rather than a form to fill in.
 */
export function openingFor(options: FoundingOptions, choices: FoundingChoices): OpeningPosition | undefined {
  const fields = resolveFoundingFields(worldDataset, choices);
  const nation = options.nations.find((n) => n.id === fields.nationId);
  const charter = charterFor(options, fields.charterId);
  const leadRole = charter?.cabinetRoles[0];
  if (!nation || !leadRole) return undefined;
  // The player is not in the drafted pool — they are composed from the
  // biography they are still editing — so the opening is read against the
  // cabinet *including* them, exactly as sealFounding will read it.
  const leader = composeLeader(choices.leader, nation.id, nation.identity.name, leadRole, charter.parties ?? []);
  const pool = leader.ok ? [...options.pool, leader.person] : options.pool;
  const cabinet = leader.ok ? { ...choices.cabinet, [leadRole]: leader.person.id } : choices.cabinet;
  // The President's own career buys a line too, on the same terms the seal
  // adds it, so the rail's reasons are the seal's reasons.
  return openingPosition(nation, seatedPeople(cabinet, pool), leadRole, (treasury) =>
    leader.ok ? leaderHookContributions(choices.leader, leader.person, leadRole, treasury) : [],
    openingElectorate(options.seed, choices.leader),
  );
}
