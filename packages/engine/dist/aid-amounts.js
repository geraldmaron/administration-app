// What each rung of the assistance ladder gives, USD millions at the United
// States' scale. No imports: the resolution projection quotes it as the
// act's bill and the rung records the same figure as delivered, so the
// treasury is charged exactly what the recipient is credited with.
//
// Relief is the most one shipment carries; the rung scales it down to what
// the disaster still needs.
export const AID_AMOUNT = { 1: 60, 2: 240, 3: 700, 4: 400, 5: 900 };
