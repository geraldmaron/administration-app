// Ids exempt from the premise rule. Both lists are empty: every shipped and
// bundled scenario in a state-dependent class gates on its class's state or
// declares a premise. Nothing may be added; a new scenario in such a class
// gates on the class's state or declares why it need not.
export const PREMISE_DEBT_SHIPPED: ReadonlySet<string> = new Set<string>();

export const PREMISE_DEBT: ReadonlySet<string> = new Set<string>(PREMISE_DEBT_SHIPPED);
