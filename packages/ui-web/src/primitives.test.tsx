import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { IconLabel } from "./IconLabel";
import { CompareAuthorize, baselineOf } from "./CompareAuthorize";
import { Movement, movementScale } from "./Movement";
import { Field, Choice, Toggle } from "./Field";
import { Flag } from "./Flag";
import { Gauge } from "./Gauge";
import { Hemicycle, hemicycleSeats } from "./Hemicycle";
import { PartyBar } from "./PartyBar";
import { Portrait } from "./Portrait";
import { Receipt } from "./Receipt";
import { Bar, BarRows, ShareBar } from "./Bar";
import { Countdown, OpenEnded } from "./Countdown";
import { Stages } from "./Stages";
import { Steps, StepsTable } from "./Steps";
import { Series } from "./Series";
import { SideNav } from "./SideNav";
import { Stat } from "./Stat";
import { Collection, pageWindow } from "./Collection";
import { SortHeader, nextSort, sortRows } from "./SortHeader";
import { Tag } from "./Tag";
import { Trend } from "./Trend";
import { WorkSurface } from "./WorkSurface";

// The parts render to static markup here, which is what a screen reader and
// the layout read; pressing and dragging are proven in the browser suite.

const html = (node: ReactElement): string => renderToStaticMarkup(node);

describe("Button", () => {
  it("names its kind and blocks a second press while busy", () => {
    const out = html(<Button kind="commit" busy>Seal</Button>);
    expect(out).toContain("ui-button--commit");
    expect(out).toContain("disabled");
    expect(out).toContain('aria-busy="true"');
  });
});

describe("shadcn integration", () => {
  it("keeps submit and disabled semantics on native shadcn buttons", () => {
    const out = html(<Button type="submit" name="authorize" value="confirm" disabled>Authorize</Button>);
    expect(out).toMatch(/<button[^>]*type="submit"/);
    expect(out).toContain('name="authorize"');
    expect(out).toContain('value="confirm"');
    expect(out).toContain('data-slot="button"');
    expect(out).toContain("disabled");
  });

  it("keeps icon labels together without duplicating the accessible name", () => {
    const out = html(<IconLabel icon="schedule">Calendar</IconLabel>);
    expect(out).toContain('class="ui-icon-label"');
    expect(out).toContain('aria-hidden="true"');
    expect(out).toContain("<span>Calendar</span>");
  });
});

describe("Field, Choice and Toggle", () => {
  it("ties the label, hint and error to the control", () => {
    const out = html(<Field label="Name" hint="As sworn" error="A name is needed">{(props) => <input {...props} />}</Field>);
    const id = /<input id="([^"]+)"/.exec(out)?.[1];
    expect(id).toBeDefined();
    expect(out).toContain(`for="${id}"`);
    expect(out).toContain(`aria-describedby="${id}-hint ${id}-error"`);
    expect(out).toContain('aria-invalid="true"');
    expect(out).toContain('role="alert"');
  });

  it("draws a radio group under one legend with the picked one checked", () => {
    const out = html(<Choice legend="Camera" value="quick" onChange={() => undefined} options={[{ value: "fly", label: "Fly" }, { value: "quick", label: "Quick" }]} />);
    expect(out).toContain("<legend");
    expect(out.match(/type="radio"/g)).toHaveLength(2);
    expect(out).toMatch(/checked="" value="quick"/);
  });

  it("draws a switch", () => {
    expect(html(<Toggle label="High contrast" checked onChange={() => undefined} />)).toContain('role="switch"');
  });
});

