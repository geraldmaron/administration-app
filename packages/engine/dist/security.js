import { foundingUnifiedCommand } from "./combatant-commands.js";
import { foundingIntelligence } from "./intelligence.js";
import { foundingFindings } from "./findings.js";
import { foundingWarPowersReports } from "./war-powers-report.js";
export function foundingSecurity() {
    return {
        unifiedCommand: foundingUnifiedCommand(),
        intelligence: foundingIntelligence(),
        assessments: [],
        covert: foundingFindings(),
        warPowers: foundingWarPowersReports(),
    };
}
