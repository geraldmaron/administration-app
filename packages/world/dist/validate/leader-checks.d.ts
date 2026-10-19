import type { WorldDataset } from "../schemas/index.js";
import type { ValidationError } from "./validation-error.js";
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
export declare function checkLeaderConstraints(dataset: WorldDataset): ValidationError[];
