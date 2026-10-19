export const COLLECTION_FOCUS_QUESTIONS = {
    overview: "What does current collection show across this government's activities and conditions?",
    "external-intent": "What does current collection show about this government's external intentions and actions?",
    "force-posture": "What does current collection show about this government's forces and readiness?",
    "economic-pressure": "What does current collection show about this government's economic pressure?",
    "domestic-public-conditions": "What do public state records show about current conditions and governor requests?",
};
export const COLLECTION_FOCUS_LABELS = {
    overview: "General reporting",
    "external-intent": "External intentions and actions",
    "force-posture": "Forces and readiness",
    "economic-pressure": "Economic pressure",
    "domestic-public-conditions": "Public state conditions",
};
export const DISCIPLINE_TOPICS = {
    humint: ["external-intent", "stability"], sigint: ["external-intent", "military-readiness"],
    geoint: ["military-readiness"], masint: ["military-readiness"],
    osint: ["stability", "financial-pressure"], finint: ["financial-pressure"],
    "all-source": ["external-intent", "military-readiness", "financial-pressure", "stability"],
};
const FOCUS_TOPICS = {
    overview: ["external-intent", "military-readiness", "financial-pressure", "stability"],
    "external-intent": ["external-intent"],
    "force-posture": ["military-readiness"],
    "economic-pressure": ["financial-pressure"],
    "domestic-public-conditions": ["domestic-security"],
};
export function collectionTopics(discipline, focus, kind) {
    if (kind === "domestic-state")
        return focus === undefined || focus === "domestic-public-conditions" ? ["domestic-security"] : [];
    const available = DISCIPLINE_TOPICS[discipline];
    return focus === undefined ? available : FOCUS_TOPICS[focus].filter((topic) => available.includes(topic));
}
export function collectionFocusUnavailable(discipline, focus, kind) {
    if (focus === undefined)
        return undefined; // Existing saves and callers remain general reporting.
    if (kind === "domestic-state")
        return focus === "domestic-public-conditions" ? undefined : "Choose public state conditions for a domestic-state tasking.";
    if (focus === "domestic-public-conditions")
        return "Public state conditions can be tasked only against a state through DHS I&A open sources.";
    if (collectionTopics(discipline, focus, kind).length === 0)
        return `${discipline.toUpperCase()} cannot obtain ${COLLECTION_FOCUS_LABELS[focus].toLowerCase()} through this desk. Choose a compatible discipline or focus.`;
    return undefined;
}