describe("readings", () => {
  it("retains a comparison threshold beside each exact reading", () => {
    const out = html(<BarRows label="Disposition" rows={[{ id: "house", label: "House", value: .58, figure: "58%", marks: [{ at: .5, label: "Even at 50%" }] }]} />);
    expect(out).toContain("58%");
    expect(out).toContain('class="ui-bar__mark" style="inset-inline-start:50.00%"');
  });
  it("says a gauge's value and its thresholds", () => {
    const out = html(<Gauge label="Approval" value={0.48} valueText="48%" marks={[{ at: 0.5, label: "Half" }]} />);
    expect(out).toContain('role="meter"');
    expect(out).toContain('aria-valuenow="48"');
    expect(out).toContain('aria-valuetext="48%. Half at 50%"');
  });

  it("clamps a gauge drawn past its scale", () => {
    expect(html(<Gauge label="Pressure" value={1.4} valueText="Over" shape="meter" />)).toContain('aria-valuenow="100"');
  });

  it("states a stat's movement in words as well as an arrow", () => {
    const out = html(<Stat label="Approval" value="48%" delta={{ text: "2 pts", direction: "down" }} period="since last week" />);
    expect(out).toContain("down");
    expect(out).toContain("since last week");
  });

  it("summarizes a series and says what was inherited", () => {
    const out = html(<Series label="Approval" values={[0.5, 0.48, 0.52]} format={(v) => `${Math.round(v * 100)}%`} splitAt={2} splitLabel="inherited" />);
    expect(out).toContain("3 readings, from 50% to 52%");
    expect(out).toContain("The first 2 are inherited");
  });

  it("seats every member of a chamber", () => {
    expect(hemicycleSeats(100)).toHaveLength(100);
    expect(hemicycleSeats(435)).toHaveLength(435);
    expect(hemicycleSeats(0)).toHaveLength(0);
    const out = html(<Hemicycle label="Senate" majority={51} parties={[{ party: "democrat", seats: 47, label: "Democrats" }, { party: "independent", seats: 2, label: "Independents" }, { party: "republican", seats: 51, label: "Republicans" }]} />);
    expect(out.match(/<circle/g)).toHaveLength(100);
    expect(out).toContain("Senate: Democrats 47, Independents 2, Republicans 51 of 100; 51 for a majority.");
  });

  it("prints each party's count beside the bar", () => {
    const out = html(<PartyBar label="House" majority={218} parties={[{ party: "democrat", seats: 213, label: "Democrats" }, { party: "republican", seats: 222, label: "Republicans" }]} />);
    expect(out).toContain("<strong>213</strong>");
    expect(out).toContain("218 for a majority");
  });
});

describe("faces and flags", () => {
  it("draws a face as an image named for the person, or initials when there is none", () => {
    expect(html(<Portrait name="Ada Moore" src="data:image/svg+xml,x" redacted={false} />)).toContain('alt="Ada Moore"');
    expect(html(<Portrait name="Ada Moore" />)).toContain("Ada Moore: portrait redacted");
    const initials = html(<Portrait name="Ada Moore" monogram="AM" redacted={false} />);
    expect(initials).toContain('role="img"');
    expect(initials).toContain('aria-label="Ada Moore"');
  });

  it("says when a flag is missing rather than drawing nothing", () => {
    expect(html(<Flag name="Ohio" />)).toContain("Ohio (no flag on file)");
    expect(html(<Flag name="Ohio" src="/oh.svg" />)).toContain('alt="Flag of Ohio"');
  });
});

