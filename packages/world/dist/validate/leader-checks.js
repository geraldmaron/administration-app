import { NATION_LEADER_CONSTRAINTS } from "../dataset/nation-leaders.generated.js";
import { nameCultureFor } from "../dataset/people.js";
function rowErrors(row, nation, dataset) {
    const path = `nations.${nation.id}.leader`;
    const errors = [];
    const slate = new Set((nation.partySystem?.parties ?? []).map((party) => party.id));
    for (const party of row.governing) {
        if (!slate.has(party)) {
            errors.push({
                kind: "dangling-reference",
                path,
                message: `the leader table seats "${nation.id}"'s government with "${party}", which is not on its slate`,
            });
        }
    }
    const charter = dataset.charters.find((entry) => entry.id === nation.identity.government);
    if (!charter?.cabinetRoles[0]) {
        errors.push({
            kind: "shape",
            path,
            message: `the leader table titles "${nation.id}"'s leader "${row.title}", but its charter seats no chair for the title to name`,
        });
    }
    if (nameCultureFor(nation.id) !== row.nameCulture) {
        errors.push({
            kind: "shape",
            path,
            message: `the leader table names "${nation.id}"'s culture "${row.nameCulture}", but its people are named from "${nameCultureFor(nation.id)}"`,
        });
    }
    return errors;
}
/**
 * Every row of the leader constraint table agrees with the dataset it
 * constrains: each governing party is on that nation's slate, the title has
 * a chair to name (the one its charter seats first), and the name culture is
 * the one its people are drawn from. A row that disagrees would hold a draw
 * to a fact the world cannot seat.
 *
 * Rows are read for the nations the dataset carries, so a fixture of two
 * nations is not refused for the other hundred and ninety-three; the table's
 * own test holds its rows to the shipped roster one for one.
 */
export function checkLeaderConstraints(dataset) {
    return dataset.nations.flatMap((nation) => {
        const row = NATION_LEADER_CONSTRAINTS[nation.id];
        return row ? rowErrors(row, nation, dataset) : [];
    });
}
