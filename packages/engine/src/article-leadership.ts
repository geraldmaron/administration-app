import { hashIndex } from "./rng.js";

// The lines a leadership change abroad is reported in: an election the
// government came through or lost, a party choosing a new leader, a lost
// confidence vote, a coup, a death in office, and a succession after a lost
// war. Every line names only an office, a country or a modeled person; none
// quotes anybody, and none says what the new government will do, because
// nobody outside it knows yet.

/** Which story a leadership change is. */
export type LeadershipStory = "held" | "opposition" | "handover" | "confidence" | "coup" | "death" | "defeat" | "removed";

/** The particulars a line may name. `leader` holds the chair after the change; `predecessor` held it before. */
export type LeadershipParticulars = {
  readonly nation: string;
  readonly leader: string;
  readonly predecessor: string;
};

type Line = (p: LeadershipParticulars) => string;

export type LeadershipBank = {
  readonly headlines: readonly Line[];
  readonly standfirsts: readonly Line[];
  readonly bodies: readonly Line[];
};

export const LEADERSHIP_ARTICLE_BANK: Readonly<Record<LeadershipStory, LeadershipBank>> = {
  held: {
    headlines: [
      (p) => `${p.leader} keeps the chair in ${p.nation}`,
      (p) => `Voters in ${p.nation} return ${p.leader}`,
      (p) => `${p.nation}'s government comes through its election`,
    ],
    standfirsts: [
      () => "The government that sat across the table from Washington before the vote is the one sitting there after it.",
      (p) => `${p.leader} was returned, and the government's program stands.`,
      (p) => `No change of government in ${p.nation}: the same leader, on the same terms.`,
    ],
    bodies: [
      (p) =>
        `The count in ${p.nation} returned the sitting government. Nothing Washington had agreed with it lapses, and nothing it had refused is back on the table.`,
      (p) => `${p.leader} ran on the record and kept the chair. The embassy's read of the government carries over as it stands.`,
    ],
  },
  opposition: {
    headlines: [
      (p) => `${p.nation} votes out its government`,
      (p) => `${p.leader} wins in ${p.nation}`,
      (p) => `A new government for ${p.nation}`,
    ],
    standfirsts: [
      (p) => `${p.predecessor} is out, and the government Washington deals with in ${p.nation} is not the one it dealt with before the vote.`,
      (p) => `${p.leader} takes the chair with a program of their own.`,
      () => "The opposition won the count, and the ministries change hands.",
    ],
    bodies: [
      (p) =>
        `Voters in ${p.nation} turned out the sitting government. ${p.leader} takes the chair from ${p.predecessor}, and the new government's program replaces the old one.`,
      (p) =>
        `Every standing arrangement with ${p.nation} was made with the government that just lost. The new one has not said which of them it will keep.`,
    ],
  },
  handover: {
    headlines: [
      (p) => `${p.nation} names a new leader`,
      (p) => `${p.leader} succeeds ${p.predecessor} in ${p.nation}`,
      (p) => `Change at the top in ${p.nation}, same party in power`,
    ],
    standfirsts: [
      (p) => `The party that governs ${p.nation} has put ${p.leader} in the chair.`,
      () => "The succession was settled inside the governing party, and the program is still the party's.",
      (p) => `${p.predecessor} steps aside; the government ${p.nation} runs on does not.`,
    ],
    bodies: [
      (p) => `The governing party has replaced ${p.predecessor} with ${p.leader}. The party's program stands; the person who carries it is new.`,
      (p) =>
        `Nothing about how ${p.nation} is governed was put to a contested vote. What changes is the temperament of the person at the top, and the embassy is reading it now.`,
    ],
  },
  confidence: {
    headlines: [
      (p) => `${p.nation}'s government falls`,
      (p) => `${p.leader} loses a confidence vote in ${p.nation}`,
      (p) => `Parliament brings down the government in ${p.nation}`,
    ],
    standfirsts: [
      (p) => `The chamber withdrew its confidence, and ${p.nation} goes back to the voters.`,
      (p) => `${p.leader} stays on as caretaker until a new election.`,
      () => "A government that could not hold its majority has lost it.",
    ],
    bodies: [
      (p) =>
        `The government of ${p.nation} lost a vote of confidence. ${p.leader} remains in the chair as caretaker, and a snap election has been called.`,
      (p) => `A caretaker government signs nothing new. Anything Washington needs from ${p.nation} waits for the count.`,
    ],
  },
  coup: {
    headlines: [
      (p) => `Military takes power in ${p.nation}`,
      (p) => `${p.predecessor} overthrown in ${p.nation}`,
      (p) => `Coup in ${p.nation}`,
    ],
    standfirsts: [
      (p) => `The armed forces have removed the government of ${p.nation}, and ${p.leader} holds the chair.`,
      (p) => `${p.nation}'s constitution was set aside by the people sworn to defend it.`,
      (p) => `Nobody in ${p.nation} voted for the government that now answers Washington's calls.`,
    ],
    bodies: [
      (p) =>
        `Soldiers took control of the capital of ${p.nation} and removed ${p.predecessor}. ${p.leader} now holds the chair; the constitution's own succession was not followed.`,
      (p) =>
        `Every agreement with ${p.nation} was made with a government that no longer exists. Whether to deal with the one that replaced it is a question for this administration.`,
    ],
  },
  death: {
    headlines: [
      (p) => `${p.predecessor} dies in office`,
      (p) => `${p.nation} mourns its leader`,
      (p) => `${p.leader} takes the chair after ${p.predecessor}'s death`,
    ],
    standfirsts: [
      (p) => `${p.nation}'s head of government has died, and ${p.leader} has taken the chair.`,
      () => "The succession followed the constitution, and the government continues.",
      (p) => `A death at the top of ${p.nation}'s government, and an orderly handover.`,
    ],
    bodies: [
      (p) =>
        `${p.predecessor} died in office. ${p.leader} succeeds under the constitution's own rules, and the government's program stands until the new leader changes it.`,
      () => "What the new leader brings to the government's decisions is still being read, and the embassy's first account is being written.",
    ],
  },
  removed: {
    headlines: [
      (p) => `${p.predecessor} is out in ${p.nation}`,
      (p) => `${p.nation}'s leader removed from power`,
      (p) => `${p.leader} takes the chair in ${p.nation}`,
    ],
    standfirsts: [
      (p) => `${p.predecessor} no longer holds power in ${p.nation}, and ${p.leader} has taken the chair under the constitution's succession.`,
      (p) => `A foreign government's operation ended ${p.predecessor}'s hold on ${p.nation}.`,
      () => "The succession followed the constitution, though the reason for it did not.",
    ],
    bodies: [
      (p) =>
        `${p.predecessor} was removed from power by an operation from abroad. ${p.leader} succeeds under ${p.nation}'s own rules, and the government's program stands until the new leader changes it.`,
      (p) => `Every capital is now asking who ran the operation against ${p.nation}'s leader, and what it means for their own.`,
    ],
  },
  defeat: {
    headlines: [
      (p) => `Defeat topples ${p.predecessor}`,
      (p) => `${p.nation} changes leaders after the war`,
      (p) => `${p.leader} takes over a beaten government in ${p.nation}`,
    ],
    standfirsts: [
      () => "The war is lost, and the leader who fought it is gone.",
      (p) => `${p.leader} inherits the terms of a defeat.`,
      (p) => `${p.nation}'s government could not survive the outcome on the battlefield.`,
    ],
    bodies: [
      (p) => `${p.predecessor} has left office after ${p.nation}'s defeat. ${p.leader} takes the chair and, with it, whatever the settlement demands.`,
      (p) => `A government that loses a war rarely keeps its leader. ${p.nation}'s new one starts from the terms, not from the program it had.`,
    ],
  },
};

export type LeadershipArticle = {
  readonly story: LeadershipStory;
  readonly headline: string;
  readonly standfirst: string;
  readonly paragraphs: readonly string[];
};

function chosen<T>(bank: readonly T[], key: string): T {
  return bank[hashIndex(key, bank.length)]!;
}

/**
 * The article for one change, the same every time it is read: the line is
 * picked off the change's own key rather than a stream, so a country file
 * opened twice reads the same story.
 */
export function leadershipArticle(story: LeadershipStory, particulars: LeadershipParticulars, key: string): LeadershipArticle {
  const bank = LEADERSHIP_ARTICLE_BANK[story];
  return {
    story,
    headline: chosen(bank.headlines, `${key}:headline`)(particulars),
    standfirst: chosen(bank.standfirsts, `${key}:standfirst`)(particulars),
    paragraphs: bank.bodies.map((line) => line(particulars)),
  };
}
