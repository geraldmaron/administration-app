/**
 * The second sentence of every card bio: what this person is like, once the
 * first sentence has said where they were.
 *
 * The line is chosen by whichever reading landed furthest from the middle of
 * its own seat's window, in the direction it landed — read as character, not as
 * a score. A low reading is a person, not a penalty: low ambition is the rarest
 * and most useful thing in a deputy, and low loyalty is somebody who serves the
 * office rather than whoever is sitting in it.
 *
 * **Ten sentences used to close every bio in the world.** Five readings times
 * two directions, one string each, dealt across the whole cast — so the half of
 * a bio that is supposed to be the person was the most repeated prose in the
 * game. Six per cell, drawn by a hash of the person's own id, is what makes the
 * closing sentence a fact about them rather than a category they fell into.
 */
export const ATTRIBUTE_LINES: Record<string, { readonly high: readonly string[]; readonly low: readonly string[] }> = {
  competence: {
    high: [
      "Reads a brief once and can quote it back accurately a week later.",
      "Rewrites a deputy's work rather than send it back, which saves the week and costs the deputy the lesson.",
      "Asks the one question in a briefing that nobody prepared for, and waits through the silence that follows.",
      "Writes their own memos, which is why the ones that go out under their name are shorter than everyone else's.",
      "Gets handed the impossible file as a matter of routine now, which is a compliment with a workload attached.",
      "Finishes the work early and has never learned to make that look like anything other than an accusation.",
    ],
    low: [
      "Has never been the sharpest person in the room, and long ago stopped pretending otherwise.",
      "Works twice as long as anyone else to reach the same page, and turns it in on time regardless.",
      "Confuses the mechanism with the outcome often enough that staff have learned to write the outcome first.",
      "Repeats the last thing said in the room with real conviction, and is agreed with about half the time.",
      "Was promoted for a strength that has nothing to do with the paperwork, and the paperwork has noticed.",
      "Needs the same thing explained twice and has signed off on the version explained first more than once.",
    ],
  },
  loyalty: {
    high: [
      "Has turned down better offers than this one, and did not think to mention any of them.",
      "Answers the phone at four in the morning and has never once asked what the call is going to cost.",
      "Burned a decade of goodwill with a former patron by taking this job, and has not spoken to them since.",
      "Takes a bad instruction and carries it out well, then says what was wrong with it afterward and only upstairs.",
      "Took a demotion rather than move to a department where the reporting line ran to somebody else.",
      "Keeps nothing on a personal device, takes no files home, and has never had to be asked about either.",
    ],
    low: [
      "Serves the office rather than whoever happens to be sitting in it, and says so in private.",
      "Reads every appointment as temporary, including their own, and plans accordingly without much apparent feeling about it.",
      "Keeps a friendship on the other side of the aisle that survives every election, and neither party has ever liked it.",
      "Owes the seat to a sponsor outside this administration, and every decision here is weighed against that debt first.",
      "Would testify accurately about a conversation with the leader, and considers that an unremarkable thing to say out loud.",
      "Reports to a caucus before reporting to the administration, and the sequence has shown up in every close vote.",
    ],
  },
  integrity: {
    high: [
      "Refused a posting once rather than put a signature on something they had not read.",
      "Will not let a number be rounded in the direction that helps, and has slowed three announcements doing it.",
      "Says the same thing to a hostile committee as to a friendly one, which costs more with the friendly one.",
      "Writes down what was promised and by whom, and has read it back aloud at moments that embarrassed the room.",
      "Declines the gift, the upgrade and the corner table, and has never once explained the refusal to the person offering.",
      "Is honest in a way that has cost real money, most of it their own, and none of it recoverable.",
    ],
    low: [
      "Carries a reputation the department has spent two years arranging not to look into.",
      "Treats a rule as a starting position in a negotiation, and has never been caught on the wrong side of one.",
      "Tells each person in a room the version of events that person can live with, and remembers all of them.",
      "Signs what is put in front of them and has stopped reading the paragraph that says who is liable.",
      "Believes everyone at this level does the same and is simply less careful about the paperwork than they are.",
      "Keeps the receipts on other people and has never had to use more than one of them.",
    ],
  },
  charisma: {
    high: [
      "Can hold a hostile room for a full hour without ever raising their voice.",
      "Is the reason a meeting runs an hour long and the reason nobody leaves, which costs the schedule every week.",
      "Gets asked for a photograph in airports by people who cannot name the office being held.",
      "Makes the case in plain words that four experts could not make in an afternoon, and gets the credit for all four.",
      "Warms a room in about ninety seconds and has been mistrusted by careful people for exactly that reason.",
      "Leaves a room believing it agreed with them, which is true about half the time and useful the rest.",
    ],
    low: [
      "Reads far better on paper than at a podium, and knows precisely which rooms to stay out of.",
      "Delivers bad news in the same tone as good news, and has watched a room miss the difference twice.",
      "Has no small talk at all, and gets to the point so quickly that people mistake it for rudeness.",
      "Was left off a delegation for reasons nobody wrote down, and has been left off two more since.",
      "Turns down every invitation that would require being charming, and has not been asked to reconsider in years.",
      "Loses an argument in public that was already won in writing, and has stopped taking the public half.",
    ],
  },
  ambition: {
    high: [
      "Wants the job above this one, and has never been subtle about the wanting.",
      "Reads every reshuffle rumor the way other people read a weather forecast, and dresses for it days ahead.",
      "Measures a week by how many people above them noticed it, and has never had a week that scored zero.",
      "Is already fifteen years into a plan that has three more steps in it, and none of them is this seat.",
      "Has burned two friendships getting this far and describes both, when asked, as differences over policy.",
      "Is unfailingly generous to anyone who might matter later, and briskly efficient with everyone who will not.",
    ],
    low: [
      "Has no interest at all in the job above this one, which makes them rarer than competent.",
      "Goes home at a reasonable hour, and has watched three faster colleagues pass by without altering the habit.",
      "Would rather finish the work than be seen finishing it, and lets other names go on top without comment.",
      "Has no plan beyond this file, this month, and finds the question about five years genuinely difficult to answer.",
      "Keeps a house in the same town as their parents and has turned down every posting that would require selling it.",
      "Was the obvious name for a bigger seat three times, and let the deadline pass on each of them.",
    ],
  },
};
