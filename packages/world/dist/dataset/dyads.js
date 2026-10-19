// The particular relationships the world has, one sourced pair at a time: the
// United States' allies and adversaries, and the rivalries between other
// governments that no formula over their shapes would produce.
//
// The founding graph derives every edge from the two countries' shapes, which
// gets the average pair about right and the pairs a player recognizes wrong.
// These rows are the exceptions, and they are data rather than rules for exactly
// that reason: there is no formula under which Washington and London come out
// close and Washington and Havana come out distant.
//
// `since` is the year the relationship took its current shape, `source` is the
// page the row was read from, and `opened` is the day it was read. The table is
// `seed/dyads.tsv`, cell for cell, and that file carries what each source says;
// a row enters only once its source has been opened.
const row = (pair, kind, intensity, since, source, opened, trust, tension, threat) => ({ pair, kind, intensity, since, source, opened, levels: { trust, tension, threat } });
const THREAT_ASSESSMENT_2026 = "https://archive.dni.gov/files/ODNI/documents/assessments/ATA-2026-Unclassified-Report.pdf";
export const FOUNDING_DYADS = [
    { pair: ["CHN", "USA"], kind: "rivalrous", intensity: 0.5, since: 2018, source: THREAT_ASSESSMENT_2026, opened: "2026-09-28" },
    {
        pair: ["CUB", "USA"],
        kind: "hostile",
        intensity: 0.7,
        since: 1961,
        source: "https://www.presidency.ucsb.edu/documents/executive-order-14380-addressing-threats-the-united-states-the-government-cuba",
        opened: "2026-09-28",
    },
    {
        pair: ["IRN", "USA"],
        kind: "hostile",
        intensity: 0.9,
        since: 1979,
        source: "https://www.globalsecurity.org/military/ops/iran-war-oprep.htm",
        opened: "2026-09-28",
    },
    { pair: ["PRK", "USA"], kind: "hostile", intensity: 0.7, since: 1950, source: THREAT_ASSESSMENT_2026, opened: "2026-09-28" },
    { pair: ["RUS", "USA"], kind: "hostile", intensity: 0.7, since: 2022, source: THREAT_ASSESSMENT_2026, opened: "2026-09-28" },
    // The sourced pairs beyond the United States' five adversaries, each at the levels its row sets.
    row(["AFG", "PAK"], "hostile", 0.5, 2025, "https://www.aa.com.tr/en/asia-pacific/timeline-how-pakistan-afghanistan-tensions-reached-a-breaking-point/3842132", "2026-09-24", [-0.6, -0.4], 0.9, [0.8, 0.6]),
    row(["ARE", "USA"], "close", 0.57, 2020, "https://www.timesofisrael.com/full-text-of-the-abraham-accords-signed-by-israel-the-uae-and-bahrain/", "2026-09-24", [0.55, 0.6], 0.2, [0.15, 0.05]),
    row(["ARM", "AZE"], "hostile", 0.4, 2023, "https://www.cfr.org/global-conflict-tracker/conflict/nagorno-karabakh-conflict", "2026-09-24", [-0.3, -0.5], 0.75, [0.6, 0.5]),
    row(["AUS", "USA"], "close", 0.8, 1951, "https://avalon.law.yale.edu/20th_century/usmu002.asp", "2026-09-24", [0.8, 0.8], 0.1, [0.05, 0.05]),
    row(["BRA", "USA"], "close", 0.45, 1947, "https://www.oas.org/juridico/english/sigs/b-29.html", "2026-09-24", [0.4, 0.5], 0.15, [0.05, 0.05]),
    row(["CAN", "USA"], "close", 0.7, 1949, "https://www.nato.int/cps/en/natolive/official_texts_17120.htm", "2026-09-24", [0.65, 0.75], 0.2, [0.05, 0.05]),
    row(["DEU", "USA"], "close", 0.72, 1955, "https://www.nato.int/cps/en/natolive/official_texts_17120.htm", "2026-09-24", [0.7, 0.75], 0.1, [0.05, 0.05]),
    row(["DNK", "USA"], "close", 0.68, 2026, "https://www.whitehouse.gov/briefings-statements/2026/09/agreement-between-the-government-of-the-united-states-of-america-and-the-government-of-the-kingdom-of-denmark-together-with-the-government-of-greenland-to-amend-and-supplement-the-agreement-of-27-apri/", "2026-09-24", [0.65, 0.7], 0.25, [0.05, 0.05]),
    row(["FRA", "USA"], "close", 0.75, 1949, "https://www.nato.int/cps/en/natolive/official_texts_17120.htm", "2026-09-24", [0.75, 0.75], 0.1, [0.05, 0.05]),
    row(["GBR", "USA"], "close", 0.85, 1949, "https://www.nato.int/cps/en/natolive/official_texts_17120.htm", "2026-09-24", [0.85, 0.85], 0.05, [0.05, 0.05]),
    row(["GUY", "VEN"], "hostile", 0.55, 2018, "https://www.icj-cij.org/case/171", "2026-09-24", [-0.6, -0.5], 0.7, [0.6, 0.1]),
    row(["IND", "PAK"], "hostile", 0.5, 2025, "https://en.wikipedia.org/wiki/2025_India%E2%80%93Pakistan_conflict", "2026-09-29", [-0.5, -0.5], 0.85, [0.7, 0.7]),
    row(["IRN", "ISR"], "hostile", 0.93, 2026, "https://www.globalsecurity.org/military/ops/iran-war-oprep.htm", "2026-09-24", [-0.95, -0.9], 0.95, [0.9, 0.9]),
    row(["ISR", "LBN"], "hostile", 0.4, 2026, "https://en.wikipedia.org/wiki/2026_Israel%E2%80%93Lebanon_ceasefire", "2026-09-24", [-0.3, -0.5], 0.8, [0.3, 0.6]),
    row(["ITA", "USA"], "close", 0.75, 1949, "https://www.nato.int/cps/en/natolive/official_texts_17120.htm", "2026-09-24", [0.75, 0.75], 0.1, [0.05, 0.05]),
    row(["JPN", "USA"], "close", 0.78, 1960, "https://treaties.un.org/doc/Publication/UNTS/Volume%20373/volume-373-I-5321-English.pdf", "2026-09-24", [0.75, 0.8], 0.2, [0.15, 0.1]),
    row(["KOR", "USA"], "close", 0.78, 1953, "https://avalon.law.yale.edu/20th_century/kor001.asp", "2026-09-24", [0.75, 0.8], 0.3, [0.15, 0.15]),
    row(["MEX", "USA"], "close", 0.5, 2020, "https://ustr.gov/trade-agreements/free-trade-agreements/united-states-mexico-canada-agreement", "2026-09-24", [0.45, 0.55], 0.3, [0.1, 0.05]),
    row(["NZL", "USA"], "close", 0.6, 1986, "https://avalon.law.yale.edu/20th_century/usmu002.asp", "2026-09-24", [0.6, 0.6], 0.1, [0.05, 0.05]),
    row(["PAK", "SAU"], "close", 0.6, 2025, "https://en.wikipedia.org/wiki/Strategic_Mutual_Defence_Agreement", "2026-09-24", [0.6, 0.6], 0.1, [0.05, 0.05]),
    row(["PAN", "USA"], "close", 0.38, 1977, "https://history.state.gov/milestones/1977-1980/panama-canal", "2026-09-24", [0.35, 0.4], 0.45, [0.35, 0.05]),
    row(["PHL", "USA"], "close", 0.68, 1951, "https://avalon.law.yale.edu/20th_century/phil001.asp", "2026-09-24", [0.7, 0.65], 0.35, [0.35, 0.15]),
    row(["POL", "USA"], "close", 0.78, 1999, "https://www.nato.int/cps/en/natolive/official_texts_17120.htm", "2026-09-24", [0.8, 0.75], 0.15, [0.05, 0.05]),
    row(["RUS", "UKR"], "hostile", 0.8, 2022, "https://www.cfr.org/global-conflict-tracker/conflict/conflict-ukraine", "2026-09-24", [-0.7, -0.9], 0.95, [0.3, 0.95]),
    row(["SAU", "USA"], "close", 0.53, 2025, "https://www.globalsecurity.org/wmd/library/news/saudi/2025/saudi-251118-whitehouse01.htm", "2026-09-24", [0.5, 0.55], 0.35, [0.35, 0.05]),
    row(["SRB", "XKX"], "hostile", 0.55, 2008, "https://www.eeas.europa.eu/eeas/belgrade-pristina-dialogue_en", "2026-09-24", [-0.5, -0.6], 0.6, [0.3, 0.4]),
    row(["TUR", "USA"], "close", 0.38, 1952, "https://www.nato.int/cps/en/natolive/official_texts_17120.htm", "2026-09-24", [0.35, 0.4], 0.35, [0.15, 0.15]),
    row(["TWN", "USA"], "close", 0.68, 1979, "https://www.law.cornell.edu/uscode/text/22/3301", "2026-09-24", [0.7, 0.65], 0.55, [0.75, 0.05]),
    row(["USA", "VEN"], "cool", 0.07, 2026, "https://en.wikipedia.org/wiki/2026_United_States_intervention_in_Venezuela", "2026-09-28", [0.15, 0], 0.6, [0.05, 0.7]),
];
