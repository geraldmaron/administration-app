import type { CorpusDeed } from "../corpus/shard-store.js";
import { ScenarioClass, ScenarioSeverity, type ScenarioDef } from "@admin/content";
import type { JobFile } from "../jobs/job-file.js";
import { type PersonaId } from "../personas/index.js";
export { impactSection } from "./brief-impact.js";
export type ScenarioBriefSpec = {
    readonly class: ScenarioClass;
    readonly severity: ScenarioSeverity;
    readonly cast: "tensest" | "closest" | "band" | "warCounterpart" | "belligerent" | "none" | "stricken" | "outlet" | "collectionReport" | "tradeMeasure" | "liveBill" | "judicialVacancy" | "pendingOrderCase";
    readonly steer?: string;
    readonly persona?: PersonaId;
    readonly count: number;
    /**
     * Whether this cell is one chain rather than `count` siblings.
     *
     * A cell has always meant "write N scenarios of this class at this severity",
     * which is a shape that produces N unrelated weeks however hard rule 26 asks
     * for a callback. Measured on the shipped corpus that is what it produced:
     * 826 distinct flags stamped and 43 ever read, 65 scenarios of 275 gating on
     * a flag at all. The mechanism was never the problem — `sets`, `agedAtLeast`
     * and the `flagAge` boost have all been built and documented for months. The
     * unit of work was.
     *
     * An arc cell asks for a setter and its readers in one call, which is also
     * the only way the quoted-callback doctrine can be obeyed: it requires
     * quoting a `remembered` line the writer has actually read, and that means
     * the reply that wrote it has to be in the same batch.
     */
    readonly arc?: boolean;
    readonly deeds?: readonly CorpusDeed[];
};
/**
 * The bar: the approved reference set, not the bundled pack.
 *
 * The ten in `content/reference/` are written to the framework the corpus is
 * being regenerated to — a standing brief, declared impact bands instead of
 * hand-typed costs, a rejoinder on every answer. The bundled pack's exemplars
 * carry none of that, and showing a generator one would teach it to write the
 * corpus being replaced.
 *
 * The bundled pack stays as the fallback for the one case that matters: a
 * checkout with no reference directory still produces a working brief rather
 * than one with no bar in it at all.
 */
export declare function exemplars(): readonly ScenarioDef[];
export declare const REGISTER_SECTION: string;
export declare const SEVERITY_TIERS: string;
export declare const CHANNEL_SECTION: string;
export declare const CRAFT_RULES = "Write like the best political drama gets written, and never one inch past it:\n- Concrete detail over adjectives. \"Two phones bought there last month,\" never \"a shocking attack.\"\n- Plain words. The room talks like people, not like a proclamation: \"the outer office\", never \"the\n  anteroom\"; \"puts us on the hook\", never \"obligates us\". If a simpler word says the same thing, the\n  simpler word is the correct one \u2014 the audit flags stilted vocabulary for review (stilted-register).\n- Officials speak in operational sentences that carry subtext. The narrator states; it does not perform.\n- Every reply is something a head of government could say out loud, in a room, to people.\n- Options are the ones a leader is actually handed. Not one vague course of action but a real menu:\n  the force option named for what it is, the deniable option, the option that costs standing to\n  hold a principle. A leader chooses between instruments, and the briefing has to have told them\n  which instruments exist before the reply asks them to spend one.\n- Hard subjects (mass casualties, terror, children) are written with restraint and dignity: the decision\n  space, never the spectacle. No gore, no melodrama, no cleverness at the dead's expense.\n- Say a number. A decision briefed without one magnitude \u2014 how much, how many, how long \u2014 is mood\n  standing in for substance, and it is the commonest complaint a reader has about this corpus. Either\n  fill \"particulars\" or put the figure in the sentence that needs it: \"fourteen clinics or nine boats,\n  and the money covers half of either\", never \"we cannot fund both\" (briefing-without-a-figure).\n- Name an official the way the cabinet screen does: \"the Secretary of the Treasury\", \"the Secretary of\n  Defense\", \"the Secretary of the Interior\". Never \"the chair\" \u2014 that is the app's own word for a\n  seat and it means nothing to a player, who reads \"both chairs think it's theirs\" and cannot tell\n  whether that is two people, two committees or two pieces of furniture. Never \"the minister\" either:\n  this government does not have ministers. The same goes for money \u2014 say what it was for, not \"the\n  line\" (insider-shorthand, cabinet-title-literal).\n- The locus descriptor never names the landform. \"site\" is a kind of place and the board picks the\n  real one at run time, so a chokepoint descriptor saying \"the strait\" datelines itself \"Panama Canal\n  \u2014 the gray water midway across the strait\". Describe the water and the people; the place name is\n  printed beside it (locus-asserts-landform).\n- American English spelling throughout.\n- Costs must match the fiction: a heavy answer costs heavily, a cheap one reads cheap.\n- A decision is a trade, not a menu of regrets. Give every reply a reason a reasonable minister\n  would argue for it in the room, and give at least one a price that makes the room go quiet.\n- Write the third act before the first: know which reply comes back to haunt the player, and stamp\n  the flag that lets it. The best scenario in a batch is usually the one that reads another one's flag.";
/**
 * The doctrines that sit above the gates: quote the player, announce the fuse,
 * give the week a shape, bind the person, and answer the player back.
 *
 * Deliberately outside `gateSummary`. Everything in that list is refused by the
 * validator, and a rule filed among them that nothing enforces teaches a
 * generator that the list is advisory. These are the ceiling — what a batch is
 * judged on once it has cleared every floor — and they are stated as such.
 */
