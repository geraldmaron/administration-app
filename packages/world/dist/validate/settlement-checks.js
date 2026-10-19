export function checkSettlements(dataset) {
    const states = new Set(dataset.states.map((state) => state.id));
    const seen = new Set();
    const errors = [];
    for (const place of dataset.settlements ?? []) {
        if (seen.has(place.id))
            errors.push({ kind: "shape", path: `settlements.${place.id}`, message: "duplicate settlement id" });
        seen.add(place.id);
        if (place.nation !== "USA" || !states.has(place.state))
            errors.push({ kind: "dangling-reference", path: `settlements.${place.id}`, message: "settlement must reference a known US state" });
        if (!place.commercialPort && !place.roadBorderCrossing && place.population > 100000)
            errors.push({ kind: "shape", path: `settlements.${place.id}.population`, message: "small settlement exceeds its model size tier" });
    }
    return errors;
}
