import { STALE_ACT_MESSAGE } from "../campaign/store";
import { playerFacingStorageFailure } from "../persistence/storage-failure";
import { campaignStamp, draftSubject, priceDraft, sameStamp } from "./price";
import { DRAFT_AUTHORITY_LABEL, DRAFT_AUTHORITY_ORDER } from "./types";
export const ALREADY_SIGNED = "This draft is already signed. It went through but isn't saved yet, so save again rather than signing twice.";
export const REVISED_DRAFT = "This draft changed after you opened it, so nothing was signed. Review it again.";
const NO_DRAFT = "That draft isn't here any more, so nothing was signed.";
const UNSAID = "The device didn't say why.";
export const MARK_UNSAVED = "Your drafts couldn't be saved on this device, so nothing was signed. Try again.";
/** A spec that asks for nothing: a budget with every line at today's amount, an order with no goods. */
const isEmpty = (spec) => (spec.kind === "budget" ? Object.keys(spec.lines).length === 0 : spec.goods.length === 0);
/** True when the campaign has moved since the draft was priced. */
export function isStale(draft, campaign) {
    return !sameStamp(draft.basis, campaignStamp(campaign));
}
/** A draft whose act this campaign already holds: signed in the same administration, which has since moved on. */
function actKept(entry, stamp) {
    return entry.signing !== undefined && entry.signing.from.seed === stamp.seed && stamp.ledger > entry.signing.from.ledger;
}
function isStamp(value) {
    const v = value;
    return typeof v === "object" && v !== null && typeof v.seed === "string" && typeof v.turn === "number" && typeof v.date === "string" && typeof v.ledger === "number" && typeof v.last === "number";
}
function isEntry(value) {
    const v = value;
    return typeof v === "object" && v !== null && typeof v.subject === "string" && typeof v.revision === "number" && typeof v.spec === "object" && v.spec !== null && typeof v.authority === "string" && isStamp(v.basis) && typeof v.preview === "object" && v.preview !== null;
}
/**
 * The drafts read back beside a restored campaign. Another administration's
 * drafts are dropped; a signed draft whose act the campaign holds is done; one
 * whose act the campaign lost is pending again.
 */
