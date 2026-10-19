import type { WorldDataset as WorldDatasetT } from "../schemas/index.js";
import type { ValidationError } from "./validation-error.js";
export declare function checkVitalRates(dataset: WorldDatasetT): ValidationError[];
export declare function checkCostOfLivingOpening(dataset: WorldDatasetT): ValidationError[];
export declare function checkDebtReproducesRatio(dataset: WorldDatasetT): ValidationError[];
export declare function checkStateVitalAnchors(dataset: WorldDatasetT): ValidationError[];
