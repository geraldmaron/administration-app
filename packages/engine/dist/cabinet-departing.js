// A Secretary who has announced they are leaving and serves on until they go.
//
// Kept as a marked flag rather than a field on the campaign: the announcement
// is an event on the record, dated by its marker, that content can gate on
// ("the Secretary who is on their way out"), and the chair itself stays exactly
// what it is, held by a confirmed officer, until the day they leave. A leaf
// module so the nomination pipeline can ask whether a chair is being handed on
// without importing the cabinet sweep.
const PREFIX = "cabinet-departing";
/** `cabinet-departing:<role>:<person>`, standing from the announcement until the Secretary has gone. */
export function departingFlag(role, person) {
    return `${PREFIX}:${role}:${person}`;
}
/** Whether this person has announced they are leaving this chair and has not yet gone. */
export function isDeparting(campaign, role, person) {
    return campaign.player.flags[departingFlag(role, person)] === true;
}
/** Whether the chair's holder is serving out an announced departure, so a successor may be sent up while they sit. */
export function awaitsSuccessor(campaign, role) {
    const holder = role ? campaign.player.cabinet[role] : undefined;
    return role !== undefined && holder !== undefined && isDeparting(campaign, role, holder);
}
/**
 * Every departure announced and not yet made, oldest first. One pass over the
 * flags, reading each announcement's week off its marker; an announcement with
 * no marker is dated to the week it is read, so it is never read as overdue.
 */
export function announcedDepartures(campaign) {
    const standing = [];
    const weeks = new Map();
    const markerPrefix = `flagset:${PREFIX}:`;
    for (const [flag, set] of Object.entries(campaign.player.flags)) {
        if (set && flag.startsWith(`${PREFIX}:`))
            standing.push(flag);
        if (!flag.startsWith(markerPrefix))
            continue;
        const cut = flag.lastIndexOf(":");
        const week = Number(flag.slice(cut + 1));
        const announced = flag.slice("flagset:".length, cut);
        if (Number.isInteger(week))
            weeks.set(announced, Math.max(week, weeks.get(announced) ?? week));
    }
    return standing
        .map((flag) => {
        const [, role, person] = flag.split(":");
        return { role: role, person: person, announcedTurn: weeks.get(flag) ?? campaign.turn };
    })
        .sort((a, b) => a.announcedTurn - b.announcedTurn || a.role.localeCompare(b.role));
}
