import { commitmentsToward, selectActiveConflicts, selectRelationshipsFrom, sideOf } from "@admin/engine";
import { worldDataset } from "@admin/world";
import { stanceForDisposition } from "../format/figures";
import { foreignCoverageReading } from "../press/foreign-coverage";
import { recentMoves } from "../reasons/recent-moves";
import { place } from "../navigation/places";
import { envoyReading, rapportLine } from "./engagement";
import { figureProvenance } from "./figure-provenance";
import { inOfficeSince, nextSelectionWords, worldLeaderRows } from "./leaders";
import { nationForces } from "./nation-forces";
import { nationPosture } from "./nation-posture";
import { nationPower } from "./nation-power";
import { nationProgram } from "./nation-program";
import { nationVitals } from "./nation-vitals";
import { boardStance, standingToward } from "./standing";
import { thirdPartyTieReadable } from "./third-party-standing";
import { bilateralTradePartners } from "./trade-partners";
import { usForcesIn } from "./us-presence";
const TIE_ARCS_PER_SIDE = 3;
const TRADE_ARCS_SHOWN = 6;
const ARCS_SHOWN = 8;
const ALLY_WORD = { favorable: "Close partner", neutral: "Works with", caution: "Keeps its distance from", adverse: "Rival" };
/** The governments this one is closest to and furthest from, only where the services can read the tie. */
function tiesOf(campaign, nation) {
    const home = campaign.founding.nation;
    const readable = selectRelationshipsFrom(campaign, nation).filter((tie) => tie.to !== home && campaign.nations[tie.to] !== undefined && thirdPartyTieReadable(campaign, nation, tie.to));
    const row = (tie, kind) => ({
        nation: tie.to,
        name: campaign.nations[tie.to].base.identity.name,
        href: place.country(tie.to),
        word: ALLY_WORD[stanceForDisposition(tie.alignment)],
        kind,
    });
    const ranked = [...readable].sort((a, b) => b.alignment - a.alignment || a.to.localeCompare(b.to));
    const allies = ranked.filter((tie) => tie.alignment > 0.2).map((tie) => row(tie, "ally"));
    const rivals = ranked.filter((tie) => tie.alignment < -0.2).reverse().map((tie) => row(tie, "rival"));
    return [...allies, ...rivals];
}
function arcsOf(trade, ties) {
    const trading = trade.partners.slice(0, TRADE_ARCS_SHOWN).map((partner) => ({ to: partner.nation, kind: "trade", weight: partner.share }));
    const nearest = (kind) => ties.filter((tie) => tie.kind === kind).slice(0, TIE_ARCS_PER_SIDE);
    const bonds = [...nearest("ally"), ...nearest("rival")].map((tie) => ({ to: tie.nation, kind: tie.kind, weight: 0.1 }));
    const seen = new Set();
    return [...trading, ...bonds].filter((arc) => !seen.has(`${arc.kind}:${arc.to}`) && seen.add(`${arc.kind}:${arc.to}`)).slice(0, ARCS_SHOWN);
}
function organizationsOf(campaign, nation) {
    const runtime = campaign.nations[nation];
    return (runtime?.memberships ?? runtime?.base.memberships ?? []).flatMap((id) => {
        const body = worldDataset.organizations.find((org) => org.id === id);
        return body ? [{ id: body.id, name: body.name, href: place.organization(body.id) }] : [];
    });
}
function warsWith(campaign, nation) {
    const home = campaign.founding.nation;
    return selectActiveConflicts(campaign).flatMap((conflict) => {
        const ours = sideOf(conflict, home);
        const theirs = sideOf(conflict, nation);
        return ours !== undefined && theirs !== undefined && ours !== theirs ? [conflict.id] : [];
    });
}
/** A foreign government's whole file, or undefined for the President's own country and an id the board does not carry. */
export function nationFile(campaign, nation) {
    const standing = standingToward(campaign, nation);
    const leader = worldLeaderRows(campaign).find((row) => row.nation === nation);
    const posture = nationPosture(campaign, nation);
    const trade = bilateralTradePartners(campaign, nation);
    const forces = nationForces(campaign, nation);
    const power = nationPower(campaign, nation);
    const program = nationProgram(campaign, nation);
    if (!standing || !leader || !posture || !trade || !forces || !power || !program)
        return undefined;
    const ties = tiesOf(campaign, nation);
    const since = inOfficeSince(campaign, nation);
    const next = nextSelectionWords(campaign, nation);
    const rapport = rapportLine(campaign, nation);
    const coverage = foreignCoverageReading(campaign, nation);
    const fidelity = campaign.nations[nation]?.base.fidelity ?? "full";
    const provenance = fidelity === "full" ? undefined : figureProvenance(nation, fidelity);
    return {
        nation,
        name: leader.nationName,
        leader,
        ...(since ? { inOfficeSince: since } : {}),
        ...(next ? { nextSelection: next } : {}),
        posture,
        standing,
        boardStance: boardStance(standing),
        ...(rapport ? { rapport } : {}),
        envoy: envoyReading(campaign),
        atWarWith: warsWith(campaign, nation),
        vitals: nationVitals(campaign, nation),
        power,
        trade,
        forces,
        presence: usForcesIn(campaign, nation).map((placement) => ({
            id: placement.id,
            label: placement.label,
            where: placement.precision === "installation" ? "Base" : `Somewhere in ${placement.zoneName}`,
            precision: placement.precision,
            ...(placement.personnelBand ? { band: placement.personnelBand } : {}),
            lon: placement.point[0],
            lat: placement.point[1],
            weight: placement.personnel,
        })),
        commitments: commitmentsToward(campaign, campaign.founding.nation, nation).map((commitment) => ({ id: commitment.id, kind: commitment.kind, rationale: commitment.rationale, status: commitment.status })),
        program,
        recent: recentMoves(campaign, nation, Number.POSITIVE_INFINITY),
        organizations: organizationsOf(campaign, nation),
        ...(coverage ? { coverage } : {}),
        ties,
        arcs: arcsOf(trade, ties),
        ...(provenance ? { provenance } : {}),
    };
}
