/**
 * The speaker kinds a scenario may author, and what each one is.
 *
 * `counterpart` is deliberately absent. A foreign government does not speak in
 * the player's secure channel; its words arrive as a transmission, which is a field
 * on the scenario rather than a beat in the opening. Leaving the kind out is
 * what makes that unwritable rather than merely discouraged — an audit rule
 * can be argued with, a shape that does not exist cannot.
 */
export declare const SCENARIO_SPEAKER_KINDS: readonly ["cabinet", "player", "narrator"];
export type ScenarioSpeakerKind = (typeof SCENARIO_SPEAKER_KINDS)[number];
/**
 * How a transmission got into the room. The relay is authored, not decorative: it
 * tells the player why they are reading a foreign government's exact words,
 * and each one carries a different claim about how reliable those words are.
 * A cable is what they chose to send you; an intercept is what they did not.
 */
export declare const TRANSMISSION_RELAYS: {
    readonly letter: {
        readonly label: "Letter";
        readonly brief: "a signed letter relayed to the President through the responsible office";
    };
    readonly cable: {
        readonly label: "Cable";
        /** Their government to yours, formally, through the channel that exists for it. */
        readonly brief: "a formal message from their government to yours, sent through diplomatic channels";
    };
    readonly readout: {
        readonly label: "Readout";
        readonly brief: "your own service's written account of what was said to them, or on a call";
    };
    readonly broadcast: {
        readonly label: "Broadcast";
        readonly brief: "what they said in public, transcribed — said to their own people as much as to you";
    };
    readonly intercept: {
        readonly label: "Intercept";
        readonly brief: "words they did not intend you to have, and cannot be answered without revealing that you do";
    };
    readonly communique: {
        readonly label: "Communique";
        readonly brief: "a joint or multilateral statement, issued rather than sent";
    };
};
export declare const TRANSMISSION_RELAY_KINDS: readonly (keyof typeof TRANSMISSION_RELAYS)[];
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
export declare const REGISTER_RULES: readonly string[];
/** The channel rules, in the same one-source form, for the brief and the docs. */
export declare const CHANNEL_RULES: readonly string[];
