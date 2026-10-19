import { describe, expect, it } from "vitest";
import { createRngStreams, makeCampaignSeed, openConversation, sealFounding } from "@admin/engine";
import { worldDataset } from "@admin/world";
import { foundingOptions, openingChoices } from "../campaign/founding-options";
import { decisionComparison } from "./decision-comparison";
import { decisionOutcomes } from "./decision-outcomes";
import { pendingConversations } from "./scripts";

const seed = makeCampaignSeed("surface-audit-a");
const choices = openingChoices(foundingOptions(seed));
const campaign = sealFounding(seed, worldDataset, { ...choices, leader: { ...choices.leader, name: "Alex Harlan" } });
const cast = pendingConversations(campaign)[0]!;
const thread = openConversation(campaign, cast.script, createRngStreams(campaign.seed));
const table = decisionComparison(campaign, cast.script, thread.replies, "The other government");
const outcomes = decisionOutcomes(table);

describe("a decision as a results list", () => {
  it("gives every answer one outcome, in option order, with no row for leaving it", () => {
    expect(outcomes).toHaveLength(table.options.length);
    expect(table.options.map((option) => option.id)).toEqual(thread.replies.map((reply) => reply.option.id));
  });

  it("draws every banded move the comparison holds, and no other", () => {
    outcomes.forEach((outcome, index) => {
      const impacts = table.rows.filter((row) => (row.topic === "effect" || row.topic === "relationship") && row.cells[index]!.kind === "impact");
      expect(outcome.effects.map((effect) => effect.metric)).toEqual(impacts.map((row) => row.id));
      for (const effect of outcome.effects) {
        expect(effect.unit).toBe("band");
        expect(Math.abs(effect.value)).toBeGreaterThanOrEqual(1);
        expect(Math.abs(effect.value)).toBeLessThanOrEqual(3);
      }
    });
  });

  it("carries odds only where the comparison has a chance, at the chance shown", () => {
    const odds = table.rows.find((row) => row.id === "odds")!;
    outcomes.forEach((outcome, index) => {
      const cell = odds.cells[index]!;
      if (cell.kind === "chance") expect(outcome.odds?.share).toBe(cell.chance);
      else expect(outcome.odds).toBeUndefined();
    });
  });

  it("prices the cost from the cost row, and calls nothing up front free", () => {
    const cost = table.rows.find((row) => row.id === "cost")!;
    outcomes.forEach((outcome, index) => {
      const cell = cost.cells[index]!;
      if (cell.kind === "money") expect(outcome.cost.figure?.value).toBe(cell.amount);
      else expect(outcome.cost.figure).toBeUndefined();
    });
  });

  it("says what each answer says in its detail", () => {
    outcomes.forEach((outcome, index) => expect(outcome.details[0]).toEqual({ label: "What you say", text: table.options[index]!.text }));
  });
});


it("carries borrowing through the choice model instead of hiding it in selected-row details", () => {
  const withDebt = { ...table, rows: [...table.rows.filter((row) => row.id !== "debt"), { id: "debt", topic: "money" as const, label: "Added debt, first year",
    cells: table.options.map(() => ({ kind: "money" as const, amount: -100, text: "About +$100M (broad estimate, actual cost may differ)" })) }] };
  expect(decisionOutcomes(withDebt)[0]!.cost.borrowing).toEqual({ amount: -100, text: "About +$100M (broad estimate, actual cost may differ)" });
});
