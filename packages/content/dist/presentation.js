// How a scenario reaches the player, declared once.
//
// Four things independently decided what a scenario looks like: the schema
// (what may be written), the audit (what is refused), the generation brief
// (what a writer is told), and the player's renderer (what is drawn). Each
// held its own partial idea of the same model, so a change to any of them
// had to be hand-carried to the other three and silently drifted when it was
// not. The defect that made this visible: a beat spoken by a foreign head of
// government rendered identically to one spoken by the player's own defense
// minister, because nothing in the model said a beat had a *channel* — the
// schema could express it, the audit had no rule against it, the brief never
// mentioned it, and the renderer had no way to tell them apart.
//
// This module is the one declaration. The schema builds its shapes from it,
// the audit derives its rules from it, and the brief prints it. Changing a
// speaker kind, a relay or a rule is an edit here.
/**
 * The speaker kinds a scenario may author, and what each one is.
 *
 * `counterpart` is deliberately absent. A foreign government does not speak in
 * the player's secure channel; its words arrive as a transmission, which is a field
 * on the scenario rather than a beat in the opening. Leaving the kind out is
 * what makes that unwritable rather than merely discouraged — an audit rule
 * can be argued with, a shape that does not exist cannot.
 */
export const SCENARIO_SPEAKER_KINDS = ["cabinet", "player", "narrator"];
/**
 * How a transmission got into the room. The relay is authored, not decorative: it
 * tells the player why they are reading a foreign government's exact words,
 * and each one carries a different claim about how reliable those words are.
 * A cable is what they chose to send you; an intercept is what they did not.
 */
export const TRANSMISSION_RELAYS = {
    letter: { label: "Letter", brief: "a signed letter relayed to the President through the responsible office" },
    cable: {
        label: "Cable",
        /** Their government to yours, formally, through the channel that exists for it. */
        brief: "a formal message from their government to yours, sent through diplomatic channels",
    },
    readout: {
        label: "Readout",
        brief: "your own service's written account of what was said to them, or on a call",
    },
    broadcast: {
        label: "Broadcast",
        brief: "what they said in public, transcribed — said to their own people as much as to you",
    },
    intercept: {
        label: "Intercept",
        brief: "words they did not intend you to have, and cannot be answered without revealing that you do",
    },
    communique: {
        label: "Communique",
        brief: "a joint or multilateral statement, issued rather than sent",
    },
};
export const TRANSMISSION_RELAY_KINDS = Object.keys(TRANSMISSION_RELAYS);
/**
 * The register every opening is written in, stated as the rules the audit
 * actually enforces and the brief actually prints — so a writer is never told
 * one thing while the gate checks another.
 *
 * The failure these describe is real and was everywhere in the first corpus:
 * openings written at watch-officer altitude. "The dockers did not clock on at
 * six, every container quay is stopped, and the vote is called for two this
 * afternoon" is a duty log. It is accurate, it is concrete, and nobody has ever
 * briefed a head of government that way. A president is told what is at stake,
 * what is being decided, and by when — the operational facts appear as the
 * evidence for that, not in place of it.
 */
export const REGISTER_RULES = [
    "The first beat states what is at stake for the country and what is now being decided. Not what happened at what time.",
    "A deadline is a decision clock — the hour by which the player must have answered — never a timetable of other people's events.",
    "Operational detail earns its place by changing the decision. Counts, clock times and site specifics belong in `particulars`, or below the stakes, never ahead of them.",
    "Officials speak like people under pressure who have already done the summarizing. They bring judgment, not raw feed.",
    "Plain words a player never has to decode. A narrator states rather than performs.",
    "Replies are things a head of government could say out loud in a room.",
    // The newsroom half. The rules above fix altitude — a briefing that reads as
    // a duty log. These fix substance: prose at the right altitude that still
    // says nothing, because atmosphere is cheaper to write than a fact.
    "A title is a headline a paper would actually run: it states the specific thing that happened. Not a label for a topic, and never a mood.",
    "Every beat carries a particular — a name, a number, a refusal, a date. A sentence that would read identically in a different scenario is not writing, it is filler, and it is cut.",
    "Say plainly why this matters, once, in the terms the player is deciding in. Never let knowingness stand in for a reason: an air of significance is not significance.",
    "Wit is carried by a fact or it is cut. A dry line that is also empty is worse than a plain one, because it reads as though something was said.",
    "Given no particular worth printing, say less. Never reach for atmosphere to fill the space, and never invent a figure, a quote or a source to avoid saying less.",
];
/** The channel rules, in the same one-source form, for the brief and the docs. */
export const CHANNEL_RULES = [
    "The opening is the player's own room: their cabinet, and a narrator. Nobody else is on the channel.",
    "A foreign government never speaks in the thread. Its words are a `transmission` — one relayed document, attached to the channel and read, not received as a message.",
    "A transmission names how it arrived (`relay`), because how the words reached the room is part of what they mean.",
    "A scenario with no foreign counterpart (`cast.pick: none`) may carry only an explicitly bound domestic official letter/readout: declare transmission.domesticSubject and its governor/mayor/member or inherited person slot. Otherwise it has no transmission.",
];
