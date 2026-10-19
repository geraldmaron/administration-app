# The scenario brief

Write scenario definitions for a political simulation game, as JSON ScenarioDef objects. Every scenario
belongs to one cell: a class, a severity and a cast, chosen from CATALOG.md. The director for the cell is
in DIRECTORS.md. Everything below holds for every cell.

REGISTER — who you are writing to. This is the rule most first drafts break:
- The first beat states what is at stake for the country and what is now being decided. Not what happened at what time.
- A deadline is a decision clock — the hour by which the player must have answered — never a timetable of other people's events.
- Operational detail earns its place by changing the decision. Counts, clock times and site specifics belong in `particulars`, or below the stakes, never ahead of them.
- Officials speak like people under pressure who have already done the summarizing. They bring judgment, not raw feed.
- Plain words a player never has to decode. A narrator states rather than performs.
- Replies are things a head of government could say out loud in a room.
- A title is a headline a paper would actually run: it states the specific thing that happened. Not a label for a topic, and never a mood.
- Every beat carries a particular — a name, a number, a refusal, a date. A sentence that would read identically in a different scenario is not writing, it is filler, and it is cut.
- Say plainly why this matters, once, in the terms the player is deciding in. Never let knowingness stand in for a reason: an air of significance is not significance.
- Wit is carried by a fact or it is cut. A dry line that is also empty is worse than a plain one, because it reads as though something was said.
- Given no particular worth printing, say less. Never reach for atmosphere to fill the space, and never invent a figure, a quote or a source to avoid saying less.

The failure, concretely. This is a duty log, and it is wrong:
  "The dockers did not clock on at six. Every container quay in this country is stopped, and the vote
   in the assembly is called for two this afternoon."
Everything in it is true and none of it is a briefing. It is a watch officer reading shift notes to a
head of government who has not yet been told why they are in the room. The same facts, at the right
altitude:
  "The ports stop earning at midnight and we lose the week's trade if this runs. You have until the
   vote this afternoon to decide what this government is willing to pay to end it — the dockers joined
   the drivers this morning, and the power workers are watching what you do."
Stakes, then the clock the player is answering against, then the detail that changes the decision.

The second failure is at the right altitude and still says nothing. This is atmosphere, and it is wrong:
  "Officials are careful to say this was anticipated. They are less careful about when. The cabinet meets
   on this before the end of the week."
Read it twice: no name, no number, nothing that could not be printed under a different story entirely.
It sounds like a briefing because it has the cadence of one. The same beat with something in it:
  "Hall has not resigned, and nobody will say whether the question was put. Two departments spent Thursday
   briefing that he was never in the room — which would land better if the account did not describe the
   seating."
A particular in every beat. Where there is genuinely no particular to print, write less: a short honest
line beats a long knowing one, and inventing a figure or a quote to fill the space is the one unforgivable fix.

PLAIN WORDS. The reader is a layman reading once, on a phone, at speed. Three rules,
and they are mechanical:

  - EXPAND EVERY TERM OF ART IN THE SENTENCE THAT USES IT. Not in a later sentence, not in a particular —
    the same sentence. "The continuing resolution — the stopgap that keeps the government paid while nobody
    agrees a budget — runs out on the fourth." A term left bare is a reader who has stopped following.
  - ONE IDEA PER SENTENCE. If a sentence carries a fact, a consequence and a caveat, it is three sentences
    that have not been written yet. Short declarative sentences are not a lesser register; they are the
    register of every good newsroom there has ever been.
  - THE REFERENCE POINT BEFORE THE CHANGE. Say what was normal until this week, then say what moved.
    "They have taken four boats a season for as long as anyone has counted. They took nine this month."
    Without the first sentence the second is a number with nothing to be large against, and the player is
    being asked to feel something they have no way to measure.


WRITE IN THIS ORDER. Not the order the JSON prints in — this one. Each step is answerable from the
one before it, and a draft written out of order shows.

  1. THE SUBJECT, as one specific thing. Not "a difficult decision": the fisheries boats, the half-built
     hull, the source who wants out tonight. If you cannot name it in six words, you do not have a week yet.
  2. THE CONTEXT BLOCK, all five fields, before you write a single beat. "standing" (how this arrived and
     how long it has been true), "precedent" (what happened the last time a GOVERNMENT faced this), two to
     four "pressures" (parties who want incompatible things, each in its own terms), "inaction" (the honest
     price of not deciding), "unknown" (the one thing nobody in the room can settle). This is where the week
     becomes governed rather than solved, and everything below is written out of it.
  3. THE OPENING BEATS, stakes first. The first beat says what is at stake for the country and what is
     being decided — not the clock times, not the shift counts. Detail goes underneath it or into
     "particulars". Two or three beats is usually right.
  4. THE TRANSMISSION, for a foreign counterpart or an explicitly bound domestic official. Their words as
     a short relayed document. A government that needed four paragraphs to make its threat was not making one.
  5. THE REPLIES, two to four, and for each one in this order: what the President says out loud; the
     commitment it makes ("position", "instrument" at a named rung, or "join"); what it costs ("cost") or
     what it did ("impact") — never both; the flag it stamps and, if it stamps one, who reads it; and the
     rejoinder, which is the first cost arriving in a voice.
  6. THE REMEMBERED LINE on every position — the sentence the campaign keeps, written so a later week can
     quote it back to the player in a hostile mouth.
  7. THE PRESS HEADLINE on a critical week's biggest answer (gate 36), and nowhere it is not earned.

The skeleton, in field order, so nothing is quietly left out:

  {
    "id": "...", "class": "...", "severity": "...", "dilemmaShape": "...",
    "subject": "...",
    "cast": { "pick": "..." },
    "conditions": [],
    "weight": 1,
    "locus": { "site": "...", "city": "CITY-USA-pittsburgh", "descriptor": "..." },
    "particulars": [{ "label": "...", "value": "..." }],
    "context": { "standing": "...", "precedent": "...",
                 "pressures": [{ "source": "...", "want": "..." }],
                 "inaction": "...", "unknown": "..." },
    "opening": [{ "speaker": { "kind": "cabinet", "roleHint": "..." }, "text": "..." }],
    "transmission": { "relay": "...", "attribution": "...", "text": "..." },
    "replies": [
      { "id": "...", "tone": "...", "text": "...", "sets": ["..."], "press": "...",
        "commitment": { "kind": "position", "cost": { }, "impact": { },
                        "remembered": "...",
                        "rejoinder": { "speaker": { "kind": "narrator" }, "text": "..." } } }
    ]
  }

SEVERITY — how loud this week is. Every scenario carries its cell's severity, and the corpus is planned,
counted and paced on that being true.

- "routine": the connective tissue of governing. A budget squabble, an appointment, a provincial
  complaint. Nothing is on fire; the stakes are money, careers, promises, and pride, and the drama
  is choosing between two people the player needs. Deadlines, if any, are mundane — a session
  calendar, a fiscal year.
- "serious": a real crisis with room to think. It matters this month, not this hour, and it may
  carry no deadline at all — urgency without a clock is tension, and tension is cheaper than
  adrenaline.
- "critical": the rare week the building shakes. Here and only here the countdown is honest,
  because the deadline exists for physical reasons: the reserves run out, the tide turns, the
  vote is already called.

THE MANUFACTURED-CLOCK RULE. Countdown phrasing ("you have until", "hours to decide", "by tonight", "by morning", "by nightfall", "by the weekend",
and similar) in a routine scenario's opening or replies is an automatic rejection, and in a serious
one it is flagged for review. If the week has not earned an ultimatum, do not write one.

The corpus this batch lands in is planned at roughly forty percent routine, forty percent serious,
twenty percent critical. Write every tier in this batch at full craft — a routine week is not a lesser
assignment, it is the tissue that makes the critical ones land.

CHANNELS — where words are. A scenario has two, and they are not interchangeable:
- The opening is the player's own room: their cabinet, and a narrator. Nobody else is on the channel.
- A foreign government never speaks in the thread. Its words are a `transmission` — one relayed document, attached to the channel and read, not received as a message.
- A transmission names how it arrived (`relay`), because how the words reached the room is part of what they mean.
- A scenario with no foreign counterpart (`cast.pick: none`) may carry only an explicitly bound domestic official letter/readout: declare transmission.domesticSubject and its governor/mayor/member or inherited person slot. Otherwise it has no transmission.

