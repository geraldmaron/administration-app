import { type Campaign } from "@admin/engine";
import type { ScenarioDef } from "./scenario.js";
/** Sign a real order, let it operate, and wait for the Court's filing phase. */
export declare function orderCaseBoards(defs: readonly ScenarioDef[]): readonly Campaign[];
