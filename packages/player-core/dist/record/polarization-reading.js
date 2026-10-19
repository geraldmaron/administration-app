import { ERA_POLARIZATION, POLARIZATION_DRIFT_MAX, POLARIZATION_DRIFT_MIN, blocApprovals, erosionOf, headlineOf, opinionCourse, polarizationDrift, selectElectorate, valenceSlope, } from "@admin/engine";
function polarizationMoves(campaign) {
    return campaign.ledger
        .filter((entry) => entry.mood?.polarization !== undefined && entry.mood.polarization !== 0)
        .map((entry) => ({
        turn: entry.turn,
        description: entry.description,
        delta: entry.mood.polarization,
        byPlayer: entry.actor === "player",
    }));
}
/** The headline the same week would read at the era's level of division. */
function headlineAtEra(campaign) {
    const reading = selectElectorate(campaign);
    const inputs = { ...reading, polarization: ERA_POLARIZATION, erosion: erosionOf(campaign, ERA_POLARIZATION) };
    return headlineOf(reading.shares, blocApprovals(inputs));
}
export function polarizationReading(campaign) {
    const moves = polarizationMoves(campaign);
    const value = selectElectorate(campaign).polarization;
    const divided = moves.filter((move) => move.delta > 0);
    const heaviest = divided.reduce((worst, move) => (worst === undefined || move.delta > worst.delta ? move : worst), undefined);
    const { partisanship, headline } = selectElectorate(campaign);
    const series = [...opinionCourse(campaign).map((sample) => sample.polarization)];
    return {
        value,
        anchor: ERA_POLARIZATION,
        drift: polarizationDrift(value),
        driftMin: POLARIZATION_DRIFT_MIN,
        driftMax: POLARIZATION_DRIFT_MAX,
        position: (polarizationDrift(value) - POLARIZATION_DRIFT_MIN) / (POLARIZATION_DRIFT_MAX - POLARIZATION_DRIFT_MIN),
        anchorAt: -POLARIZATION_DRIFT_MIN / (POLARIZATION_DRIFT_MAX - POLARIZATION_DRIFT_MIN),
        againstEra: value / ERA_POLARIZATION - 1,
        ownIdentifierMovement: {
            now: valenceSlope(partisanship.ownId, value),
            atEra: valenceSlope(partisanship.ownId, ERA_POLARIZATION),
        },
        headlineEffect: headline - headlineAtEra(campaign),
        series,
        addedByUs: divided.filter((move) => move.byPlayer).reduce((sum, move) => sum + move.delta, 0),
        addedByTheWorld: divided.filter((move) => !move.byPlayer).reduce((sum, move) => sum + move.delta, 0),
        healed: moves.filter((move) => move.delta < 0).reduce((sum, move) => sum - move.delta, 0),
        ...(heaviest ? { heaviest: { turn: heaviest.turn, description: heaviest.description, delta: heaviest.delta } } : {}),
    };
}
