import { type AttentionStop, type Campaign, type EffectPacket, type FeedItem, type MatterSource, type StopReason, type TurnPhases } from "@admin/engine";
import type { Charter } from "@admin/world";
import { type StopBrief } from "./stop-brief";
import type { AttentionPolicySettings } from "../desk/attention";
import type { SaveStore } from "../persistence/save-store";
export type CampaignState = {
    readonly status: "loading";
} | {
    readonly status: "empty";
} | {
    readonly status: "ready";
    readonly campaign: Campaign;
    /**
     * What the world raised the last time it was run forward, and why it
     * stopped. Session-only, never written to a save: a stop is a fact about
     * this sitting, not about the country.
     */
    readonly stop?: AttentionStop;
    readonly stopReason?: StopReason;
    readonly ambient?: readonly FeedItem[];
    /**
     * The same run as one record: the span it spent, the readings it crossed,
     * the wire it filed and the stop it ended on. Produced by
     * `continueUntilAttention` and by nothing else — `restore` does not
     * produce one, because restoring does not run the world.
     */
    readonly brief?: StopBrief;
    /**
     * Session-only: set once the brief has actually been read. The Desk routes
     * to it while one is pending and unacknowledged; without this flag every
     * return to the Desk routed unconditionally, because the brief itself is
     * not cleared until the world runs again (it stays revisitable). Never
     * written to a save — an acknowledgment is a fact about this session's
     * screen, not about the campaign.
     */
    readonly briefAcknowledged?: boolean;
} | {
    readonly status: "failed";
    readonly message: string;
};
/**
 * What a committed act hands back: which ledger events it wrote, and whether
 * the device kept them.
 *
 * The two answers are separate because they fail separately. By the time a
 * save is attempted the act has already applied and been published — the
 * country has moved — so a refused write is not a refused act, and rejecting
 * would tell the caller an act that happened did not. `persisted: false` says
 * the act stands in this session and is not yet durable; the save store's own
 * status says the same thing to the shell, and `retrySave` is the way back.
 */
