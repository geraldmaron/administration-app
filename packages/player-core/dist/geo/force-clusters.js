import { commandDef, selectNation } from "@admin/engine";
function groupKey(campaign, placement, zoom) {
    if (zoom === "close")
        return `close:${placement.id}`;
    if (zoom === "region")
        return `region:${placement.actor}:${placement.zone}`;
    const ours = placement.actor === campaign.founding.nation;
    return ours && placement.command ? `world:command:${placement.command}` : `world:${placement.actor}:${ours ? placement.zone : "abroad"}`;
}
function groupLabel(campaign, members, zoom) {
    const first = members[0];
    if (zoom === "close")
        return first.label;
    if (zoom === "region")
        return first.zoneName;
    const ours = first.actor === campaign.founding.nation;
    if (ours && first.command)
        return commandDef(first.command)?.abbr ?? first.command;
    return ours ? first.zoneName : (selectNation(campaign, first.actor)?.base.identity.name ?? first.actor);
}
/** Weighted by personnel where the members carry any, so a marker sits over the bulk of the force rather than the middle of its map. */
function centroid(members) {
    const total = members.reduce((sum, member) => sum + member.personnel, 0);
    const weight = (member) => (total > 0 ? member.personnel / total : 1 / members.length);
    const lon = members.reduce((sum, member) => sum + member.point[0] * weight(member), 0);
    const lat = members.reduce((sum, member) => sum + member.point[1] * weight(member), 0);
    return [Math.round(lon * 10_000) / 10_000, Math.round(lat * 10_000) / 10_000];
}
export function clusterForces(campaign, placements, zoom) {
    const groups = placements.reduce((map, placement) => {
        const key = groupKey(campaign, placement, zoom);
        return map.set(key, [...(map.get(key) ?? []), placement]);
    }, new Map());
    return [...groups.entries()]
        .map(([key, members]) => ({
        key,
        zoom,
        label: groupLabel(campaign, members, zoom),
        point: centroid(members),
        members: members.map((member) => member.id).sort(),
        personnel: Math.round(members.reduce((sum, member) => sum + member.personnel, 0)),
        precision: zoom === "close" ? members[0].precision : "zone",
        actor: members[0].actor,
    }))
        .sort((a, b) => a.key.localeCompare(b.key));
}
