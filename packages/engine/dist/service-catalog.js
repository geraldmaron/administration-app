// The departments' case work, one service per department. Each names the body
// the law gives the work to and the authority it holds for it (checked against
// the institution catalog by `workIsLawful`), the Secretary who answers for it,
// how long a case may wait before it is late, and any stage another body must
// clear. A component's service rolls up to its parent department and is run by
// the component's own head, so the department's Secretary is not read twice.
//
// Standards are the nearest display band (4, 13 or 26 weeks) to the published
// target or statute: thirty days for a visa interview, a drilling permit or a
// disaster assistance decision; a hundred days to investigate a fair housing
// complaint; a drug review runs ten months and more, so it is held to the
// longest band.
const seat = (id) => id;
export const SERVICES = [
    {
        id: "consular-visas",
        name: "Visa applications",
        unit: "applications",
        portfolio: seat("role-foreign-minister"),
        work: { id: "consular-visas", name: "Visa adjudication", owner: "INST-STATE", authority: "visa", dependencies: [] },
        standardWeeks: 4,
    },
    {
        id: "tax-returns",
        name: "Tax returns",
        unit: "returns",
        portfolio: seat("role-treasury-minister"),
        work: { id: "tax-returns", name: "Return processing", owner: "INST-IRS", authority: "tax-administration", dependencies: [] },
        standardWeeks: 4,
    },
    {
        // The Pentagon runs a transfer case, and it cannot close one the State
        // Department has not approved: that approval is the civilian authorization
        // an arms transfer needs, and a healthy Pentagon cannot outrun it.
        id: "arms-transfers",
        name: "Arms transfer cases",
        unit: "cases",
        portfolio: seat("role-defense-minister"),
        work: {
            id: "arms-transfers",
            name: "Arms transfer cases",
            owner: "INST-DOD",
            authority: "procurement",
            dependencies: [{ kind: "approval", institution: "INST-STATE", authority: "foreign-assistance" }],
        },
        standardWeeks: 13,
    },
    {
        id: "disability-claims",
        name: "Disability claims",
        unit: "claims",
        portfolio: seat("role-veterans-secretary"),
        work: { id: "disability-claims", name: "Claims adjudication", owner: "INST-VA", authority: "veteran-benefits", dependencies: [] },
        standardWeeks: 13,
        shortcut: { kind: "refusal", share: 0.3 },
    },
    {
        // A case closes in a courtroom, so the department cannot close cases
        // faster than the courts hear them, and the courts are nobody's
        // subordinate. What the department can be judged on is how long cases wait
        // and how many are decided wrongly; how many it brings is not a measure of
        // anything, and a backlog cleared by pushing defendants into pleas reads
        // as the failure it is.
        id: "federal-cases",
        name: "Federal criminal cases",
        unit: "cases",
        portfolio: seat("role-attorney-general"),
        work: {
            id: "federal-cases",
            name: "Federal prosecutions",
            owner: "INST-DOJ",
            authority: "prosecution",
            dependencies: [{ kind: "approval", institution: "INST-JUDICIARY", authority: "adjudication" }],
        },
        standardWeeks: 26,
        shortcut: { kind: "plea" },
    },
    {
        // Farm loans and program payments are decided by the department's county
        // offices, and a backlog is the kind of pressure under which applications
        // have historically been turned down rather than weighed.
        id: "farm-payments",
        name: "Farm program applications",
        unit: "applications",
        portfolio: seat("role-agriculture-secretary"),
        work: { id: "farm-payments", name: "Farm program decisions", owner: "INST-USDA", authority: "farm-support", dependencies: [] },
        standardWeeks: 4,
        shortcut: { kind: "refusal", share: 0.1 },
    },
    {
        id: "export-licenses",
        name: "Export license applications",
        unit: "applications",
        portfolio: seat("role-commerce-secretary"),
        work: { id: "export-licenses", name: "Export licensing", owner: "INST-BIS", authority: "export-control", dependencies: [] },
        standardWeeks: 4,
    },
    {
        id: "wage-complaints",
        name: "Wage and hour complaints",
        unit: "complaints",
        portfolio: seat("role-labor-secretary"),
        work: { id: "wage-complaints", name: "Wage and hour investigation", owner: "INST-LABOR", authority: "workplace-enforcement", dependencies: [] },
        standardWeeks: 13,
    },
    {
        id: "drug-applications",
        name: "Drug applications",
        unit: "applications",
        portfolio: seat("role-health-secretary"),
        work: { id: "drug-applications", name: "Drug review", owner: "INST-FDA", authority: "regulatory-approval", dependencies: [] },
        standardWeeks: 26,
    },
    {
        id: "fair-housing-complaints",
        name: "Fair housing complaints",
        unit: "complaints",
        portfolio: seat("role-housing-secretary"),
        work: { id: "fair-housing-complaints", name: "Fair housing investigation", owner: "INST-HUD", authority: "fair-housing", dependencies: [] },
        standardWeeks: 13,
    },
    {
        id: "student-aid",
        name: "Student aid applications",
        unit: "applications",
        portfolio: seat("role-education-secretary"),
        work: { id: "student-aid", name: "Student aid processing", owner: "INST-ED", authority: "student-loans", dependencies: [] },
        standardWeeks: 4,
    },
    {
        // Somewhere in the country a declared disaster is always open, so the
        // agency always has survivors' applications in hand.
        id: "disaster-assistance",
        name: "Disaster assistance claims",
        unit: "claims",
        portfolio: seat("role-homeland-secretary"),
        work: { id: "disaster-assistance", name: "Individual assistance", owner: "INST-FEMA", authority: "disaster-recovery", dependencies: [] },
        standardWeeks: 4,
    },
    {
        id: "drilling-permits",
        name: "Drilling permit applications",
        unit: "applications",
        portfolio: seat("role-interior-minister"),
        work: { id: "drilling-permits", name: "Permits to drill", owner: "INST-INTERIOR", authority: "leasing", dependencies: [] },
        standardWeeks: 4,
    },
];
