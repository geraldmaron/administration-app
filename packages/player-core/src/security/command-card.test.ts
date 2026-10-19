import { describe, expect, it } from "vitest";
import { assignedFormations, commandEngagement } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { BRANCH_ORDER, commandCards, commandFile } from "./command-board";

const opening = openingCampaign({ seedText: "command-card" });

describe("a combatant command's card", () => {
  it("carries its service shares, formations and engagement counts from the engine", () => {
    for (const card of commandCards(opening)) {
      const runtime = opening.security.unifiedCommand.commands[card.id];
      expect(card.assignment.map((row) => row.branch)).toEqual(BRANCH_ORDER.filter((branch) => runtime.assignment[branch] > 0));
      const formations = BRANCH_ORDER.reduce((sum, branch) => sum + (assignedFormations(opening, card.id, branch) ?? 0), 0);
      expect(card.formations).toBe(formations);
      const engagement = commandEngagement(opening, card.id);
      expect(card.engagedWith).toEqual({ against: engagement?.against.length ?? 0, toward: engagement?.toward.length ?? 0 });
      expect(card.engaged).toBe(engagement !== undefined);
    }
  });

  it("gives the file the same shares the card draws", () => {
    const card = commandCards(opening).find((entry) => entry.assignment.length > 0)!;
    expect(commandFile(opening, card.id)!.assignment).toEqual(card.assignment);
  });
});
