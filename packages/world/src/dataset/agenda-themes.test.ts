import { describe, expect, it } from "vitest";
import { AGENDA_THEMES, agendaTheme, allCandidateAgendaIds } from "./agenda-themes.js";

describe("agenda themes", () => {
  it("classifies every agenda any nation can roll", () => {
    const unclassified = allCandidateAgendaIds().filter((id) => !agendaTheme(id));
    expect(unclassified, `agendas with no theme: ${unclassified.join(", ")}`).toEqual([]);
  });

  it("classifies into the declared theme set only", () => {
    for (const id of allCandidateAgendaIds()) {
      expect(AGENDA_THEMES).toContain(agendaTheme(id));
    }
  });

  it("reads aims apart rather than collapsing them into one theme", () => {
    const used = new Set(allCandidateAgendaIds().map((id) => agendaTheme(id)));
    expect(used.size).toBe(AGENDA_THEMES.length);
    // No single theme may swallow the pool — that would make every nation want
    // the same instrument regardless of what it was authored to be after.
    for (const theme of AGENDA_THEMES) {
      const share = allCandidateAgendaIds().filter((id) => agendaTheme(id) === theme).length / allCandidateAgendaIds().length;
      expect(share, `${theme} share`).toBeLessThan(0.5);
    }
  });

  it("is stable for a known aim", () => {
    expect(agendaTheme("deterrence-through-arsenal")).toBe("security");
    expect(agendaTheme("export-led-growth")).toBe("economic");
    expect(agendaTheme("permanent-neutrality")).toBe("autonomy");
    expect(agendaTheme("alliance-leadership")).toBe("prestige");
    expect(agendaTheme("institution-rebuilding")).toBe("internal");
  });

  it("has no theme for an agenda it has never seen", () => {
    expect(agendaTheme("not-a-real-agenda")).toBeUndefined();
  });
});
