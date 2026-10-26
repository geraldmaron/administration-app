import { Cradle, Organization } from "../schemas/org-cradle-charter.js";
import { ALGERIA_ID, ARGENTINA_ID, AUSTRALIA_ID, BELARUS_ID, BELGIUM_ID, BRAZIL_ID, CANADA_ID, CHILE_ID, CHINA_ID, CUBA_ID, DENMARK_ID, DR_CONGO_ID, EGYPT_ID, ETHIOPIA_ID, FRANCE_ID, GERMANY_ID, HUNGARY_ID, ICELAND_ID, INDIA_ID, INDONESIA_ID, IRAN_ID, IRAQ_ID, IRELAND_ID, ITALY_ID, JAPAN_ID, KAZAKHSTAN_ID, MALAYSIA_ID, MEXICO_ID, MOROCCO_ID, NETHERLANDS_ID, NIGERIA_ID, NORWAY_ID, PAKISTAN_ID, PHILIPPINES_ID, POLAND_ID, QATAR_ID, RUSSIA_ID, SAUDI_ID, SINGAPORE_ID, SOUTH_AFRICA_ID, SOUTH_KOREA_ID, SPAIN_ID, SWEDEN_ID, THAILAND_ID, TURKEY_ID, UAE_ID, UK_ID, US_ID, VENEZUELA_ID, VIETNAM_ID } from "./nations.js";
// The single homeland cradle. Founding is taking office, not placing an
// island, but the founding contract still takes a cradle — so the one cradle
// pins the campaign to the United States' real geography and neighbors, and
// `applyCradleToNation` is an identity for the shipped flow.
export const CRADLE_POTOMAC = "CRADLE-POTOMAC";
export const ORG_NATO = "ORG-NATO";
export const ORG_EU = "ORG-EU";
export const ORG_CSTO = "ORG-CSTO";
export const ORG_BRICS = "ORG-BRICS";
export const ORG_GCC = "ORG-GCC";
export const ORG_AU = "ORG-AU";
export const ORG_CPTPP = "ORG-CPTPP";
export const ORG_MERCOSUR = "ORG-MERCOSUR";
export const ORG_OPEC_PLUS = "ORG-OPEC-PLUS";
export const ORG_G7 = "ORG-G7";
export const ORG_ASEAN = "ORG-ASEAN";
export const ORG_US_JAPAN = "ORG-US-JAPAN";
export const ORG_US_KOREA = "ORG-US-KOREA";
export const ORG_US_PHILIPPINES = "ORG-US-PHILIPPINES";
export const ORG_ANZUS = "ORG-ANZUS";
export const ORG_SCO = "ORG-SCO";
export const ORG_UNSC = "ORG-UNSC";
const PACIFIC_AREA = ["region-east-asia", "region-southeast-asia", "region-oceania"];
const JAPAN_TREATY = "https://treaties.un.org/doc/Publication/UNTS/Volume%20373/volume-373-I-5321-English.pdf";
const KOREA_TREATY = "https://avalon.law.yale.edu/20th_century/kor001.asp";
const PHILIPPINES_TREATY = "https://avalon.law.yale.edu/20th_century/phil001.asp";
const ANZUS_TREATY = "https://avalon.law.yale.edu/20th_century/usmu002.asp";
const UN_CHARTER_VOTING = "https://www.un.org/en/about-us/un-charter/chapter-5";
const NORTH_ATLANTIC_TREATY = "https://www.nato.int/cps/en/natolive/official_texts_17120.htm";
export const ORGANIZATION_SOURCES = {
    [ORG_NATO]: { source: "https://www.nato.int/cps/en/natohq/topics_52044.htm", asOf: "2026-09-28" },
    [ORG_EU]: { source: "https://european-union.europa.eu/principles-countries-history/eu-countries_en", asOf: "2026-09-28" },
    [ORG_CSTO]: { source: "https://en.wikipedia.org/wiki/Collective_Security_Treaty_Organization", asOf: "2026-09-28" },
    [ORG_BRICS]: { source: "https://en.wikipedia.org/wiki/BRICS", asOf: "2026-09-28" },
    [ORG_GCC]: { source: "https://en.wikipedia.org/wiki/Gulf_Cooperation_Council", asOf: "2026-09-28" },
    [ORG_AU]: { source: "https://au.int/en/member_states/countryprofiles2", asOf: "2026-09-28" },
    [ORG_CPTPP]: { source: "https://en.wikipedia.org/wiki/Comprehensive_and_Progressive_Agreement_for_Trans-Pacific_Partnership", asOf: "2026-09-28" },
    [ORG_ASEAN]: { source: "https://en.wikipedia.org/wiki/ASEAN", asOf: "2026-09-28" },
    [ORG_MERCOSUR]: { source: "https://en.wikipedia.org/wiki/Mercosur", asOf: "2026-09-28" },
    [ORG_OPEC_PLUS]: { source: "https://en.wikipedia.org/wiki/OPEC%2B", asOf: "2026-09-28" },
    [ORG_G7]: { source: "https://en.wikipedia.org/wiki/G7", asOf: "2026-09-28" },
    [ORG_US_JAPAN]: { source: JAPAN_TREATY, asOf: "2026-09-24" },
    [ORG_US_KOREA]: { source: KOREA_TREATY, asOf: "2026-09-24" },
    [ORG_US_PHILIPPINES]: { source: PHILIPPINES_TREATY, asOf: "2026-09-24" },
    [ORG_ANZUS]: { source: ANZUS_TREATY, asOf: "2026-09-24" },
    [ORG_SCO]: { source: "https://eng.sectsco.org/20170109/192193.html", asOf: "2026-10-25" },
    [ORG_UNSC]: { source: "https://main.un.org/securitycouncil/en/content/current-members", asOf: "2026-10-25" },
};
/** Roster governments the dataset names by code rather than by a constant of their own. */
const roster = (codes) => codes.split(" ").map((code) => code);
// Real institutions, gameplay shape. The roster is every recognized
// government, so a membership list is the body's real full membership (as of
// 2026, cross-checked against Wikidata's current member-of statements); an
// observer, associate or partner is not a member. `conflictsWith` encodes the game's exclusivity rules (a strategic
// premise, not a legal fact about the real institution). Joinability now
// reads from the one homeland cradle: bodies the United States could
// plausibly seek or hold membership in from home list [CRADLE_POTOMAC],
// regional bodies it can never join from home carry an empty list
// (invitation-only — no founding reaches them), and the global clubs
// (BRICS, OPEC+) omit `requiresCradle` and are reachable from anywhere.
export const organizations = [
    Organization.parse({
        id: ORG_NATO,
        kind: "defense",
        name: "NATO",
        history: "NATO was founded in 1949 by the Washington Treaty: an armed attack on one member is treated as an attack on all. That mutual-defense promise is not a customs union and not a talking shop — it is a standing security guarantee. The United States is a founding member; for a US president the alliance turns a strike on a European or Atlantic partner into a shared obligation before any shot is fired.",
        members: [
            US_ID, UK_ID, FRANCE_ID, GERMANY_ID, ITALY_ID, SPAIN_ID, POLAND_ID, CANADA_ID, TURKEY_ID, HUNGARY_ID, SWEDEN_ID, NETHERLANDS_ID, BELGIUM_ID, NORWAY_ID, DENMARK_ID, ICELAND_ID,
            ...roster("ALB BGR HRV CZE EST FIN GRC LVA LTU LUX MNE MKD PRT ROU SVK SVN"),
        ],
        // A mutual-defense guarantee cannot coexist with one aimed the other way,
        // and BRICS's whole premise is sitting outside this order.
        conflictsWith: [ORG_CSTO, ORG_BRICS],
        // The US is a founding member; the alliance is reachable from home.
        requiresCradle: [CRADLE_POTOMAC],
        // Article 6: an attack on a party's territory in Europe or North America,
        // on Turkey's, or on the parties' islands and forces in the North Atlantic.
        defenseScope: { kind: "parties-territory", source: NORTH_ATLANTIC_TREATY },
    }),
    Organization.parse({
        id: ORG_EU,
        kind: "economic",
        name: "European Union",
        history: "The European Union grew from postwar pooling of coal, steel, and later markets into a single market and customs union: members share one external tariff and speak with one commercial voice. It is not a defense pact. The United States is not a member and cannot join from home; for a US president it is the counterpart that sets European tariffs, standards, and sanctions as a bloc, so a bilateral deal with one capital does not move the union's common line.",
        members: [
            GERMANY_ID, FRANCE_ID, ITALY_ID, SPAIN_ID, POLAND_ID, SWEDEN_ID, HUNGARY_ID, NETHERLANDS_ID, BELGIUM_ID, IRELAND_ID, DENMARK_ID,
            ...roster("AUT BGR HRV CYP CZE EST FIN GRC LVA LTU LUX MLT PRT ROU SVK SVN"),
        ],
        // Membership means handing trade policy to the bloc, which no other
        // customs union will accept concurrently.
        conflictsWith: [ORG_MERCOSUR],
        // A regional body the US can never join from home: empty list means
        // invitation-only, same as the G7.
        requiresCradle: [],
        // One external tariff: no member sets its own.
        tradeCompetence: "customs-union",
    }),
    Organization.parse({
        id: ORG_CSTO,
        kind: "defense",
        name: "Collective Security Treaty Organization",
        history: "The Collective Security Treaty Organization took shape in the 1990s and took its name in 2002 as a Russian-led mutual-defense pact: an attack on one is meant to bind the rest. It is NATO's opposite number, not a trade club. The United States is not a member and cannot join from home; for a US president it is the security umbrella over Russia's partners, so a move against one of them can pull the others in.",
        // Armenia is still a signatory but froze its participation in 2024 and
        // has said it will leave; it is not counted under the umbrella.
        members: [RUSSIA_ID, BELARUS_ID, KAZAKHSTAN_ID, ...roster("KGZ TJK")],
        conflictsWith: [ORG_NATO],
        requiresCradle: [],
    }),
    Organization.parse({
        id: ORG_BRICS,
        kind: "political",
        name: "BRICS",
        history: "BRICS formed in the late 2000s as a standing forum of large economies coordinating outside the Atlantic security order — not a mutual-defense treaty and not a customs union. It binds by joint communiqués and alternative development finance: when the group closes ranks, markets read that the Atlantic table is not the only one. For a US president it is the club whose premise is sitting outside NATO's order, and Washington is not a member.",
        members: [CHINA_ID, INDIA_ID, BRAZIL_ID, RUSSIA_ID, SOUTH_AFRICA_ID, IRAN_ID, EGYPT_ID, UAE_ID, ETHIOPIA_ID, INDONESIA_ID],
        // Not a defense pact, but its whole premise is not being inside the
        // Atlantic security order.
        conflictsWith: [ORG_NATO],
    }),
    Organization.parse({
        id: ORG_GCC,
        kind: "political",
        name: "Gulf Cooperation Council",
        history: "The Gulf Cooperation Council formed in 1981 as a standing forum of Gulf monarchies coordinating on oil, shipping lanes, and regional security — not a NATO-style guarantee and not a single-market customs union. The United States is not a member and cannot join from home; for a US president it is the political table over Gulf energy and the Strait of Hormuz.",
        members: [SAUDI_ID, UAE_ID, QATAR_ID, ...roster("BHR KWT OMN")],
        conflictsWith: [],
        requiresCradle: [],
        // Begun in 2003 and fully operational from January 2015.
        tradeCompetence: "customs-union",
    }),
    Organization.parse({
        id: ORG_AU,
        kind: "political",
        name: "African Union",
        history: "The African Union succeeded the Organization of African Unity in 2002, itself founded in 1963, as the continental political forum for African governments. It is a standing table for peace missions and a shared diplomatic line — not a mutual-defense treaty on NATO's model and not a customs union. The United States is not a member and cannot join from home; for a US president it is the body that frames how African capitals answer as a continent.",
        // Every African government on the roster; the Sahrawi Republic is a member
        // too, but not a government the roster carries. The juntas the Union has
        // suspended (Mali, Burkina Faso, Niger, Guinea, Sudan, Gabon) are still
        // members.
        members: [
            NIGERIA_ID, SOUTH_AFRICA_ID, ETHIOPIA_ID, EGYPT_ID, DR_CONGO_ID, MOROCCO_ID, ALGERIA_ID,
            ...roster("AGO BEN BWA BFA BDI CMR CPV CAF TCD COM COG DJI GNQ ERI SWZ GAB GMB GHA GIN GNB CIV KEN LSO LBR LBY MDG MWI MLI MRT MUS MOZ NAM NER RWA STP SEN SYC SLE SOM SSD SDN TZA TGO TUN UGA ZMB ZWE"),
        ],
        conflictsWith: [],
        requiresCradle: [],
    }),
    Organization.parse({
        id: ORG_CPTPP,
        kind: "economic",
        name: "CPTPP",
        history: "The Comprehensive and Progressive Agreement for Trans-Pacific Partnership took effect in 2018 after the United States left the original Trans-Pacific Partnership. It is a Pacific-rim trade pact — tariff cuts, investment rules, and a shared commercial standard — not a defense alliance. The United States is not a member; for a US president it is the trade architecture Washington walked away from and could still join from home, and staying out leaves others writing the Pacific rulebook without a US signature.",
        members: [JAPAN_ID, AUSTRALIA_ID, SINGAPORE_ID, VIETNAM_ID, CANADA_ID, MEXICO_ID, UK_ID, MALAYSIA_ID, CHILE_ID, ...roster("BRN NZL PER")],
        conflictsWith: [],
        // A Pacific-rim trade pact the US could plausibly accede to from home —
        // it negotiated the original TPP text.
        requiresCradle: [CRADLE_POTOMAC],
        tradeCompetence: "fta",
    }),
    Organization.parse({
        id: ORG_ASEAN,
        kind: "political",
        name: "ASEAN",
        history: "The Association of Southeast Asian Nations formed in 1967 as a standing political forum for Southeast Asian governments to keep disputes from becoming wars and to speak as a region on trade and security. It is not a mutual-defense treaty and not a single-market customs union. The United States is not a member and cannot join from home; for a US president it is the table that sets how the region answers shipping, investment, and great-power pressure as a group.",
        // Eleven since Timor-Leste was admitted in 2025.
        members: [SINGAPORE_ID, VIETNAM_ID, INDONESIA_ID, THAILAND_ID, PHILIPPINES_ID, MALAYSIA_ID, ...roster("BRN KHM LAO MMR TLS")],
        conflictsWith: [],
        requiresCradle: [],
        // The ASEAN Free Trade Area drops the tariffs between members and leaves
        // each its own schedule against everyone else.
        tradeCompetence: "fta",
    }),
    Organization.parse({
        id: ORG_MERCOSUR,
        kind: "economic",
        name: "Mercosur",
        history: "Mercosur was founded in 1991 as a South American customs union: members share an external tariff and negotiate trade as a bloc, which is why it cannot sit cleanly beside the European Union's own customs union. It is not a defense pact. The United States is not a member and cannot join from home; for a US president it is the commercial voice of its South American members, so a deal with one capital does not by itself open the union's common external wall.",
        // Paraguay and Uruguay are founders and Bolivia a full member since 2024.
        // Venezuela has been suspended since 2016 and holds no seat; Colombia is an
        // associated state, not a member.
        members: [BRAZIL_ID, ARGENTINA_ID, ...roster("PRY URY BOL")],
        conflictsWith: [ORG_EU],
        requiresCradle: [],
        tradeCompetence: "customs-union",
    }),
    Organization.parse({
        id: ORG_OPEC_PLUS,
        kind: "economic",
        name: "OPEC+",
        history: "OPEC formed in 1960 as a club of oil exporters; OPEC+ dates to 2016, when Russia and other producers joined that output coordination. The compact binds by agreed production cuts and increases — it can move the world oil price without a shot or a tariff. The United States is not a member; for a US president it is the table that can tighten or flood supply, and because the club is open to exporters rather than invitation-only, a producing government can seek a seat without waiting on an invitation.",
        // Open to any exporter: no cradle requirement, no conflicts. It is the
        // one compact a player can always reach, so no cradle is a dead end.
        // OPEC's twelve (Angola left in 2024) and the producers of the 2016
        // Declaration of Cooperation.
        members: [
            SAUDI_ID, UAE_ID, IRAN_ID, RUSSIA_ID, NIGERIA_ID, VENEZUELA_ID, ALGERIA_ID, KAZAKHSTAN_ID, IRAQ_ID, MEXICO_ID, MALAYSIA_ID,
            ...roster("KWT LBY COG GNQ GAB AZE BHR BRN OMN SDN SSD"),
        ],
        conflictsWith: [],
    }),
    Organization.parse({
        id: ORG_G7,
        kind: "political",
        name: "G7",
        history: "The Group of Seven formed in the mid-1970s as a standing forum of major market democracies coordinating on macroeconomics, energy shocks, and crisis response — not a mutual-defense treaty and not a customs union. It binds by agenda-setting and joint pressure: when the seven close ranks, markets and capitals treat that as a signal. For a US president it is the smallest table where peers can align fiscal and diplomatic posture before a wider body dilutes it, and leaving that table empty cedes the framing to whoever still sits.",
        members: [US_ID, UK_ID, FRANCE_ID, GERMANY_ID, ITALY_ID, JAPAN_ID, CANADA_ID],
        conflictsWith: [],
        // An empty requiresCradle satisfies no cradle: the G7 is a standing club
        // the player can never found their way into, unlike the open-to-any
        // OPEC+ whose requiresCradle is absent entirely.
        requiresCradle: [],
    }),
    // The United States' treaty alliances in the Pacific. Each is its own
    // instrument with its own promise, so each is its own body, and each carries
    // the reach its text gives the promise rather than a guarantee that holds
    // wherever a member is attacked.
    Organization.parse({
        id: ORG_US_JAPAN,
        kind: "defense",
        name: "US-Japan Security Treaty",
        history: "The Treaty of Mutual Cooperation and Security was signed in 1960. Its Article V binds both parties to meet an armed attack on either in the territories under the administration of Japan: an attack on Japan brings the United States in, while an attack on the United States elsewhere does not bring Japan in. For a US president it is the anchor of the forward presence in the western Pacific and a promise that covers islands another government claims.",
        members: [US_ID, JAPAN_ID],
        conflictsWith: [],
        requiresCradle: [CRADLE_POTOMAC],
        // Only Japan's administered territory is inside it. The scope vocabulary
        // has no one-sided form, so the parties' territory is the nearest honest
        // reading and the history states the difference.
        defenseScope: { kind: "parties-territory", source: JAPAN_TREATY },
    }),
    Organization.parse({
        id: ORG_US_KOREA,
        kind: "defense",
        name: "US-Korea Mutual Defense Treaty",
        history: "The Mutual Defense Treaty was signed in 1953, months after the armistice that stopped the Korean War without ending it. Its Article III binds each party to meet an armed attack in the Pacific area on territory the other administers. For a US president it is the reason American forces stand on the peninsula, and the promise a crisis in the north tests first.",
        members: [US_ID, SOUTH_KOREA_ID],
        conflictsWith: [],
        requiresCradle: [CRADLE_POTOMAC],
        defenseScope: { kind: "area", area: [...PACIFIC_AREA].map((id) => id), source: KOREA_TREATY },
    }),
    Organization.parse({
        id: ORG_US_PHILIPPINES,
        kind: "defense",
        name: "US-Philippines Mutual Defense Treaty",
        history: "The Mutual Defense Treaty was signed in 1951. Article IV binds each party to act against an armed attack in the Pacific area on the other, and Article V counts an attack on either's home territory, its Pacific islands, or its forces, ships and aircraft in the Pacific. For a US president it is the promise every standoff over the reefs and shoals of the South China Sea puts to the test.",
        members: [US_ID, PHILIPPINES_ID],
        conflictsWith: [],
        requiresCradle: [CRADLE_POTOMAC],
        defenseScope: { kind: "area", area: [...PACIFIC_AREA, "region-north-america"].map((id) => id), source: PHILIPPINES_TREATY },
    }),
    Organization.parse({
        id: ORG_ANZUS,
        kind: "defense",
        name: "ANZUS (the US-Australia leg)",
        history: "The ANZUS Treaty was signed in 1951 by Australia, New Zealand and the United States. Article IV binds each to act against an armed attack in the Pacific area on another, and Article V defines that attack as the Philippines treaty does. The New Zealand leg has been suspended by the United States since 1986, so only Australia and the United States hold each other to it. For a US president it is the oldest promise in the southern Pacific.",
        members: [US_ID, AUSTRALIA_ID],
        conflictsWith: [],
        requiresCradle: [CRADLE_POTOMAC],
        defenseScope: { kind: "area", area: [...PACIFIC_AREA, "region-north-america"].map((id) => id), source: ANZUS_TREATY },
    }),
    Organization.parse({
        id: ORG_SCO,
        kind: "political",
        name: "Shanghai Cooperation Organisation",
        history: "The Shanghai Cooperation Organisation grew from the 1996 Shanghai Five border agreements and was founded in 2001; its charter took effect in 2003. It runs summits, a regional anti-terrorist structure and security, trade and cultural meetings. It says it is not an alliance directed against others, and it has no mutual-defense clause. The United States is not a member and cannot join from home.",
        members: [CHINA_ID, RUSSIA_ID, INDIA_ID, PAKISTAN_ID, IRAN_ID, BELARUS_ID, KAZAKHSTAN_ID, ...roster("KGZ TJK UZB")],
        conflictsWith: [],
        requiresCradle: [],
    }),
    Organization.parse({
        id: ORG_UNSC,
        kind: "political",
        name: "United Nations Security Council",
        history: "The Security Council is the United Nations organ with primary responsibility for peace and security. Five permanent members, China, France, Russia, the United Kingdom and the United States, each hold a veto; ten members are elected for two-year terms. Substantive decisions need nine votes with no permanent member voting no. An abstention is not a veto. Its decisions carry no authority inside the United States, which needs Congress.",
        members: [
            CHINA_ID, FRANCE_ID, RUSSIA_ID, UK_ID, US_ID,
            ...roster("BHR COL COD DNK GRC LVA LBR PAK PAN SOM"),
        ],
        conflictsWith: [],
        requiresCradle: [],
        council: { permanent: [CHINA_ID, FRANCE_ID, RUSSIA_ID, UK_ID, US_ID], threshold: 9, source: UN_CHARTER_VOTING },
    }),
];
// The one cradle: home. Its `geo` equals the US nation record's own anchor and
// its neighbors are the real ones, so sealing a founding through it changes
// nothing about the nation — which is the point. `region` must come from the
// same vocabulary the nations use, so the World-screen filter can read it.
export const cradles = [
    Cradle.parse({
        id: CRADLE_POTOMAC,
        name: "The Union",
        region: "region-north-america",
        // Cuba by the Guantanamo Bay base's land border, which is a border the
        // land-border table carries both ways.
        startingNeighbors: [CANADA_ID, CUBA_ID, MEXICO_ID],
        geo: { lat: 38.9, lon: -77.0 },
    }),
];
// Membership is authored once, on the organization. Mirroring it onto each
// nation at assembly keeps the two from disagreeing, which a second hand-typed
// list inevitably would.
export function applyMemberships(nations) {
    const joined = new Map();
    for (const org of organizations) {
        if (org.council)
            continue;
        for (const member of org.members) {
            const key = member;
            if (!joined.has(key))
                joined.set(key, []);
            joined.get(key).push(org.id);
        }
    }
    return nations.map((nation) => ({ ...nation, memberships: joined.get(nation.id) ?? [] }));
}
export const organizationById = new Map(organizations.map((o) => [o.id, o]));
export const cradleById = new Map(cradles.map((c) => [c.id, c]));
