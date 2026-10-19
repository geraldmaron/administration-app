import { outstandingMemberOutreach, outstandingInstrumentActs, daysBetween, outstandingIssuedAuthorizationActs, outstandingIssuedLobbyActs, outstandingIssuedPressActs, outstandingIssuedTreatyActs, selectHillMember } from "@admin/engine";
import { formatDate } from "../format/figures";
import { anchored, place } from "../navigation/places";
import { warPowersHome } from "../world/war-powers-home";
import { issuedInstrumentHref } from "../act/catalogue";
// The acts the President has issued and is waiting on: a Hill play, a press
// engagement, a treaty before the Senate, a force authorization before
// Congress. Ambient rows, never stops — Continue is what brings the answer.
/** The country a treaty is with, as a subject key, so the treaty's vote shows on that country's file. */
function treatyCounterpart(campaign, treatyId) {
    const counterpart = campaign.treaties?.[treatyId]?.counterpart;
    return counterpart ? [`nation:${counterpart}`] : [];
}
const PLAY_NOUN = {
    call: "call",
    trade: "budget negotiation",
    public: "public appeal",
    credit: "offer of shared credit",
    campaign: "campaign stop",
};
export function outstandingLobbyItems(campaign) {
    return [...outstandingMemberOutreach(campaign).map((act) => ({ id: act.id, source: "consequence-return", urgency: "ambient", subject: `person:${act.member}`, title: `Waiting on ${campaign.people[act.member]?.base.name ?? "the member"}`, reason: `Your talks about ${campaign.bills[act.billId]?.title ?? "the proposal"} wrap up ${formatDate(act.dueDate)}. Agreeing to talk doesn't mean they'll vote with you.`, href: anchored(place.person(act.member), "person-acts"), stance: "neutral", figure: `${Math.max(0, daysBetween(campaign.calendar, act.dueDate))}d`, icon: "building", dueDate: act.dueDate, opened: act.issuedDate, waitingOn: campaign.people[act.member]?.base.name ?? "The member", about: [`person:${act.member}`, `bill:${act.billId}`] })), ...outstandingIssuedLobbyActs(campaign).flatMap((act) => {
            const member = selectHillMember(campaign, act.post);
            if (!member)
                return [];
            const days = daysBetween(campaign.calendar, act.dueDate);
            const play = PLAY_NOUN[act.approach];
            return [
                {
                    id: `issued-lobby:${act.id}`,
                    source: "consequence-return",
                    urgency: "ambient",
                    subject: `hill:${act.post}`,
                    title: `Waiting on ${member.name}`,
                    reason: days <= 0
                        ? `The result of your ${play} is due. Press Continue to see it.`
                        : `The result of your ${play} comes ${formatDate(act.dueDate)}.`,
                    href: anchored(place.post(act.post), "post-lobby"),
                    stance: "neutral",
                    figure: days <= 0 ? "due" : `${days}d`,
                    icon: "building",
                    dueDate: act.dueDate,
                    opened: act.issuedDate,
                    waitingOn: member.name,
                    about: [`hill:${act.post}`],
                },
            ];
        })];
}
export function outstandingPressItems(campaign) {
    return outstandingIssuedPressActs(campaign).flatMap((act) => {
        const days = daysBetween(campaign.calendar, act.dueDate);
        const play = act.action === "press-conference"
            ? "press conference"
            : act.action === "interview"
                ? "interview"
                : "leak";
        return [
            {
                id: `issued-press:${act.id}`,
                source: "consequence-return",
                urgency: "ambient",
                subject: "press",
                title: `Waiting on the press`,
                reason: days <= 0
                    ? `The result of your ${play} is due. Press Continue to see how it went.`
                    : `The result of your ${play} comes ${formatDate(act.dueDate)}.`,
                href: anchored(place.pressView("feed"), "press-feed"),
                stance: "neutral",
                figure: days <= 0 ? "due" : `${days}d`,
                icon: "press",
                dueDate: act.dueDate,
                opened: act.issuedDate,
                waitingOn: "The press",
                about: ["press"],
            },
        ];
    });
}
export function outstandingTreatyItems(campaign) {
    return outstandingIssuedTreatyActs(campaign).flatMap((act) => {
        const days = daysBetween(campaign.calendar, act.dueDate);
        return [
            {
                id: `issued-treaty:${act.id}`,
                source: "consequence-return",
                urgency: "ambient",
                subject: `treaty:${act.treatyId}`,
                title: `Waiting on the Senate`,
                reason: days <= 0
                    ? `${act.title} is due for a Senate vote. Press Continue to see the result.`
                    : `The Senate votes on ${act.title} ${formatDate(act.dueDate)}.`,
                href: anchored(place.treaty(act.treatyId), "treaty-odds"),
                stance: "neutral",
                figure: days <= 0 ? "due" : `${days}d`,
                icon: "summit",
                dueDate: act.dueDate,
                opened: act.issuedDate,
                waitingOn: "The Senate",
                about: [`treaty:${act.treatyId}`, ...treatyCounterpart(campaign, act.treatyId)],
            },
        ];
    });
}
export function outstandingAuthorizationItems(campaign) {
    return outstandingIssuedAuthorizationActs(campaign).flatMap((act) => {
        const days = daysBetween(campaign.calendar, act.dueDate);
        return [
            {
                id: `issued-aumf:${act.id}`,
                source: "consequence-return",
                urgency: "ambient",
                subject: `aumf:${act.target}`,
                title: `Waiting on Congress`,
                reason: days <= 0
                    ? `${act.title} is due for a vote in Congress. Press Continue to see the result.`
                    : `Congress votes on ${act.title} ${formatDate(act.dueDate)}.`,
                href: warPowersHome(campaign, act.target),
                stance: "neutral",
                figure: days <= 0 ? "due" : `${days}d`,
                icon: "shield",
                dueDate: act.dueDate,
                opened: act.issuedDate,
                waitingOn: "Congress",
                about: [`nation:${act.target}`],
            },
        ];
    });
}
export function outstandingInstrumentItems(campaign) {
    const pending = outstandingInstrumentActs(campaign).flatMap((act) => {
        const replies = act.supportRequests?.filter((response) => response.status !== "pending") ?? [];
        const item = {
            id: act.id, source: "consequence-return", urgency: "ambient", subject: act.id,
            title: act.title, reason: `Being prepared. First report expected ${formatDate(act.dueDate)}.`,
            href: issuedInstrumentHref(act), stance: "neutral", figure: `${Math.max(0, daysBetween(campaign.calendar, act.dueDate))}d`, icon: "pending", dueDate: act.dueDate,
            opened: act.issuedDate, waitingOn: "Your staff", about: [`nation:${act.request.target}`],
        };
        return replies.length ? [{
                ...item, id: `support:${act.id}`, title: `Partner responses · ${act.title}`,
                reason: replies.map((reply) => `${reply.name}: ${reply.status}. ${reply.reason}`).join(" "),
                stance: replies.some((reply) => reply.status !== "confirmed") ? "caution" : "favorable",
            }] : [item];
    });
    const reported = Object.values(campaign.issuedActs ?? {}).flatMap((act) => {
        if (act.kind !== "instrument" || act.request.actor !== campaign.founding.nation || !act.outcome)
            return [];
        const report = [...campaign.ledger].reverse().find((entry) => entry.causal?.causeIds?.some((id) => id === act.causedBy || id === act.id));
        if (!report?.causal || daysBetween(report.causal.createdDate, campaign.calendar) > 7)
            return [];
        return [{ id: act.id, source: "consequence-return", urgency: "ambient", subject: act.id,
                title: act.title, reason: act.outcome.account,
                href: anchored(place.event(report.causal.eventId), "rec-result"),
                stance: act.outcome.landed ? "favorable" : "caution", icon: "record" }];
    });
    return [...pending, ...reported];
}
