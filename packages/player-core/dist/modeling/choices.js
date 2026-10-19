import { commitReply, executiveOrder, projectBudgetDraft, requestAppropriation, signOrder, } from "@admin/engine";
import { castStillBound, rememberReply } from "@admin/content";
import { charterOf } from "../campaign/founding-options";
import { withHeldRemoval } from "../conversation/docket-removal";
import { scenarioDispositionPackets } from "../conversation/scenario-dispositions";
import { BUNDLED_CONSEQUENCES, pendingConversations } from "../conversation/scripts";
import { ORDER_SIGN } from "../policy/order-desk";
import { buildModelingAct } from "./acts";
// The choices a screen can project forward, and the alternatives of each. Every
// alternative builds its packets with the same engine call the screen that owns
// the choice commits with, and carries that screen's own option id, so a
// projection lands on the row it describes and what it charges at week zero is
// the act's own price and nothing priced here. Each choice also runs one path
// no screen offers: the world with nothing approved, the zero every
// alternative's forecast is read from (DECISIONS §8.13).
/** The id of the run with nothing approved; no screen lists it as an option. */
export const UNTOUCHED = "untouched";
/** The budget request's one option, as the request screen names it. */
export const BUDGET_SEND = "send";
/** One text per choice, so a hook can tell the same choice from a new one without comparing objects. Account order is fixed so equal drafts key alike. */
export function modelingChoiceKey(spec) {
    if (spec.kind === "acts")
        return `acts:${JSON.stringify(spec.alternatives)}`;
    if (spec.kind !== "budget-draft")
        return `${spec.kind}:${spec.id}`;
    const lines = Object.entries(spec.draft).sort(([a], [b]) => a.localeCompare(b)).map(([account, share]) => `${account}=${share}`);
    return `budget-draft:${lines.join(",")}`;
}
const NOTHING = { ok: true, packets: [] };
function held(campaign, packets) {
    return { ok: true, packets: packets.map((packet) => withHeldRemoval(campaign, packet)) };
}
const capitalized = (text) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
function replyAlternative(cast, option) {
    return {
        id: option.id,
        label: capitalized(option.tone),
        baseline: false,
        build: (campaign, streams) => {
            if (!castStillBound(campaign, cast))
                return { ok: false, reason: "The situation behind this decision is already over." };
            const result = commitReply(campaign, cast.script, option, streams, { consequences: BUNDLED_CONSEQUENCES });
            if (!result.ok)
                return { ok: false, reason: result.missingCapability };
            return held(campaign, [rememberReply(campaign, result.packet, cast, option.id)]);
        },
    };
}
function decisionChoice(campaign, spec) {
    const cast = pendingConversations(campaign).find((entry) => entry.def.id === spec.id);
    if (!cast)
        return undefined;
    const unanswered = {
        id: UNTOUCHED,
        label: cast.orderCase?.posture === "adverse-lower" ? "If the lower judgment stands" : "If it goes unanswered",
        baseline: true,
        build: (state) => {
            const answered = scenarioDispositionPackets(state, cast, "allow-default");
            return answered.ok ? held(state, answered.packets) : { ok: false, reason: answered.reason };
        },
    };
    return {
        spec,
        title: cast.script.subject,
        baselineMeaning: cast.orderCase?.posture === "adverse-lower"
            ? "You accept the lower court's ruling, and the order it ruled against ends. Saying nothing costs you nothing extra."
            : "You don't answer, and not answering has its usual cost.",
        against: cast.orderCase?.posture === "adverse-lower" ? "accepting the lower judgment" : "leaving it unanswered",
        alternatives: [unanswered, ...cast.script.options.map((option) => replyAlternative(cast, option))],
    };
}
function orderChoice(campaign, spec) {
    const order = executiveOrder(spec.id);
    if (!order)
        return undefined;
    const charter = charterOf(campaign);
    return {
        spec,
        title: order.name,
        baselineMeaning: "You don't sign it, and nothing changes.",
        against: "not signing",
        alternatives: [
            { id: UNTOUCHED, label: "If you don't sign", baseline: true, build: () => NOTHING },
            {
                id: ORDER_SIGN,
                label: "Sign it",
                baseline: false,
                build: (state, streams) => {
                    const result = signOrder(state, charter, order.id, streams);
                    return result.ok ? held(state, [result.packet]) : { ok: false, reason: result.reason };
                },
            },
        ],
    };
}
/** The draft as it stands against the book in force: the same candidate and the same request the budget screen sends. */
function budgetChoice(spec) {
    return {
        spec,
        title: "The draft budget",
        baselineMeaning: "You keep the current budget, and nothing goes to Congress.",
        against: "keeping the current budget",
        alternatives: [
            { id: UNTOUCHED, label: "If you send nothing", baseline: true, build: () => NOTHING },
            {
                id: BUDGET_SEND,
                label: "Send the draft",
                baseline: false,
                build: (campaign) => {
                    const draft = projectBudgetDraft(campaign, spec.draft);
                    if (!draft.ok)
                        return { ok: false, reason: draft.reason };
                    const request = requestAppropriation(campaign, draft.candidate);
                    return request.ok ? held(campaign, [request.packet]) : { ok: false, reason: request.reason };
                },
            },
        ],
    };
}
/** A screen's own options, each built with the call its commit makes, read from the run with nothing approved. */
function actsChoice(spec) {
    if (spec.alternatives.length === 0)
        return undefined;
    return {
        spec,
        title: spec.title,
        baselineMeaning: spec.baselineMeaning,
        against: spec.against,
        alternatives: [
            { id: UNTOUCHED, label: "If you approve nothing", baseline: true, build: () => NOTHING },
            ...spec.alternatives.map((entry) => ({
                id: entry.id,
                label: entry.label,
                baseline: false,
                build: (campaign) => {
                    if (entry.refused !== undefined)
                        return { ok: false, reason: entry.refused };
                    if (!entry.act)
                        return { ok: false, reason: "The forecast can't show this option yet." };
                    const built = buildModelingAct(campaign, entry.act);
                    return built.ok ? held(campaign, built.packets) : built;
                },
            })),
        ],
    };
}
/** The choice and its alternatives, read on the campaign it would be committed on, or nothing when it is not pending. */
export function modelingChoice(campaign, spec) {
    if (spec.kind === "budget-draft")
        return budgetChoice(spec);
    if (spec.kind === "acts")
        return actsChoice(spec);
    return spec.kind === "decision" ? decisionChoice(campaign, spec) : orderChoice(campaign, spec);
}
