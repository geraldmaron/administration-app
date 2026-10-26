import { cabinetConsequencesPhase } from "./cabinet.js";
import { institutionPhase } from "./institutions.js";
import { servicePhase } from "./services.js";
import { projectPhase } from "./projects.js";
import { militaryConstructionPhase } from "./military-construction.js";
import { offshoreLeaseSalePhase } from "./offshore-leasing.js";
import { cleanPowerPurchasePhase } from "./clean-power-purchasing.js";
import { blockedAssetPhase } from "./blocked-assets.js";
import { commandPhase } from "./combatant-commands.js";
import { intelligencePhase } from "./intelligence.js";
import { warPowersReportPhase } from "./war-powers-report.js";
import { nominationPhase } from "./nomination.js";
import { judicialVacancyPhase } from "./judicial-vacancies.js";
import { officeSuccessionPhase } from "./succession.js";
import { tradePhase } from "./trade-phase.js";
import { tariffFindingPhase } from "./tariff-orders.js";
import { cabinetLoyaltyPhase } from "./loyalty.js";
import { conditionPhase } from "./conditions.js";
import { macroDriftPhase } from "./macro.js";
import { cityPhase } from "./cities.js";
import { statePhase } from "./states.js";
import { obligationPhase } from "./obligations.js";
import { emergencyPhase } from "./emergency.js";
import { capacityPhase } from "./capacity.js";
import { conflictPhase } from "./war-tick.js";
import { governancePhase } from "./governance.js";
import { policyPhase } from "./policy.js";
import { budgetPhase } from "./budget.js";
import { apportionmentPhase, fiscalPhase } from "./fiscal.js";
import { congressPhase } from "./congress.js";
import { delegationPhase } from "./delegations.js";
import { governorPhase } from "./governors.js";
import { legislationPhase } from "./legislation.js";
import { shutdownPhase } from "./shutdown.js";
import { judicialReviewPhase } from "./judicial-review.js";
import { rulemakingPhase } from "./rulemaking.js";
import { orderExpiryPhase } from "./order-lifecycle.js";
import { docketPhase } from "./docket.js";
import { scandalPhase } from "./press-scandal.js";
import { pressPhase } from "./press.js";
import { electionPhase } from "./elections.js";
import { commitmentPhase } from "./commitments.js";
import { vitalsPhase } from "./vitals.js";
import { grudgeDecayPhase } from "./relationships.js";
import { npcActionPhase } from "./npc-turn.js";
import { blocPhase } from "./blocs.js";
import { compactPhase } from "./compacts.js";
import { pursuitPhase } from "./pursuits.js";
import { operatorPhase } from "./operators.js";
import { opinionPhase } from "./opinion.js";
import { pledgePhase } from "./pledges.js";
import { demosPhase } from "./demos.js";
import { inspectorGeneralPhase } from "./inspectors-general.js";
import { committeeInquiryPhase } from "./committee-inquiry.js";
import { oversightRipeningPhase } from "./oversight.js";
import { specialCounselPhase } from "./special-counsel.js";
import { removalPhase } from "./removal.js";
import { commodityPhase } from "./commodity-phase.js";
import { munitionsPhase } from "./munitions.js";
import { worldEventPhase } from "./world-events.js";
import { foreignPoliticsPhase } from "./foreign-politics.js";
import { regimePhase } from "./regime-npc.js";
import { defaultPhase } from "./sovereign-default.js";
import { familyLapsePhase } from "./scenario-family-lapse.js";
import { noopPhase } from "./turn-loop.js";
/**
 * Order is the rule, not the ingredients. The world moves first — nations act,
 * then operators outside any government's writ, then the wars and the
 * conditions the country is already living through take their week, then the
 * player's own cabinet answers for it, then the standing program does
 * another week's work — the player's, then every other government's — then old
 * grievances fade by a tick. Removal reads last,
 * so the pressure it computes is pressure after everything that happened this
 * week rather than before it.
 *
 * Wars and conditions run before the cabinet rather than after because they
 * are the week the cabinet is answering for: a defense minister's week is set
 * by the front, not the other way round.
 *
 * A named list rather than a concatenation, so the sequence is a value the
 * runner walks one step at a time and a reader can name the slot it is looking
 * at. The runner applies each step's packets before planning the next, which
 * is what makes every "after X" below a real read of X's week rather than a
 * statement of intent.
 */
