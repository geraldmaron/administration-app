import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NAMED_PALETTE, regionTable } from "./__fixtures__/map-fixtures";
import { openingHarnessCampaign } from "./harness/fixture";
import { lensRows } from "./lenses/contract";
import { resolveLens } from "./lenses/registry";
import { MapDataList, type MapDataListProps } from "./MapDataList";
import { clusterMarks } from "./marks/cluster";

const noop = () => undefined;

function render(overrides: Partial<MapDataListProps>): string {
  const lens = resolveLens("approval", openingHarnessCampaign(), NAMED_PALETTE);
  const props: MapDataListProps = {
    open: true,
    onToggle: noop,
    lensName: lens.name,
    levelName: "state",
    legend: lens.legend,
    rows: lensRows(lens, regionTable(), "state"),
    marks: [],
    onPreview: noop,
    onChoose: noop,
    onChooseMark: noop,
    ...overrides,
  };
  return renderToStaticMarkup(<MapDataList {...props} />);
}

describe("the accessible lens list", () => {
  it("is a captioned table with one row header per state and the reading beside it", () => {
    const html = render({});
    expect(html).toContain("<caption");
    expect(html).toContain("Approval by state, ranked. Arrow keys move through the list.");
    expect(html.match(/<th scope="row">/g)).toHaveLength(51);
    expect(html).toMatch(/<td>\d+% approve<\/td>/);
    expect(html).toContain("Approval by state, by state");
  });

  it("opens ranked by reading, highest first, and sorts by either column", () => {
    const html = render({});
    expect(html).toMatch(/<th scope="col" aria-sort="none"[^>]*><button[^>]*><span class="ui-sort__label">Place/);
    expect(html).toMatch(/<th scope="col" aria-sort="descending"[^>]*><button[^>]*><span class="ui-sort__label">Reading/);
  });

  it("puts exactly one row in the tab order", () => {
    const html = render({});
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(50);
  });

  it("names the toggle by what it does and reports its state", () => {
    expect(render({ open: false })).toContain('aria-expanded="false"');
    expect(render({ open: false })).toContain("Show the map data as a list");
    expect(render({ open: true })).toContain("Hide the map data");
  });

  it("says when the lens colors nothing, and lists the pins as the marks' twins", () => {
    const marks = clusterMarks([{ mark: { id: "x", kind: "incident", label: "Flooding", where: "Ohio", lon: 0, lat: 0, weight: 1, members: ["x"] }, x: 0, y: 0 }]);
    const html = render({ rows: [], marks });
    expect(html).toContain("This lens colors nothing here.");
    expect(html).toContain("Pinned on the map");
    expect(html).toContain("Flooding, Ohio");
  });
});