export declare function doctrineSpread(severity: string, count: number | string): readonly string[];
export declare function doctrineSection(spread: readonly string[]): string;
/**
 * What a decision did to people and to money, and why a writer declares it in
 * bands rather than typing a number.
 *
 * The two costings on a reply are not alternatives and the division between
 * them is the thing writers get wrong. `cost` is what the *act* spent — the
 * standing burned by saying it out loud, the stability of having done it — and
 * is authored directly because it is a fact about the government rather than
 * about the country. `impact` is what the decision did to people and to the
 * budget, and is declared in bands because the same words are cast onto a
 * country of four million or four hundred million and have to be true in both.
 *
 * Every band here is read off the schema rather than restated, so a value the
 * validator accepts and a value this brief teaches cannot come apart.
 */
/**
 * What the room already knows.
 *
 * `ScenarioContext` lives in the schema and in the ten reference exemplars, but
 * a field the brief does not teach comes back absent from every batch — it
 * exists, it is audited, and nobody writes it. This section is what closes that
 * gap, for the same reason the impact bands above have one.
 *
 * Every enum and floor is read off the schema rather than restated, so a value
 * the validator accepts and a value this brief teaches cannot come apart.
 */
/**
 * The order to write a scenario in.
 *
 * The brief is long, the schema is wide, and a drafter with no route through it
 * writes the fields in the order the JSON happens to list them — which is why
 * so many drafts arrive with a subject that summarizes a context block that was
 * written after the replies it is supposed to have caused. This is the route.
 * It is stated for the weakest hand that will ever read this brief: a
 * Haiku-class model, a Cursor or Codex session, a person with an hour, none of
 * whom will reconstruct it from the rules.
 */
export declare function writeInThisOrderSection(): string;
/**
 * What a reply actually reaches, and what it only appears to.
 *
 * The commonest way a well-written scenario lies: a rejoinder promising that a
 * third capital will answer, or that a chair will lose their seat, when a
 * position reply reaches the counterpart and nothing else. Stated as its own
 * paragraph because it is a fact about the engine that no gate can catch — the
 * validator cannot read a promise.
 */
export declare const RIPPLES_SECTION = "RIPPLES IN THE FICTION \u2014 and never a promise the engine cannot keep.\n\nA \"position\" reply reaches exactly this much of the world: the player's own metrics, the public mood, the\nrelationship edge with the CAST COUNTERPART, an alignment pull, the flags it stamps, and a press headline.\nThat is all. It cannot cost a Secretary their seat, move a vote in Congress, relieve a disaster, or reach a\nthird country. Before the player commits, the board shows a position reply ONE line \u2014 its direct price \u2014\nand nothing else: no odds, no worst case, no third parties. What it did to people and money is hidden until\nthe Record.\n\nTwo things follow, and they are the difference between a scenario that lands and one that lies.\n\n  - EVERYTHING THE PLAYER NEEDS TO WEIGH THIS IS IN YOUR TEXT, because the board will not supply it. Who is\n    affected, what it costs now, who is watching: if the reply does not say it, the player decides blind.\n  - SPREAD LIVES IN THE FICTION, NOT IN THE NUMBERS. Third parties, allies re-pricing your word, a partner's\n    government wobbling, a market that opens differently \u2014 all of that is real in this game and none of it\n    happens through a position reply. Write it into the rejoinder, into the press headline, and into a later\n    scenario that reads the flag. Never write a sentence that tells the player a number moved somewhere the\n    engine did not move one. \"Three capitals will read this as a forecast about themselves\" is good writing;\n    \"this costs us the alliance\" is a bill nothing will ever issue, and the player will notice it did not.\n\nSpread that must actually happen belongs in an \"instrument\" commitment, where the ladder genuinely reaches\nthird parties and the board tells the player so before they choose.";
/**
 * The cabinet gate, argued rather than only required.
 *
 * Gate 37 states the share. This says why a writer should want it: it is the
 * only mechanism by which the screen where the player assembled a government
 * changes what the game puts in front of them.
 */
