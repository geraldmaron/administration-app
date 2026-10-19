import { selectDateOfTurn, selectPerson } from "@admin/engine";
import { charterOf } from "../campaign/founding-options.js";
import { formatDate } from "../format/figures.js";
import { judgeAttribute } from "../government/machine-readings.js";
import { whiteHouseSeatOf } from "../government/machine-white-house.js";
import { assessmentProfile } from "./assessment-profile.js";
import { currentAge } from "./person-age.js";
import { personDossier } from "./person-dossier.js";
import { circleOrder, connectionsForPerson } from "./person-network.js";
const CAREER_LABEL = {
    "civil-service": "Civil service",
    "military-command": "Military command",
    "intelligence-service": "Intelligence service",
    "diplomatic-corps": "Diplomatic corps",
    "private-law": "Private law practice",
    business: "Business",
    academia: "Academic life",
    "party-organizing": "Party organizing",
    "local-government": "Local government",
    "state-media": "State media",
    "independent-press": "Independent press",
    activism: "Activism",
    medicine: "Medicine",
    "labor-union": "Labor union",
    judiciary: "Judge",
};
const PRESSURE_BAND = { "Below the danger point": 1, "Near the danger point": 2, "Past the danger point": 3 };
function roleLine(standing) {
    switch (standing.kind) {
        case "president":
            return "President of the United States";
        case "cabinet":
        case "agency":
            return standing.title;
        case "justice":
            return standing.chief ? "Chief Justice of the United States" : "Associate Justice of the Supreme Court";
        case "hill":
            return `${standing.title}, ${standing.chamber}`;
        case "mayor":
            return `Mayor of ${standing.cityName}`;
        case "governor":
            return `Governor of ${standing.stateName}`;
        case "foreign-leader":
            return `${standing.title ?? "Head of government"}, ${standing.nationName}`;
        case "foreign":
            return `A national of ${standing.nationName}`;
        case "former":
            return `Former ${standing.title}, ${standing.departure}`;
        case "deceased":
            return "Deceased";
        case "available":
            return "Holds no office";
    }
}
function cameraOf(campaign, standing, person) {
    switch (standing.kind) {
        case "cabinet":
            return standing.institution ? `office:${standing.institution.id}` : "dc";
        case "agency":
            return `office:${standing.institution.id}`;
        case "mayor":
            return standing.state ? `state:${standing.state}` : "dc";
        case "governor":
            return `state:${standing.state}`;
        case "foreign-leader":
        case "foreign":
            return `nation:${standing.nation}`;
        default:
            return whiteHouseSeatOf(campaign, person.id) || standing.kind === "president" ? "office:INST-PRESIDENCY" : "dc";
    }
}
function readingsOf(campaign, person, dossier, role) {
    const subject = dossier.standing.kind;
    const profile = assessmentProfile(person, { subject, ...(role ? { role } : {}), titles: charterOf(campaign).roleTitles });
    const calls = dossier.counsel.length;
    const readings = profile.readings.map((reading) => {
        if (reading.kind === "pressure")
            return { ...reading, band: PRESSURE_BAND[reading.word] ?? 1 };
        const judgment = judgeAttribute(reading.key, reading.value, calls);
        const moved = reading.key === "loyalty" ? dossier.loyaltyTrend?.movedPoints : undefined;
        return {
            ...reading,
            band: judgment.band,
            confidence: judgment.confidence,
            basis: judgment.basis,
            ...(moved !== undefined && moved !== 0
                ? { trend: moved > 0 ? "rising" : "falling", trendText: moved > 0 ? "Warmer since you appointed them" : "Cooler since you appointed them" }
                : {}),
        };
    });
    return { readings, ...(profile.watch ? { watch: profile.watch } : {}) };
}
/** Their working life before this administration, then what the Record says they did in it, oldest first. */
function careerOf(campaign, person, dossier) {
    const before = person.career.map((post, index) => ({
        key: `career:${index}`,
        when: `Age ${post.startAge} to ${post.startAge + post.years}`,
        text: CAREER_LABEL[post.archetype],
    }));
    const entries = [...dossier.counsel.map((row) => row.entry), ...dossier.namedIn].filter((entry) => entry.causal);
    const during = [...new Set(entries)]
        .sort((a, b) => a.turn - b.turn)
        .map((entry) => ({
        key: `record:${entry.causal.eventId}`,
        when: formatDate(entry.causal.createdDate ?? selectDateOfTurn(campaign, entry.turn)),
        text: entry.description,
        eventId: entry.causal.eventId,
    }));
    return [...before, ...during];
}
function seatOf(standing) {
    if (standing.kind === "cabinet")
        return { kind: "cabinet", role: standing.role, title: standing.title };
    if (standing.kind === "agency") {
        return { kind: "officer", institution: standing.institution.id, title: standing.title, body: standing.institution.name, removal: standing.removal };
    }
    return undefined;
}
/** A person's whole file, or undefined for an id this campaign does not know. */
export function personFile(campaign, personId) {
    const runtime = selectPerson(campaign, personId);
    const dossier = personDossier(campaign, personId);
    if (!runtime || !dossier)
        return undefined;
    const person = runtime.base;
    const role = dossier.standing.kind === "cabinet" ? dossier.standing.role : whiteHouseSeatOf(campaign, personId)?.role;
    const { readings, watch } = readingsOf(campaign, person, dossier, role);
    const seat = seatOf(dossier.standing);
    return {
        person,
        age: currentAge(person, campaign),
        dossier,
        role: whiteHouseSeatOf(campaign, personId)?.title ?? roleLine(dossier.standing),
        camera: cameraOf(campaign, dossier.standing, person),
        readings,
        ...(watch ? { watch } : {}),
        career: careerOf(campaign, person, dossier),
        circle: circleOrder(connectionsForPerson(campaign, person.id)),
        ...(seat ? { seat } : {}),
    };
}