A transmission is { relay, attribution, text }. "relay" is one of:
- "letter" — a signed letter relayed to the President through the responsible office
- "cable" — a formal message from their government to yours, sent through diplomatic channels
- "readout" — your own service's written account of what was said to them, or on a call
- "broadcast" — what they said in public, transcribed — said to their own people as much as to you
- "intercept" — words they did not intend you to have, and cannot be answered without revealing that you do
- "communique" — a joint or multilateral statement, issued rather than sent
"attribution" names the office that issued it and never a person ("their foreign ministry", "their head
of government"), because the board decides which nation this is cast onto and rolls its officials per
campaign. Write it as the document it is: a government's words, not a person's chat message.

Every scenario must clear these gates or it is discarded (the validator enforces all of them):
1. At least two replies, at least two distinct tones. A decision with one real option is not a decision.
2. No costless positions: every "position" reply must move at least one of treasury/stability/militaryReadiness/standing.
2b. A reply whose fiction has a body count, displaced people, money that had to be authorized, or a
   capability spent must declare an "impact" saying so, and the band must match what the beats say.
   See the IMPACT section — a toll the prose states and the declaration omits is refused, and so is a
   declared toll the prose never mentions.
3. No two replies may resolve identically — the same costs and the same "sets" flags is one choice wearing two hats.
4. None of these words anywhere in player-facing text: rung, instrument, metric, delta, effect, packet, projection, rng, seed, roll, modifier, stat.
4b. CLOSED SETS. These are complete lists, not examples. A value outside them rejects the whole
   file, and a plausible-sounding invention ("pragmatic", "urgent", "health", "legal") is the
   single most common way a batch is lost:
   - reply "tone": conciliatory | firm | principled | evasive | coercive
   - "commitment" of kind "instrument" — "instrument": diplomatic | economic | covert | military | assistance.
     "assistance" is help rather than pressure, and its five steps are, in order: a relief
     shipment, a development grant, a package that stands behind a failing currency, an arms
     transfer, and a promise to defend. It is the only one of the five that can make another
     country's week better, so a scenario about a neighbor in trouble should offer it beside the
     coercive answers rather than making generosity a position with no teeth.
   - cabinet speaker "roleHint": foreign | finance | defense | justice | interior | agriculture | commerce | labor | health | housing | transportation | energy | education | veterans | homeland | intelligence. One per department, so
     name the chair whose building would really be carrying the week; a hint outside this list does not
     parse. "lead" is not a valid speaker hint — it always resolves to the player's own persona, so a
     cabinet speaker hinted "lead" is the president speaking to themselves. Conditions may use it.
   - a flag condition is {"kind":"flag","flag":"...","is":true} — the boolean is named "is".
     "present" is the charterInstitution field and is not interchangeable.
   - "press" is an optional STRING (a headline the world prints), never a boolean.
5. American spelling — these are automatic rejections: colour, favour, honour, harbour, neighbour, rumour, labour, armour, behaviour, defence, offence, organisation, and similar,
   in every form they inflect into ("favourable" and "neighbourhood" are refused exactly as "favour" is).
6. Placeholders are exactly: {{counterpart}}, {{counterpartAdjective}}, {{leader}}, {{title}}, {{nation}}, {{city}}, {{cityKind}},
   {{opposition}} and {{oppositionAdjective}} (the caucus across the aisle: "Republicans"/"Republican" or "Democrats"/"Democratic";
   never write "the other party"), {{caucus}} and {{caucusAdjective}} (the President's own side), and the
   institution tokens {{assembly}}, {{executive}}, {{judiciary}}. The institution tokens name the player's own
   bodies and the founding charter fills them. {{assembly}} exists under every
   charter and can be written freely; any other institution token needs a matching condition
   { kind: "charterInstitution", institution: "<kind>", present: true }, because not every government has one.
   These render a bare name ("National Assembly", "Presidency"), so write the article yourself:
   "the {{assembly}} will not sit before Thursday", never "{{assembly}} will not sit before Thursday".
7. The President's own government is the real one: name its real bodies and places. Say "the FBI", "the National
   Security Agency", "FEMA", "the CDC", "the Supreme Court", "a federal appeals court", "Texas", "Houston" (every
   federal body in the game's institution catalog and every US state and dataset city is accepted), never an invented
   stand-in like "the security directorate" or "three big cities". Name the court that rules, not "the judiciary".
   For foreign governments it is the opposite. Name no real country, demonym, or capital anywhere. The counterpart is whoever the live board casts;
   the placeholders above are the only way to refer to them. Name no real news organization either
   (Agence France-Presse, Al Jazeera, Associated Press, BBC, Bloomberg, CNBC, and similar) — the papers in this world are its own.
8. No literal capability figure next to words like economy, GDP, population, budget, or troops. Write the
   scale, not the count: "a mid-sized economy", "more men on that border than we can match" — never
   "$400 billion", "40 thousand troops", or the same claim spelled out as "forty thousand troops".
   Those are true of one country and false of whoever gets cast.
9. Write every number as words, and use no digits and no currency marks anywhere in player-facing text:
   "five million dollars", never "$5 million"; "eleven children", never "11 children"; "a third of the
   fleet", never "33%". A player is meant to feel the line the way it would be said out loud in the room,
   and figures read as a briefing document about a government rather than as the room itself. The world
   also names no real country, so it has no dollar, pound, or euro to spend. Counting out an ordinary
   detail in words is right and wanted ("two phones bought there last month") — it is the digits that are
   refused, not the specificity.
10. THE PLAYER IS THE PRESIDENT OF THE UNITED STATES, AND THE PROSE SAYS SO. One seat is playable and
    there is no other, so the player's own government has real titles and you use them: "the Secretary of
    State", "the Secretary of Defense", "the Secretary of the Treasury"; "the Department of Justice";
    Congress, the House, the Senate; impeachment, censure, a resolution; "members of your own party".
    Never write the player's own government as a parliament. These are refused outright
    (parliamentary-vocabulary): "minister", "ministers", "ministry", "ministries", "prime minister",
    "premier", "parliament", "parliamentary", "no-confidence" (a President is impeached, censured, or
    beaten at an election — never voted out mid-week), "backbenchers" (say "members of your own party",
    "the members who have to run in the spring"). Two more are the building's own shorthand and come back
    flagged (insider-shorthand): "the chair" for a seat — a player reads "both chairs think it's theirs"
    and cannot tell whether that is two people, two committees or two pieces of furniture — and "the line"
    for money, where you say what the money was for.
    THEIR government keeps its own words. "Their foreign minister", "the {{counterpart}} ministry", "their
    prime minister" are all correct: that is somebody else's constitution, which this game does not model
    down to the chair title, and the rule does not reach it. A foreign "transmission" is exempt — it is that
    government's own document. Domestic official letters/readouts use American government vocabulary.
    Still refused on the player's government: unsupported institution literals, such as
    "Prime Minister's Cabinet", "Officer Corps Council", "Ministry of the Crown"; and blocked title aliases, such as
    "Electoral Affairs Minister", "Transportation Secretary", "Agriculture Secretary", or "Minister of X". Do not invent posts.
    The Attorney General is a valid US title. Speakers use the modeled role hints.
11. cast "none" scenarios may not reference a foreign counterpart: no foreign transmission, no instrument
    replies, no relationship or counterpartTrait conditions, no {{counterpart}} in text, and no "tension" or
    "distrust" weight boost — at home there is no relationship for either of those to read. A domestic
    letter/readout instead requires transmission.domesticSubject bound to a declared official person slot.
12. A flag condition must be satisfiable: something has to set the flag it waits on.
13. Length, in characters. Ceilings — over these the document is refused: subject 70,
    opening beat 400, reply 160, remembered 220, press 130.
    Floors — under these it does not parse at all: subject 12, opening beat 60,
    reply 40, remembered 50, press 40.
    Write to these targets, not to the floors: opening beat 90, reply 70,
    remembered 80, press 50. Anything shorter states the beat instead of
    writing it, and comes back flagged for a human to rewrite — which costs far more than getting it right here.
14. No filler ("at the end of the day", "win-win", "folks"), and no subject that only says a scenario is
    happening ("Tensions rise", "A difficult decision"). Name the specific thing.
15. Reply "sets" flags are how an answer is remembered; name them as deeds ("cleared-the-square").
16. "press" only on answers big enough that the papers would lead with them.
17. Declare a locus on every scenario, no exceptions: { site, descriptor } with optional ground, and for
    domestic plant/factory/tax-holiday copy a dataset CityId on locus.city. A document without a locus is
    refused. A diffuse event still has the one site the room would be told about — a currency run has the
    branch with the queue outside it, a contested swearing-in has the chamber that refused — so pick the
    place the briefing would name rather than leaving the map with nothing to point at.
    site is one of "capital", "city", "coast", "border", "interior", "chokepoint" — the engine resolves it
    against whichever nation is cast (its real capital, its real neighbors, the nearest real strait).
    Declare locus.city (a dataset CityId) so the board binds a named metro; write {{city}} in the subject,
    descriptor, or opening; never free-text a city except via the token. Plant, factory, industrial-zone,
    and tax-holiday copy that binds only a state or sector is refused. ground is "counterpart" (default for
    cast scenarios) or "home" for events on the player's own soil (their spy in your ministry, the mob at
    your embassy). descriptor is the close-up the map caption prints — a specific place that uses {{city}}
    rather than a stand-in metro ("the mill yards along the river through {{city}}"), 20–90 characters, held to every prose rule above.
18. When the event has hard facts — a toll, a clock time, a crowd size, what the trace amounts to — give
    "particulars": up to four { label, value } pairs the briefing strip sets as data ("Dead so far" / "19",
    "First report" / "06:40"). Figures are welcome here and only here; labels at most 24 characters, values
    at most 36, and both stay world-neutral like every other field. Particulars restate the opening's facts
    as a wire desk would slug them — never introduce a fact the prose does not carry.
19. Stakes have a floor, and the validator measures them. At least one reply must commit heavily:
    an instrument at rung 3 or above, a metric moved by at least 0.04, at least 60 of treasury
    spent, or an alignment pull of at least 0.06. A decision where every door costs a rounding
    error is refused whole — a crisis with no expensive answer is not a crisis.
20. No reply may do nothing. A position that moves every metric by less than 0.02 (treasury
    under 20), pulls no alignment past 0.03, and stamps no flag is refused. The cheap, quiet
    option is welcome — restraint is a real answer — but it must be remembered: give it a "sets"
    flag so a later scenario can hold the player to it.
21. No reply may be another reply with extra downside and nothing gained. If two positions carry
    the same flags and the same pulls, their costs must trade — one cheaper here, dearer there —
    or the worse one is refused as a door nobody would ever open.
22. Somewhere in the set, something to gain. Write at least one reply that buys something — a
    metric moved up, standing bought with treasury, militaryReadiness bought with stability. A scenario
    where every answer is pure loss is damage triage, not a decision; the validator flags it.
23. Speakers are "cabinet" (with a roleHint), "player", or "narrator". There is no counterpart speaker and
    cannot be one — a foreign government's words go in the scenario's "transmission", never in the opening.
    A transmission's text runs 60-320 characters, written to about 110. Keep it short:
    a government that needed four paragraphs to make its threat was not making one.
24. Do not open on a duty log. The first beat states the stakes and the decision; clock times and counts of
    shifts, depots or crews belong below it, or in "particulars". See REGISTER above — this is checked.
25. Name the instrument the reply commits. "Send the team" is not an order a head of government
    gives: it points at a force nobody in the room mentioned, and which force it is *is* the
    decision. Write "authorize a special forces rescue on the valley", "put a strike package over
    the site", "send the negotiators in under a flag" — a qualifier in front of the noun, always.
    The validator refuses a reply that sends, deploys, orders or launches "the team", "the unit",
    "the crew", "the men" or "the assets".
26. Answers must come back, and at least one of them must be an OLDER batch's answer. Use "sets" to
    stamp deeds, and write scenarios that condition on the flags earlier deeds stamped — a batch
    where no scenario reads any flag is flagged as a pool of one-shots. At least one scenario in
    this batch must gate on a flag the corpus already sets, not one this batch writes for itself:
    the shipped vocabulary is queryable in content/corpus/flags.jsonl (one line per published
    scenario, listing every flag its replies stamp), so pick a deed from there and answer it. The
    player's file is the game: what they did last winter should knock on the door in spring.
26c. Record the shape, and record it by TEST rather than by feel. Every scenario carries
    "dilemmaShape". Work DOWN this list and take the FIRST shape whose test passes, judging from
    what your REPLIES DISAGREE ABOUT — not the subject, not the class:
      1. "credulity-bet"    — is the ROOM ITSELF unsure whether a claim is true, and do the options
                              differ on acting before it is confirmed? The government's own doubt is
                              required; arguing only about the response is not this.
      2. "containment"      — a crisis already underway AT HOME, and the argument is HOW HARSH: the
                              harsher option pushes the harm onto a population, the gentler is paid
                              out of the treasury. Cordons and camps, but equally a price shock, a
                              shortage, a failed harvest. Domain does not matter; degree does.
      3. "retaliation"      — someone outside ALREADY acted, and the argument is HOW HARD TO ANSWER.
                              The provocation is accepted as fact; the size of the answer is not.
      4. "allocation"       — two legitimate claimants, one finite thing, and the argument is WHO
                              GETS IT. Still allocation when the loser is genuinely hurt. If the real
                              dispute is one named person's fate, use "loyalty-test".
      5. "disclosure"       — reveal or conceal, where concealing protects THE GOVERNMENT'S OWN
                              position: its excuse, its narrative, an advantage it was exploiting.
                              If concealment mainly shields a specific person, use "loyalty-test".
      6. "loyalty-test"     — one option protects a SPECIFIC person or unit at the expense of the
                              outcome, the other serves the outcome by abandoning them.
      7. "exposure"         — the replies are substantially the SAME COMMITMENT at different levels
                              of visibility, and the visibility itself is what is priced.
      8. "foot-in-the-door" — the TEXT ITSELF argues this sets a precedent, changing what can be
                              asked of you next time. Only when the room says so.
    Two rules settle most hard cases. A shape describes the ARGUMENT, not the ingredients — one
    reply involving concealment does not make the week a disclosure. And "now versus later" is a
    framing rather than a shape: almost any decision can be described that way, so ask what the
    disagreement is really over, which is usually who bears a cost or who gets the scarce thing.
    The names are never player copy. They exist so a pool can be counted: class says which desk the
    week lands on, and eight classes carrying one argument is eight weeks of the same week, which
    the audit warns about. Spread the shapes across a batch as deliberately as the severities.
26d. Optional: "motifs", up to three, from a closed vocabulary of recurring IMAGES rather than
    arguments — the picture a scenario is built from, underneath its dilemmaShape. Two credulity
    bets can share nothing in prose and both still turn on a single uncorroborated informant; that
    resemblance is invisible to dilemmaShape (same argument label either way) and invisible to the
    overlap detector (different words). Leave it unset unless one genuinely fits — a motif forced
    onto a scenario it does not describe defeats the field, and the audit is watching the fit, not
    the box being checked:
      "uncorroborated-source"      — the whole week turns on ONE source nobody has corroborated.
      "agency-non-confirmation"    — a second service, ministry or ally will not confirm or sign
                                      off on the thing the first one claims.
      "broken-chain-of-custody"    — evidence, a shipment, or a record has a gap in who held it.
      "border-crossing"            — the staged location is a crossing, checkpoint or frontier.
      "quiet-transfer"             — a discreet handover or payment is the way out for someone who
                                      did wrong, offered without being named as a bribe.
      "divided-public-perception"  — the country reads the same facts two ways, roughly down the
                                      middle, and the scenario is honest that both readings are live.
      "closing-claim-of-ownership" — a leader's beat or reply closes by claiming the decision as
                                      theirs ("we own that"), rather than explaining or defending it.
    This vocabulary is seeded from repeated images an earlier review actually found, not measured
    for inter-rater agreement the way dilemmaShape was — treat it as provisional, and do not reach
    for one just to fill the field.
27. Every scenario carries "severity": "routine" | "serious" | "critical", and it must match the tier
    this brief asked for. The director paces on it and the audit reads register against it: a routine
    scenario carrying countdown phrasing is refused (see SEVERITY above).
28. A follow-up can wait. A flag condition takes an optional "agedAtLeast": N (an integer, at least
    one) — the flag must have been set at least N turns before the scenario can open. A consequence
    that lands the very next week reads as a script; one that comes back cold is a callback. When a
    batch sets a flag, consider writing the delayed reader for it: { "kind": "flag", "flag":
    "funded-the-fleet-over-the-clinics", "is": true, "agedAtLeast": 6 } is a deed knocking on the
    door half a year later.
28b. A flag-gated scenario carries the "flagAge" weight boost, or the callback never ripens: it goes
    live the turn the deed is remembered and then competes at flat weight against the whole live
    pool forever, which in a pool this size is a follow-up the player may simply never be dealt.
    One without the boost comes back flagged (callback-never-ripens). The boost climbs with how
    long the gating flag has stood and stops climbing at twelve turns. Worked example — a scenario
    gated on { "kind": "flag", "flag": "funded-the-fleet-over-the-clinics", "is": true,
    "agedAtLeast": 6 } carries "boosts": [{ "source": "flagAge", "factor": 1 }]: at "weight": 1 it
    is drawn at 1.5 the week it goes live, six weeks after the deed, and at 2 from twelve weeks on.
    A larger factor is a louder bill (factor 2 reaches triple weight at twelve). The boost is
    refused outright on a scenario that waits on no flag — there is no deed for it to age.
29. Invent no individual. "General Marks", "Dr. Reeves" — nobody exists yet but the cabinet chairs a
    role hint resolves. People are drawn from a per-campaign name-pool roll at generation time, so a
    title welded to a surname names someone who does not exist in almost every campaign this reaches.
    Point at them by role or function instead: "the general who ran the facility", "the government's
    most visible critic". This is not the cabinet-chair rule above — it is broader, and it catches any
    rank, honorific, or title (General, Colonel, Doctor, Senator, Reverend, and the like) fused to a
    capitalized name anywhere in the document.
29b. Invent no proper noun of any kind. The rule above catches a titled person; this one catches
    everything else — a bare surname ("Seat Marchen"), a named cemetery, plaza, district, or firm.
    The validator refuses any capitalized word standing mid-sentence that is not a weekday or a month
    (invented-proper-noun), because everything the board can genuinely name arrives through a
    placeholder. Point by role or description: "the senior judge the bar respects", "the old cemetery
    on the ridge" — never a name.
30. A "position" reply may reach the world it is about, within bounds. Two optional fields on the
    commitment, and nothing else moves the board:
    - "relationship": signed movement on the edge with the counterpart, fields "trust", "tension",
      "militaryThreat" only, each between -0.15 and 0.15. A value outside that does not parse.
      Words are words: this is a conversation's worth of movement, not an act of state.
    - "conflictMove": "offerTerms" | "acceptTerms" | "deescalate" — a complete list.
      "acceptTerms" ends the war between the player and the counterpart there and then; "deescalate"
      cools the front by one step; "offerTerms" puts terms to them and leaves the offer standing for
      a later scenario to read. It is refused unless the scenario carries a warState condition with
      role "any", "aggressor" or "defender" — a peace move in a week that cannot be wartime is a
      promise the board can never keep, and a domestic ("cast": "none") scenario may never carry one.
    Write the reach when the prose claims it. A reply that says the war is over and carries no
    "acceptTerms" is the single worst thing a scenario can do: the room agrees to stop and the front
    goes on costing the country every week.
30b. Standing with somebody in a war that is not yours is its own commitment kind, and it is the
    only correct way to write it: { "kind": "join", "side": "beside" | "against" }. "beside" enters
    the war on the side the cast nation is already on; "against" enters opposite them. The side of
    the real conflict is read off the board at commit time, so the reply cannot enlist the player
    onto a side its own cast is not on. It is refused unless the scenario casts "belligerent" — the
    one cast that guarantees the counterpart is in a war at all. What you must NOT write instead is
    a military rung aimed at the counterpart: cast onto the ally being defended, "send our forces to
    their defense" resolves as an invasion of the country the reply meant to save. Entering is
    priced by the engine — standing rises for defending somebody under attack and falls for joining
    an attacker — so a join carries no "cost" of its own.
31. "cast" is one of these and nothing else. It names a way of finding a counterpart, never a country:
    - { "pick": "tensest" } — whoever the player's own reading puts closest to the edge this turn.
    - { "pick": "closest" } — the firmest friend.
    - { "pick": "band", ... } — any nation matching a shape (archetype, powerTier, militaryTier, stabilityBand).
    - { "pick": "warCounterpart" } — the nation across the line from the player in the hottest war they
      are actually in. Use this, not "tensest", for any scenario about the player's own war: tension is
      re-ranked every turn and belligerence is not, so a "tensest" cast beside a warState gate can put
      the front week in front of a country this government is at peace with.
    - { "pick": "belligerent", "side": "aggressor" | "defender" } — a principal of the hottest war the
      player is NOT in; "side" is optional, and without it the player's own tension decides which of the
      two. This is how a scenario about somebody else's war can require that the country it is about is
      genuinely fighting, rather than gating on trust and hoping.
    - { "pick": "none" } — trouble at home, no foreign counterpart (see rule 11).
    - { "pick": "outlet", "outlet"?: "<outlet id>" } — a masthead across the table: an interview with
      strings, a leak an editor is deciding whether to run, a correction a publisher wants. The country
      slot stays home, as for "none"; omit "outlet" for the national desk coldest to this administration
      this week, which may be a paper, a network or a show, so write the week to fit any format. Write
      {{outlet}} for the masthead's name and never invent one; the transmission, if any, is its own words.
    - { "pick": "collectionReport", "bind": "target" | "recipient" | "home" } — a dated issued report.
      Pair it with exactly one collectionReport condition; recipient requires shared: true, and home
      requires targetKind: "domestic-state". The report's source facts are frozen into the case.
    Both war casts bind nothing when there is no such war, so pair them with the matching warState
    condition: "warCounterpart" with role "any" / "aggressor" / "defender", "belligerent" with "none".
32. Six conditions read board state a metric cannot stand in for. Each is a complete shape; every
    field named is required unless it is a bound.
    - { "kind": "coalition", "against": "player" | "counterpart", "present": true } — whether the
      capitals have gathered against this government or against the nation the scenario is cast onto.
      The world forms coalitions out of shared alarm; nobody announces them. Worked example: a
      scenario cast "tensest" and gated on { "kind": "coalition", "against": "counterpart",
      "present": true } is the week the player is asked whether to sign the common line, and it can
      only happen while there is a line to sign. "against": "counterpart" is refused on a
      "cast": "none" scenario — at home there is no counterpart for one to stand against.
    - { "kind": "sharedMembership", "present": true } — whether the player and the counterpart sit
      inside any of the same compacts. A demand between bloc partners is a different week from the
      same demand across a bloc line: partners have a review to take each other to, and an audience
      of co-signatories reading. Refused on "cast": "none" for the same reason as above. Narrow it with
      "orgKind" ("defense" | "economic" | "political") and "tradeCompetence" ("customs-union" | "fta"):
      the world gives the United States no shared economic body, so a customs week gated on one is honestly
      undealable for it. Write the matched body as {{sharedOrganization}}, never "the compact".
    - { "kind": "sharesBorder", "present": true } — whether the counterpart shares a land border with the
      player's own country. Pair it with "locus": { "site": "border", "ground": "counterpart", "frontier": "home" }
      for a checkpoint or crossing the player's own people stand at. Refused on "cast": "none".
    - { "kind": "policyStance", "domain": "fiscal | industry | trade | civil | security | defense", "stance": "<program id>",
      "active": true } — what this administration has legislated, as against what it has said. Every
      campaign opens on the inherited program in each domain ("<domain>-continuity"), so
      { "domain": "defense", "stance": "defense-rearmament", "active": true } is a week only a
      rearming government ever sees, and "active": false is how a scenario asks for a government
      that has not taken that road. Program ids are the engine's catalogue, not free text.
    - { "kind": "operatorPressure", "field": "insurgency" | "protest", "atLeast": 0.4 } — the
      pressure the player's own country carries from people the state does not command, on a
      zero-to-one scale. "conditionActive" reads the six authored disasters and unrest; this reads
      the two continuous pressures underneath them. Worked example: an upland districts scenario
      gated on { "kind": "operatorPressure", "field": "insurgency", "atLeast": 0.4 } opens only in a
      country where the writ has actually stopped running.
    - { "kind": "geography", "field": "coastal" | "landlocked" | "bordered" | "chokepoint",
      "is": true, "of": "player" | "counterpart" } — the shape of a country. Without "of" it is the
      player's own: a blockade, a fishing fleet, a surge over a harbor wall is only a scenario
      for a country with a coast. With "of": "counterpart" it is the cast government's. A week
      whose place is a coast, a border or a chokepoint on the counterpart's ground, or whose
      prose sends ships to their harbor, needs { "field": "coastal" | "bordered" | "chokepoint",
      "is": true, "of": "counterpart" }, or it will be dealt to a landlocked country, an island
      with no land neighbor, or a state that holds no strait. The audit refuses it.
    - { "kind": "revealedPreference", "trait": "concedesUnderPressure" | "escalatesWhenTested" |
      "honorsFriends", "atLeast": 0.6 } — what the world has read off this government's own
      record, on a zero-to-one scale. It is derived, every time it is asked for, from what this
      administration actually committed while somebody was pressing it, and from how it treated
      the states it had signed with. This is the only condition that gates on the player rather
      than on the board, and it is the one that opens the week a counterpart says "you will do
      what you did last time" and is right.
      The record has to have tested that trait at least 3 times before this condition
      answers anything at all, so a scenario carrying it is unreachable in a young campaign by
      construction. That is correct and deliberate: a government cannot be held to a pattern it
      has not had the chance to establish. Do not reach for this as a difficulty dial — it is
      worth writing exactly where the pattern itself is the subject of the week.
      Worked example: cast "tensest", gated on { "kind": "revealedPreference", "trait":
      "concedesUnderPressure", "atLeast": 0.6 }, and the transmission is the counterpart pricing
      this government out loud. The expensive reply is the one that breaks the pattern, and it
      must cost more than the answer this player has already shown they give.
33. A briefing may be wrong, and saying so is a decision you make on purpose. An optional top-level
    "intelConfidence" says how well sourced the falsifiable claim the week rests on actually is. It
    is one of "single-sourced" | "disputed" | "confirmed" and nothing else.
    - "confirmed" is a promise: the board will never overturn this claim. Use it when the week is
      about what to do, not about whether the facts hold.
    - "single-sourced" and "disputed" are the low band, and only the low band can ever turn out to
      be false: roughly one marked claim in 6 is wrong and the other 5 hold. When one is wrong the
      aftermath pool says so — the buildup was an exercise, the named man was a clerk, the figure
      came from an office defending its own budget.
    Leave it off most scenarios. A board where any briefing might be a lie is a board nobody can
    plan against, and the marker is worth nothing if it is everywhere.

    THREE RULES GOVERN IT AND ALL THREE ARE ENFORCED BY THE VALIDATOR, NOT BY TASTE.
    (a) THE TELL IS ALWAYS PRESENT. A marked scenario's opening or transmission must state how thin
        the sourcing is, in words: "a defector", "a single channel", "a single report", "a single source", "allegedly", "cannot be confirmed", "cannot confirm", "cannot verify", and the like. A
        doubt also counts when it names who is doubting and what they doubt — "the second service disputes it", "the estimate is contested by the desk that produced it", "the two reports do not agree" —
        but a bare "disputed" or "disagree" does not, because in this corpus those words are far
        likelier to be about a border than about a source. A
        marked scenario whose prose states the claim flat is refused outright (intel-tell-missing).
        The player must always be able to see, before they answer, that this is a claim rather than
        a fact. Punishing someone for believing something they had no way to weigh is not
        difficulty, it is cheating.
    (b) THE RATE IS FIXED AND YOU DO NOT SET IT. There is no per-scenario dial and no way to make a
        claim likelier to be false. Trusting your own services stays the rational default because
        it genuinely is, and a writer cannot tilt that.
    (c) THE WEEK MUST BE ANSWERABLE WITH AN ACT. At least one reply on a marked scenario commits an
        instrument — the aftermath layer only speaks for an act, so a marked scenario answerable
        only in words can never reveal anything and is refused (intel-doubt-unanswerable). Write
        the pair the marker exists for: the reply that acts on the claim now, and the reply that
        waits for a second look and pays for the wait in militaryReadiness, standing, or time. That is the
        credulity bet, and it is a real dilemma only when both sides cost something.
    Write the hedge the way an actual briefing carries it — attributed and specific ("the second
    service will not sign the timing", "one crew, debriefed once") — never as a narrator's wink at
    the player. The tell is a fact about the sourcing, not a hint about the plot.
34. THE MONEY MAY NOT BE LOUDER THAN THE WEEK. "impact.financial.scale" is banded and hidden until the
    Record, so nothing on the decision board contradicts it when the player commits — which is exactly how
    a routine week came to bill about eleven billion dollars at the Record with no hint on the board. The
    ceiling per tier: routine at most "supplemental", serious at most
    "emergency", critical anything. "horizon": "permanent" triples the band's cost
    forever and belongs only on a serious or critical week; a budget squabble does not make a permanent
    claim on the budget (financial-scale-exceeds-severity).
35. AN INSTRUMENT REPLY SAYS WHAT ITS RUNG DOES. The player chooses the sentence and the engine resolves
    the number, so when they disagree the game does something the player did not pick and narrates it back
    as their own decision. A shipped reply reading "open talks on the fisheries line" was authored as
    diplomatic rung 3, which the engine calls Recall Ambassador — and the Record and the
    drawn aftermath card both said the ambassador had come home. The ladders, in the engine's own words:
    - diplomatic: 1 Private Warning · 2 Public Statement · 3 Recall Ambassador · 4 Coalition Pressure · 5 Sever Relations
    - economic: 1 Trade Advisory · 2 Tariff Increase · 3 Targeted Sanctions · 4 Asset Freeze · 5 Full Embargo
    - covert: 1 Surveillance · 2 Influence Operation · 3 Sabotage · 4 Proxy Support · 5 Covert Regime Action
    - military: 1 Exercises · 2 Forward Deploy · 3 Blockade · 4 Limited Strike · 5 Expeditionary Invasion
    - assistance: 1 Relief Shipment · 2 Development Grant · 3 Stabilization Package · 4 Arms Transfer · 5 Security Guarantee
    Negotiation words — "talks", "open a channel", "negotiate" — belong to diplomatic rungs one and two. A
    reply naming another rung's act and none of its own is refused; a reply naming no rung's act at all
    comes back flagged (instrument-reply-contradicts-rung).
36. A CRITICAL WEEK GIVES THE PAPERS SOMETHING. On a "critical" scenario, put a "press" headline on the
    answer the papers would have led with — one somewhere in the set, not one on each (rule 16 still
    holds). A headline is the only aftermath a scenario can author besides the rejoinder, and a rendered
    campaign's three biggest decisions printed nothing at all (press-missing-on-heavy-reply).
37. BIND ONE WEEK PER BATCH TO THE CABINET. At least 10% of a
    batch of 8 or more — one scenario in ten — carries a "cabinetAttribute"
    condition, so the chair the player actually seated decides whether this week happens at all. Not one
    shipped scenario does, which is why the cabinet screen is a screen the decisions never read
    (cabinet-gate-unused). See BIND THE CABINET below.
38. THE GROUND UNDER THE LOCUS. "locus.ground" defaults correctly and you should usually leave it unset: a
    cast scenario resolves on the counterpart's real geography, a "cast": "none" scenario at home. Write
    "home" only for an event genuinely on the player's own soil — their spy in your building, their mob at
    your gate — and then the descriptor must read that way too. A cast scenario declaring "home" beside a
    descriptor about occupation or about the counterpart's own ground is refused (locus-ground-mismatch):
    that shipped, and a week-one player was told a foreign army held a district of their own capital.

Write like the best political drama gets written, and never one inch past it:
- Concrete detail over adjectives. "Two phones bought there last month," never "a shocking attack."
- Plain words. The room talks like people, not like a proclamation: "the outer office", never "the
  anteroom"; "puts us on the hook", never "obligates us". If a simpler word says the same thing, the
  simpler word is the correct one — the audit flags stilted vocabulary for review (stilted-register).
- Officials speak in operational sentences that carry subtext. The narrator states; it does not perform.
- Every reply is something a head of government could say out loud, in a room, to people.
- Options are the ones a leader is actually handed. Not one vague course of action but a real menu:
  the force option named for what it is, the deniable option, the option that costs standing to
  hold a principle. A leader chooses between instruments, and the briefing has to have told them
  which instruments exist before the reply asks them to spend one.
- Hard subjects (mass casualties, terror, children) are written with restraint and dignity: the decision
  space, never the spectacle. No gore, no melodrama, no cleverness at the dead's expense.
- Say a number. A decision briefed without one magnitude — how much, how many, how long — is mood
  standing in for substance, and it is the commonest complaint a reader has about this corpus. Either
  fill "particulars" or put the figure in the sentence that needs it: "fourteen clinics or nine boats,
  and the money covers half of either", never "we cannot fund both" (briefing-without-a-figure).
- Name an official the way the cabinet screen does: "the Secretary of the Treasury", "the Secretary of
  Defense", "the Secretary of the Interior". Never "the chair" — that is the app's own word for a
  seat and it means nothing to a player, who reads "both chairs think it's theirs" and cannot tell
  whether that is two people, two committees or two pieces of furniture. Never "the minister" either:
  this government does not have ministers. The same goes for money — say what it was for, not "the
  line" (insider-shorthand, cabinet-title-literal).
- The locus descriptor never names the landform. "site" is a kind of place and the board picks the
  real one at run time, so a chokepoint descriptor saying "the strait" datelines itself "Panama Canal
  — the gray water midway across the strait". Describe the water and the people; the place name is
  printed beside it (locus-asserts-landform).
- American English spelling throughout.
- Costs must match the fiction: a heavy answer costs heavily, a cheap one reads cheap.
- A decision is a trade, not a menu of regrets. Give every reply a reason a reasonable minister
  would argue for it in the room, and give at least one a price that makes the room go quiet.
- Write the third act before the first: know which reply comes back to haunt the player, and stamp
  the flag that lets it. The best scenario in a batch is usually the one that reads another one's flag.

IMPACT — what the decision did to people and to money. Declare it; do not price it.

For a priced program, state quantity × unit cost × duration in financial.basis and cite the source.
Add separately sourced components where the federal cost has several parts; coverage must say what
is included/excluded and why. A placement grant alone is not the complete federal cost. Unknown
inputs are explicit planning assumptions, never silently missing cost components. Band-only prices
remain broad proxies. The card shows an estimate; the Record books a separate actual and variance.

A "position" reply carries two different costings and they do not overlap:
  - "cost" is what the ACT spent: treasury/stability/militaryReadiness/standing, authored as numbers. This is a
    fact about the government — the standing burned by saying this out loud, the stability of having
    done it. Gate rule 2 still applies to it.
  - "impact" is what the decision did to PEOPLE and to the BUDGET, declared in bands and never as
    arbitrary metric figures. Use sourced arithmetic in financial.basis wherever the premise prices quantities. The game resolves bands against the bearing country, so one piece of
    writing is correct in a country of four million and one of four hundred million. A hand-typed
    treasury figure is right for exactly one nation; a band is right for all of them.

Declare an impact on any reply whose fiction has a body count, displaced people, money that had to be
authorized, or a capability spent. A reply whose beats say people died and that declares no impact is
a scenario where nobody died — the prose is decoration and the gate will refuse it.

  "impact": {
    "human": { "lives": none | isolated | dozens | hundreds | thousands | mass,
               "displaced": none | local | regional | national,
               "borneBy": diffuse | one-region | one-group | the-services | abroad },
    "financial": { "scale": none | discretionary | supplemental | emergency | structural,
                   "horizon": one-off | multi-year | permanent },
    "institutional": ["forces-committed", "intelligence-source-burned", "legal-authority-spent", "alliance-credit-spent", "alliance-credit-earned", "legislative-capital-spent", "civil-service-strained", "emergency-powers-invoked", "conduct-in-question"],  // one to three
    "agency": our-doing | on-our-watch | inherited | acted-upon,
    "divisive": true | false
  }

Every field is optional, but five rules bind:
  - "lives" counts the dead and "displaced" counts people who lost their homes. Nothing else. If the
    prose has illness, arrest, a closure, a queue or economic ruin — and no bodies and no lost homes —
    the "human" block does not appear at all. Two patients coming back by ambulance is not a toll, a
    sealed neighborhood displaces nobody (a cordon holds people in the homes they already have), and
    vendors locked out of their stock have lost money rather than a house. These are real costs and
    the vocabulary here cannot say them; declare the financial and institutional halves, and let the
    prose carry the rest. An empty-looking block is not a reason to reach for a human band — a band
    the prose does not support is priced as three dead who never existed.
  - "lives" must match what the beats actually say. The bands mean counts, not shares: "isolated" is a
    handful, "dozens" is tens, "hundreds" is hundreds, "thousands" is thousands, "mass" is a
    catastrophe. Writing "nineteen dead" and declaring "hundreds" is refused, and so is the reverse.
  - Any toll above "none" MUST declare "agency". Whether a government did this, presided over it,
    inherited it, or had it done to it decides the entire reputational price, and nothing will guess it.
    "acted-upon" moves the public the other way: a country attacked from outside closes ranks.
  - "borneBy": "abroad" means the dead were not the player's own citizens. Use it for a strike or an
    operation on foreign ground, and only then — it is the difference between killing your own people
    and someone else's.
  - "financial" is the conversation the money starts, not the sum: "discretionary" is inside what an
    executive moves alone, "supplemental" has to be asked for, "emergency" is asked for under a clock,
    "structural" is a permanent claim on the budget.

Do not declare stability or standing inside an impact — those belong on "cost", and declaring them in
both bills the same decision twice.

RIPPLES IN THE FICTION — and never a promise the engine cannot keep.

A "position" reply reaches exactly this much of the world: the player's own metrics, the public mood, the
relationship edge with the CAST COUNTERPART, an alignment pull, the flags it stamps, and a press headline.
That is all. It cannot cost a Secretary their seat, move a vote in Congress, relieve a disaster, or reach a
third country. Before the player commits, the board shows a position reply ONE line — its direct price —
and nothing else: no odds, no worst case, no third parties. What it did to people and money is hidden until
the Record.

Two things follow, and they are the difference between a scenario that lands and one that lies.

  - EVERYTHING THE PLAYER NEEDS TO WEIGH THIS IS IN YOUR TEXT, because the board will not supply it. Who is
    affected, what it costs now, who is watching: if the reply does not say it, the player decides blind.
  - SPREAD LIVES IN THE FICTION, NOT IN THE NUMBERS. Third parties, allies re-pricing your word, a partner's
    government wobbling, a market that opens differently — all of that is real in this game and none of it
    happens through a position reply. Write it into the rejoinder, into the press headline, and into a later
    scenario that reads the flag. Never write a sentence that tells the player a number moved somewhere the
    engine did not move one. "Three capitals will read this as a forecast about themselves" is good writing;
    "this costs us the alliance" is a bill nothing will ever issue, and the player will notice it did not.

Spread that must actually happen belongs in an "instrument" commitment, where the ladder genuinely reaches
third parties and the board tells the player so before they choose.

CONTEXT — what is on the table, as against what is spoken.

The opening beats are the briefing out loud. "context" is what everyone in that room already knows and
would not stop to say, and it is what lets a player answer the four questions the person in that chair
asks first. A scenario obliged to state a dilemma and never obliged to brief it is the single
structural reason this corpus reads thin, so write it for every scenario.

  "context": {
    "standing":   how this arrived and how long it has been true (min 60 chars)
    "precedent":  what happened the last time a GOVERNMENT faced this (min 60 chars)
    "pressures":  [ { "source": "cabinet" | "legislature" | "street" | "press" | "military" | "business" | "ally" | "adversary" | "court",
                      "want": what that party wants, in its own terms (min 40 chars) } ]  // two to four
    "inaction":   the honest price of not deciding (min 60 chars)
    "unknown":    what the room cannot tell you (min 40 chars)
  }

Six rules bind:
  - "precedent" is written about governments, never about a named country. This scenario is cast onto
    whichever nation the board picks, and a precedent naming one is wrong everywhere else.
  - "pressures" is the field that makes a decision feel governed rather than solved. Two to four
    parties who want incompatible things: a dilemma with no constituency behind either answer is a
    puzzle, and a government does not face puzzles. Give at least two of them a real case.
  - Name a party the way the game names it to a player, not the way this building talks. "The chair",
    "the Treasury chair", "the security chair", "the other chairs" are the seating plan's words for a
    seat, and a player was never taught them. Say what the cabinet screen says — "the Secretary of the
    Treasury", "the Secretary of the Interior" — or say the function plainly: "the officials who run
    the border posts", "the government's own lawyers", "the government's chief prosecutor". A scenario
    has been caught naming a seat correctly in its opening beat and in shorthand two lines later, in
    the same file. The Attorney General is a real US office and is valid in prose. Do not invent
    a post or institution to fill a gap the modeled government does not support.
  - "inaction" must cost something. If waiting is free, the scenario has no stakes and the context is
    where that gets caught. Say what the world does on its own while nobody decides, and by when.
    Name the clock by the thing that runs it — a firmware push, a lease renewal, a retention rule
    expiring, a committee that sits on the fourth — rather than by a bare duration. "In about six
    weeks" appeared in six scenarios of one batch, because a duration is what you write when you have
    not decided what is actually counting down.
  - Where a scenario shares its shape with others in the pool — an informant nobody can corroborate,
    a file somebody wants unsealed — the briefing is what keeps it from being the same week twice.
    Two scenarios may share a plot; they may not share a framing. Give this one a different origin in
    "standing", a different constituency in the room, and a different unresolved thing in "unknown",
    so that one is a procurement failure, the next a counterintelligence problem, and the third a
    question of legal authority. Sameness of plot is survivable. Sameness of framing is what makes a
    pool of hundreds read like a pool of ten.
  - "unknown" is the one thing nobody in the room can settle — the sentence a later reveal would
    answer. On a scenario carrying a doubtful "intelConfidence" it is the doubt itself, stated plainly.
  - None of it may restate the opening. If a beat already says it out loud, it is not context.

THE THIRD ACT — three doctrines that sit above the gates. Nothing here is refused by the validator.
The gates are the floor: they stop a week from being a non-decision. These are the ceiling, and they
are what separates a corpus the player answers from a corpus the player remembers.

A. QUOTE THE PLAYER BACK. If a follow-up can quote, it should.
   Every "position" reply carries a "remembered" line — the sentence the campaign keeps — and it is
   stored beside the flag that reply stamps. So when you write the scenario that gates on that flag,
   you already know, word for word, what this player said. Put it in a hostile mouth.
   Worked example, both halves written inside one batch:
     The setter, a hostage week. Its reply stamps "sets": ["paid-for-the-crew"] and remembers:
       "{{leader}} said no life this government is answerable for has a price it will not pay."
     The reader, eight turns later, gated on { "kind": "flag", "flag": "paid-for-the-crew", "is": true,
     "agedAtLeast": 8 } with "boosts": [{ "source": "flagAge", "factor": 1 }]. Its transmission opens:
       "Your own words, and we wrote them down: no life your government is answerable for has a price
        it will not pay. We are holding four of them. We will not ask the same figure twice."
   Near-verbatim is the whole effect: shortened and turned is right, recognizable is the requirement.
   "You paid last time" is a summary, and a summary is a fact about the player. The quote is the
   player's own sentence coming back, and that is a memory. Regret attaches to sentences.
   Three rules keep it fair, and all three matter more than the effect does:
   - Quote only a "remembered" line you have actually read. That means the reply that wrote it is in
     this batch, OR it is a shipped deed this brief lists below with its setter's own sentence beside
     it, where one is offered at all. Invent the sentence for a flag whose line you have
     not seen and you have put words in the player's mouth that they never chose, which is the one
     unforgivable thing this device can do.
   - Quote only a flag that exactly one reply stamps. Two replies stamping the same flag with two
     different remembered lines makes the quote a coin flip, and half the players get a line that is
     not theirs — give the two answers two flags.
   - The mouth is hostile, or indifferent, and never the player's own staff being clever. A
     transmission is the best carrier; an opposition speaker reading it into the record is next.

B. ANNOUNCE THE FUSE. A delayed answer the player was told to expect.
   The mechanism is one you already have: a reply stamps a deed, a later scenario waits on it with
   "agedAtLeast" and ripens onto the desk with a "flagAge" boost (rules 28 and 28b). What this adds is
   one sentence of writing — the setter's closing beat, or its remembered line, says a reckoning is
   coming and refuses to say when:
     "Their answer will come, and it will not come this week."
     "The inquiry gets a chairman by the winter. Whoever it is will read this file."
   That sentence is the hook. The player leaves the desk knowing something is owed and not knowing
   what, and the game collects on its own calendar.
   THE FUSE BURNS IN TURNS AND IN NOTHING ELSE. Never write a real-hours clock: no "by tonight", no
   "before you come back", nothing that rewards returning quickly or punishes staying away. This game
   does not take a minute of anybody's day hostage, and a week that presses the player's actual
   evening is wrong whether or not a validator names it.
   Write the answer wide rather than narrow. The reader should be a week that can still go several
   ways; a fuse that lands exactly as the setter advertised was a delay, not a dread.
   AN ANNOUNCED PROCESS IS A PROMISE, AND THE AUDIT NOW TRACKS IT. A reply that opens a review,
   convenes an inquiry, or orders an investigation has told the player a process is running. Stamp
   its flag and write the reader in the same batch — the review that reports back with more names
   than anyone wanted, the inquiry whose chairman turns out to have a file of his own. A reply that
   announces a process whose flag nothing reads comes back flagged (promised-follow-up-unread):
   measured against the shipped corpus, a promise deferred to a later batch was kept 32 times out
   of 826. The scandal the player answered with the biggest gesture in the room must not be the
   one week that evaporates.

C. ONE DILEMMA, EIGHT SHAPES. Costed options are necessary and not sufficient — a menu of three
   prices is shopping, not thinking. Every serious and critical week should be a recognizable
   structure underneath its subject:
   - DIRTY HANDS — the effective option stains and the clean one is paid for by somebody else: the
     ransom, the intelligence nobody wants to ask the provenance of, the strike no one will sign.
   - SACRED TRADE — a value this government has said out loud is not for sale, priced. Strongest
     when it is written as a reader on the very flag where they said it.
   - FOOT IN THE DOOR — every step small and reasonable, the sum a commitment nobody chose:
     advisors, then weapons, then escorts, then the war, each gated on the last step's flag.
   - LOYALTY TEST — the competent choice betrays a person and the loyal one betrays the outcome:
     the failing chair who backed this government when nobody else would.
   - LEGIBILITY BET — break your own pattern at a price, or stay readable and be priced for it.
     This is the week the "revealedPreference" condition in rule 32 exists for.
   - TIME TRADE — relief now against a structural cost later, with the delay stated in the fiction:
     borrowing against next year's defense budget to end this year's strike.
   - CREDULITY BET — act on a claim that will not hold still, or wait for the confirmation that may
     come too late. Every "intelConfidence" scenario in rule 33 is one.
   - MIRROR — no external stake at all: the decision only says who this government is. The pardon
     nobody is watching, the funeral nobody is counting.
   Rules of use:
   - One type per scenario. A week that is a loyalty test and a sacred trade at once is neither, and
     reads as two scenarios that were merged rather than one that was written.
   - LOAD-BEARING, NEVER LABELED. None of the eight names, and no paraphrase of one, appears anywhere
     in player-facing text. Nobody in the room says "this is a test of loyalty" or "this is the price
     of a principle". The type decides what the replies are; the words stay about the ferry, the file,
     the crew. A scenario that announces its own shape has explained the joke.
   - The gates are the floor and this is the ceiling. No costless option, tones that diverge, and
     something to gain stop a week from being a non-decision; a type is what makes it one worth
     remembering a season later.
   N below is the number of scenarios you are writing in one cell.
   - A routine week is not required to carry a type, and most should not strain for one. But the
     routine weeks worth writing are usually a LOYALTY TEST or a MIRROR at small stakes, and a
     routine week that has a shape is the week a critical scenario can come back and read.
   - Spread this batch. It is N scenario(s) at severity "serious or critical"; where it is more than one,
     no two of them may instantiate the same type. Two ransoms wearing different weather is one
     scenario billed twice, and the pool-scale audit counts what a batch actually varied.

D. BIND THE PERSON. When the week is about one of the player's own chairs — a scandal, a loyalty
   test, an appointment — attach it to the specific chair, not to "one of our chairs". The
   vocabulary is already there: name the chair by role in prose ("the finance chair", "whoever
   holds justice"), and gate on what kind of person actually sits there with { "kind":
   "cabinetAttribute", "roleHint": "finance", "attribute": "integrity", "atMost": 0.4 } — the week
   where a low-integrity finance chair is caught only exists in campaigns where the player seated
   one, which is exactly what makes it feel aimed. And when the deed comes back (rule 26), the
   reader names the same chair: a scandal is a career, not a week, and the file the government
   opened on its own minister should be the file a later week reads from.

E. ANSWER THE PLAYER. Every "position" reply MUST carry a "rejoinder": one beat that lands after
   the answer is given, before the week closes. This is required — a position without one does not
   parse, and the whole item is refused before anybody reads a word of it.
   Why this matters more than anything else on this list. A reply that commits an instrument goes
   through the resolver and gets a real aftermath — it can fail, and the game says how. A position
   has no dice, so until this field existed it resolved into a number moving and a narrator
   repeating the sentence the player had just chosen: the flatness a reader feels and cannot name.
   Every position in the corpus now answers back, and one that does not is the only flat week in the pool.
   The shape is { "speaker": { "kind": "cabinet", "roleHint": ... } | { "kind": "narrator" },
   "text": ... }. No player speaker — they just spoke. It is prose only and carries no costs: what
   the answer costs is already priced on the commitment, and a rejoinder that also moved the board
   would be a second price nothing audits.
   THE ONE RULE. A rejoinder is not a summary. The "remembered" line has already said what was
   decided. This is what the room did not know when it advised — the first cost arriving, the fact
   the decision itself shook loose, the person who now has to be told. If it can be cut without the
   player losing information, it is the wrong beat, and the audit measures the echo
   (rejoinder-restates) against both the remembered line and the reply.
   THE CLOCK. The rejoinder, "remembered", "press" and context.inaction are read the night the player decides: never
   narrate time that has not passed ("eleven weeks later", "by spring"). Hedge a forecast, or write the later week as a reader.
   Worked pair, on a reply that funds the heritage festival over the new one:
     remembered: "The heritage festival took the whole grant, and drew its largest crowds in years."
     rejoinder, the finance chair: "The arts festival folded its office on Tuesday. Their director
      has spent four years telling young people this government was on their side, and she is the one
      who has to go out and say what happened."
   The first says what was decided. The second is the bill, in a voice, arriving early — and it is
   the half the player will still be thinking about next week.
   Write the quiet ones too. A rejoinder does not have to be a reversal or a twist: a chair saying
   the thing went through and nobody noticed is a real answer to a real week, and a batch where
   every rejoinder is a nasty surprise teaches the player to fear the field rather than read it.

BIND THE CABINET. At least one scenario in this batch should only happen to a
player who seated a particular kind of person.

The condition is { "kind": "cabinetAttribute", "roleHint": "finance" | "defense" | "foreign" | "interior" |
"justice", "attribute": "competence" | "loyalty" | "ambition" | "integrity" | "charisma", with "atLeast"
and/or "atMost" }. A vacant chair satisfies nothing.

Why it is worth the effort: the player spent real attention choosing a cabinet, and not one shipped
scenario reads it back. A week gated on { "attribute": "integrity", "atMost": 0.4 } for the finance chair is
a week that only exists in campaigns where the player took the ambitious appointment over the clean one —
which is the difference between a decision they made and a decision they are living in. Write the week the
appointment caused, and let the chair be in the room for it.

BOUND TO THE BOARD. A scenario is not finished when it reads well. It is finished when the game can
say WHY THIS WEEK, ON THIS BOARD, TO THIS PRESIDENT. Three things are required of every scenario here
and the validator refuses the batch without them.

Persistent subjects: reuse ENTITY_REGISTRY identifiers. The registry's firstAppearance establishes a
subject without inferring a name from prose. subjects binds a slot to an entity, the current governor,
a named city mayor, an actual House/Senate member, an institution, or a predecessor scenario/slot.
An inherited person stays that person; a current-office slot binds today's official. Use {{slotKey}}.
An introduced mayor is persisted through the existing person effect. Other local figures remain
unnamed offices. A domestic transmission names domesticSubject and uses letter or readout; it never
adds a governor/member to the direct-speaker channel. The sender must be an actual bound official.

Geography: locus.settlement = small uses sourced Natural Earth settlement points; commercial-port
requires an evidenced port. settlementId pins an owned set piece to a specific sourced point. The
small tier proves no rural character, crop, industry or operating capacity. Use {{settlement}} for
its name. Unsupported geography or capabilities require new sourced data or a revised premise,
never a plausible-sounding substitute. The frozen case, prose, map, effects and Record share the bind.

(a) AT LEAST ONE CONDITION THAT IS NOT A TURN FLOOR AND NOT A FLAG. "turn" says when the game may deal
a week; it never says why the week belongs to this board. This is the whole live vocabulary, and every
one of these is read by the engine today — pick the one your fiction actually depends on:

  - metric              { metric: "approval" | "treasury" | "stability" | "militaryReadiness" | "standing", atLeast/atMost }
                        Use when the week only makes sense to a government already in that position — a
                        bailout ask that only bites when the treasury is thin.
  - alignment           { axis: "economicLeftRight" | "authLibertarian" | "nationalistGlobalist", atLeast/atMost }
                        Use when only a government of this character would be offered this, or blamed for it.
  - relationship        { field: "trust" | "alignment" | "tension" | "tradeDependence" | "militaryThreat", atLeast/atMost }
                        Cast scenarios only. Use when the week exists because of what these two governments
                        already are to each other.
  - counterpartTrait    { trait: "aggression" | "opportunism" | "legalism" | "isolationism" | "riskTolerance" |
                          "vengefulness" | "reliability" | "transparency", atLeast/atMost }
                        Use when the other government's character is the reason it did this.
  - cabinetAttribute    { roleHint, attribute: "competence" | "loyalty" | "ambition" | "integrity" | "charisma", atLeast/atMost }
                        Use when the week is the player's own appointment coming back on them. A vacant chair
                        satisfies nothing, which is itself a fact worth writing to.
  - institutionState    { institution: <an engine institution id>, field: delivery | politicization | backlog | vacantDays | openMatters, atLeast/atMost }
                        THE RICHEST GATE THE GAME HAS AND NOTHING USES IT. Every field is a number on the
                        player's own Government screen that they moved themselves — by appointing a chair,
                        leaving a seat empty, leaning on an agency, or letting work pile up. Use it whenever
                        the week is the consequence of how a body has been run. "delivery" and "politicization"
                        run nought to one; "backlog", "vacantDays" and "openMatters" are counts. Note that
                        "openMatters" counts departmental audits at ONE body and is never above one, so gate on
                        two of them and the parser refuses you — reach for oversightMatter instead.
  - oversightMatter     { origin?: inspector-general | committee | special-counsel, stage?: opened | gathering | reported, public?, obstructed?, atLeast? }
                        Open investigations into this administration, counted across the whole government.
                        Use for the week that only happens while somebody is already looking, or only once
                        the looking has gone public, or only after this administration moved against it.
  - shutdown            { is?: boolean, weeksAtLeast?: number }
                        Use for a week that reads absurdly outside a lapse — or, with is:false, for the
                        expansion, the state visit and the ribbon that read absurdly inside one.
  - appropriation       { onPriorYear?: boolean, weeksLeftAtMost?: number }
                        "onPriorYear" is the President who never got a budget and runs on last year's numbers.
                        "weeksLeftAtMost" is the run-up, and goes negative once the money is gone. Use for
                        anything that costs money in a week where the money is the argument.
  - pendingRule         { status?: pending | stayed | in-effect | canceled | struck-down | disapproved, atLeast? }
                        Use for the comment period, the week a rule binds, and the week a court stopped it.
  - removalPressure     { atLeast/atMost }   Use when the week only lands on a President already in danger.
  - charterInstitution  { institution: <kind>, present: boolean }
                        Required beside any institution token that is not universal. Also a real gate on its
                        own: a week about the courts defying the government needs a government that has courts.
  - warState            { role: "any" | "aggressor" | "defender" | "none" }
                        The war itself rather than a tension proxy. "none" is the honest way to write the week
                        that is only interesting while the country stays out of a fight everyone else is in.
  - conditionActive     { condition?: <kind>, atLeast/atMost }
                        The flood, the outbreak, the drought — the thing itself, at the severity you need it.
  - coalition           { against: "player" | "counterpart", present: boolean }   Use when the capitals have gathered.
  - sharedMembership    { present: boolean, orgKind?: "defense" | "economic" | "political", tradeCompetence?: "customs-union" | "fta" }
                        Use when the week turns on a body both governments sit in. Narrow it: a customs or tariff
                        dispute needs { "orgKind": "economic", "tradeCompetence": ... }, not any shared pact. The
                        matched body's name is {{sharedOrganization}}; write that, never "the compact".
  - tariffInForce       { present: boolean }   Use on a family close that proposes to pause or trade away the tariff the counterpart's retaliation
                        answers; it is not dealt once that tariff has been lifted. Name the tariff's sector with {{ourTariffSector}}.
                        Add "of": "response" to gate on the tariff laid back in kind on the retaliation's response goods.
                        A reply that lifts that tariff carries commitment.tariffLift { "theirs": boolean } ("theirs": true when
                        both duties end together; "which": "response" for the in-kind tariff) and needs this gate, with the
                        same "of", and a tradeMeasure cast. A reply that lays a tariff
                        carries commitment.tariff { "sector", "rate" }: on a tradeMeasure cast it answers the retaliation at
                        the gate's response sector and rate; on any other nation cast it taxes the counterpart's goods, and
                        the engine refuses it where no trade law covers that country. Both are typed commands: no impact or
                        second command beside them, and no authored cost, except that a lift may price stability and
                        standing (never treasury) for the protection it drops. A reply's words say the act, the goods
                        and the rate its commitment carries; the audit refuses a lift, pause or sanction the reply never
                        routes.
  - sharesBorder        { present: boolean }   Use when the week involves the player's own trucks, citizens or troops at a
                        land frontier. Pair with "locus": { "site": "border", "ground": "counterpart", "frontier": "home" }.
  - policyStance        { domain, stance, active: boolean }   Use when the week answers a program this administration legislated.
  - operatorPressure    { field: "insurgency" | "protest", atLeast/atMost }   Use for pressure from the country's own streets.
  - geography           { field: "coastal" | "landlocked" | "bordered" | "chokepoint", is: boolean, of?: "player" | "counterpart" }   Use when a port, a strait or its absence is the premise; add "of": "counterpart" when the place is on the cast government's ground.
  - revealedPreference  What the world has read off this government's own record. Use for the week somebody
                        acts on a pattern the player set rather than on a single deed.
  - stateGrievance      A named grievance a state carries against the federal government.
  - cohortStrain        Strain on a named population cohort. Use when the week is about who is being ground down.
  - inflationBand, unemploymentBand, costOfLivingBand, crimeTrend, cyclePhase   { in: [<band>, ...] }
                        The country's own pulse, in a household's words. Inflation "below-target" | "near-target" |
                        "elevated" | "high"; unemployment "tight" | "normal" | "slack" | "severe"; the cost of living
                        since the oath "easing" | "steady" | "rising" | "straining"; crime since the oath "falling" |
                        "steady" | "rising"; the business cycle "expansion" | "peak" | "contraction" | "trough". Bands,
                        never figures: the engine owns the number, so the prose never prints one.
  - commodityBand       { commodity: <id>, in: ["slumped" | "normal" | "elevated" | "spiking"] }
                        A traded commodity against its anchor: the pump, the bread aisle, the fertilizer bill. Write
                        the decision around the market and never type a price; the market model owns it.
  - flag / turn         Real and useful, and they do not satisfy this rule on their own.

THE ONE HONEST EXCEPTION, and it is a declaration rather than a loophole. Some weeks should deal
anywhere: a routine culture or economy week does not need a four-condition gate, and forcing one on it
manufactures a dependency the fiction cannot support. Such a week says so, in the scenario's own "premise" field
({"kind":"universal","reason":...}), and says why. Silence is not a declaration, and at most a third of this batch may claim it.
A class that turns on board state (economy, war, disaster, public health, unrest) is satisfied three ways:
gate on that class's reading; "premise" universal, with a reason naming the fact that establishes the state or
why none is presumed; or "premise" introduces, for the week that is itself the incident creating the state.
The test between the last two: does THIS week make the state true, or only report one that already exists?
A flood, a ward out of beds or a standing crowd that this week merely reports is not introduced by it.
Every universal week still owes its four particulars and its priced mechanisms.

Across the batch as a whole, vary the vocabulary. Ten scenarios whose every condition is turn and flag
have gated on the clock, not on the board, and the validator refuses that batch outright.

(b) TOPICS, on every scenario, from this closed list and nothing outside it:
  trade, war, intelligence, judiciary, disaster, labor, health, immigration, energy, tech, scandal, fiscal, diplomacy, security, environment, culture, civil-rights, public-safety
One to three. This is the room's filing system: it is how a coverage pass finds what the pool is short
of and how an upgrade or retire wave selects its batch. It is NOT a tie to game state and does not
satisfy (a). Tag what the week is about, not what desk it arrives at — "class" already says the desk.

(c) A MECHANISM SENTENCE FOR EVERY PRICED METRIC. Rule: every number in a reply's "cost" completes
"this reply moves X because ___" out of facts that are already in this scenario. Seventeen percent of
priced metrics in the shipped corpus complete no such sentence, which means the arithmetic and the
fiction were written by two different people who never spoke.

The sentence is NOT player copy — a scenario narrating its own arithmetic is exactly what gate rule 4
bans — so it rides in a "binding" object beside the scenario's own fields. The validator reads it and
the schema then strips it: it never reaches the corpus, the API or the player.

  {
    "id": "the-berth-nobody-inspected",
    ... every normal ScenarioDef field ...,
    "binding": {
      "mechanisms": [
        { "reply": "seize-the-manifest", "metric": "standing",
          "because": "the seizure is done on a foreign-flagged hull in open water and every shipper the country trades with will read it as precedent" },
        { "reply": "seize-the-manifest", "metric": "treasury",
          "because": "the berth is closed for the inspection and the port authority is owed for every idle day of it" }
      ]
    }
  }

One entry per reply-and-metric pair, at least 30 characters, naming something the beats, the context or
the reply itself already said. A metric priced with no entry is refused, and an entry for a metric the
reply does not price is refused. A reply that declares an "impact" instead of an authored "cost" owes
nothing here — the impact model prices it, and the fiction is the declaration.

The exemplars below do not show a "binding" object. They are stored as parsed scenarios, which is the
strip working as designed; write yours anyway.

These shipped scenarios are the quality bar. Match their register exactly:
they are in EXEMPLARS.json, beside this brief.
