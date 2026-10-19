import { Charter } from "../schemas/org-cradle-charter.js";
// The reusable charter catalogue the NPC nations govern under (the United
// States' constitutional charter in usa.ts is a specific instance of this
// same shape). Each is data, not a
// code branch: a distinct institution set, cabinet role set, decision
// constraint, succession rule, and removal path. This is where the old
// US-only impeachment/midterm modeling generalizes — republics impeach,
// parliamentary systems hold no-confidence votes, juntas face coups,
// theocracies face clerical councils, monarchies face rival claimants.
export const CHARTER_PARLIAMENTARY_REPUBLIC = Charter.parse({
    id: "charter-parliamentary-republic",
    name: "The Parliamentary Republic",
    removalMechanism: "no-confidence",
    cabinetRoles: ["role-prime-minister", "role-foreign-minister", "role-treasury-minister", "role-defense-minister", "role-interior-minister"],
    institutions: [
        { name: "National Assembly", role: "Legislature; can dissolve the cabinet by no-confidence vote.", kind: "assembly" },
        { name: "Prime Minister's Cabinet", role: "Executive, drawn from and answerable to the Assembly.", kind: "executive" },
        { name: "Judiciary", role: "Reviews Assembly acts for constitutionality.", kind: "judiciary" },
    ],
    decisionConstraint: "Major fiscal and treaty decisions require Assembly ratification.",
    successionRule: "An interim Speaker holds power until the Assembly confirms a new Prime Minister.",
});
export const CHARTER_PRESIDENTIAL_REPUBLIC = Charter.parse({
    id: "charter-presidential-republic",
    name: "The Presidential Republic",
    removalMechanism: "impeachment",
    cabinetRoles: [
        "role-president",
        "role-foreign-minister",
        "role-treasury-minister",
        "role-defense-minister",
        "role-interior-minister",
        "role-intelligence-director",
    ],
    institutions: [
        { name: "Congress", role: "Legislature; brings and tries impeachment by supermajority.", kind: "assembly" },
        { name: "Presidency", role: "Directly elected executive, fixed term.", kind: "executive" },
        { name: "Supreme Judiciary", role: "Presides over an impeachment trial.", kind: "judiciary" },
    ],
    decisionConstraint: "Removal requires a supermajority impeachment vote in Congress followed by trial.",
    successionRule: "The Vice President assumes office for the remainder of the term.",
});
export const CHARTER_MILITARY_JUNTA = Charter.parse({
    id: "charter-military-junta",
    name: "The Junta Compact",
    removalMechanism: "coup",
    cabinetRoles: ["role-junta-chairman", "role-defense-minister", "role-interior-minister", "role-intelligence-director"],
    institutions: [
        { name: "Officer Corps Council", role: "Senior military command; the only body that can lawfully remove the Chairman.", kind: "assembly" },
        { name: "Ministry of Order", role: "Civil administration under military oversight.", kind: "executive" },
    ],
    decisionConstraint: "No civilian institution may override a Council directive on security matters.",
    successionRule: "The senior-ranking officer on the Council assumes the chairmanship.",
});
export const CHARTER_THEOCRATIC_COUNCIL = Charter.parse({
    id: "charter-theocratic-council",
    name: "The Theocratic Council",
    removalMechanism: "clerical-council",
    cabinetRoles: ["role-first-councillor", "role-foreign-minister", "role-treasury-minister", "role-interior-minister"],
    institutions: [
        { name: "Council of Clerics", role: "Sitting body of senior clergy; holds the First Councillor to ongoing confidence.", kind: "assembly" },
        { name: "Ministry of Doctrine", role: "Reviews law for doctrinal conformity.", kind: "judiciary" },
    ],
    decisionConstraint: "No law may be enacted that the Council rules contrary to doctrine.",
    successionRule: "The Council convenes to select a successor from among its senior clerics.",
});
export const CHARTER_ABSOLUTE_MONARCHY = Charter.parse({
    id: "charter-absolute-monarchy",
    name: "The Absolute Monarchy",
    removalMechanism: "coup",
    cabinetRoles: ["role-monarch", "role-court-chancellor", "role-treasury-minister", "role-defense-minister"],
    institutions: [
        { name: "Royal Court", role: "Advises the Crown; cannot veto, only counsel and, in extremis, conspire.", kind: "assembly" },
        { name: "Ministry of the Crown", role: "Civil administration executing royal decree.", kind: "executive" },
    ],
    decisionConstraint: "The monarch's decree is final; the Royal Court may only advise, never veto.",
    successionRule: "The heir designated by royal decree assumes the throne; absent a clear heir, the Royal Court names a regent.",
});
export const CHARTER_ELECTORAL_DEMOCRACY = Charter.parse({
    id: "charter-electoral-democracy",
    name: "The Electoral Democracy",
    removalMechanism: "electoral-defeat",
    cabinetRoles: [
        "role-prime-minister",
        "role-foreign-minister",
        "role-treasury-minister",
        "role-defense-minister",
        "role-interior-minister",
        "role-electoral-affairs-minister",
    ],
    institutions: [
        { name: "National Assembly", role: "Legislature elected on a fixed calendar.", kind: "assembly" },
        { name: "Electoral Commission", role: "Runs and certifies elections; the sitting government cannot postpone them." },
        { name: "Judiciary", role: "Adjudicates electoral disputes.", kind: "judiciary" },
    ],
    decisionConstraint: "Elections occur on a fixed calendar the sitting government cannot postpone.",
    successionRule: "The winner of the next scheduled election assumes office at inauguration.",
});
// A seventh charter, added purely as data with no code changes anywhere
// else in the engine or validator — the proof that adding a charter costs
// only data plus its institution token set.
export const CHARTER_CONFEDERAL_COUNCIL = Charter.parse({
    id: "charter-confederal-council",
    name: "The Confederal Council",
    removalMechanism: "no-confidence",
    cabinetRoles: ["role-council-chair", "role-foreign-minister", "role-treasury-minister", "role-defense-minister"],
    institutions: [
        { name: "Council of Delegates", role: "Regional delegations; can withdraw confidence from the Council Chair.", kind: "assembly" },
        { name: "Regional Assemblies", role: "Retain a veto over any Council decision binding their own region." },
    ],
    decisionConstraint: "No Council decision binds a region without its delegation's assent.",
    successionRule: "Regional delegations nominate a new Council Chair by rotating precedence.",
});
export const genericCharters = [
    CHARTER_PARLIAMENTARY_REPUBLIC,
    CHARTER_PRESIDENTIAL_REPUBLIC,
    CHARTER_MILITARY_JUNTA,
    CHARTER_THEOCRATIC_COUNCIL,
    CHARTER_ABSOLUTE_MONARCHY,
    CHARTER_ELECTORAL_DEMOCRACY,
    CHARTER_CONFEDERAL_COUNCIL,
];
