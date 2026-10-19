import { capitalize } from "./article-desk.js";
import { possessive } from "./naming.js";
// The operator desk. An operator crisis is filed with a host country and a
// headline and nothing else: no figure, no official, no source. The banks this
// replaces wrote four paragraphs of invented reporting over that — three
// ministries contacted, manifests listing construction equipment, finance hubs
// in two capitals — which is exactly the fabricated particular the register
// forbids. What the desk can say truthfully is what the engine models: what an
// operator of this kind costs its host every week it runs (operators.ts,
// crisisEffects), and that diplomacy cannot reach it while a short list of
// instruments can (OPERATOR_PROFILES' answerableWith).
export function operatorThemeFromHeadline(headline) {
    const lower = headline.toLowerCase();
    if (/\b(smuggl|drugs and guns|ports can search|traffick)\b/.test(lower))
        return "network";
    if (/\b(armed rebels|turned down every offer of talks|hold ground)\b/.test(lower))
        return "insurgency";
    if (/\b(hackers?|computer systems|broken into)\b/.test(lower))
        return "cyber";
    if (/\b(hired army|jobs nobody will admit|private military)\b/.test(lower))
        return "pmc";
    if (/\b(traders?|betting|currency|central bank|pound|exchange rate|market)\b/.test(lower))
        return "market";
    return "generic";
}
const THEMES = {
    network: {
        label: "A trafficking network",
        lede: (place) => `${capitalize(place)} has a smuggling network moving through it that its ports cannot keep up with.`,
        cost: (place) => `Every week it runs, crime in ${place} rises.`,
        tools: "covert action, economic pressure or force",
    },
    insurgency: {
        label: "An insurgency",
        lede: (place) => `${capitalize(place)} has lost ground to rebels who will not negotiate.`,
        cost: (place) => `Every week they hold it, ${possessive(place)} government is less secure.`,
        tools: "force, covert action or economic pressure",
    },
    cyber: {
        label: "An intrusion crew",
        lede: (place) => `A hacking crew working out of ${place} has broken into systems it should not be able to reach.`,
        cost: (place) => `Every week it goes on, ${possessive(place)} counterintelligence is weaker.`,
        tools: "covert action or economic pressure",
    },
    pmc: {
        label: "A private army",
        lede: (place) => `A private army registered in ${place} is working for clients nobody has named.`,
        cost: (place) => `It costs ${possessive(place)} government legitimacy with its own people.`,
        tools: "force, covert action or economic pressure",
    },
    market: {
        label: "A run on the currency",
        lede: (place) => `Traders have turned on ${possessive(place)} currency.`,
        cost: (place) => `Every week the bet holds, prices in ${place} climb faster.`,
        tools: "economic pressure or covert action",
    },
    generic: {
        label: "A group outside any government's control",
        lede: (place) => `A group outside any government's control is operating in ${place}.`,
        cost: (place) => `What it costs ${place} has not been reported.`,
        tools: "covert action or economic pressure",
    },
};
/** The piece: what it is, what it costs the host, and what can reach it. Nothing when the item named no host. */
export function operatorParagraphs(desk) {
    const place = desk.target;
    if (!place)
        return undefined;
    const theme = THEMES[desk.operatorTheme];
    return [theme.lede(place), theme.cost(place), `There is nobody to negotiate with. What reaches it is ${theme.tools}.`];
}
export function operatorStandfirst(desk) {
    const place = desk.target;
    if (!place)
        return undefined;
    return `${THEMES[desk.operatorTheme].label} in ${place}, what it costs the country, and what can reach it.`;
}
export function operatorRelevance(reader, desk) {
    const place = desk.target;
    if (!place)
        return undefined;
    const theme = THEMES[desk.operatorTheme];
    if (desk.aimedAtPlayer)
        return `This is inside ${place}, and it costs the country's stability every week it runs.`;
    return `${reader} is not the target. Diplomacy cannot reach it; ${theme.tools} can, if the President chooses to use them.`;
}
