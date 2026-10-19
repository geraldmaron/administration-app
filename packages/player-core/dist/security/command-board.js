import { COMBATANT_COMMANDS, commandChain, commandDef, assignedFormations, commandEngagement, describeCommitment, effectivePosture, selectNation, } from "@admin/engine";
import { commandAreas, placeForces } from "../geo/force-placement.js";
import { formatDate } from "../format/figures.js";
import { place } from "../navigation/places.js";
const SERVICE_NAMES = {
    army: "Army",
    navy: "Navy",
    air: "Air Force",
    marines: "Marine Corps",
    space: "Space Force",
    cyber: "Cyber",
};
export const BRANCH_ORDER = ["army", "navy", "air", "marines", "space", "cyber"];
export const branchName = (branch) => SERVICE_NAMES[branch];
export const POSTURE_WORDS = { routine: "Routine", heightened: "Heightened", surge: "Surge" };
function personnelBy(placements) {
    return placements.reduce((tally, placement) => (placement.command ? tally.set(placement.command, (tally.get(placement.command) ?? 0) + placement.personnel) : tally), new Map());
}
const assignmentOf = (shares) => BRANCH_ORDER.map((branch) => ({ branch, label: SERVICE_NAMES[branch], share: shares[branch] })).filter((row) => row.share > 0);
function cardFor(campaign, id, areas, placements, heaviest, personnel) {
    const def = commandDef(id);
    const runtime = campaign.security.unifiedCommand.commands[id];
    if (!def || !runtime)
        return undefined;
    const commander = runtime.commander;
    const engagement = commandEngagement(campaign, id);
    return {
        id,
        abbr: def.abbr,
        name: def.name,
        hasArea: areas.has(id),
        mission: def.mission,
        ...(commander ? { commander: { name: commander.name, service: SERVICE_NAMES[commander.service], acting: commander.acting === true } } : {}),
        ordered: runtime.posture,
        effective: effectivePosture(campaign, id),
        engaged: engagement !== undefined,
        places: placements.filter((placement) => placement.command === id).length,
        weight: heaviest > 0 ? personnel / heaviest : 0,
        chain: commandChain(campaign, id).execution,
        assignment: assignmentOf(runtime.assignment),
        formations: BRANCH_ORDER.reduce((sum, branch) => sum + (assignedFormations(campaign, id, branch) ?? 0), 0),
        engagedWith: { against: engagement?.against.length ?? 0, toward: engagement?.toward.length ?? 0 },
        href: place.command(id),
    };
}
/** Every combatant command in the catalog's order, geographic first. */
export function commandCards(campaign) {
    const placements = placeForces(campaign);
    const personnel = personnelBy(placements);
    const heaviest = Math.max(0, ...personnel.values());
    const areas = new Set(commandAreas(campaign).map((area) => area.command));
    return COMBATANT_COMMANDS.flatMap((def) => {
        const card = cardFor(campaign, def.id, areas, placements, heaviest, personnel.get(def.id) ?? 0);
        return card ? [card] : [];
    });
}
/** The countries a geographic command holds today and the seas most of whose coast it holds. */
function areaOf(campaign, id) {
    const area = commandAreas(campaign).find((entry) => entry.command === id);
    return { nations: area?.nations ?? [], seas: area?.seas ?? [] };
}
/** The map key that frames a command's area: its countries and seas as one set. A functional command has none, so the world. */
export function commandCamera(campaign, id) {
    const { nations, seas } = areaOf(campaign, id);
    const members = [...nations.map((nation) => `nation:${nation}`), ...seas.map((sea) => `zone:${sea}`)];
    return members.length > 0 ? `set:${members.join("|")}` : "world";
}
/** The countries a command's area lights on the map, as a selection; a sea is not a region the map selects. */
export function commandSelection(campaign, id) {
    const { nations } = areaOf(campaign, id);
    return nations.length > 0 ? nations.map((nation) => `nation:${nation}`).join("|") : undefined;
}
const nameOf = (campaign, id) => selectNation(campaign, id)?.base.identity.name ?? id;
function zonesOf(campaign, id) {
    const mine = placeForces(campaign).filter((placement) => placement.command === id);
    const zones = mine.reduce((map, placement) => map.set(placement.zone, [...(map.get(placement.zone) ?? []), placement]), new Map());
    return [...zones.entries()]
        .map(([zone, members]) => ({
        zone,
        name: members[0].zoneName,
        rows: members.map((member) => {
            const commitment = campaign.commitments[member.id];
            return {
                id: member.id,
                label: member.label,
                precision: member.precision,
                what: commitment ? describeCommitment(commitment, campaign) : member.label,
                ...(commitment?.source.kind === "orderOfBattle" ? { asset: { unitType: commitment.source.unitType, count: commitment.source.count } } : {}),
                ...(member.service ? { service: member.service } : {}),
                ...(member.personnelBand ? { band: member.personnelBand === "in the country total" ? "counted in the host country's total" : member.personnelBand } : {}),
            };
        }),
    }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
function amendmentsOf(campaign, id) {
    const abbr = (command) => commandDef(command)?.abbr ?? command;
    return campaign.security.unifiedCommand.amendments
        .filter((amendment) => amendment.from === id || amendment.to === id)
        .map((amendment) => ({
        nation: nameOf(campaign, amendment.nation),
        from: abbr(amendment.from),
        to: abbr(amendment.to),
        date: formatDate(amendment.date),
        rationale: amendment.rationale,
    }));
}
/** One command's file, or undefined for an id the catalog does not list. */
export function commandFile(campaign, id) {
    const card = commandCards(campaign).find((entry) => entry.id === id);
    const def = card ? commandDef(card.id) : undefined;
    const runtime = card ? campaign.security.unifiedCommand.commands[card.id] : undefined;
    if (!card || !def || !runtime)
        return undefined;
    const engagement = commandEngagement(campaign, card.id);
    const selection = commandSelection(campaign, card.id);
    return {
        card,
        headquarters: def.headquarters,
        missions: runtime.missions,
        reliefs: runtime.reliefs,
        chainBreaks: commandChain(campaign, card.id).breaks.map((link) => link.reason),
        engagedAgainst: (engagement?.against ?? []).map((nation) => nameOf(campaign, nation)),
        engagedToward: (engagement?.toward ?? []).map((nation) => nameOf(campaign, nation)),
        assignment: card.assignment,
        zones: zonesOf(campaign, card.id),
        nations: areaOf(campaign, card.id).nations.map((nation) => ({ id: nation, name: nameOf(campaign, nation) })).sort((a, b) => a.name.localeCompare(b.name)),
        amendments: amendmentsOf(campaign, card.id),
        camera: commandCamera(campaign, card.id),
        ...(selection ? { selection } : {}),
    };
}
