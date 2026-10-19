import { describe, expect, it } from "vitest";
import { SHARED_CREDIT_FRACTION, apply, projectLobbying, transmittableActs, type Bill, type Campaign, type LobbyApproach } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { deskComparison, deskPacket, extensionNotices, lobbyComparison, lobbyPacket, transmitComparison, transmitPacket } from "./congress-acts";
import { committeeReadings, delegationReading, hillPostReading, hillPosts } from "./hill-reading";

const base = openingCampaign();

const onDesk: Bill = {
  id: `bill:act-tax-relief-and-growth:${base.turn}`,
  act: "act-tax-relief-and-growth",
  title: "Tax Relief and Growth Act",
  sponsor: "bipartisan",
  introducedTurn: base.turn,
  status: "on-the-desk",
  presentedOn: base.calendar,
  passage: [
    { chamber: "house", yeas: 231, nays: 199, required: 218, passed: true },
    { chamber: "senate", yeas: 61, nays: 39, required: 60, passed: true },
  ],
};
const withDesk: Campaign = { ...base, bills: { ...base.bills, [onDesk.id]: onDesk } };

describe("signing or returning a bill", () => {
  it("compares signing and vetoing, with the unsigned deadline said beside them", () => {
    const comparison = deskComparison(withDesk, onDesk.id)!;
    expect(comparison.columns.map((column) => column.id)).toEqual(["sign", "veto"]);
    expect(comparison.waiting).toMatch(/becomes law without your signature/);
    const sign = comparison.columns[0]!;
    expect(sign.refusal).toBeUndefined();
    expect(sign.cells["hill"]!.lines[0]).toMatch(/^Warms from \d+% to \d+%$/);
    expect(comparison.columns[1]!.cells["hill"]!.lines[0]).toMatch(/^Cools from/);
    expect(comparison.columns[1]!.cells["override"]!.lines[0]).toBe("No one knows yet if Congress can override");
  });

  it("has nothing to compare once the bill is off the desk", () => {
    expect(deskComparison(base, onDesk.id)).toBeUndefined();
  });

  it("commits the signature the comparison priced, and refuses a veto with no message", () => {
    const comparison = deskComparison(withDesk, onDesk.id)!;
    const signed = apply(withDesk, deskPacket(withDesk, onDesk.id, "sign", ""));
    expect(signed.bills[onDesk.id]!.status).toBe("law");
    expect(comparison.columns[0]!.cells["hill"]!.lines[0]).toContain(`${Math.round(signed.congress.disposition * 100)}%`);
    expect(() => deskPacket(withDesk, onDesk.id, "veto", "  ")).toThrow(/message/);
    expect(apply(withDesk, deskPacket(withDesk, onDesk.id, "veto", "It costs too much.")).bills[onDesk.id]!.status).toBe("vetoed");
  });
});

describe("sending a bill up", () => {
  it("offers each bill the administration could write", () => {
    const comparison = transmitComparison(base);
    expect(comparison.columns.map((column) => column.id)).toEqual(transmittableActs(base).map((act) => act.id));
  });

  it("puts the transmitted bill in committee", () => {
    const act = transmittableActs(base)[0];
    if (!act) return;
    const sent = apply(base, transmitPacket(base, act.id));
    expect(Object.values(sent.bills).some((entry) => entry.act === act.id && entry.status === "in-progress")).toBe(true);
    expect(transmitComparison(sent).columns.every((column) => column.refusal !== undefined)).toBe(true);
  });
});

describe("working a member", () => {
  it("compares every play against leaving them be, and books the one authorized", () => {
    const comparison = lobbyComparison(base, "post-house-speaker")!;
    expect(comparison.columns.map((column) => column.id)).toEqual(["call", "trade", "public", "credit", "campaign"]);
    expect(comparison.columns[0]!.cells["odds"]!.lines[0]).toMatch(/confidence$/);
    const worked = apply(base, lobbyPacket(base, "post-house-speaker", "call"));
    expect(Object.values(worked.issuedActs ?? {}).some((act) => act.kind === "lobby" && act.post === "post-house-speaker")).toBe(true);
    expect(lobbyComparison(worked, "post-house-speaker")!.columns[0]!.refusal).toMatch(/already being worked/);
    expect(hillPostReading(worked, "post-house-speaker")!.pending).toMatch(/^Private call in progress\./);
  });
});