export function campaignPhaseSequence(charter) {
    return [
        { id: "npcActionPhase", run: npcActionPhase },
        // Right after the acting, so a campaign that was not pressed this week
        // is already stale by the time anything else reads it.
        { id: "pursuitPhase", run: pursuitPhase },
        { id: "operatorPhase", run: operatorPhase },
        { id: "conflictPhase", run: conflictPhase },
        // The week's draw on stocks reads the fighting it paid for.
        { id: "munitionsPhase", run: munitionsPhase },
        // After the week's actors, so an event between two governments answers the
        // moves they made rather than racing them.
        { id: "worldEventPhase", run: worldEventPhase },
        // Prices move before the economy drifts, so a shock reaches inflation and
        // growth through the pressure the drift reads rather than by a level write.
        { id: "commodityPhase", run: commodityPhase },
        // Before the conditions, because this week's economy is what this week's
        // conditions read: a recession opens on a reading of growth, so the growth
        // it is read against has to be this week's rather than last week's. It is
        // also the only writer of growth, inflation and unemployment — a standing
        // condition states its macro pressure and this phase applies it, so the
        // condition cannot become the largest writer of the figure it is gated on.
        { id: "macroDriftPhase", run: macroDriftPhase },
        // A default abroad reads the economy the drift has just settled.
        { id: "defaultPhase", run: defaultPhase },
        { id: "conditionPhase", run: conditionPhase },
        // After conditions, before capacity: local lean mean-reverts and tax
        // holidays count down through apply(), so the week's employment
        // recovery is not folding in a city the tick has not yet moved.
        { id: "cityPhase", run: cityPhase },
        // After the conditions that open the obligations, before the housekeeping
        // that expires them: a claim opened this week must be on the books before
        // statePhase counts what is owed, and cannot expire in the week it opened.
        { id: "obligationPhase", run: obligationPhase },
        // Beside the obligations, because both are the price of what the president
        // did or did not do about an emergency: one bills the silence, the other
        // bills the powers still being held.
        { id: "emergencyPhase", run: emergencyPhase },
        { id: "statePhase", run: statePhase },
        // Right after the fighting, because refit is what the week after an
        // action is: the rung that was taken this week has already charged the
        // force, and this is the week of rest it does not get if another one
        // is taken next week.
        { id: "capacityPhase", run: capacityPhase },
        // Beside the refit, because a theater's posture is drawn on the same force
        // the refit is restoring: a command left at surge is spending the week the
        // capacity phase was giving back.
        { id: "commandPhase", run: commandPhase },
        // Right after the fighting for the same reason the war powers gate reads
        // it: an obligation opened by this week's introduction of forces is owed
        // within forty-eight hours, so the deadline has to be marked before the
        // chamber's mood is settled on Friday.
        { id: "warPowersReportPhase", run: warPowersReportPhase },
        // After the wars and the campaigns, because what a compact is worth
        // and who is frightened of whom are both read off the board those two
        // have just finished moving.
        { id: "blocPhase", run: blocPhase },
        // Immediately after, because a call is read off the same two facts the
        // bloc phase has just priced — who is at war and what the compact is worth
        // — and because the fracture rule and the call rule must never disagree
        // about a week. A compact both belligerents sit in is a fracture and not a
        // call, and that split is only stable if one board decides both.
        { id: "compactPhase", run: compactPhase },
        // Before the consequences draw, so a week that cost a minister their
        // regard is priced at the loyalty it actually left them with rather
        // than at last week's.
        // The executive branch's own week runs before the cabinet's and before
        // policy: what an agency can deliver has to be settled before anything
        // asks it to deliver, and a nomination confirmed this week should be in
        // the chair when this week's policy is executed.
        // Retaliation lands before the budget counts the week, so a trade war's
        // cost is in the same week's books as the tariff that caused it.
        { id: "tradePhase", run: tradePhase },
        // After retaliation lands, so a partner's answer this week counts toward a
        // finding due the same week.
        { id: "tariffFindingPhase", run: tariffFindingPhase },
        { id: "nominationPhase", run: nominationPhase },
        { id: "judicialVacancyPhase", run: judicialVacancyPhase },
        { id: "institutionPhase", run: institutionPhase },
        // Right after the branch's own week, because a service is processed at the
        // delivery its owner and its approvers have just settled at.
        { id: "servicePhase", run: servicePhase },
        // Beside the services and for the same reason: a project's review and
        // construction move at the delivery the branch has just settled at.
        { id: "projectPhase", run: projectPhase },
        { id: "militaryConstructionPhase", run: militaryConstructionPhase },
        { id: "offshoreLeaseSalePhase", run: offshoreLeaseSalePhase },
        { id: "cleanPowerPurchasePhase", run: cleanPowerPurchasePhase },
        { id: "blockedAssetPhase", run: blockedAssetPhase },
        // After the institutions, because a referral's clock is a fact about days
        // rather than about how the agency it came from is running — but the
        // agency has to have had its week before the record reads its standing.
        { id: "intelligencePhase", run: intelligencePhase },
        { id: "cabinetLoyaltyPhase", run: cabinetLoyaltyPhase },
        { id: "cabinetConsequencesPhase", run: cabinetConsequencesPhase },
        { id: "policyPhase", run: policyPhase },
        // After the program, because both draw on the same treasury and the
        // order has to be fixed: the country is governed first, and the
        // the budget is drawn on what governing it left behind.
        // Before the accounts draw, because the money has to be apportioned before
        // anything can be obligated against it: this is the week's release of the
        // appropriation Congress enacted, and it is the only thing in the sequence
        // that credits the administration's authority.
        { id: "apportionmentPhase", run: apportionmentPhase },
        { id: "budgetPhase", run: budgetPhase },
        // After the appropriation, because a commitment is drawn on what the
        // budget left rather than on what the vote said: an administration
        // that has overspent its establishment does not get to keep its
        // promises abroad with money it does not have.
        { id: "commitmentPhase", run: commitmentPhase },
        // After the commitments and before the country's books: population moves
        // are demography, not fiscal policy, and `fiscalPhase` reads a debt and a
        // GDP that should already reflect who the country has this week rather
        // than who it had last week.
        { id: "vitalsPhase", run: vitalsPhase },
        // After the commitments, because that is where the week's obligations are
        // finally known: the country's own books take the week the government
        // actually had. The deficit accumulates into the debt, nominal growth
        // compounds the output under it, and the rating follows both — so a term of
        // deficits is a thing the player watches arrive rather than a picture beside
        // the controls.
        { id: "fiscalPhase", run: fiscalPhase },
        // Before the chamber's mood settles, because being investigated is one of
        // the three things that mood is a reading of. The auditors go first: an
        // audit the President has just moved against is a thing a committee opens
        // its own file on in the same week, which is the only order in which that
        // chain reads as one event rather than as two a month apart.
        { id: "inspectorGeneralPhase", run: inspectorGeneralPhase },
        { id: "committeeInquiryPhase", run: committeeInquiryPhase },
        // The department's own answer, after the two files that could become its
        // predicate and before the ripening that would advance them: a counsel is
        // appointed out of a matter that has already reported, never out of one
        // reporting this morning.
        { id: "specialCounselPhase", run: specialCounselPhase },
        // Last of the three, so a file opened this week is not also advanced by it.
        { id: "oversightRipeningPhase", run: oversightRipeningPhase },
        // Before governance and before removal, because the arc reads the
        // chamber's mood and the chamber's mood is a reading of the week that
        // has just happened rather than of the one before it.
        { id: "congressPhase", run: congressPhase },
        // After the chamber's mood, before the week's votes are counted: a
        // delegation's target is a displacement on this week's disposition, and
        // the disposition a vote is counted against already carries the drift.
        // Governor drift shares the slot until the two are composed into one
        // packet.
        { id: "delegationPhase", run: delegationPhase },
        { id: "governorPhase", run: governorPhase },
        // After the chamber's mood settles, because what Congress sends the
        // President and whether it can pass a bill over him are both read off
        // the disposition this week produced.
        { id: "legislationPhase", run: legislationPhase },
        // The courts, whenever a challenge filed weeks ago comes back.
        // After the chamber and after the desk, because both are how a lapse ends:
        // a stopgap Congress carried this week and the President signed this week
        // has already moved the date this phase reads, so the government reopens in
        // the week it was funded rather than in the one after it.
        { id: "shutdownPhase", run: shutdownPhase },
        { id: "judicialReviewPhase", run: judicialReviewPhase(charter) },
        // After the courts, because a rule the bench has just stayed must not then
        // take effect in the same week — and after the chamber, because a
        // resolution of disapproval enacted this week is what undoes one.
        { id: "rulemakingPhase", run: rulemakingPhase },
        { id: "orderExpiryPhase", run: orderExpiryPhase },
        // Beside the President's own rulemaking rather than inside it: this is what
        // the regulatory bodies do on their own statutory clock, whether or not the
        // administration asked for it. After the courts for the same reason the
        // rulemaking phase is — a docket item the bench vacated this week must not
        // also land this week.
        { id: "docketPhase", run: docketPhase },
        // After the courts and the chamber, because what the coverage hardens
        // or softens around is the week's record and the rulings are part of it.
        { id: "pressPhase", run: pressPhase },
        // After the press, because a story is closed against the room it died in.
        { id: "scandalPhase", run: scandalPhase },
        // After the press, because the country's opinion on election night is
        // the one the coverage has just finished shaping — and before removal,
        // so a chamber the midterms have just recomposed is the chamber the
        // impeachment arc reads.
        { id: "electionPhase", run: electionPhase(charter) },
        { id: "governancePhase", run: governancePhase },
        // On the week's last office day, because every death and seat change it
        // applies is dated inside the week: run on any earlier day it would apply a
        // death drawn for Saturday on Thursday. Before the foreign week, which
        // seats a successor to any leader who died in office this week.
        { id: "officeSuccessionPhase", run: officeSuccessionPhase },
        // A seat changes hands after its government has set this week's program,
        // so the new leader's offset first reaches the following week's decisions.
        { id: "foreignPoliticsPhase", run: foreignPoliticsPhase },
        // After the week's changes of government, so an operation whose target fell
        // this week is closed against the government that fell rather than run on.
        { id: "regimePhase", run: regimePhase },
        { id: "grudgeDecayPhase", run: grudgeDecayPhase },
        // Due pledges settle before the public's week is read, so a promise broken
        // this week weighs on this week's opinion.
        { id: "pledgePhase", run: pledgePhase },
        // After everything the country could have seen this week, and before
        // removal: the public revises its reading of the administration, and
        // the arc then reads an approval rating that already includes that revision.
        { id: "opinionPhase", run: opinionPhase },
        // After the public's revision, because a cohort weighs the mood this
        // week's revision left rather than last week's: cohorts cancel matching
        // causes, decay at valence-split rates, and emit a dispersion polarize
        // under the joint turn ceiling.
        { id: "demosPhase", run: demosPhase },
        { id: "removalPhase", run: removalPhase(charter) },
        // Last, and after removal: an arc lapses on the week's closing date, and
        // nothing earlier in the week reads whether one did.
        { id: "familyLapsePhase", run: familyLapsePhase },
    ];
}
export function campaignTurnPhases(charter, layout = false) {
    return turnPhasesFrom(campaignPhaseSequence(charter), layout);
}
/** The flat week, or the same runs cut into office days when `layout` is set. */
export function turnPhasesFrom(sequence, layout) {
    const simulate = simulateRuns(sequence);
    if (!layout)
        return { simulate, select: noopPhase };
    return {
        simulate,
        select: noopPhase,
        days: weekGroups(sequence).map((group) => group.map((phase) => phase.run)),
    };
}
/**
 * The week's phases cut into the seven office days, in the sequence's own
 * order. Day 2 is empty because the second actor still runs inside
 * `npcActionPhase`, which sits on day 1 until that phase is split.
 * The flat list is what a week runs today. The days are what the clock will
 * run, and they are not switched on here.
 */
export function weekGroups(sequence) {
    const at = (id) => {
        const index = sequence.findIndex((phase) => phase.id === id);
        if (index < 0)
            throw new Error(`the week layout has no ${id}`);
        return index;
    };
    const span = (from, to) => sequence.slice(at(from), to === undefined ? sequence.length : at(to));
    return [
        span("npcActionPhase", "pursuitPhase"),
        [],
        span("pursuitPhase", "commodityPhase"),
        span("commodityPhase", "nominationPhase"),
        span("nominationPhase", "inspectorGeneralPhase"),
        span("inspectorGeneralPhase", "pressPhase"),
        span("pressPhase"),
    ];
}
/** Today's flat week. Throws if the office-day cut dropped or reordered a phase. */
export function simulateRuns(sequence) {
    const laid = weekGroups(sequence).flat();
    const same = laid.length === sequence.length && laid.every((phase, index) => phase.id === sequence[index]?.id);
    if (!same)
        throw new Error("the week layout does not cover the phase sequence");
    return sequence.map((phase) => phase.run);
}