export declare const BIND_THE_CABINET = "BIND THE CABINET. At least one scenario in this batch should only happen to a\nplayer who seated a particular kind of person.\n\nThe condition is { \"kind\": \"cabinetAttribute\", \"roleHint\": \"finance\" | \"defense\" | \"foreign\" | \"interior\" |\n\"justice\", \"attribute\": \"competence\" | \"loyalty\" | \"ambition\" | \"integrity\" | \"charisma\", with \"atLeast\"\nand/or \"atMost\" }. A vacant chair satisfies nothing.\n\nWhy it is worth the effort: the player spent real attention choosing a cabinet, and not one shipped\nscenario reads it back. A week gated on { \"attribute\": \"integrity\", \"atMost\": 0.4 } for the finance chair is\na week that only exists in campaigns where the player took the ambitious appointment over the clean one \u2014\nwhich is the difference between a decision they made and a decision they are living in. Write the week the\nappointment caused, and let the chair be in the room for it.";
/**
 * The register rule most first drafts break, stated as a procedure rather than
 * as taste.
 *
 * REGISTER above is about altitude and particulars. This is about the sentence
 * itself, and it is the half a weaker hand gets wrong: a term of art dropped
 * unexplained, three ideas in one sentence, a change with no reference point
 * before it.
 */
export declare const PLAIN_WORDS = "PLAIN WORDS. The reader is a layman reading once, on a phone, at speed. Three rules,\nand they are mechanical:\n\n  - EXPAND EVERY TERM OF ART IN THE SENTENCE THAT USES IT. Not in a later sentence, not in a particular \u2014\n    the same sentence. \"The continuing resolution \u2014 the stopgap that keeps the government paid while nobody\n    agrees a budget \u2014 runs out on the fourth.\" A term left bare is a reader who has stopped following.\n  - ONE IDEA PER SENTENCE. If a sentence carries a fact, a consequence and a caveat, it is three sentences\n    that have not been written yet. Short declarative sentences are not a lesser register; they are the\n    register of every good newsroom there has ever been.\n  - THE REFERENCE POINT BEFORE THE CHANGE. Say what was normal until this week, then say what moved.\n    \"They have taken four boats a season for as long as anyone has counted. They took nine this month.\"\n    Without the first sentence the second is a number with nothing to be large against, and the player is\n    being asked to feel something they have no way to measure.\n\n";
export declare function contextSection(): string;
export declare function gateSummary(spec: ScenarioBriefSpec): string;
export declare const PERSONA_FRAME = "The director below sets taste and emphasis only: what to notice, what register to write in, and\nwhere the pressure sits. It cannot loosen anything. The gates that follow it are non-negotiable and\nwin every conflict \u2014 where the director's instinct and a gate disagree, the gate is right, and the\nvalidator enforces it regardless of what was asked for here. If a scenario cannot be written in this\ndirector's register without breaking a gate, write it in the register and keep the gate.";
export declare function personaSection(id: PersonaId): readonly string[];
export declare const CLASS_SCOPE: Readonly<Record<ScenarioClass, string>>;
export declare const CLASS_CONTRACT = "Every scenario in this batch must actually be that. A week that would be filed under a different class if someone read it cold is the wrong scenario for this brief, however well it is written \u2014 the class is how the game finds this week later, and a mislabeled one is a cell counted that the pool does not really have.";
export declare function buildScenarioBrief(spec: ScenarioBriefSpec): string;
/**
 * A scenario batch as a job file the existing runner executes: one item per
 * brief cell, resumable, spend-journaled — the same discipline as every
 * other generation job.
 *
 * The resolved director is written into the payload rather than recomputed
 * later: the job file is the durable record of what a batch was actually
 * generated under, and a routing map edited between the run and the review
 * would otherwise quietly rewrite that history.
 */
/**
 * The two sections an upgrade run needs, in the same words the generation
 * brief uses them.
 *
 * Exported rather than copied because the alternative is two descriptions of
 * `context` and `impact` drifting apart, and the upgrade pass is precisely
 * where that drift would be invisible: its output is checked against the
 * schema and the audit, neither of which can tell which brief taught it.
 */
export declare function buildUpgradeSections(): readonly string[];
export declare function scenarioJob(id: string, driver: JobFile["driver"], cells: readonly ScenarioBriefSpec[], jobPersona?: PersonaId, deeds?: readonly CorpusDeed[]): JobFile;
