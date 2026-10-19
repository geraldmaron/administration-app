import { describe, it, expect } from "vitest";
import { Person, type PersonId, type RoleId } from "@admin/world";
import { buildCampaign, nationB, person as chancellor } from "./__fixtures__/campaign.js";
import { selectCounselRecord, selectCounselRecordFor } from "./counsel-record.js";
import type { ActionRecord, Campaign } from "./state.js";

const FOREIGN_ROLE = "role-foreign-minister" as RoleId;
const DEFENSE_ROLE = "role-defense-minister" as RoleId;

// A hawk: their instincts back a heavier answer than a démarche, so the
// stances the record reconstructs are the ones the room would actually have
// taken rather than a single flat reading.
const hawk = Person.parse({
  ...chancellor,
  id: "PER-2",
  name: "Ilse Brandt",
  traits: ["hawkish"],
  eligibleRoles: [FOREIGN_ROLE],
});

const dove = Person.parse({ ...hawk, id: "PER-3", name: "Noor Haddad", traits: ["dovish"] });
const measured = Person.parse({ ...hawk, id: "PER-4", name: "Ada Moreau", traits: ["pragmatic"] });

function seated(minister: Person, extra: readonly ActionRecord[] = [], role: RoleId = FOREIGN_ROLE): Campaign {
  const base = buildCampaign();
  return {
    ...base,
    founding: { ...base.founding, cabinet: { ...base.founding.cabinet, [role]: minister.id } },
    people: { ...base.people, [minister.id]: { base: minister, alive: true, currentRole: role } },
    player: { ...base.player, cabinet: { ...base.player.cabinet, [role]: minister.id } },
    ledger: [...base.ledger, ...extra],
  };
}

function call(turn: number, rungName: string, landed: boolean): ActionRecord {
  return {
    turn,
    actor: "player",
    description: landed
      ? `United States uses ${rungName} against Alpland, and it lands.`
      : `United States attempts ${rungName} against Alpland. Alpland rebuffs the approach and nothing moves.`,
  };
}

describe("selectCounselRecord", () => {
  it("scores nothing off an empty record", () => {
    const record = selectCounselRecord(seated(hawk), FOREIGN_ROLE);
    expect(record).toBeDefined();
    expect(record!.contested).toBe(0);
    expect(record!.right).toBe(0);
  });

  it("has no record for a chair nobody holds", () => {
    expect(selectCounselRecord(buildCampaign(), FOREIGN_ROLE)).toBeUndefined();
  });

  it("scores a call right when the chair backed an attempt that landed", () => {
    const record = selectCounselRecord(seated(dove, [call(2, "Private Warning", true)]), FOREIGN_ROLE)!;
    expect(record.calls).toHaveLength(1);
    expect(record.calls[0]!.stance).toBe("for");
    expect(record.contested).toBe(1);
    expect(record.right).toBe(1);
  });

  it("scores the same backing wrong when the attempt failed", () => {
    const record = selectCounselRecord(seated(dove, [call(2, "Private Warning", false)]), FOREIGN_ROLE)!;
    expect(record.contested).toBe(1);
    expect(record.right).toBe(0);
  });

  it("credits opposition that was vindicated", () => {
    const campaign = seated(dove, [call(2, "Limited Strike", false)], DEFENSE_ROLE);
    const record = selectCounselRecord(campaign, DEFENSE_ROLE)!;
    expect(record.calls[0]!.stance).toBe("against");
    expect(record.right).toBe(1);
  });

  it("leaves a hedge out of the arithmetic rather than scoring it as a miss", () => {
    // A hawk is the wrong minister for this claim now that counsel is scored on
    // institutional stake as well as temperament: told the answer is a private
    // warning, a hawkish Foreign Minister lands on `against`, which is the
    // honest reading of that chair rather than a hedge. The case needs a
    // minister who genuinely hedges.
    const campaign = seated(measured, [call(2, "Private Warning", false)]);
    const record = selectCounselRecord(campaign, FOREIGN_ROLE)!;
    expect(record.calls[0]!.stance).toBe("wary");
    expect(record.calls).toHaveLength(1);
    expect(record.contested).toBe(0);
  });

  it("derives deterministically from the same record", () => {
    const campaign = seated(dove, [call(2, "Private Warning", true), call(3, "Sever Relations", false)]);
    expect(selectCounselRecord(campaign, FOREIGN_ROLE)).toEqual(selectCounselRecord(campaign, FOREIGN_ROLE));
  });

  it("scores only calls that fall in this minister's own domain", () => {
    // A military rung answers to a chair this cabinet does not seat, so it is
    // nobody's call rather than the foreign minister's.
    const record = selectCounselRecord(seated(dove, [call(2, "Limited Strike", true)]), FOREIGN_ROLE)!;
    expect(record.calls).toEqual([]);
  });

  it("does not hand a new minister their predecessor's record", () => {
    const inherited = seated(dove, [
      call(2, "Private Warning", true),
      { turn: 3, actor: "player", description: `${dove.name} is appointed to the cabinet.` },
      call(4, "Private Warning", true),
    ]);
    const record = selectCounselRecord(inherited, FOREIGN_ROLE)!;
    expect(record.calls.map((c) => c.turn)).toEqual([4]);
  });

  it("ignores a pre-migration entry an authored consequence dressed, which does not say how it went", () => {
    const dressed = seated(dove, [
      { turn: 2, actor: "player", description: "The channel closes quietly, and nobody says which side closed it." },
    ]);
    expect(selectCounselRecord(dressed, FOREIGN_ROLE)!.calls).toEqual([]);
  });

  it("scores an entry an authored consequence dressed, from the stance the room actually took", () => {
    // The same unreadable prose as the case above, over an entry that states
    // its commitment and the counsel that was given on it.
    const dressed = seated(dove, [
      {
        turn: 2,
        actor: "player",
        description: "The channel closes quietly, and nobody says which side closed it.",
        commitment: { instrument: "diplomatic", rung: 1, target: nationB.id, landed: false },
        counsel: { role: FOREIGN_ROLE, person: dove.id, stance: "for", successChance: 0.31 },
      },
    ]);
    const record = selectCounselRecord(dressed, FOREIGN_ROLE)!;
    expect(record.calls).toEqual([
      { turn: 2, instrument: "diplomatic", rung: 1, stance: "for", landed: false },
    ]);
    expect(record.contested).toBe(1);
    expect(record.right).toBe(0);
  });

  it("scores the recorded stance rather than reconstructing one that disagrees with it", () => {
    // A cautious chair that flinched at thin odds: the reconstruction cannot
    // see the odds and would read this as backing. The record says otherwise,
    // and the record is what the minister is held to.
    const flinched = seated(dove, [
      {
        turn: 2,
        actor: "player",
        description: "United States uses Private Warning against Alpland, and it lands.",
        commitment: { instrument: "diplomatic", rung: 1, target: nationB.id, landed: true },
        counsel: { role: FOREIGN_ROLE, person: dove.id, stance: "against", successChance: 0.12 },
      },
    ]);
    const record = selectCounselRecord(flinched, FOREIGN_ROLE)!;
    expect(record.calls[0]!.stance).toBe("against");
    expect(record.right).toBe(0);
  });
});

