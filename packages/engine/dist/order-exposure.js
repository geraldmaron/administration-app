export const ORDER_EXPOSURE = {
    "order-border-controls": {
        salience: 0.75, classes: { advocacy: 0.6, individuals: 0.3 },
        privatePlaintiff: "Border Families Legal Defense Coalition",
        stateBasis: "residents", stateReach: { kind: "cohort", cohort: "foreign-born" }, constitutionalShare: 0.2,
        grounds: ["The checks exceed the inspection authority of the Immigration and Nationality Act.",
            "Detention at the port without a hearing denies due process."],
    },
    "order-price-controls": {
        salience: 0.8, classes: { regulated: 0.8 },
        privatePlaintiff: "Plains Grain Growers Association",
        stateBasis: "none", stateReach: { kind: "economy", axis: "agricultural" }, constitutionalShare: 0.1,
        grounds: ["No statute in force delegates a power to freeze prices.",
            "A ceiling below cost takes property without just compensation."],
    },
    "order-asset-seizure": {
        salience: 0.4, classes: { regulated: 0.25 },
        privatePlaintiff: "Meridian Trade Finance Bank",
        stateBasis: "none", stateReach: { kind: "none" }, constitutionalShare: 0.15,
        grounds: ["The blocking exceeds the property the International Emergency Economic Powers Act reaches.",
            "Blocking a U.S. person's interest without notice denies due process."],
    },
    "order-relief-program": {
        salience: 0.2, classes: { individuals: 0.05 },
        privatePlaintiff: "Disaster Claimants Association",
        stateBasis: "none", stateReach: { kind: "none" }, constitutionalShare: 0,
        grounds: ["The allocation departs from the Stafford Act's eligibility rules."],
    },
    "order-entry-suspension": {
        salience: 0.85, classes: { advocacy: 0.6, individuals: 0.6 },
        privatePlaintiff: "Separated Families Visa Project",
        stateBasis: "residents", stateReach: { kind: "cohort", cohort: "foreign-born" }, constitutionalShare: 0.3,
        grounds: ["The suspension lacks the finding 8 U.S.C. §1182(f) requires.",
            "The class drawn singles out a religion or nationality the Constitution protects."],
    },
    "order-force-protection": {
        salience: 0.55, classes: { advocacy: 0.4, individuals: 0.25 },
        privatePlaintiff: "Civic Assembly Rights Project",
        stateBasis: "residents", stateReach: { kind: "subject-state" }, constitutionalShare: 0.4,
        grounds: ["The deployment reaches past the federal property 40 U.S.C. §1315 protects.",
            "Policing of protesters off federal property chills speech and assembly."],
    },
    "order-regulatory-review": {
        salience: 0.15, classes: { regulated: 0.1 },
        privatePlaintiff: "Public Standards Watch",
        stateBasis: "none", stateReach: { kind: "none" }, constitutionalShare: 0,
        grounds: ["The review delays a rule past a statutory deadline."],
    },
    "order-grant-conditions": {
        salience: 0.6, classes: { advocacy: 0.3 },
        privatePlaintiff: "Municipal Grantees Alliance",
        stateBasis: "proprietary", stateReach: { kind: "federal-dependence" }, constitutionalShare: 0.6,
        grounds: ["Congress did not attach this condition to the grant.",
            "A condition imposed after acceptance and unrelated to the program coerces the states under the Spending Clause."],
    },
    "order-energy-leasing": {
        salience: 0.5, classes: { advocacy: 0.55, regulated: 0.1 },
        privatePlaintiff: "Coastal Waters Conservancy",
        stateBasis: "residents", stateReach: { kind: "economy", axis: "energy" }, constitutionalShare: 0,
        grounds: ["The program skipped steps the Outer Continental Shelf Lands Act and the APA require."],
    },
    "order-clean-energy": {
        salience: 0.3, classes: { regulated: 0.2 },
        privatePlaintiff: "Federal Contractors Council",
        stateBasis: "none", stateReach: { kind: "none" }, constitutionalShare: 0.1,
        grounds: ["The standard reaches past the economy and efficiency the Procurement Act serves."],
    },
    "order-defense-production": {
        salience: 0.3, classes: { regulated: 0.3 },
        privatePlaintiff: "Allied Steel Fabricators",
        stateBasis: "none", stateReach: { kind: "economy", axis: "industrial" }, constitutionalShare: 0.1,
        grounds: ["The rated order exceeds the priorities the Defense Production Act allows."],
    },
    "order-emergency-construction": {
        salience: 0.8, classes: { advocacy: 0.5, congress: 0.5 },
        privatePlaintiff: "Borderlands Conservation Trust",
        stateBasis: "proprietary", stateReach: { kind: "subject-state" }, constitutionalShare: 0.3,
        grounds: ["The project does not support the armed forces as 10 U.S.C. §2808 requires.",
            "Spending against Congress's appropriation violates the Appropriations Clause."],
    },
    // The federal missions in one state. A mission over the governor's objection
    // is sued by the state on its own sovereign footing; the Los Angeles case is
    // the shape the troop rows follow, and the enforcement row reaches the cap.
    "order-property-surge": {
        salience: 0.55, classes: { advocacy: 0.4, individuals: 0.25 },
        privatePlaintiff: "Civic Assembly Rights Project",
        stateBasis: "residents", stateReach: { kind: "subject-state" }, constitutionalShare: 0.4,
        grounds: ["The deployment reaches past the federal property 40 U.S.C. §1315 protects.",
            "Policing of protesters off federal property chills speech and assembly."],
    },
    "order-immigration-operation": {
        salience: 0.8, classes: { advocacy: 0.6, individuals: 0.5 },
        privatePlaintiff: "Neighborhood Families Defense Fund",
        // The operation is in one state, so that state is the one injured: a
        // national foreign-born reach would caption distant states over it.
        stateBasis: "residents", stateReach: { kind: "subject-state" }, constitutionalShare: 0.5,
        grounds: ["Officers stop people without the reasonable suspicion the Fourth Amendment requires.",
            "Warrantless arrests exceed what 8 U.S.C. §1357 allows.",
            "The operation retaliates against the state's residents for protected speech."],
    },
    "order-joint-task-force": {
        salience: 0.2, classes: { advocacy: 0.1 },
        privatePlaintiff: "Open Streets Civil Liberties Union",
        stateBasis: "none", stateReach: { kind: "none" }, constitutionalShare: 0.1,
        grounds: ["The task force enforces state law Congress gave federal agents no part in."],
    },
    "order-guard-federalization": {
        salience: 0.9, classes: { advocacy: 0.4 },
        privatePlaintiff: "Citizen Soldiers Accountability Project",
        stateBasis: "proprietary", stateReach: { kind: "subject-state" }, constitutionalShare: 0.5,
        grounds: ["None of 10 U.S.C. §12406's three occasions exists in the state.",
            "The orders were not issued through the governor, as §12406 requires.",
            "Federalizing a state's Guard over its objection invades the powers the Tenth Amendment reserves."],
    },
    "order-insurrection-proclamation": {
        salience: 0.5, classes: { advocacy: 0.2 },
        privatePlaintiff: "Assembly Rights Legal Project",
        stateBasis: "none", stateReach: { kind: "none" }, constitutionalShare: 0.3,
        grounds: ["No occasion the Insurrection Act names exists in the state."],
    },
    "order-insurrection-request": {
        salience: 0.4, classes: { advocacy: 0.15 },
        privatePlaintiff: "Assembly Rights Legal Project",
        stateBasis: "none", stateReach: { kind: "none" }, constitutionalShare: 0.2,
        grounds: ["The troops act beyond the assistance 10 U.S.C. §251 lets the state request, which the Posse Comitatus Act (18 U.S.C. §1385) bars."],
    },
    "order-insurrection-enforcement": {
        salience: 0.95, classes: { advocacy: 0.5, individuals: 0.3 },
        privatePlaintiff: "Riverside Neighbors for Civil Rights",
        stateBasis: "proprietary", stateReach: { kind: "subject-state" }, constitutionalShare: 0.5,
        grounds: ["The courts are open, so 10 U.S.C. §252's predicate of impracticable judicial enforcement is missing.",
            "The state is protecting its residents' rights, so §253 does not reach it.",
            "The troops are executing the laws beyond their stated mission, which the Posse Comitatus Act (18 U.S.C. §1385) bars.",
            "Using the armed forces against residents for their protests retaliates against protected speech."],
    },
};
/** An act the table does not name is still exposed, quietly. */
export const DEFAULT_EXPOSURE = {
    salience: 0.2, classes: { regulated: 0.1 }, privatePlaintiff: "An affected party",
    stateBasis: "none", stateReach: { kind: "none" }, constitutionalShare: 0,
    grounds: ["The act exceeds the authority it cites."],
};
export function orderExposure(orderId) {
    return ORDER_EXPOSURE[orderId] ?? DEFAULT_EXPOSURE;
}
