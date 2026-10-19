import { BUDGET_ACCOUNT_SPECS, budgetChair, domainsChairedBy, executionQuality, institutionForRole, ownershipOf, POLICY_DOMAIN_SPECS, selectCounselRecord, stewardSway, } from "@admin/engine";
import { classLabel } from "../conversation/labels";
import { INSTRUMENT_LABELS } from "../format/figures";
/** Programs the chair runs, at the delivery `executionQuality` currently prices them at. */
function programRows(campaign, role) {
    return domainsChairedBy(campaign, role).map((domain) => ({
        key: `program:${domain}`,
        label: `${POLICY_DOMAIN_SPECS[domain].name} programs`,
        reading: `Working at ${Math.round(executionQuality(campaign, domain) * 100)}% of what was planned`,
        readBy: "executionQuality",
    }));
}
/** The department's own backlog, the figure `institutionTick` carries week to week. */
function backlogRow(campaign, role) {
    const institution = institutionForRole(role);
    const runtime = institution ? campaign.institutions[institution.id] : undefined;
    if (!runtime || runtime.backlog < 1)
        return undefined;
    return {
        key: "backlog",
        label: "Backlog",
        reading: `${Math.round(runtime.backlog)} pieces of work waiting`,
        readBy: "institutionTick",
    };
}
/** The chair's own advice record, silent until they have been asked something contested. */
function counselRow(campaign, role) {
    const record = selectCounselRecord(campaign, role);
    if (!record || record.contested === 0)
        return undefined;
    return {
        key: "counsel",
        label: "Advice record",
        reading: `Right on ${record.right} of ${record.contested} disputed calls. You overruled ${record.overruled} of them.`,
        readBy: "selectCounselRecord",
    };
}
/** What the chair's own competence adds or costs an attempt through an instrument they own. */
function stewardRow(campaign, instrument) {
    const nation = campaign.founding.nation;
    const sway = stewardSway(campaign, { actor: nation, target: nation, instrument, rung: 1 });
    const points = Math.round((sway - 1) * 100);
    return {
        key: `sway:${instrument}`,
        label: `Effect on ${INSTRUMENT_LABELS[instrument].toLowerCase()}`,
        reading: points === 0 ? "No effect on the odds this week" : `${points > 0 ? "+" : ""}${points}% to the odds when you use it`,
        readBy: "stewardSway",
    };
}
function isPricedAccount(account) {
    return account in BUDGET_ACCOUNT_SPECS;
}
/**
 * Whose name `budgetChair` puts on the account this week — never claimed for
 * a chair currently vacant, and never claimed for a split line another
 * department's living secretary carries the larger share of.
 */
function budgetRow(campaign, role, account) {
    if (!isPricedAccount(account))
        return undefined;
    const name = BUDGET_ACCOUNT_SPECS[account].name;
    const chair = budgetChair(campaign, account);
    return {
        key: `budget:${account}`,
        label: "Budget account",
        reading: chair ? `In charge of ${name} this week` : `No secretary is in charge of ${name} this week`,
        readBy: "budgetChair",
    };
}
/** The classes of matter this chair has standing in, per the ownership table `classRoles` reads. */
function classesRow(scenarioClasses) {
    if (scenarioClasses.length === 0)
        return undefined;
    return {
        key: "classes",
        label: "Advises on",
        reading: scenarioClasses.map((kind) => classLabel(kind)).join(", "),
        readBy: "classRoles",
    };
}
/**
 * What a department answers for, drawn from the United States ownership table
 * (`department-ownership.ts`) rather than guessed at: the programs it
 * delivers, its backlog, its counsel record, the sway its chair's competence
 * carries on the instruments it owns, the budget account it spends, and the
 * classes of matter it has standing in. Absent for a charter with no written
 * table and for the head of state's own chair, which owns a government
 * rather than a department.
 */
export function departmentScorecard(campaign, role) {
    const ownership = ownershipOf(campaign, role);
    if (!ownership)
        return [];
    return [
        ...programRows(campaign, role),
        ...[backlogRow(campaign, role), counselRow(campaign, role)].filter((row) => row !== undefined),
        ...ownership.instruments.map((instrument) => stewardRow(campaign, instrument)),
        ...ownership.budgetAccounts
            .map((account) => budgetRow(campaign, role, account))
            .filter((row) => row !== undefined),
        ...[classesRow(ownership.scenarioClasses)].filter((row) => row !== undefined),
    ];
}
