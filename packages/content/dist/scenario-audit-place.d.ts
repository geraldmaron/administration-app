import type { ScenarioDef } from "./scenario.js";
import { type ScenarioFinding } from "./scenario-audit-contract.js";
export declare function auditLocusLandform(def: ScenarioDef, findings: ScenarioFinding[]): void;
/**
 * A scenario whose place or prose needs the counterpart to have a coast, dealt
 * to a counterpart the board may pick landlocked. `geography` reads the
 * player's own country unless it says `of: "counterpart"`, so a week that sends
 * ships into "their harbor" was datelined in Zurich or Almaty.
 *
 * An error where the locus itself is a coast, border or chokepoint, a warning where only the prose
 * says maritime things.
 */
export declare function auditCoastalCounterpart(def: ScenarioDef, findings: ScenarioFinding[]): void;
/**
 * A real American city named in the prose of a week the map places somewhere
 * else. Real cities are welcome, but a week set in the field has to bind the
 * city it names (locus.city, written as {{city}}) or the map pins a different
 * one; a week set in the capital may name the cities it is about freely.
 */
export declare function auditUnplacedCity(def: ScenarioDef, findings: ScenarioFinding[]): void;
export declare function auditLocusGround(def: ScenarioDef, findings: ScenarioFinding[]): void;
export declare function auditUnplacedDomestic(def: ScenarioDef, findings: ScenarioFinding[]): void;
export declare function auditGenericPlace(def: ScenarioDef, findings: ScenarioFinding[]): void;
export declare function auditCityEffectUnplaced(def: ScenarioDef, findings: ScenarioFinding[]): void;
export declare function auditMissingCityToken(def: ScenarioDef, findings: ScenarioFinding[]): void;
export declare function auditUnknownCity(def: ScenarioDef, findings: ScenarioFinding[]): void;
