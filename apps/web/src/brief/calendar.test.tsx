import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { openingHarnessCampaign } from "../map/harness/fixture";
import { BriefCalendar } from "./BriefCalendar";
vi.mock("../shell/Door", () => ({ Door: ({ href, children }: { href: string; children: unknown }) => <a href={href}>{children as never}</a> }));

describe("the presidential calendar", () => {
  it("renders a real month grid with today's date and a truthful sparse agenda", () => {
    const html = renderToStaticMarkup(<BriefCalendar campaign={openingHarnessCampaign()} />);
    expect(html).toContain("Calendar dates");
    expect(html).toContain('aria-current="date"');
    expect(html).toContain("Previous month");
    expect(html).toContain("Next month");
    expect(html).toContain("institutional review windows recorded by the simulation");
    expect(html).not.toContain("Lunch");
  });
});
