import { Plank } from "../schemas/platform.js";
/**
 * The planks a US platform can be built from.
 *
 * Parsed at load, the same way the charter is, so a malformed plank fails the
 * build rather than reaching a founding screen.
 *
 * Ten, split evenly between the two parties' usual ground, so either ticket
 * can build a platform of its own without borrowing the other's. Six are
 * economic and four are not. The engine owns what each one commits the
 * administration to; this table owns only what a player reads and who each
 * plank is written for. A plank courts cohorts whose own politics lean the way
 * its program pushes, which the engine's tests check against that program, so
 * a plank never courts the people its own program is against.
 */
export const platformPlanks = Plank.array().parse([
    {
        id: "plank-balanced-budget",
        title: "Balance the budget",
        summary: "Cut federal spending on a fixed schedule until the deficit closes. The programs people use shrink first, and the savings go to paying down the debt.",
        courts: ["income-affluent", "professional-technical", "suburban"],
    },
    {
        id: "plank-rebuild-infrastructure",
        title: "Rebuild roads, rail and the power grid",
        summary: "Borrow now for a decade of highway, rail and grid work, spent through the states. It puts builders to work this year and pays itself back slowly, if at all.",
        courts: ["goods-producing", "frontline-services", "urban"],
    },
    {
        id: "plank-fair-share",
        title: "Make the wealthiest pay their share",
        summary: "Raise what the highest earners and the largest companies pay, and send it to working households. Families feel it within a few months, and so do the people asked to pay for it.",
        courts: ["income-struggling", "frontline-services", "age-under-35"],
    },
    {
        id: "plank-energy-dominance",
        title: "Unleash American energy",
        summary: "Open federal land and water to drilling and mining, and approve the pipelines that move what comes out. Fuel gets cheaper at home, and the fight over what it leaves behind starts at once.",
        courts: ["rural", "age-65-plus", "income-affluent"],
    },
    {
        id: "plank-clean-energy",
        title: "Build the clean energy economy",
        summary: "Move federal money out of oil, gas and coal and into wind, solar, batteries and the lines that carry them. It costs more up front and takes years to pay off.",
        courts: ["age-under-35", "urban", "degree"],
    },
    {
        id: "plank-fair-trade",
        title: "Protect American jobs from unfair trade",
        summary: "Put tariffs on countries that dump cheap goods or copy American technology, and bring factory work home. Prices at the store go up, and the countries on the other end hit back.",
        courts: ["goods-producing", "no-degree", "rural"],
    },
    {
        id: "plank-secure-border",
        title: "Secure the border",
        summary: "Order more agents and more checks at every port of entry, on the President's own signature. It can be done in the first week, and it can be taken to court just as fast.",
        courts: ["rural", "age-65-plus", "no-degree"],
    },
    {
        id: "plank-rebuild-military",
        title: "Rebuild the military",
        summary: "Speed up weapons buying across every branch and bring units back to full readiness. It is expensive, and every rival capital reads the orders.",
        courts: ["public-and-uniformed", "rural", "goods-producing"],
    },
    {
        id: "plank-reform-policing",
        title: "Reform policing",
        summary: "Put more officers on foot patrol and fewer behind desks, and make departments answer to the neighborhoods they police. It costs money and takes years to show.",
        courts: ["urban", "age-under-35", "frontline-services"],
    },
    {
        id: "plank-open-government",
        title: "Defend a free press and open government",
        summary: "Write protections for reporters into law, open the government's files, and stop treating peaceful protest as a police matter. Allies admire it, and it is loud at home.",
        courts: ["degree", "age-under-35", "professional-technical"],
    },
]);
export const plankById = new Map(platformPlanks.map((plank) => [plank.id, plank]));
