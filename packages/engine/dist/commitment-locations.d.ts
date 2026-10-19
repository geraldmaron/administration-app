import { type NationId } from "@admin/world";
import type { Campaign, CommitmentKind, CommitmentTarget } from "./state.js";
import type { CommitmentLocation } from "./state-world.js";
/**
 * The zone a deployment stands in. A deployment to a government stands in its
 * territory. A deployment to a war stands on the defender's ground, where an
 * invasion is fought whichever side the forces came to help; the defender
 * itself, committing to its own war, faces the aggressor's. Only deployments
 * are placed here: aid, arms and money have no position, and a base carries
 * its own installation.
 */
export declare function deploymentLocation(campaign: Campaign, kind: CommitmentKind, actor: NationId, target: CommitmentTarget): CommitmentLocation | undefined;
/** The load step for v56: typed theaters, split composite bases, and a location on every placeable deployment. Idempotent. */
export declare function withTypedLocations(campaign: Campaign): Campaign;
