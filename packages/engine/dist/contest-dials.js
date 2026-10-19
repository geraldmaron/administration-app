/** The layers a contest is decided on, per instrument. Ids are stable; labels are presentation. */
export const CONTEST_LAYERS = {
    military: ["ground", "air", "sea", "cyber", "space", "reach", "sustainment"],
    economic: ["dependence", "reserves", "market", "resolve"],
    diplomatic: ["reach", "standing", "coalition", "temperature"],
    covert: ["collection", "access", "penetration"],
    assistance: ["purse", "delivery", "absorption"],
};
export const CONTEST_DIALS = {
    contrast: 0.45,
    floor: 0.05,
    ceiling: 0.95,
    rungReliability: { 1: 1, 2: 0.97, 3: 0.9, 4: 0.82, 5: 0.72 },
    deterrenceDrag: 0.35,
    deterrenceMutualRelief: 0.7,
    alliedDeterrenceDrag: 0.3,
    habituation: 1,
    weights: {
        // Land is the heaviest because taking or holding ground is what a military
        // act is ultimately judged on; air outranks sea because every rung on the
        // ladder below an invasion is flown rather than sailed.
        military: { ground: 0.26, air: 0.2, sea: 0.13, cyber: 0.09, space: 0.05, reach: 0.15, sustainment: 0.12 },
        economic: { dependence: 0.35, reserves: 0.25, market: 0.2, resolve: 0.2 },
        diplomatic: { reach: 0.35, standing: 0.25, coalition: 0.2, temperature: 0.2 },
        covert: { collection: 0.45, access: 0.3, penetration: 0.25 },
        assistance: { purse: 0.35, delivery: 0.3, absorption: 0.35 },
    },
    forceMassShare: 0.4,
    homeGroundFloor: 0.45,
    defaultBranchShare: { ground: 0.55, air: 0.2, sea: 0.18, cyber: 0.04, space: 0.03 },
};