describe("compare and authorize", () => {
  const options = [{ id: "wait", label: "Stay as you are", baseline: true }, { id: "act", label: "Enable" }];
  const rows = [{ label: "Ranked", cells: { wait: "Yes", act: "Never" } }];

  it("refuses a comparison with two baselines, and takes one with none", () => {
    expect(() => baselineOf([{ id: "a", label: "Wait", baseline: true }, { id: "b", label: "Hold", baseline: true }])).toThrow(/baseline/);
    expect(baselineOf([{ id: "act", label: "Enable" }])).toBeUndefined();
  });

  it("keeps the verb off until an option is picked where there is no baseline", () => {
    const out = html(<CompareAuthorize title="Answers" options={[{ id: "act", label: "Enable" }]} rows={rows} selected={undefined} onSelect={() => undefined} verb="Enable" onAuthorize={() => undefined} />);
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>.*Enable/);
    expect(out).toContain("Pick an option");
  });

  it("keeps the verb off while the baseline is picked", () => {
    const out = html(<CompareAuthorize title="God Mode" options={options} rows={rows} selected="wait" onSelect={() => undefined} verb="Enable" onAuthorize={() => undefined} />);
    expect(out).toMatch(/<button[^>]*disabled=""[^>]*>.*Enable/);
    expect(out).toContain("Nothing changes.");
  });

  it("says what doing nothing costs when the screen says it is not free", () => {
    const out = html(<CompareAuthorize title="A decision" options={options} rows={rows} selected="wait" baselineReview="Silence costs stability." onSelect={() => undefined} verb="Answer" onAuthorize={() => undefined} />);
    expect(out).toContain("Silence costs stability.");
    expect(out).not.toContain("Nothing changes.");
  });

  it("offers the verb once an act is picked", () => {
    const out = html(<CompareAuthorize title="God Mode" options={options} rows={rows} selected="act" review="This is permanent." onSelect={() => undefined} verb="Enable" onAuthorize={() => undefined} />);
    expect(out).not.toMatch(/<button[^>]*disabled=""/);
    expect(out).toContain("This is permanent.");
  });

  it("keeps a docked verb in place when there is no surface foot to dock into", () => {
    const loose = html(<CompareAuthorize title="A decision" options={options} rows={rows} selected="wait" onSelect={() => undefined} verb="Answer" onAuthorize={() => undefined} />);
    const docked = html(<CompareAuthorize title="A locale act" options={options} rows={rows} selected="wait" onSelect={() => undefined} verb="Answer" onAuthorize={() => undefined} docked />);
    expect(loose).not.toContain("data-docked");
    expect(docked).toContain('data-docked="true"');
    expect(docked).toMatch(/<section[^>]*>.*ui-compare__act.*<\/section>/);
  });

  it("marks a locked option and says why in its row before it is picked", () => {
    const locked = [...options, { id: "force", label: "Federalize", unavailable: "Not available: it needs a declared emergency." }];
    const out = html(<CompareAuthorize title="A locale act" options={locked} rows={rows} selected="wait" onSelect={() => undefined} verb="Answer" onAuthorize={() => undefined} />);
    expect(out.match(/data-locked="true"/g)).toHaveLength(1);
    expect(out).toMatch(/<div class="ui-choice__row[^"]*"[^>]*data-locked="true"[^>]*>.*Federalize.*it needs a declared emergency/);
    expect(out).toMatch(/aria-describedby="[^"]*-force-locked"/);
  });

  it("says a reason every locked option shares once, above the list", () => {
    const why = "It needs a bill.";
    const locked = [...options, { id: "a", label: "Cut", unavailable: why }, { id: "b", label: "Spend", unavailable: why }];
    const out = html(<CompareAuthorize title="Positions" options={locked} rows={rows} selected="wait" onSelect={() => undefined} verb="Adopt" onAuthorize={() => undefined} />);
    expect(out.match(/It needs a bill\./g)).toHaveLength(1);
    expect(out.match(/aria-describedby="[^"]*-locked"/g)).toHaveLength(2);
  });

  it("is one radio group whose rows are the radios, doing nothing first", () => {
    const out = html(<CompareAuthorize title="God Mode" options={[options[1]!, options[0]!]} rows={rows} selected="act" onSelect={() => undefined} verb="Enable" onAuthorize={() => undefined} />);
    expect(out.match(/role="radiogroup"/g)).toHaveLength(1);
    expect(out.match(/type="radio"/g)).toHaveLength(2);
    expect(out.indexOf("Stay as you are")).toBeLessThan(out.indexOf(">Enable</span>"));
    expect(out).toMatch(/class="ui-choice__row[^"]*ui-row-target"[^>]*data-baseline="true"/);
  });

  it("lifts a legacy screen's cost, odds and worst case into the columns, and keeps the rest for the picked row", () => {
    const legacy = [
      { label: "What it does", kind: "lead" as const, cells: { wait: "Nothing", act: "Every lever" } },
      { label: "Cost now", cells: { wait: "Nothing", act: "$4B" } },
      { label: "Chance it works", cells: { wait: "Certain", act: "Likely" } },
      { label: "If it goes wrong", cells: { wait: "Nothing of yours", act: "A recall vote" } },
      { label: "Ranked", cells: { wait: "Yes", act: "Never" } },
    ];
    const closed = html(<CompareAuthorize title="God Mode" options={options} rows={legacy} selected="wait" onSelect={() => undefined} verb="Enable" onAuthorize={() => undefined} />);
    expect(closed).toMatch(/<div class="ui-choice__cost" data-label="Cost now">\$4B<\/div>/);
    expect(closed).toMatch(/<div class="ui-choice__chance" data-label="Chance it works"><span class="ui-visually-hidden">Chance it works: <\/span>Likely<\/div>/);
    expect(closed).toMatch(/ui-choice__worst.*A recall vote/);
    expect(closed).toContain("Every lever");
    expect(closed).not.toContain("Never");
    const open = html(<CompareAuthorize title="God Mode" options={options} rows={legacy} selected="act" onSelect={() => undefined} verb="Enable" onAuthorize={() => undefined} />);
    expect(open).toMatch(/<dt>Ranked<\/dt><dd>Never<\/dd>/);
    expect(open).not.toMatch(/<dt>Cost now<\/dt>/);
    const willingness = html(<CompareAuthorize title="Terms" options={options} rows={legacy.map((row) => row.label === "Chance it works" ? { ...row, label: "Would they accept" } : row)} selected="act" onSelect={() => undefined} verb="Offer" onAuthorize={() => undefined} />);
    expect(willingness).toContain('<span class="ui-visually-hidden">Would they accept: </span>Likely');
  });

  it("draws an option's outcome in place of its rows", () => {
    const outcome = { cost: { text: "Free" }, odds: { share: 0.62, word: "likely", confidence: "moderate" }, effects: [{ metric: "press", label: "Press corps", value: 4, text: "+4 pts", tone: "favorable" as const, unit: "pts", ifWell: 10, ifBadly: -5 }], worstCase: "Press corps −5", details: [{ label: "Who it is with", text: "The whole corps" }] };
    const out = html(<CompareAuthorize title="Plays" options={[options[0]!, { ...options[1]!, outcome }]} rows={rows} selected="act" onSelect={() => undefined} verb="Enable" onAuthorize={() => undefined} />);
    expect(out).toContain("62%");
    expect(out).toContain('<span class="ui-choice__word">likely</span>');
    expect(out).toContain("moderate confidence");
    expect(out).toMatch(/aria-label="Press corps: \+4 pts likely; \+10 if it goes well, −5 if badly, in your favor"/);
    expect(out).toContain("Press corps −5");
    expect(out).toMatch(/<dt>Who it is with<\/dt><dd>The whole corps<\/dd>/);
    expect(out).not.toMatch(/<dt>Ranked<\/dt>/);
  });

  it("names each option's radio by its label alone, so the verdict never joins the name", () => {
    const judged = [{ ...options[0]!, verdict: [{ text: "Nothing changes", valence: "neutral" as const }] }, options[1]!];
    const out = html(<CompareAuthorize title="God Mode" options={judged} rows={rows} selected="wait" onSelect={() => undefined} verb="Enable" onAuthorize={() => undefined} />);
    expect(out).toMatch(/<label class="ui-compare__pick[^"]*"><span id="[^"]+">Stay as you are<\/span><input/);
    expect(out).toContain('data-valence="neutral"');
  });

  it("writes a receipt with its lines and record", () => {
    const out = html(<Receipt title="Sworn in" date="January 20, 2029" lines={[{ label: "Orders signed", value: "2" }]} record="Entered on the Record." />);
    expect(out).toContain("<dt>Orders signed</dt>");
    expect(out).toContain("Entered on the Record.");
    expect(out).toContain('data-glyph="approve"');
  });

  it("does not check off a refused act", () => {
    const out = html(<Receipt title="Appropriation requested and refused" date="March 1, 2029" lines={[]} outcome="refused" />);
    expect(out).toContain('data-outcome="refused"');
    expect(out).toContain('data-glyph="reject"');
    expect(out).not.toContain('data-glyph="approve"');
    expect(out).toContain(">Refused</p>");
  });
});

