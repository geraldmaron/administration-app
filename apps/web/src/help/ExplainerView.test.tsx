import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EXPLAINERS, glossaryEntry } from "@admin/player-core";
import { ExplainerView } from "./ExplainerView";
import { GlossaryCard } from "./GlossaryCard";
import { linkKind } from "./parts";

const full = EXPLAINERS.find((item) => item.thresholds?.length && item.links?.length && item.steps?.length && item.cast?.length);
if (!full) throw new Error("no explainer carries thresholds, links, steps and a cast");

const escaped = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

describe("ExplainerView", () => {
  const html = renderToStaticMarkup(<ExplainerView explainer={full} />);

  it("states each threshold as text beside its bar", () => {
    for (const threshold of full.thresholds ?? []) {
      expect(html).toContain(`${threshold.needed} of ${threshold.of}`);
      expect(html).toContain(escaped(threshold.note));
    }
  });

  it("draws one row per influence, with its direction and weight in words", () => {
    expect(html.match(/class="help-link"/g)).toHaveLength(full.links?.length ?? 0);
    for (const link of full.links ?? []) expect(html).toContain(linkKind(link));
  });

  it("lists the steps as a numbered track and the cast as a list", () => {
    expect(html).toContain('<ol class="help-steps">');
    expect(html.match(/class="help-step"/g)).toHaveLength(full.steps?.length ?? 0);
    expect(html.match(/class="help-cast__member"/g)).toHaveLength(full.cast?.length ?? 0);
  });

  it("leaves out a part the explainer does not have", () => {
    const bare = renderToStaticMarkup(<ExplainerView explainer={{ id: "bare", title: "Bare", summary: "Only a summary." }} />);
    expect(bare).toContain("Only a summary.");
    expect(bare).not.toContain("help-part");
  });
});

describe("GlossaryCard", () => {
  it("shows what the game does with a term and a case", () => {
    const entry = glossaryEntry("approval-rating") ?? { id: "x", term: "Term", definition: "What it is.", inGame: "What the game does.", example: "A case." };
    const card = renderToStaticMarkup(<GlossaryCard entry={entry} />);
    expect(card).toContain(entry.term);
    if (entry.inGame) expect(card).toContain("In this game");
  });
});
