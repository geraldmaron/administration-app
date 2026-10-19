import { LeaderBackground, LeaderRoute, } from "../schemas/leader.js";
// The lives a player can have led before the first turn, and the routes by
// which such a life reaches the nomination.
//
// Every number here is a claim about what an American career leaves behind,
// and the claims are meant to argue with each other: the cabinet secretary is
// the most capable and the least magnetic, the executive the most ambitious and
// the least trusted, the mayor the most liked and the least prepared. No
// background dominates another on every reading, which is the whole reason this
// is a choice rather than a slider.
//
// Each background and each route also buys exactly one thing on the first
// morning, through a writer the engine already has (founding-leader-hooks.ts in
// the engine names it). The prose below promises that thing and the readings,
// and nothing else: a card that sells a mechanic the game does not run is the
// founding screen lying on the one page the player reads most closely.
const BACKGROUND_INPUTS = [
    {
        id: "path-senator",
        name: "U.S. Senator",
        kicker: "Twelve years counting to fifty-one",
        rationale: "The Senate teaches the votes that confirm a cabinet and ratify a treaty, and its leaders open the term warmer toward one of their own. It teaches speeches before it teaches management.",
        base: { competence: 0.62, loyalty: 0.5, ambition: 0.72, integrity: 0.54, charisma: 0.66 },
        anchorTrait: "ambitious",
        ageRange: { min: 45, max: 78 },
        careerLine: "Served two terms in the United States Senate for their home state, and learned exactly how many votes a promise is worth.",
        formation: { archetype: "party-organizing", field: "law", postgraduate: true, startAge: 27 },
    },
    {
        id: "path-house",
        name: "House Member",
        kicker: "A decade of two-year terms",
        rationale: "Every other November on the ballot builds a feel for what a district will forgive, and the House leadership opens the term warmer toward a former member. It builds nothing in running a department.",
        base: { competence: 0.56, loyalty: 0.62, ambition: 0.66, integrity: 0.52, charisma: 0.64 },
        anchorTrait: "pragmatic",
        ageRange: { min: 38, max: 74 },
        careerLine: "Won a House seat at thirty-something and held it through five elections, and never stopped reading the district first.",
        formation: { archetype: "party-organizing", field: "public-administration", postgraduate: false, startAge: 26 },
    },
    {
        id: "path-governor",
        name: "Governor",
        kicker: "Ran a state first",
        rationale: "The one background that has already run a government, at a size small enough to forgive the mistakes. The statehouse back home opens the term warmer toward you.",
        base: { competence: 0.66, loyalty: 0.54, ambition: 0.66, integrity: 0.52, charisma: 0.68 },
        anchorTrait: "charismatic",
        ageRange: { min: 42, max: 74 },
        careerLine: "Governed their home state for two terms, close enough to the ground to be blamed personally for a bad winter.",
        formation: { archetype: "local-government", field: "law", postgraduate: true, startAge: 27 },
    },
    {
        id: "path-vice-president",
        name: "Vice President",
        kicker: "Eight years a heartbeat away",
        rationale: "You have sat in the rooms this office sits in and met the leaders it has to deal with, so the world opens the term already knowing you. Loyalty to someone else's program is the habit it leaves.",
        base: { competence: 0.64, loyalty: 0.68, ambition: 0.6, integrity: 0.56, charisma: 0.58 },
        anchorTrait: "loyal",
        ageRange: { min: 50, max: 78 },
        careerLine: "Served as Vice President under the last administration of their party, and spent those years in the rooms where the decisions were made.",
        formation: { archetype: "party-organizing", field: "law", postgraduate: true, startAge: 27 },
    },
    {
        id: "path-general",
        name: "General",
        kicker: "Four stars before politics",
        rationale: "Command builds discipline and a chain of people who will follow an order, and the services open the term ready for one of their own. It does not build a talent for persuasion.",
        base: { competence: 0.66, loyalty: 0.74, ambition: 0.54, integrity: 0.6, charisma: 0.46 },
        anchorTrait: "hawkish",
        ageRange: { min: 55, max: 76 },
        careerLine: "Rose through the Army to four stars and a combatant command, and came to politics still counting risk the way the war college taught it.",
        formation: { archetype: "military-command", field: "military-science", postgraduate: false, startAge: 22 },
    },
    {
        id: "path-business",
        name: "Business Executive",
        kicker: "Ran a company, never a government",
        rationale: "Voters give a chief executive the benefit of the doubt on the economy, so the public opens the term a little more confident in it. Nothing about a boardroom teaches that a cabinet can say no.",
        base: { competence: 0.6, loyalty: 0.42, ambition: 0.78, integrity: 0.4, charisma: 0.64 },
        anchorTrait: "ambitious",
        ageRange: { min: 40, max: 78 },
        careerLine: "Built a company from a regional firm into a household name, and ran for office having never once answered to a legislature.",
        formation: { archetype: "business", field: "economics", postgraduate: true, startAge: 24 },
    },
    {
        id: "path-cabinet",
        name: "Cabinet Secretary",
        kicker: "Ran a department",
        rationale: "Years running a federal department teach how the government actually moves, and the institutions open the term steadier for a President who knows them. They teach nothing about a crowd.",
        base: { competence: 0.74, loyalty: 0.6, ambition: 0.5, integrity: 0.64, charisma: 0.44 },
        anchorTrait: "cautious",
        ageRange: { min: 48, max: 76 },
        careerLine: "Ran one of {nation}'s federal departments for a full term, and learned where every decision in Washington is actually made.",
        formation: { archetype: "civil-service", field: "public-administration", postgraduate: true, startAge: 25 },
    },
    {
        id: "path-mayor",
        name: "Mayor",
        kicker: "Ran a city hall",
        rationale: "A big city is the most personal office in American politics, and your hometown opens the term leaning your way. Potholes and budgets are not wars and treaties.",
        base: { competence: 0.54, loyalty: 0.58, ambition: 0.7, integrity: 0.58, charisma: 0.74 },
        anchorTrait: "pragmatic",
        ageRange: { min: 38, max: 70 },
        careerLine: "Ran the city they grew up in for two terms, and learned that people forgive almost anything except a pothole.",
        formation: { archetype: "local-government", field: "public-administration", postgraduate: false, startAge: 24 },
    },
];
// How the career won the nomination. The general election is a separate
// question: the mandate the President carried in is chosen on its own
// (`FoundingMandate`), so no route here claims a popular vote.
const ROUTE_INPUTS = [
    {
        id: "route-primaries",
        name: "Won the primaries",
        kicker: "The voters chose you before the party did",
        rationale: "You carried the primaries state by state, and the members who won their own primaries on the same ballots open the term warmer toward you. Nothing about a primary taught you to govern.",
        shift: { competence: 0, loyalty: 0.02, ambition: 0.04, integrity: 0.02, charisma: 0.06 },
        arrivalLine: "Won the nomination in the primaries, state by state, before the party's leaders had settled on anyone.",
    },
    {
        id: "route-convention",
        name: "Nominated on the floor",
        kicker: "The party settled on you, ballot after ballot",
        rationale: "A deadlocked convention picks the name nobody can object to, which means you can count votes and hold a room, and the Hill opens the term a little more willing to work with you. The deals that broke the deadlock cost you some of your integrity.",
        shift: { competence: 0.05, loyalty: -0.05, ambition: 0.02, integrity: -0.08, charisma: -0.02 },
        anchorTrait: "pragmatic",
        arrivalLine: "Came out of a deadlocked convention as the name nobody could object to, and remembers who broke the deadlock.",
    },
    {
        id: "route-insurgent",
        name: "Beat the party's leaders",
        kicker: "Won the nomination against your own side",
        rationale: "You took the nomination from the candidate your party's leaders wanted, which is a talent for a crowd and a debt to nobody. Your own side's leaders in Congress open the term cooler toward you.",
        shift: { competence: -0.02, loyalty: -0.04, ambition: 0.06, integrity: 0.02, charisma: 0.08 },
        arrivalLine: "Took the nomination from the candidate the party's own leaders had chosen, and has not been forgiven for it.",
    },
];
export const leaderBackgrounds = BACKGROUND_INPUTS.map((input) => LeaderBackground.parse(input));
export const leaderRoutes = ROUTE_INPUTS.map((input) => LeaderRoute.parse(input));
export const leaderBackgroundById = new Map(leaderBackgrounds.map((background) => [background.id, background]));
export const leaderRouteById = new Map(leaderRoutes.map((route) => [route.id, route]));
/** The background and route a founding opens on, before the player has chosen. */
export const DEFAULT_LEADER_BACKGROUND = leaderBackgrounds[0].id;
export const DEFAULT_LEADER_ROUTE = leaderRoutes[0].id;