describe("shell", () => {
  it("marks the current destination and its group, and says how many matters wait there", () => {
    const groups = [
      { id: "desk", label: "Desk", icon: "desk" as const, items: [{ id: "brief", label: "Brief", href: "/brief", icon: "brief" as const, attention: 2 }] },
      { id: "world", label: "World", icon: "world" as const, items: [{ id: "world", label: "World", href: "/world", icon: "world" as const }] },
    ];
    const out = html(<SideNav current="brief" groups={groups} />);
    expect(out).toContain('aria-label="Main"');
    expect(out).toContain('aria-current="page"');
    expect(out).toContain('aria-label="Brief, 2 new, 2 waiting on you"');
    expect(out).toContain('aria-label="Desk, 2 new, 2 waiting on you"');
    expect(out).toContain(">More<");
  });

  it("draws a quiet count once everything waiting has been seen", () => {
    const seen = [{ id: "desk", label: "Desk", icon: "desk" as const, items: [{ id: "brief", label: "Brief", href: "/brief", icon: "brief" as const, waiting: 3 }] }];
    const out = html(<SideNav current="brief" groups={seen} />);
    expect(out).toContain('aria-label="Brief, 3 waiting on you"');
    expect(out).toContain("ui-nav__badge ui-nav__badge--quiet");
    const mixed = [{ id: "desk", label: "Desk", icon: "desk" as const, items: [{ id: "brief", label: "Brief", href: "/brief", icon: "brief" as const, attention: 1, waiting: 3 }] }];
    expect(html(<SideNav current="brief" groups={mixed} />)).toContain('aria-label="Brief, 1 new, 3 waiting on you"');
  });

  it("opens a workspace at full and a panel at half", () => {
    expect(html(<WorkSurface label="Settings" kind="workspace" header={<h1>Settings</h1>}>x</WorkSurface>)).toContain('data-detent="full"');
    expect(html(<WorkSurface label="Brief" header={<h1>Brief</h1>}>x</WorkSurface>)).toContain('data-detent="half"');
  });

  it("offers the same explicit expansion control on a panel and a workspace", () => {
    for (const kind of ["panel", "workspace"] as const) {
      const out = html(<WorkSurface label="File" kind={kind} header={<h1>File</h1>}>x</WorkSurface>);
      expect(out).toContain('aria-label="Expand panel"');
      expect(out).toContain('aria-pressed="false"');
      expect(out).not.toContain('data-expanded');
    }
  });
});

