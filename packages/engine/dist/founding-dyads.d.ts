import { type NationId } from "@admin/world";
import { type RelationshipGraph } from "./state-campaign.js";
/**
 * Lay the sourced dyads over a derived graph.
 *
 * Each row moves both directions of its pair, as bounded moves on trust,
 * tension and military threat: toward the reading the row's kind and intensity
 * give, never past it, and never softening an edge an adversarial row names or
 * hardening one a friendly row names. A pair the graph holds no edge for is
 * left alone, because the derivation decides who has a working relationship at
 * all and a row only says what that relationship is. It sits at the head of the
 * founding edge pipeline so that anything appended after it — a world posture,
 * a scenario's opening — reads the sourced pair rather than the derived one.
 */
export declare function applyFoundingDyads(graph: RelationshipGraph, _player: NationId): RelationshipGraph;
