import { describe, expect, it } from "vitest";
import { campaignDay } from "@admin/engine";
import { openingCampaign } from "../__fixtures__/opening";
import { waitingOnYou } from "../desk/brief-matters";
import { buildInbox, markSeen, pruneSeen } from "./inbox";
import { reminderPlan } from "./reminder";
const base = openingCampaign();
const deskBill = {
    id: "bill:act-tax-relief-and-growth:1",
    act: "act-tax-relief-and-growth",
    title: "Tax Relief and Growth Act",
    sponsor: "bipartisan",
    introducedTurn: base.turn,
    status: "on-the-desk",
    presentedOn: base.calendar,
    passage: [],
};
const story = (kind, headline) => ({
    turn: base.turn,
    kind,
    visibility: "public",
    headline,
    actor: "RUS",
    target: "UKR",
    date: base.calendar,
});
const loaded = {
    ...base,
    bills: { ...base.bills, [deskBill.id]: deskBill },
    security: {
        ...base.security,
        warPowers: {
            obligations: [{
                    id: "wpr:FRA:1", target: "FRA", kind: "hostilities", rung: 4,
                    openedDay: campaignDay(base), openedDate: base.calendar, dueDay: campaignDay(base) + 2, description: "Forces introduced.",
                }],
        },
    },
    feed: [...base.feed, story("conflict", "Shelling resumes along the front"), story("drift", "Markets drift lower")],
};
describe("the inbox", () => {
    const inbox = buildInbox(loaded, new Set());
    it("merges the desk, the wire and the calendar as far as it is asked to reach", () => {
        const sources = new Set(buildInbox(loaded, new Set(), { calendarDays: 365 }).items.map((item) => item.source));
        expect([...sources].sort()).toEqual(["calendar", "desk", "news"]);
    });
    it("takes only the stories that change the world", () => {
        const news = inbox.items.filter((item) => item.source === "news");
        expect(news.map((item) => item.title)).toEqual(["Shelling resumes along the front"]);
        expect(news[0]?.actionable).toBe(false);
        expect(news[0]?.entityRefs).toEqual([{ kind: "nation", id: "RUS" }, { kind: "nation", id: "UKR" }]);
    });
    it("does not tell the same obligation twice", () => {
        const titles = inbox.items.map((item) => item.title);
        expect(titles.filter((title) => title === "Report to Congress on France")).toHaveLength(1);
    });
    it("ranks the harder matter first", () => {
        const rank = { hard: 0, soft: 1, ambient: 2 };
        const ranks = inbox.items.map((item) => rank[item.urgency]);
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    });
    it("keeps the same ids on every read, and no id twice", () => {
        const ids = inbox.items.map((item) => item.id);
        expect(buildInbox(loaded, new Set()).items.map((item) => item.id)).toEqual(ids);
        expect(new Set(ids).size).toBe(ids.length);
    });
    it("counts a story or a date as read once it has been seen", () => {
        expect(inbox.unread).toBe(inbox.items.length);
        const first = inbox.items.find((item) => item.source !== "desk");
        const seen = markSeen(new Set(), [first.id]);
        const after = buildInbox(loaded, seen);
        expect(after.unread).toBe(inbox.unread - 1);
        expect(after.items.find((item) => item.id === first.id)?.read).toBe(true);
        expect(after.byUrgency[first.urgency]).toBe(inbox.byUrgency[first.urgency] - 1);
    });
    it("keeps counting a desk matter that has been opened, until it is answered", () => {
        const desk = inbox.items.filter((item) => item.source === "desk");
        expect(desk.length).toBeGreaterThan(0);
        const after = buildInbox(loaded, markSeen(new Set(), inbox.items.map((item) => item.id)));
        expect(after.unread).toBe(desk.length);
        expect(after.items.filter((item) => item.source === "desk").every((item) => !item.read)).toBe(true);
    });
    it("lists exactly what the Brief counts at the desk", () => {
        const { matters, count } = waitingOnYou(loaded);
        const desk = inbox.items.filter((item) => item.source === "desk");
        expect(desk).toHaveLength(count);
        expect(desk.map((item) => item.title).sort()).toEqual(matters.map((matter) => matter.title).sort());
    });
    it("marks and prunes seen ids without touching the caller's set", () => {
        const seen = new Set(["gone"]);
        const marked = markSeen(seen, [inbox.items[0].id]);
        expect([...seen]).toEqual(["gone"]);
        expect([...pruneSeen(marked, inbox)]).toEqual([inbox.items[0].id]);
    });
    it("is derived on read and never writes to the campaign", () => {
        const before = structuredClone(loaded);
        buildInbox(loaded, new Set(["x"]));
        expect(loaded).toEqual(before);
    });
});
describe("a device reminder", () => {
    it("speaks only of what already waits, never of time passing", () => {
        const plan = reminderPlan(buildInbox(loaded, new Set()));
        expect(plan.send).toBe(true);
        expect(plan.badge).toBeGreaterThan(0);
        expect(plan.body).toMatch(/waiting for you/);
        expect(plan.body).not.toMatch(/passed|while you were|since you|later|ago|happened/i);
    });
    it("still reminds of what is owed after everything has been seen, and of nothing else", () => {
        const inbox = buildInbox(loaded, new Set());
        const plan = reminderPlan(buildInbox(loaded, markSeen(new Set(), inbox.items.map((item) => item.id))));
        expect(plan.send).toBe(true);
        expect(plan.badge).toBe(waitingOnYou(loaded).count);
    });
});