describe("Trend", () => {
  it("says the figure and its change, and draws a line only once there are two readings", () => {
    const out = html(<Trend label="Stability" figure="62%" values={[0.6, 0.61, 0.62]} change={{ text: "+1 pts", direction: "up", good: true, period: "this week" }} />);
    expect(out).toContain('aria-label="Stability: 62%, +1 pts this week"');
    expect(out).toContain('data-good="true"');
    expect(out).toContain("ui-trend__line");
    expect(html(<Trend label="Stability" figure="62%" values={[0.62]} />)).not.toContain("ui-trend__plot");
  });

  it("draws what came before the administration apart from what came after", () => {
    const out = html(<Trend label="Approval" figure="60%" values={[0.5, 0.52, 0.55, 0.6]} splitAt={2} />);
    expect(out).toContain("ui-trend__line--before");
  });
});

describe("Tag", () => {
  it("is text with its tone, and solid only when asked", () => {
    const out = html(<Tag tone="risk" icon="adverse" solid>CRITICAL</Tag>);
    expect(out).toContain('data-tone="risk"');
    expect(out).toContain('data-solid="true"');
    expect(out).toContain("CRITICAL");
    expect(html(<Tag>War</Tag>)).not.toContain("data-solid");
  });
});

describe("Bar", () => {
  it("fills to the value, clamped, and speaks its label with its marks", () => {
    const out = html(<Bar label="Approval" value={1.4} tone="good" marks={[{ at: 0.5, label: "Majority at 50%" }]} />);
    expect(out).toContain("inline-size:100.00%");
    expect(out).toContain('data-tone="good"');
    expect(out).toContain('aria-label="Approval. Majority at 50%"');
    expect(out).toContain("ui-bar__mark");
  });

  it("is decoration where the figure beside it already speaks", () => {
    expect(html(<Bar value={0.4} />)).toContain('aria-hidden="true"');
  });

  it("draws a move from a baseline as a lighter span plus a solid one", () => {
    const out = html(<Bar label="Change" value={0.7} from={0.4} />);
    expect(out).toContain('data-span="base"');
    expect(out).toContain('data-span="move"');
  });

  it("draws a level as a tick on a faint run and a shift as dots at both ends", () => {
    expect(html(<Bar value={0.3} mode="level" />)).toContain("ui-bar__tick");
    const shift = html(<Bar value={0.3} from={0.8} mode="shift" />);
    expect(shift).toContain('data-end="start"');
    expect(shift).toContain('data-end="end"');
  });
});

