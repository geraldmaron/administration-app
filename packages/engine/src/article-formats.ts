import type { OutletFormat, OutletStance } from "./press-outlets.js";

// How a format sounds when it is warm or cold toward the administration.
//
// The six desks of record each have a voice of their own (`article-desk.ts`).
// The partisan and regional desks come in pairs that sound alike and differ in
// which President they are warm to, so their register is the format's, and the
// stance at filing picks the line. A regional paper's register is the place: it
// judges a move by what it does for its readers, not by the party behind it.

type FormatVoice = Readonly<Record<OutletStance, string>>;

export const FORMAT_VOICE: Readonly<Partial<Record<OutletFormat, FormatVoice>>> = {
  cable: {
    hostile: "The panel spent the hour against the move.",
    skeptical: "The segment gave the move a clip and its critics the rest of the hour.",
    neutral: "Both sides got a guest, and the chyron stayed with the facts.",
    friendly: "The panel spent the hour on what the move gets right.",
  },
  digital: {
    hostile: "The site ran the move under its harshest critics' words.",
    skeptical: "The explainer walked through the move, and then through its gaps.",
    neutral: "The piece laid out the move and left the verdict to its readers.",
    friendly: "The site framed the move as a promise kept.",
  },
  "talk-radio": {
    hostile: "The host took the move apart, and then opened the phones.",
    skeptical: "Callers had questions about the move, and the host let them ask them.",
    neutral: "The host gave the move a segment between the traffic and the next caller.",
    friendly: "The host told listeners the move was what they voted for.",
  },
  podcast: {
    hostile: "The episode spent its hour on the move and none of it on the administration's side.",
    skeptical: "The hosts gave the move a fair hearing, and found it wanting.",
    neutral: "The episode walked through the move with a guest who had worked the building before.",
    friendly: "The hosts called the move the kind their listeners voted for.",
  },
  regional: {
    hostile: "The paper judges the move by what it does for its readers, and finds it lacking.",
    skeptical: "The paper is waiting to see what the move means locally.",
    neutral: "The paper reports what the move means locally, without a verdict yet.",
    friendly: "The paper credits the move with doing right by its readers.",
  },
};
