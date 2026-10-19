import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Campaign, CourtProceeding } from "@admin/engine";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { CourtSystemView } from "./CourtSystemView";
vi.mock("../../map/MapView", () => ({ MapView: ({ title }: { title: string }) => <section aria-label={title} /> }));

vi.mock("../../shell/Door", () => ({ Door: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));

const opening = openingHarnessCampaign();

function filing(id: string, stage: CourtProceeding["stage"], withForum = true): CourtProceeding {
  return { id, subject: { kind: "state-election-access", state: "OH", electionTurn: 30 },
    matter: { title: `Voting access ${id}`, parties: [{ name: "Voter", role: "plaintiff" }],
      injury: "Equipment was unavailable.", jurisdiction: "Federal district court.", question: "Was access denied?",
      authority: "Federal election law.", disputedFacts: "Equipment status.", reliefSought: "Install equipment.", affected: "Voters." },
    filedTurn: opening.turn, stage, nextTurn: opening.turn + 2, history: [],
    ...(withForum ? { lowerForum: { id: "DIST-OHIO-NORTHERN", court: "United States District Court for the Northern District of Ohio",
      circuit: "Sixth", sourceDate: "2026-10-11", authorized: 11, activeRepublican: 6, activeDemocratic: 5, vacancies: 0 } } : {}) };
}

const render = (proceedings: readonly CourtProceeding[], mode: "bench" | "docket" = "docket"): string =>
  renderToStaticMarkup(<CourtSystemView mode={mode} campaign={{ ...opening, judiciary: { ...opening.judiciary, proceedings } } as Campaign} />);

describe("the court-system view", () => {
  it("places a live case once on its path, with its forum, next date and a link to its file", () => {
    const html = render([filing("case:filing-ohio", "interim")]);
    expect(html).toContain("Voting access case:filing-ohio");
    expect(html).toContain("case%3Afiling-ohio");
    expect(html).toContain("Northern District of Ohio");
    expect(html).toContain("Cases before the courts");
    expect(html).toMatch(/data-lane="injunction"[^>]*>.*?<strong>1<\/strong>/s);
  });

  it("keeps a case reachable when its filing forum is not yet recorded", () => {
    const html = render([filing("case:forum-pending", "threshold", false)]);
    expect(html).toContain("Filing forum not yet recorded");
    expect(html).toContain("case%3Aforum-pending");
  });

  it("says plainly when nothing waits on the President and no agreement is recorded yet", () => {
    const html = render([], "bench");
    expect(html).toContain("No court response requires action");
    expect(html).toContain("No two sitting justices have voted in the same recorded case yet");
    expect(html).not.toContain("0% agreement");
    expect(html).not.toContain("court-matrix");
  });

  it("draws every seat of the Court and the votes needed to strike an order", () => {
    const html = render([], "bench");
    expect(html.match(/class="court-bench__seat"/g)).toHaveLength(9);
    expect(html).toContain("votes strike an order");
  });
});