describe("ShareBar and BarRows", () => {
  it("sizes each part to its share and names every part with its figure", () => {
    const out = html(<ShareBar label="Where it goes" segments={[{ id: "a", label: "Defense", share: 3, figure: "75%" }, { id: "b", label: "Health", share: 1, figure: "25%" }]} />);
    expect(out).toContain("flex-grow:75");
    expect(out).toContain("flex-grow:25");
    expect(out).toContain("Defense");
    expect(out).toContain("75%");
  });

  it("sets each row on one grid with its glyph, bar and figure, the figure inked by the verdict", () => {
    const out = html(<BarRows label="Performance" figureInk rows={[{ id: "a", label: "Delivery", note: "Quality", value: 0.7, figure: "70%", tone: "good" }, { id: "b", label: "Morale", value: 0.2, figure: "20%", tone: "bad" }]} />);
    expect(out.match(/class="ui-bar-row"/g)).toHaveLength(2);
    expect(out).toContain("Quality");
    expect(out).toContain('class="ui-bar-row__figure ui-valence-ink" data-valence="good"');
    expect(out).toContain('aria-label="Performance"');
  });
});

describe("Countdown", () => {
  it("drains a track by the share of the window left, red once a third is left", () => {
    const out = html(<Countdown left={2} window={10} unit="week" dueText="Sept 30" />);
    expect(out).toContain('data-valence="bad"');
    expect(out).toContain("inline-size:20.00%");
    expect(out).toContain('aria-label="2 weeks left of 10, Sept 30"');
  });

  it("says due once nothing is left and draws no track without a window", () => {
    const out = html(<Countdown left={0} unit="day" />);
    expect(out).toContain('aria-label="Due now"');
    expect(out).not.toContain("ui-bar");
  });

  it("says a matter has no deadline instead of drawing one", () => {
    expect(html(<OpenEnded holds note="No rule sets one" />)).toContain("No deadline; No rule sets one; time is held");
  });
});

describe("Stages", () => {
  it("marks the stage it waits at and says every state in words", () => {
    const out = html(<Stages label="Where it stands" stages={[{ id: "a", label: "Drafted", state: "done" }, { id: "b", label: "Signed", state: "now", note: "Aug 1" }, { id: "c", label: "In force", state: "ahead" }]} />);
    expect(out.match(/aria-current="step"/g)).toHaveLength(1);
    expect(out).toContain(", reached");
    expect(out).toContain(", not yet reached");
    expect(out).toContain("Aug 1");
  });

  it("draws an ending in its own state", () => {
    expect(html(<Stages label="Path" stages={[{ id: "a", label: "Withdrawn", state: "ended" }]} />)).toContain(", ended here");
  });
});

describe("Steps as a row", () => {
  it("leads with its glyph and lays out on the group's columns", () => {
    const out = html(
      <StepsTable label="Readings">
        <Steps layout="row" icon="graph" label="Trust" lit={3} steps={5} word="Warm" tone="good" />
      </StepsTable>,
    );
    expect(out).toContain('data-layout="row"');
    expect(out).toContain('role="group" aria-label="Readings"');
    expect(out).toContain("repeat(5, 1fr)");
    expect(out.match(/data-lit="true"/g)).toHaveLength(3);
  });
});