describe("the acts aimed at one member", () => {
  const speaker = "post-house-speaker" as const;
  const cell = (id: string, row: string, campaign: Campaign = base) =>
    lobbyComparison(campaign, speaker)!.columns.find((column) => column.id === id)!.cells[row]!;

  it("names who resents a play, and prices each one from the projection the commit charges", () => {
    for (const id of ["call", "trade", "public", "credit", "campaign"]) {
      const projection = projectLobbying(base, speaker, id as LobbyApproach)!;
      const resents = cell(id, "resents");
      if (projection.resentments.length === 0) expect(resents.lines).toEqual(["No one else"]);
      else {
        expect(resents.stance).toBe("adverse");
        for (const entry of projection.resentments) expect(resents.lines.some((line) => line.startsWith(`${entry.name}: `))).toBe(true);
      }
    }
  });

  it("shows the credit given away on a live bill, and refuses it with none", () => {
    expect(lobbyComparison(base, speaker)!.columns.find((column) => column.id === "credit")!.refusal).toMatch(/no credit to share/);
    const live: Bill = { ...onDesk, id: `bill:act-infrastructure-investment:${base.turn}`, act: "act-infrastructure-investment", title: "Infrastructure Investment Act", status: "in-progress", stage: "referral" };
    const withLive: Campaign = { ...base, bills: { ...base.bills, [live.id]: live } };
    const share = Math.round(SHARED_CREDIT_FRACTION * 100);
    expect(cell("credit", "cost", withLive).lines.some((line) => line.startsWith(`${share}% of the credit for`))).toBe(true);
  });

  it("shows what a campaign stop costs in the member's state", () => {
    const projection = projectLobbying(base, speaker, "campaign")!;
    if (!projection.campaign) {
      expect(lobbyComparison(base, speaker)!.columns.find((column) => column.id === "campaign")!.refusal).toMatch(/home state/);
      return;
    }
    expect(cell("campaign", "cost").lines.some((line) => line.startsWith(`Your support in ${projection.campaign!.stateName} goes from`))).toBe(true);
    expect(cell("campaign", "member").lines.some((line) => line.startsWith("Trust in your word:"))).toBe(true);
  });

  it("names every play in the Hill post's history and pending line", () => {
    const worked = apply(base, lobbyPacket(base, speaker, "campaign"));
    expect(hillPostReading(worked, speaker)!.pending).toMatch(/^Campaign at home in progress\./);
  });
});

describe("war-powers notices", () => {
  it("owes nothing when no force has been introduced", () => {
    expect(extensionNotices(base)).toEqual([]);
  });
});

describe("the Hill as people and panels", () => {
  it("reads every seated leader with a standing and a door", () => {
    const posts = hillPosts(base);
    expect(posts).toHaveLength(base.congress.leadership.length);
    for (const post of posts) {
      expect(post.href).toMatch(/^\/washington\/congress\/post\/post-/);
      expect(["With you", "Even", "Cool", "Against"]).toContain(post.standing.word);
    }
    expect(hillPostReading(base, "post-nobody")).toBeUndefined();
  });

  it("lists every committee, the investigating ones first", () => {
    const committees = committeeReadings(base);
    expect(committees.length).toBeGreaterThan(10);
    const firstQuiet = committees.findIndex((committee) => committee.inquiries.length === 0);
    expect(committees.slice(firstQuiet).every((committee) => committee.inquiries.length === 0)).toBe(true);
  });

  it("reads a state's delegation as the campaign seats it", () => {
    const ca = delegationReading(base, "CA")!;
    expect(ca.house.democrat + ca.house.republican + ca.house.independent).toBe(ca.house.seats);
    expect(ca.senators).toHaveLength(2);
    expect(delegationReading(base, "DC")!.senators).toEqual([]);
  });
});
