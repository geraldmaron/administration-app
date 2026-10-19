import { describe, expect, it } from "vitest";
import { subjectHref, subjectHrefWith, SUBJECTS } from "../shell/subject";
import { PLACES, place } from "./places";
describe("places", () => {
    it("gives every fixed place its own href inside the app", () => {
        const hrefs = Object.keys(PLACES).map((key) => PLACES[key].href);
        expect(new Set(hrefs).size).toBe(hrefs.length);
        expect(hrefs.every((href) => href.startsWith("/"))).toBe(true);
    });
    it("files every moded place under its own mode's root", () => {
        const misfiled = Object.keys(PLACES).filter((key) => {
            const { href, mode } = PLACES[key];
            const pathname = href.split(/[?#]/, 1)[0];
            return mode !== undefined && pathname !== `/${mode}` && !pathname.startsWith(`/${mode}/`);
        });
        expect(misfiled).toEqual([]);
    });
    it("builds the screens that need an id, encoding the id as one segment", () => {
        expect(place.decision("SCN 1")).toBe("/brief/decision/SCN%201");
        expect(place.office("OFF-STATE-SEC")).toBe("/washington/office/OFF-STATE-SEC");
        expect(place.bill("bill/7")).toBe("/washington/congress/bill/bill%2F7");
        expect(place.country("VEN")).toBe("/world/nation/VEN");
        expect(place.countryAct("VEN")).toBe("/world/nation/VEN/act");
        expect(place.event("evt-3")).toBe("/record/event/evt-3");
    });
    it("detaches a district as a query on its state", () => {
        expect(place.district("CA-12")).toBe("/nation/state/CA?district=CA-12");
        expect(place.district("WY-AL")).toBe("/nation/state/WY?district=WY-AL");
    });
});
describe("subject hrefs on the place tree", () => {
    const ref = (kind) => (kind === "dispatch" ? { kind, index: 2 } : { kind, id: "X-1" });
    it("opens every subject inside one of the five modes", () => {
        const outside = Object.keys(SUBJECTS).filter((kind) => !/^\/(brief|washington|nation|world|record)\//.test(subjectHref(ref(kind))));
        expect(outside).toEqual([]);
    });
    it("adds extra query beside one the subject already carries, and refuses to overwrite the id", () => {
        expect(subjectHrefWith({ kind: "district", id: "CA-12" }, { tab: "votes" })).toBe("/nation/state/CA?district=CA-12&tab=votes");
        expect(subjectHrefWith({ kind: "nationAct", id: "VEN" }, { goal: "trade" })).toBe("/world/nation/VEN/act?goal=trade");
        expect(() => subjectHrefWith({ kind: "district", id: "CA-12" }, { district: "CA-1" })).toThrow();
    });
});
describe("place.metric", () => {
    it("sends the authority to its budget view and stability to the emergency board", () => {
        expect(place.metric("treasury")).toBe("/nation/budget?view=authority");
        expect(place.metric("stability")).toBe("/nation/emergency");
        expect(place.metric("militaryReadiness")).toBe("/world/security");
    });
    it("keeps a page of its own for a reading no screen owns yet", () => {
        expect(place.metric("standing")).toBe("/world");
    });
});