export function reconcileDrafts(stored, campaign) {
    if (!Array.isArray(stored))
        return [];
    const stamp = campaignStamp(campaign);
    return stored.filter(isEntry).flatMap((entry) => {
        if (entry.basis.seed !== stamp.seed)
            return [];
        if (!entry.signing)
            return [entry];
        if (actKept(entry, stamp))
            return [];
        const { signing: _lost, ...pending } = entry;
        return [pending];
    });
}
/** The tray's groups, by the authority that would act on each draft, in a fixed order; empty groups are left out. */
export function draftGroups(drafts, campaign) {
    return DRAFT_AUTHORITY_ORDER.flatMap((authority) => {
        const items = drafts
            .filter((draft) => draft.authority === authority)
            .map((draft) => ({ subject: draft.subject, preview: draft.preview, stale: !draft.signing && isStale(draft, campaign), ...(draft.signing ? { signing: draft.signing } : {}) }));
        return items.length === 0 ? [] : [{ authority, label: DRAFT_AUTHORITY_LABEL[authority], items }];
    });
}
function commitPacket(campaigns, packet, basis) {
    return Array.isArray(packet) ? campaigns.commitAll(packet, undefined, { basis }) : campaigns.commit(packet, { basis });
}
const without = (drafts, subject) => drafts.filter((draft) => draft.subject !== subject);
export function createDraftStore({ campaigns }) {
    let state = { drafts: [] };
    const listeners = new Set();
    // Which administration's drafts are loaded and the slot they are written to. A change made for one slot is never written to another.
    let loadedFor = null;
    let slot = null;
    let generation = 0;
    // Every change waits for the read in flight, or that read would land after it and put back what was there before.
    let loading = Promise.resolve();
    function publish(next) {
        state = next;
        for (const listener of listeners)
            listener();
    }
    function inPlay() {
        const current = campaigns.getState();
        if (current.status !== "ready")
            throw new Error("No game is open, so there are no drafts to work on.");
        return current.campaign;
    }
    /** Writes a slot's drafts, and shows them only while that slot is still the one loaded. Resolves false when the device refused the write. */
    async function writeTo(target, drafts) {
        const current = target.generation === generation;
        if (current)
            publish({ drafts });
        if (target.slot === null)
            return true;
        try {
            await campaigns.saves.writeDrafts(target.slot, drafts);
            return true;
        }
        catch (err) {
            if (current && target.generation === generation)
                publish({ drafts: state.drafts, saveError: playerFacingStorageFailure(err) });
            return false;
        }
    }
    const here = () => ({ slot, generation });
    async function load(key, id, campaign) {
        const mine = ++generation;
        loadedFor = key;
        slot = id;
        publish({ drafts: [] });
        if (id === null)
            return;
        let stored = null;
        try {
            stored = await campaigns.saves.readDrafts(id);
        }
        catch (err) {
            if (mine === generation)
                publish({ drafts: [], saveError: playerFacingStorageFailure(err) });
            return;
        }
        if (mine !== generation)
            return;
        const drafts = reconcileDrafts(stored, campaign);
        publish({ drafts });
        // A slot whose drafts belong to another administration is not the campaign in play yet; nothing is written back until they agree.
        const agrees = Array.isArray(stored) && stored.every((entry) => !isEntry(entry) || entry.basis.seed === String(campaign.seed));
        if (agrees && JSON.stringify(drafts) !== JSON.stringify(stored))
            await writeTo({ slot: id, generation: mine }, drafts);
    }
    /** A signed draft whose campaign came back at the basis it was signed on lost its act, and is pending again. */
    function relink(campaign) {
        const stamp = campaignStamp(campaign);
        const lost = (entry) => entry.signing?.saveError !== undefined && sameStamp(entry.signing.from, stamp);
        if (!state.drafts.some(lost))
            return;
        void writeTo(here(), state.drafts.map((entry) => {
            if (!lost(entry))
                return entry;
            const { signing: _lost, ...pending } = entry;
            return pending;
        }));
    }
    // Loads follow the campaign store, not the save state: opening another
    // administration names its slot before its campaign is in play, and drafts
    // read against the old campaign in between would be judged by the wrong one.
    function onCampaigns() {
        const current = campaigns.getState();
        if (current.status !== "ready")
            return;
        const id = campaigns.saves.getSaveState().activeCampaignId;
        const key = `${id ?? "memory"}:${String(current.campaign.seed)}`;
        if (key !== loadedFor)
            loading = load(key, id, current.campaign);
        else
            relink(current.campaign);
    }
    campaigns.subscribe(onCampaigns);
    onCampaigns();
    function find(subject) {
        return state.drafts.find((draft) => draft.subject === subject);
    }
    return {
        getState: () => state,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        async put(spec) {
            await loading;
            const campaign = inPlay();
            const subject = draftSubject(spec);
            const existing = find(subject);
            if (existing?.signing)
                return { ok: false, reason: ALREADY_SIGNED };
            const priced = priceDraft(campaign, spec);
            if (!priced.ok) {
                // A draft edited back to today is no draft at all; any other refusal keeps the draft that stands.
                if (existing && isEmpty(spec))
                    await writeTo(here(), without(state.drafts, subject));
                return priced;
            }
            const draft = { subject, revision: (existing?.revision ?? 0) + 1, spec, authority: priced.authority, basis: campaignStamp(campaign), preview: priced.preview };
            await writeTo(here(), [...without(state.drafts, subject), draft]);
            return { ok: true, draft };
        },
        async discard(subject) {
            await loading;
            const existing = find(subject);
            if (!existing || existing.signing)
                return;
            await writeTo(here(), without(state.drafts, subject));
        },
        review(subject) {
            const entry = find(subject);
            if (!entry)
                return { ok: false, reason: NO_DRAFT };
            if (entry.signing)
                return { ok: false, reason: ALREADY_SIGNED };
            const basis = inPlay();
            const priced = priceDraft(basis, entry.spec);
            if (!priced.ok)
                return priced;
            try {
                const prepared = priced.build();
                return { ok: true, draft: { ...entry, authority: priced.authority, basis: campaignStamp(basis), preview: priced.preview }, stale: isStale(entry, basis), basis, prepared };
            }
            catch (cause) {
                return { ok: false, reason: cause instanceof Error ? cause.message : String(cause) };
            }
        },
        async sign(review) {
            await loading;
            const { subject } = review.draft;
            const entry = find(subject);
            if (!entry)
                throw new Error(NO_DRAFT);
            if (entry.signing)
                throw new Error(ALREADY_SIGNED);
            if (entry.revision !== review.draft.revision)
                throw new Error(REVISED_DRAFT);
            if (inPlay() !== review.basis)
                throw new Error(STALE_ACT_MESSAGE);
            const target = here();
            const others = without(state.drafts, subject);
            const from = campaignStamp(review.basis);
            const restore = () => writeTo(target, target.generation === generation ? [...without(state.drafts, subject), entry] : [...others, entry]);
            // The mark must be on the device before the act, or a reload after a kept act would find the draft unsigned and sign it again.
            if (!(await writeTo(target, [...others, { ...entry, signing: { from } }]))) {
                await restore();
                throw new Error(MARK_UNSAVED);
            }
            let receipt;
            try {
                receipt = await commitPacket(campaigns, review.prepared, review.basis);
            }
            catch (cause) {
                await restore();
                throw cause;
            }
            // Drafts made since the press are kept; only this one's fate changes.
            const now = target.generation === generation ? without(state.drafts, subject) : others;
            if (receipt.persisted)
                await writeTo(target, now);
            else
                await writeTo(target, [...now, { ...entry, signing: { from, eventIds: receipt.eventIds, saveError: receipt.saveError ?? UNSAID } }]);
            return receipt;
        },
        async retrySave(subject) {
            await loading;
            const receipt = await campaigns.retrySave();
            if (receipt.persisted && find(subject)?.signing)
                await writeTo(here(), without(state.drafts, subject));
            return receipt;
        },
    };
}