describe("movement", () => {
  it("draws a fall to the left at its share of the largest move, and says its verdict", () => {
    const out = html(<Movement label="Stability" value={-3} scale={6} text="−3 pts" valence="bad" />);
    expect(out).toContain('data-side="fall"');
    expect(out).toContain("--movement-share:0.5");
    expect(out).toContain('aria-label="Stability: −3 pts, against you"');
  });

  it("never divides by a zero scale", () => {
    expect(movementScale([0, 0])).toBe(1);
    expect(movementScale([-4, 2])).toBe(4);
  });
});

describe("shared reading tones", () => {
  it("tones a Stat delta from which direction is better", () => {
    expect(html(<Stat label="Deficit" value="5%" delta={{ text: "-1 pt", direction: "down", better: "down" }} />)).toContain('data-tone="good"');
    expect(html(<Stat label="Deficit" value="5%" delta={{ text: "+1 pt", direction: "up", better: "down" }} />)).toContain('data-tone="bad"');
    expect(html(<Stat label="Deficit" value="5%" delta={{ text: "0", direction: "flat", better: "down" }} />)).toContain('data-tone="neutral"');
  });

  it("carries a Series tone", () => {
    expect(html(<Series label="Approval" values={[0.4, 0.5]} format={(v) => `${v}`} tone="bad" />)).toContain('data-tone="bad"');
  });

  it("pages a long collection, keeps the true total in view and offers every row", () => {
    const out = html(<Collection items={Array.from({ length: 45 }, (_, i) => i)} initial={10} noun="members" render={(n) => <li key={n}>row {n}</li>} />);
    expect(out).toContain("1–10 of 45 members");
    expect(out).toContain("row 9");
    expect(out).not.toContain("row 10<");
    expect(out).toContain('aria-label="Page 5 of 5"');
    expect(out).toContain("Show all 45");
  });

  it("sorts by a column with missing readings last in either direction", () => {
    const rows = [{ n: "b", v: 2 }, { n: "a", v: undefined }, { n: "c", v: 1 }];
    const value = { v: (row: (typeof rows)[number]) => row.v, n: (row: (typeof rows)[number]) => row.n };
    expect(sortRows(rows, { key: "v", direction: "ascending" }, value).map((row) => row.n)).toEqual(["c", "b", "a"]);
    expect(sortRows(rows, { key: "v", direction: "descending" }, value).map((row) => row.n)).toEqual(["b", "c", "a"]);
    expect(sortRows(rows, { key: "n", direction: "ascending" }, value).map((row) => row.n)).toEqual(["a", "b", "c"]);
    expect(nextSort({ key: "v", direction: "ascending" }, "v")).toEqual({ key: "v", direction: "descending" });
    expect(nextSort({ key: "v", direction: "ascending" }, "n", "descending")).toEqual({ key: "n", direction: "descending" });
  });

  it("marks the sorted column for assistive technology", () => {
    const out = html(<table><thead><tr><SortHeader label="Name" sortKey="n" sort={{ key: "n", direction: "descending" }} onSort={() => undefined} /><SortHeader label="Age" sortKey="a" sort={{ key: "n", direction: "descending" }} onSort={() => undefined} /></tr></thead></table>);
    expect(out).toContain('aria-sort="descending"');
    expect(out).toContain('aria-sort="none"');
  });

  it("shows the first, last and neighboring pages with gaps", () => {
    expect(pageWindow(0, 10)).toEqual([0, 1, "gap", 9]);
    expect(pageWindow(5, 10)).toEqual([0, "gap", 4, 5, 6, "gap", 9]);
    expect(pageWindow(1, 3)).toEqual([0, 1, 2]);
  });

  it("spans a table foot over exactly the table's columns", () => {
    const out = html(
      <table>
        <Collection as="tbody" columns={4} items={[1, 2, 3]} initial={1} noun="rows" render={(n) => <tr key={n}><td>{n}</td></tr>} />
      </table>,
    );
    expect(out).toContain('colSpan="4"');
  });
});
