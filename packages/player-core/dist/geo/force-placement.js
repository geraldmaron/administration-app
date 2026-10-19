import { BOARD_DEPLOYMENTS, COMBATANT_COMMANDS, commandFor, deploymentLocation, hashIndex, nationsInAor, selectNation, } from "@admin/engine";
import { BASING_COUNTRY_TOTAL, MARITIME_ZONES, US_BASING, forceAssetFor, maritimeZone, nationOfZone, } from "@admin/world";
import { zoneSlots } from "./zone-slots.js";
/**
 * The command that holds a sea: the one holding most of its littoral on this
 * campaign's map, the principal littoral breaking a tie. Undefined when no
 * littoral government is on the roster.
 */
export function seaCommand(campaign, sea) {
    const zone = maritimeZone(sea);
    if (!zone)
        return undefined;
    const commands = zone.littoral
        .filter((nation) => campaign.nations[nation] !== undefined)
        .map((nation) => commandFor(campaign, nation))
        .filter((command) => command !== undefined);
    const counts = commands.reduce((tally, command) => tally.set(command, (tally.get(command) ?? 0) + 1), new Map());
    const most = Math.max(0, ...counts.values());
    return commands.find((command) => counts.get(command) === most);
}
/** The command whose area a zone falls in, read live. */
export function zoneCommand(campaign, zone) {
    const nation = nationOfZone(zone);
    return nation ? commandFor(campaign, nation) : seaCommand(campaign, zone);
}
/**
 * Every command that has an area, in the catalog's order. A functional command
 * (strategic, special operations, transportation, cyber) never has one, and a
 * geographic command nothing on the map is assigned to (space) has none
 * either: those are cards, never regions.
 */
export function commandAreas(campaign) {
    return COMBATANT_COMMANDS.filter((def) => def.type === "geographic").flatMap((def) => {
        const nations = nationsInAor(campaign, def.id);
        const seas = MARITIME_ZONES.filter((zone) => seaCommand(campaign, zone.id) === def.id).map((zone) => zone.id);
        return nations.length + seas.length > 0 ? [{ command: def.id, nations, seas }] : [];
    });
}
function basingRow(commitment) {
    const base = commitment.location?.base;
    if (!base)
        return undefined;
    return US_BASING.find((row) => row.country === commitment.target.id && row.base === base && row.base !== BASING_COUNTRY_TOTAL);
}
/**
 * Where a commitment stands: its basing row, else its stored zone, else the
 * zone the engine would write for it today. A base whose label is not on the
 * table stands in its host.
 */
function resolveZone(campaign, commitment) {
    const row = basingRow(commitment);
    if (row)
        return { zone: row.country, row, band: row.personnelBand, service: row.service };
    const theater = commitment.location?.theater ?? deploymentLocation(campaign, commitment.kind, commitment.actor, commitment.target)?.theater;
    if (theater) {
        const posture = BOARD_DEPLOYMENTS.find((entry) => entry.country === commitment.target.id && entry.theater === theater);
        return { zone: theater, ...(posture ? { band: posture.personnelBand, service: posture.service } : {}) };
    }
    const host = commitment.kind === "basing" ? nationOfZone(commitment.target.id) : undefined;
    return host && campaign.nations[host] ? { zone: commitment.target.id } : undefined;
}
function zoneName(campaign, zone) {
    const nation = nationOfZone(zone);
    return maritimeZone(zone)?.name ?? (nation ? selectNation(campaign, nation)?.base.identity.name : undefined) ?? zone;
}
function zoneSource(zone) {
    const sea = maritimeZone(zone);
    return sea ? `${sea.name}: ${sea.provenance}` : "a made-up spot inside the host country, not a real place";
}
/** A band's rough midpoint, for sizing only: "A to B" gives the middle, "under N" half of N, anything else nothing. */
export function bandMidpoint(band) {
    if (!band)
        return undefined;
    const range = /([\d,]+)\s+to\s+([\d,]+)/.exec(band);
    if (range)
        return (Number(range[1].replace(/,/g, "")) + Number(range[2].replace(/,/g, ""))) / 2;
    const under = /under\s+([\d,]+)/.exec(band);
    return under ? Number(under[1].replace(/,/g, "")) / 2 : undefined;
}
function sourcePersonnel(commitment) {
    const source = commitment.source;
    return source.kind === "orderOfBattle" ? source.count * forceAssetFor(source.unitType).nominalPersonnel : 0;
}
const forceCommitments = (campaign) => Object.values(campaign.commitments)
    .filter((commitment) => commitment.status === "active" && (commitment.kind === "basing" || commitment.kind === "deployment"))
    .sort((a, b) => a.id.localeCompare(b.id));
