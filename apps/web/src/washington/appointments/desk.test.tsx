import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { apply, dismissMinister, type Campaign, type EffectPacket } from "@admin/engine";
import type { RoleId } from "@admin/world";
import { openingHarnessCampaign } from "../../map/harness/fixture";
import { AppointmentDesk } from "./AppointmentDesk";

vi.mock("../../shell/Door", () => ({ Door: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a> }));
vi.mock("../../nation/economy/commit", () => ({ useNationCommit: () => ({ busy: false, problem: "", committed: undefined, commit: async () => undefined, dismiss: () => undefined }) }));

/** The founding with the Treasury emptied and the Chief Justice retired: one cabinet seat, one court seat. */
function openDesk(): Campaign {
  const base = openingHarnessCampaign();
  const dismissal = dismissMinister(base, "role-treasury-minister" as RoleId);
  if (!dismissal.ok) throw new Error(dismissal.reason);
  const emptied = apply(base, dismissal.packet);
  const holder = emptied.institutions["INST-SCOTUS-SEAT-1"]?.leader;
  const retire: EffectPacket = {
    source: "simulate",
    actor: "world",
    turn: emptied.turn,
    narration: { summary: "The Chief Justice retires." },
    effects: [
      ...(holder ? [{ kind: "person" as const, person: holder, changes: { currentRole: undefined, judicialRetired: true as const } }] : []),
      { kind: "institution", institution: "INST-SCOTUS-SEAT-1", vacate: true },
    ],
  };
  return apply(emptied, retire);
}

const open = openDesk();

describe("the appointments desk", () => {
  it("lists the open seats by group, recommends a Treasury nominee and leaves the Chief Justice's seat to the President", () => {
    const html = renderToStaticMarkup(<AppointmentDesk campaign={open} headingId="t" pipeline empty="Nothing is open." />);
    expect(html).toContain("Cabinet (1)");
    expect(html).toContain("Courts (1)");
    expect(html).toContain("Secretary of the Treasury");
    expect(html).toContain("Chief Justice of the United States");
    expect(html).toContain("No nominee picked. A Supreme Court seat is never filled by default.");
    expect(html).toContain("The appointments pipeline");
    expect(html).toContain("Send the nomination");
  });

  it("opens a seat it was sent to, with every candidate against leaving it open", () => {
    const html = renderToStaticMarkup(<AppointmentDesk campaign={open} headingId="t" focus="OFF-TREASURY-SEC" empty="Nothing is open." />);
    expect(html).toContain("Who could be sent for Secretary of the Treasury");
    expect(html).toContain("Leave it open");
    expect(html).toContain("Recommended");
    expect(html).toMatch(/best fits for the seat, of \d+ people its rules allow/);
  });

  it("narrows to one office and says so when it holds nothing", () => {
    const one = renderToStaticMarkup(<AppointmentDesk campaign={open} headingId="t" scope={{ office: "OFF-TREASURY-SEC" }} empty="Nothing is open." />);
    expect(one).not.toContain("Chief Justice of the United States");
    const none = renderToStaticMarkup(<AppointmentDesk campaign={openingHarnessCampaign()} headingId="t" scope={{ group: "courts" }} empty="Nothing is open." />);
    expect(none).toContain("Nothing is open.");
  });
});
