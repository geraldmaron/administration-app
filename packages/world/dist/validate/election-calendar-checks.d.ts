import type { WorldDataset } from "../schemas/index.js";
import type { ValidationError } from "./validation-error.js";
/**
 * The calendar's rules, for every government on the roster the calendar
 * carries a row for. Whether the roster is covered whole is a fact about the
 * shipped world rather than about a dataset's shape, so a test dataset of two
 * invented nations validates, and the shipped world's coverage is held by the
 * calendar's own test.
 */
export declare function checkElectionCalendar(dataset: WorldDataset): ValidationError[];