/**
 * The personnel a placement sizes by. An installation whose band is "in the
 * country total" takes an even share of its host's total, so the host's
 * markers add up to the total rather than to nothing.
 */
function sharedPersonnel(placed) {
    const inTotal = new Map();
    for (const { resolved } of placed) {
        if (resolved.row?.personnelBand === "in the country total")
            inTotal.set(resolved.row.country, (inTotal.get(resolved.row.country) ?? 0) + 1);
    }
    return ({ commitment, resolved }) => {
        const host = resolved.row?.country;
        if (host && resolved.band === "in the country total") {
            const total = bandMidpoint(US_BASING.find((row) => row.country === host && row.base === BASING_COUNTRY_TOTAL)?.personnelBand) ?? 0;
            return total / (inTotal.get(host) ?? 1);
        }
        return bandMidpoint(resolved.band) ?? sourcePersonnel(commitment);
    };
}
function anchorPoint(row) {
    return row?.anchor === "sourced" && row.lat !== undefined && row.lon !== undefined ? [row.lon, row.lat] : undefined;
}
/**
 * Every force on the board with a place to stand: installations at their
 * sourced points, everything else on a seeded slot in its zone. A slot is the
 * hash of the campaign seed and the commitment id, stepped past slots an
 * earlier unit in the same zone already holds, so two units share a spot only
 * when the zone has run out of them.
 */
export function placeForces(campaign) {
    const placed = forceCommitments(campaign).flatMap((commitment) => {
        const resolved = resolveZone(campaign, commitment);
        return resolved ? [{ commitment, resolved }] : [];
    });
    const personnelOf = sharedPersonnel(placed);
    const taken = new Map();
    return placed.flatMap((entry) => {
        const { commitment, resolved } = entry;
        const anchor = anchorPoint(resolved.row);
        const point = anchor ?? slotFor(campaign, commitment, resolved.zone, taken);
        if (!point)
            return [];
        const name = zoneName(campaign, resolved.zone);
        const command = zoneCommand(campaign, resolved.zone);
        return [
            {
                id: commitment.id,
                actor: commitment.actor,
                kind: commitment.kind,
                zone: resolved.zone,
                zoneName: name,
                ...(command ? { command } : {}),
                precision: anchor ? "installation" : "zone",
                point,
                label: anchor ? resolved.row.base : name,
                ...(resolved.service ? { service: resolved.service } : {}),
                ...(resolved.band ? { personnelBand: resolved.band } : {}),
                personnel: personnelOf(entry),
                source: anchor ? `${resolved.row.anchorSource}, opened ${resolved.row.anchorOpened}` : zoneSource(resolved.zone),
            },
        ];
    });
}
function slotFor(campaign, commitment, zone, taken) {
    const nation = nationOfZone(zone);
    const geo = nation ? selectNation(campaign, nation)?.base.geo : undefined;
    const slots = zoneSlots(zone, geo ? [geo.lon, geo.lat] : undefined);
    if (slots.length === 0)
        return undefined;
    const used = taken.get(zone) ?? new Set();
    const start = hashIndex(`${campaign.seed}:${commitment.id}`, slots.length);
    const free = Array.from({ length: slots.length }, (_, step) => (start + step) % slots.length).find((index) => !used.has(index));
    const index = free ?? start;
    taken.set(zone, new Set([...used, index]));
    return slots[index];
}
