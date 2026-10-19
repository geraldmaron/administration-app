// The legal framework behind each kind of domestic act these screens offer,
// with the registry citations that resolve to it. A topic teaches the law; it
// never claims that every modeled act under it is lawful.

export type LawTopic = {
  readonly title: string;
  readonly summary: string;
  readonly limits: string;
  /** What the simulation models and leaves out. */
  readonly model: string;
  /** Citations the authority registry resolves, each opening its record. */
  readonly cites: readonly string[];
};

export const LAW_TOPICS = {
  "domestic-force": {
    title: "Using the military at home is rare",
    summary: "A law called the Posse Comitatus Act keeps the armed forces it covers from enforcing laws inside the country. The only exceptions are the ones the Constitution or Congress spells out.",
    limits:
      "Section 251 is one path under the Insurrection Act. It needs an armed uprising against a state's government and a request from that state's lawmakers, or from its governor if the lawmakers can't meet. It isn't a way to answer protests or an ordinary emergency. Other paths in the law have their own conditions.",
    model:
      "You can't send in extra federal agents, take command of a state's Guard, or send troops into a state in this game. Each would need a mission, legal findings, and steps the game doesn't track. Helping a state coordinate its own forces doesn't put them under your command or send them anywhere.",
    cites: ["18 U.S.C. §1385", "10 U.S.C. §§251–255", "10 U.S.C. §12406"],
  },
  "emergency-relief": {
    title: "Disaster declarations and assistance",
    summary: "A major-disaster declaration usually starts with a request from a governor. The request says how bad things are, what the state and towns can handle on their own, and what help they need. Tribal leaders can ask too, through their own path in the law.",
    limits: "A disaster declaration doesn't give you military or police powers, and it isn't unlimited money. Other kinds of emergency declarations and aid programs have their own rules.",
    model: "The game shows the declaration, the money, the supplies, and the help that arrived as separate things. A declaration on its own doesn't mean help has reached anyone yet.",
    cites: ["42 U.S.C. §5170", "42 U.S.C. §5191", "42 U.S.C. §5121 et seq."],
  },
  "national-emergency": {
    title: "National emergencies and when they run out",
    summary: "The National Emergencies Act sets the rules for how you declare a national emergency. Other laws give you extra powers that only switch on during one.",
    limits:
      "A declaration ends one year after it starts unless you publish a notice keeping it going in the 90 days before (50 U.S.C. §1622(d)). Congress can also vote to end one (§1622(a)). You have to name each power you use, because the declaration doesn't give you any by itself.",
    model: "Each week a declaration stays in place, it costs you some International Standing, which is how other countries see you. Before the one-year mark, you get a window to renew it. If you don't, it ends on the date shown.",
    cites: ["50 U.S.C. §§1601–1651", "50 U.S.C. §§1701–1708"],
  },
  appropriations: {
    title: "Congress controls the money",
    summary: "The government can only spend money that Congress has set aside by law. You suggest a budget, and Congress passes it one line at a time.",
    limits:
      "Spending more than Congress set aside, or spending before it does, breaks a law called the Antideficiency Act. Holding back money Congress approved has to follow the steps in the Impoundment Control Act. Borrowing has to stop at the debt limit Congress sets.",
    model: "In the game, Congress votes on five accounts, one at a time. Money goes out each week from what Congress set aside, and you can see how much room is left before the debt limit.",
    cites: ["U.S. Const. art. I, §9, cl. 7", "31 U.S.C. §§1341–1342, 1517", "2 U.S.C. §§681–688", "31 U.S.C. §3101"],
  },
  "executive-direction": {
    title: "What your orders can and can't do",
    summary: "The Constitution puts you in charge of the executive branch, and it says you must carry out the laws faithfully.",
    limits: "Your orders still have to follow the laws, the money Congress approved, court rulings, and the protections some offices have. Signing an order doesn't create new money or overrule a law.",
    model: "The comparison shows what the game expects to happen and what it won't allow. It isn't a lawyer's opinion. New rules need a public comment period first, and courts can throw out an order.",
    cites: ["U.S. Const. art. II, §1", "U.S. Const. art. II, §3", "Youngstown Sheet & Tube Co. v. Sawyer, 343 U.S. 579 (1952)", "Exec. Order No. 12866, 58 Fed. Reg. 51735 (1993)"],
  },
  "central-bank": {
    title: "The Federal Reserve sets interest rates on its own",
    summary: "The Federal Reserve, often called the Fed, decides interest rates through its Board of Governors and a committee that meets on a schedule. You pick the governors, and the Senate has to approve them, but you can't tell them what rate to set.",
    limits: "Fed governors serve set terms, and you can only remove one for a serious reason. You can lean on the Fed in public, but markets will react, and it still can't make the Fed pick a rate.",
    model: "In the game, the Fed decides at its own meetings, based on its chair's views and the economic numbers in front of it.",
    cites: ["12 U.S.C. §§241–242"],
  },
} as const satisfies Readonly<Record<string, LawTopic>>;

export type LawTopicId = keyof typeof LAW_TOPICS;
