function simpleMajority(seats) {
    return Math.floor(seats / 2) + 1;
}
export function breakSenateTie(congress, vote, counted = "with") {
    if (vote.chamber !== "senate" || vote.yeas !== vote.nays)
        return vote;
    const vacant = (congress.members ?? []).filter((member) => member.chamber === "senate" && member.vacancy !== undefined).length;
    if (vote.required !== simpleMajority(congress.chambers.senate.seats - vacant))
        return vote;
    const officer = congress.presidingOfficer;
    if (!officer)
        return { ...vote, passed: false };
    // The Vice President casts an additional vote; no senator's recorded ballot changes.
    if (counted === "against") {
        return { ...vote, nays: vote.nays + 1, passed: false, tieBrokenBy: officer.person, castingVote: { person: officer.person, yea: false } };
    }
    const yeas = vote.yeas + 1;
    return {
        ...vote,
        yeas,
        nays: vote.nays,
        passed: yeas >= vote.required,
        tieBrokenBy: officer.person,
        castingVote: { person: officer.person, yea: true },
    };
}
