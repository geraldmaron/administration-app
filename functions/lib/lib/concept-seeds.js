"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectSeedConcepts = selectSeedConcepts;
exports.getSeedConcepts = getSeedConcepts;
function getFirestore() {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
        admin.initializeApp();
    }
    return admin.firestore();
}
function getSeedPriority(seed, query) {
    var _a, _b, _c;
    let priority = 0;
    const seedScopeTier = (_a = seed.scopeTier) !== null && _a !== void 0 ? _a : 'universal';
    const seedScopeKey = (_b = seed.scopeKey) !== null && _b !== void 0 ? _b : 'universal';
    if (seedScopeTier === query.scopeTier)
        priority += 20;
    if (seedScopeKey === query.scopeKey)
        priority += 20;
    if (seedScopeTier === 'universal')
        priority += 10;
    if (seedScopeKey === 'universal')
        priority += 10;
    priority += Math.max(0, 10 - ((_c = seed.rank) !== null && _c !== void 0 ? _c : 10));
    return priority;
}
function selectSeedConcepts(seeds, query) {
    const eligible = seeds
        .filter((seed) => seed.active !== false)
        .sort((left, right) => {
        var _a, _b;
        const priorityDiff = getSeedPriority(right, query) - getSeedPriority(left, query);
        if (priorityDiff !== 0)
            return priorityDiff;
        const rankDiff = ((_a = left.rank) !== null && _a !== void 0 ? _a : 999) - ((_b = right.rank) !== null && _b !== void 0 ? _b : 999);
        if (rankDiff !== 0)
            return rankDiff;
        return left.concept.localeCompare(right.concept);
    });
    const selected = [];
    const usedLanes = new Set();
    const laneFor = (seed) => {
        var _a, _b, _c, _d;
        return [
            (_a = seed.severity) !== null && _a !== void 0 ? _a : 'unknown',
            (_b = seed.difficulty) !== null && _b !== void 0 ? _b : 'unknown',
            (_c = seed.actorPattern) !== null && _c !== void 0 ? _c : 'unknown',
            (_d = seed.optionShape) !== null && _d !== void 0 ? _d : 'unknown',
        ].join('|');
    };
    for (const seed of eligible) {
        if (selected.length >= query.count)
            break;
        const lane = laneFor(seed);
        if (usedLanes.has(lane))
            continue;
        usedLanes.add(lane);
        selected.push(seed);
    }
    for (const seed of eligible) {
        if (selected.length >= query.count)
            break;
        if (selected.includes(seed))
            continue;
        selected.push(seed);
    }
    return selected;
}
async function getSeedConcepts(query) {
    try {
        const db = getFirestore();
        const snapshot = await db.collection('concept_seeds')
            .where('bundle', '==', query.bundle)
            .get();
        if (snapshot.empty)
            return [];
        const seeds = snapshot.docs.map((doc) => doc.data());
        return selectSeedConcepts(seeds, query);
    }
    catch (error) {
        console.error('[ConceptSeeds] Failed to load concept seeds:', error);
        return [];
    }
}
//# sourceMappingURL=concept-seeds.js.map