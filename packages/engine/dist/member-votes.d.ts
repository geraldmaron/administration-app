import type { Campaign, Congress, VoteCaucus } from "./state.js";
import type { VoteQuestion, CaucusVote } from "./congress-votes.js";
export declare function memberVote(congress: Congress, states: Campaign["states"] | undefined, people: Campaign["people"], question: VoteQuestion, shares: Readonly<Record<VoteCaucus, number>>): CaucusVote | undefined;
