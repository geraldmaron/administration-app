/** Only stored, answered requests contribute. A draft cannot self-certify partners. */
export function confirmedSupport(campaign, request) {
    if (request.support?.mode !== "seek")
        return [];
    const act = Object.values(campaign.issuedActs ?? {}).find((entry) => entry.kind === "instrument" && entry.request === request && entry.status !== "withdrawn");
    return (act?.supportRequests ?? []).filter((response) => response.status === "confirmed").map((response) => response.nation);
}
