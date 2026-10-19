import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { sealedCampaign } from "./__fixtures__/campaign.js";
import { castScenario, scenarioLive } from "./scenario-cast.js";
import { ScenarioDef } from "./scenario.js";

// Headless playtest for a batch that has not been published yet: cast every
// scenario in a shipped.json against real sealed campaigns — the same
// dataset, the same casting rules, the same placeholder rendering the player
// app uses — and print exactly what a player would read. This is how a batch
// gets looked at before it earns a line in packs/core.ts, without wiring it
// into the app pool first.
//
// A scenario's conditions are turn/relationship/trait gates on when the real
// engine would ever draw it — a fresh campaign at turn 1 legitimately cannot
// show a scenario gated to turn 4. So this only demands clean, placeholder-free
// prose on the boards where the scenario is actually live; on the rest it
// reports why it is dormant rather than failing.
//
// Point SCENARIO_PREVIEW at any shipped.json (from `scenarios review`) or a
// raw array of ScenarioDef; defaults to the most recent batch reviewed in
// this repo. Run with:
//   SCENARIO_PREVIEW=content/reviews/<jobId>/shipped.json pnpm --filter @admin/content exec vitest run scenario-preview

const ShippedFile = z.union([z.object({ scenarios: z.array(ScenarioDef) }), z.array(ScenarioDef)]);

const target = process.env.SCENARIO_PREVIEW ?? "content/reviews/test-loop-0804/shipped.json";
const absolute = path.resolve(process.cwd(), "..", "..", target);

function boardAt(seedLabel: string, turn: number, charterId?: string) {
  const campaign = sealedCampaign(seedLabel, charterId);
  return { ...campaign, turn };
}

describe.skipIf(!existsSync(absolute))(`preview: ${target}`, () => {
  // Read behind the same existence check the skipIf makes: a skipped describe
  // still runs its body during collection, so an unguarded read here fails
  // the whole file the moment the default batch is archived or deleted.
  const raw = existsSync(absolute) ? ShippedFile.parse(JSON.parse(readFileSync(absolute, "utf8"))) : [];
  const defs = Array.isArray(raw) ? raw : raw.scenarios;
  // Turn spread for turn-gated conditions, and one charter that actually
  // seats every institution kind — sealedCampaign()'s default charter
  // (charter-usa-constitution) has no judiciary, so a charterInstitution
  // condition on it can never be met, and a scenario gated on one would look
  // permanently dormant here for a reason that has nothing to do with its
  // own correctness.
  // A follow-up waits on flags earlier answers stamped, and a fresh board has
  // stamped nothing — so one board carries every flag the batch waits on, the
  // way a campaign that took those doors would. Without it, every follow-up
  // reads as dormant for a reason that has nothing to do with its correctness.
  const waitedOn = Object.fromEntries(
    defs
      .flatMap((def) => def.conditions)
      .filter((condition) => condition.kind === "flag" && condition.is)
      .map((condition) => [(condition as { flag: string }).flag, true as const]),
  );
  const withFlags = (campaign: ReturnType<typeof boardAt>) => ({
    ...campaign,
    player: { ...campaign.player, flags: { ...campaign.player.flags, ...waitedOn } },
  });
  // Every sealed campaign is a healthy one: full treasury, stability well over
  // half, no removal pressure. So content written for a government in trouble —
  // the auction that fails, the square that fills, the oath nobody will take —
  // was unpreviewable for the same reason a follow-up was, and the harness
  // reported it as dormant rather than as untested. One board is a campaign
  // that has been going badly, which is the other half of the game.
  const strained = (campaign: ReturnType<typeof boardAt>) => ({
    ...campaign,
    player: {
      ...campaign.player,
      metrics: {
        ...campaign.player.metrics,
        approval: 0.24,
        treasury: campaign.player.metrics.treasury * 0.6,
        stability: 0.42,
        standing: 0.31,
      },
    },
    // The removal arc is stored on the campaign and only recomputed by the
    // turn loop, so a preview board that never takes a turn has to carry the
    // pressure rather than imply it from a low approval.
    removal: { ...campaign.removal, pressure: 0.45 },
  });
  const boards = [
    boardAt("preview-1", 1),
    boardAt("preview-2", 4),
    withFlags(boardAt("preview-3", 8)),
    boardAt("preview-4", 5, "charter-presidential-republic"),
    strained(boardAt("preview-5", 9)),
  ];

  for (const def of defs) {
    it(`casts and renders cleanly wherever it is live: ${def.id}`, () => {
      let sawLive = false;
      for (const campaign of boards) {
        const cast = castScenario(campaign, def);
        if (def.cast.pick !== "none") {
          expect(cast, `${def.id} never bound a counterpart on a board at turn ${campaign.turn}`).toBeDefined();
        }
        if (!cast) continue;
        const live = scenarioLive(campaign, def, cast.counterpart);
        if (!live) {
          console.log(`\n[${def.id}] dormant at turn ${campaign.turn} — conditions not yet met on this board`);
          continue;
        }
        sawLive = true;

        console.log(`\n${"=".repeat(70)}\n${def.id}  [${def.class} / ${def.cast.pick}]  turn ${campaign.turn}  weight ${cast.weight.toFixed(2)}`);
        if (cast.locus) console.log(`  @ ${cast.locus.placeName} — ${cast.locus.descriptor}`);
        console.log(`  SUBJECT: ${cast.script.subject}`);
        for (const beat of cast.script.opening) {
          const who = beat.speaker.kind === "cabinet" ? `cabinet:${beat.speaker.role}` : beat.speaker.kind;
          console.log(`  [${who}] ${beat.text}`);
        }
        for (const option of cast.script.options) {
          const cost =
            option.commitment.kind === "position"
              ? JSON.stringify(option.commitment.cost)
              : option.commitment.kind === "join"
                ? `join ${option.commitment.side}`
                : `${option.commitment.instrument} rung ${option.commitment.rung}`;
          console.log(`    -> [${option.tone}] ${option.text}  (${cost})`);
        }

        const copy = [cast.script.subject, ...cast.script.opening.map((beat) => beat.text), ...cast.script.options.map((opt) => opt.text)];
        for (const text of copy) expect(text, `${def.id} at turn ${campaign.turn}`).not.toContain("{{");
      }
      expect(sawLive, `${def.id} was never live on any of the ${boards.length} preview boards (turns ${boards.map((b) => b.turn).join(", ")}) — widen the boards or check the conditions`).toBe(true);
    });
  }
});