export type ActReceipt = {
    /** The ledger events this act appended, oldest first. Empty when it wrote none. */
    readonly eventIds: readonly string[];
    readonly persisted: boolean;
    /** A sentence a player can read, present only when `persisted` is false. */
    readonly saveError?: string;
};
export type CommitOptions = {
    /**
     * The campaign the packet was computed against.
     *
     * A packet is priced against one state. Applied to a later one — a second
     * press on the same button, or a preview the week has moved under — it
     * charges costs nobody quoted and can land an act twice. When this is given
     * and is no longer the campaign in play, the packet is refused and nothing
     * applies.
     */
    readonly basis?: Campaign;
};
/** The sentence a stale packet is refused with; `isStaleAct` matches it. */
export declare const STALE_ACT_MESSAGE = "Things changed while you were deciding, so nothing went through. Take another look when you're ready.";
/** True when a refusal is the stale-basis guard rather than the engine or the charter. */
export declare function isStaleAct(error: unknown): boolean;
export type CampaignStore = {
    getState(): CampaignState;
    subscribe(listener: () => void): () => void;
    /** Read the local slot; resolves to the state the shell should render. */
    restore(): Promise<CampaignState>;
    begin(campaign: Campaign): Promise<void>;
    /**
     * Run a packet the engine produced — a conversation reply, an action — through
     * the one mutator. Rejects only when nothing applied (no campaign in play, or
     * a stale `basis`); a refused save resolves with `persisted: false`.
     */
    commit(packet: EffectPacket, options?: CommitOptions): Promise<ActReceipt>;
    /**
     * Run a run of packets that are one act by the player, and save once.
     *
     * Committing them one at a time is correct on the ledger — each is its own
     * event and each must apply to the state the one before it produced — and
     * wrong on the disk: `commit` writes the whole campaign after every packet,
     * so sending forty-four names to the Senate wrote a multi-megabyte save
     * forty-four times to record one decision. Forty-three of those writes are
     * pure cost, and on a phone they are the difference between an action and a
     * freeze.
     *
     * `onProgress` is called with how many have applied, so a caller can report
     * real sequence position rather than a spinner. The packets still apply in
     * the order given, because each was computed against the state its
     * predecessor produced.
     */
    commitAll(packets: readonly EffectPacket[], onProgress?: (applied: number) => void, options?: CommitOptions): Promise<ActReceipt>;
    /**
     * Runs the world forward until something needs the President, the horizon
     * runs out, or the presidency ends — the one advance the balance harness also
     * drives, so the game measured and the game played are the same sequence.
     *
     * `horizonDays` is days, never turns: the caller says how much of the
     * presidency it is willing to spend, and the engine decides how many ticks
     * that is.
     */
    continueUntilAttention(horizonDays?: number, options?: CommitOptions): Promise<ActReceipt>;
    /**
     * Hands every waiting matter a chief of staff may take to the Chief of Staff,
     * then runs the world as Continue does.
     *
     * Rows are put off and decisions left unanswered at the price each already
     * carries, one player act apiece. A matter that must come from the President
     * stays on the desk, and while one does the world does not run: the hand-off
     * is applied and saved, and Continue stays held on what is left.
     */
    handOffAndContinue(horizonDays?: number, options?: CommitOptions & {
        readonly settings?: AttentionPolicySettings;
    }): Promise<ActReceipt>;
    /**
     * One office day, whether or not the desk already has something on it.
     *
     * The clock looks after the day. Passing the matter sources through would
     * stop on the opening look and the date would never move.
     *
     * `persist` defaults to true, so a paused single step still saves. The running
     * clock passes `false` for its tick and run-to-next-pause steps: a save on
     * every one of those encoded a multi-megabyte campaign several times a second
     * while running. The runner takes its own safety and exit saves instead.
     */
    stepClockDay(options?: {
        readonly persist?: boolean;
    }): Promise<ActReceipt>;
    /**
     * Write the campaign in play now, exactly as it stands, without advancing it.
     *
     * The running clock's safety and exit saves route through here rather than
     * `retrySave`: they are a deliberate snapshot of a campaign that already
     * applied, not a recovery from a refused write, and overloading `retrySave`
     * would blur the two.
     */
    saveCampaign(): Promise<ActReceipt>;
    /**
     * Write the campaign in play again, exactly as it stands.
     *
     * The way back from a refused save. It applies nothing — the act that failed
     * to save has already happened, and replaying it would charge the country
     * twice — so it is safe to press as often as the device keeps refusing.
     */
    retrySave(): Promise<ActReceipt>;
    /**
     * Marks the current brief as read, so the Desk stops re-routing on every
     * mount. The brief itself is untouched and stays readable until the world runs
     * again — acknowledgment silences the redirect, it does not consume the record.
     */
    acknowledgeBrief(): void;
    /** End the campaign in play: its slot is deleted and the shell re-reads the vault. */
    abandon(): Promise<void>;
    /**
     * Delete one stored campaign by id, whether or not it is the one in play.
     *
     * Screens route deletion through here rather than calling `saves.delete`
     * directly: the save store promotes another slot to active when it removes
     * the active one, so a delete that only touched persistence left the shell
     * rendering a campaign that no longer exists.
     */
    discard(id: string): Promise<void>;
    /** Access to the save store for campaign library operations. */
    readonly saves: SaveStore;
};
export type CampaignStoreOptions = {
    readonly saves: SaveStore;
    /**
     * The turn's phase sequence, keyed on the campaign's charter. Defaults to the
     * engine's own list. The shell does not assemble one: a phase list written
     * here is a second copy of the rules, and the copy is what left removal
     * unrun while the balance harness measured a sequence nobody played.
     */
    readonly phases?: (charter: Charter) => TurnPhases;
    /** Called just before the first campaign is published, so cold start is stamped before anything renders it. */
    readonly onFirstPlayable?: () => void;
    /**
     * Who is asked what the President is needed for. Injected rather than
     * imported so the store owns no content: a scenario director, a deadline
     * watcher and a court are all just sources, and the store cannot tell them
     * apart. An empty list is a legitimate configuration — it means a world that
     * runs to the horizon and asks for nothing.
     */
    readonly matterSources?: readonly MatterSource<Campaign>[];
    /**
     * Consulted when the vault turns out to be empty. Returning a campaign opens
     * the app straight onto it instead of onto the threshold; returning `null`
     * leaves the vault empty, which is what every shipped build does.
     *
     * This is the local development seed and nothing else. It is deliberately an
     * injected function rather than an environment read inside the store: the
     * store owns no configuration, and a test must be able to prove both answers
     * without an environment to set.
     */
    readonly seedWhenEmpty?: () => Campaign | null;
};
export declare function createCampaignStore({ saves, phases, onFirstPlayable, matterSources, seedWhenEmpty, }: CampaignStoreOptions): CampaignStore;