describe("selectCounselRecordFor", () => {
  it("finds the record by person, and has none for someone out of office", () => {
    const campaign = seated(dove, [call(2, "Private Warning", true)]);
    expect(selectCounselRecordFor(campaign, dove.id)!.role).toBe(FOREIGN_ROLE);
    expect(selectCounselRecordFor(campaign, "PER-404" as PersonId)).toBeUndefined();
  });
});

describe("being overruled", () => {
  // The record is composed from commitments the player actually made, so the
  // chair's own stance on each one is the whole account of whether they were
  // listened to. This is the reading a dossier needs to explain a minister's
  // standing: right and heeded are different facts about the same call.
  it("counts the calls the player went against, separately from the ones they got wrong", () => {
    const overruled = seated(dove, [
      {
        turn: 2,
        actor: "player",
        description: "United States uses Private Warning against Alpland, and it lands.",
        commitment: { instrument: "diplomatic", rung: 1, target: nationB.id, landed: true },
        counsel: { role: FOREIGN_ROLE, person: dove.id, stance: "against", successChance: 0.6 },
      },
      {
        turn: 3,
        actor: "player",
        description: "United States uses Private Warning against Alpland, and it lands.",
        commitment: { instrument: "diplomatic", rung: 1, target: nationB.id, landed: true },
        counsel: { role: FOREIGN_ROLE, person: dove.id, stance: "for", successChance: 0.6 },
      },
    ]);
    const record = selectCounselRecord(overruled, FOREIGN_ROLE)!;
    expect(record.contested).toBe(2);
    expect(record.overruled).toBe(1);
    // Overruled and wrong are not the same call: the chair that was argued
    // down on turn 2 was also the one proved wrong by it.
    expect(record.right).toBe(1);
  });

  // A hedge is not a position, so it cannot be a position the player rejected.
  it("does not count a wary reading as an overruling", () => {
    const hedged = seated(dove, [
      {
        turn: 2,
        actor: "player",
        description: "United States uses Private Warning against Alpland, and it lands.",
        commitment: { instrument: "diplomatic", rung: 1, target: nationB.id, landed: true },
        counsel: { role: FOREIGN_ROLE, person: dove.id, stance: "wary", successChance: 0.5 },
      },
    ]);
    const record = selectCounselRecord(hedged, FOREIGN_ROLE)!;
    expect(record.contested).toBe(0);
    expect(record.overruled).toBe(0);
  });
});
