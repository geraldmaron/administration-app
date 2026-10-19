import { School, type SchoolTier, type StudyField } from "../schemas/background.js";
import { worldNations } from "./nations.js";
import { ROSTER_SCHOOL_HUBS, ROSTER_SCHOOLS } from "./roster-tables.generated.js";

// Where the world's officials were educated.
//
// Real institutions, because the rest of this dataset is real: the nations are
// real, the cities are real, and a minister who read law at an invented academy
// in a country whose capital is Warsaw breaks the register the dossier is
// trying to hold. The people are fictional; the places that made them are not,
// exactly as in the political fiction this product sits beside.
//
// Every nation needs at least one entry or `schoolsFor` throws — enforced by
// the paired test rather than by a fallback, because a silent fallback would
// mean one country quietly graduating everybody from the same invented school.
//
// Tiers are about reach, not quality. `global-elite` is the short list of names
// that open a door in any capital on earth; `national-flagship` is the school a
// country's own establishment comes out of; `regional` is everywhere else that
// produces a competent official; `service-academy` is the military and staff
// route, which produces a different person rather than a lesser one.

type SchoolInput = {
  readonly id: string;
  readonly name: string;
  readonly nation: string;
  readonly tier: SchoolTier;
  readonly fields: readonly StudyField[];
};

const LAW_ECON = ["law", "economics"] as const;
const STATECRAFT = ["international-relations", "public-administration"] as const;
const TECH = ["engineering", "natural-sciences"] as const;

const SCHOOL_INPUTS: readonly SchoolInput[] = [
  // United States — the playable nation, so it carries the most depth: the
  // player meets more of its cast than of anywhere else's.
  { id: "SCH-USA-HARVARD", name: "Harvard University", nation: "USA", tier: "global-elite", fields: [...LAW_ECON, ...STATECRAFT] },
  { id: "SCH-USA-YALE", name: "Yale University", nation: "USA", tier: "global-elite", fields: ["law", "international-relations"] },
  { id: "SCH-USA-PRINCETON", name: "Princeton University", nation: "USA", tier: "global-elite", fields: ["international-relations", "economics", "public-administration"] },
  { id: "SCH-USA-MIT", name: "Massachusetts Institute of Technology", nation: "USA", tier: "global-elite", fields: [...TECH, "economics"] },
  { id: "SCH-USA-GEORGETOWN", name: "Georgetown University", nation: "USA", tier: "national-flagship", fields: [...STATECRAFT, "law"] },
  { id: "SCH-USA-MICHIGAN", name: "University of Michigan", nation: "USA", tier: "national-flagship", fields: ["law", "engineering", "medicine"] },
  { id: "SCH-USA-TEXAS", name: "University of Texas at Austin", nation: "USA", tier: "regional", fields: ["law", "engineering", "public-administration"] },
  { id: "SCH-USA-OHIOSTATE", name: "Ohio State University", nation: "USA", tier: "regional", fields: ["public-administration", "journalism", "medicine"] },
  { id: "SCH-USA-WESTPOINT", name: "United States Military Academy at West Point", nation: "USA", tier: "service-academy", fields: ["military-science", "engineering"] },
  { id: "SCH-USA-ANNAPOLIS", name: "United States Naval Academy", nation: "USA", tier: "service-academy", fields: ["military-science", "engineering"] },
  { id: "SCH-USA-COLUMBIA-J", name: "Columbia University", nation: "USA", tier: "global-elite", fields: ["journalism", "law", "international-relations"] },

  { id: "SCH-CHN-TSINGHUA", name: "Tsinghua University", nation: "CHN", tier: "global-elite", fields: [...TECH, "public-administration"] },
  { id: "SCH-CHN-PEKING", name: "Peking University", nation: "CHN", tier: "global-elite", fields: [...LAW_ECON, "international-relations"] },
  { id: "SCH-CHN-FUDAN", name: "Fudan University", nation: "CHN", tier: "national-flagship", fields: ["journalism", "economics", "medicine"] },
  { id: "SCH-CHN-NDU", name: "PLA National Defence University", nation: "CHN", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-DEU-HUMBOLDT", name: "Humboldt University of Berlin", nation: "DEU", tier: "global-elite", fields: ["law", "natural-sciences", "public-administration"] },
  { id: "SCH-DEU-MUNICH", name: "Ludwig Maximilian University of Munich", nation: "DEU", tier: "national-flagship", fields: ["law", "medicine", "economics"] },
  { id: "SCH-DEU-TUM", name: "Technical University of Munich", nation: "DEU", tier: "national-flagship", fields: [...TECH] },
  { id: "SCH-DEU-FUHRUNGSAKADEMIE", name: "Bundeswehr Command and Staff College", nation: "DEU", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-NGA-IBADAN", name: "University of Ibadan", nation: "NGA", tier: "national-flagship", fields: ["medicine", "law", "public-administration"] },
  { id: "SCH-NGA-LAGOS", name: "University of Lagos", nation: "NGA", tier: "national-flagship", fields: [...LAW_ECON, "engineering"] },
  { id: "SCH-NGA-NDA", name: "Nigerian Defence Academy", nation: "NGA", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-POL-WARSAW", name: "University of Warsaw", nation: "POL", tier: "national-flagship", fields: [...LAW_ECON, "international-relations"] },
  { id: "SCH-POL-JAGIELLONIAN", name: "Jagiellonian University", nation: "POL", tier: "national-flagship", fields: ["law", "medicine", "theology"] },
  { id: "SCH-POL-WAT", name: "Military University of Technology in Warsaw", nation: "POL", tier: "service-academy", fields: ["military-science", "engineering"] },

  { id: "SCH-SAU-KSU", name: "King Saud University", nation: "SAU", tier: "national-flagship", fields: ["engineering", "medicine", "public-administration"] },
  { id: "SCH-SAU-KAUST", name: "King Abdullah University of Science and Technology", nation: "SAU", tier: "global-elite", fields: [...TECH] },
  { id: "SCH-SAU-IMAM", name: "Imam Muhammad ibn Saud Islamic University", nation: "SAU", tier: "national-flagship", fields: ["theology", "law"] },

  { id: "SCH-SGP-NUS", name: "National University of Singapore", nation: "SGP", tier: "global-elite", fields: [...LAW_ECON, ...TECH] },
  { id: "SCH-SGP-NTU", name: "Nanyang Technological University", nation: "SGP", tier: "national-flagship", fields: [...TECH, "economics"] },

  { id: "SCH-IRQ-BAGHDAD", name: "University of Baghdad", nation: "IRQ", tier: "national-flagship", fields: ["law", "medicine", "engineering"] },
  { id: "SCH-IRQ-MOSUL", name: "University of Mosul", nation: "IRQ", tier: "regional", fields: ["medicine", "natural-sciences"] },

  { id: "SCH-PRK-KIMILSUNG", name: "Kim Il Sung University", nation: "PRK", tier: "national-flagship", fields: ["public-administration", "law", "natural-sciences"] },
  { id: "SCH-PRK-KANGGON", name: "Kang Kon Military Academy", nation: "PRK", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-BLR-BSU", name: "Belarusian State University", nation: "BLR", tier: "national-flagship", fields: [...LAW_ECON, "journalism"] },
  { id: "SCH-BLR-MILACAD", name: "Military Academy of Belarus", nation: "BLR", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-VNM-VNUHANOI", name: "Vietnam National University, Hanoi", nation: "VNM", tier: "national-flagship", fields: [...LAW_ECON, "natural-sciences"] },
  { id: "SCH-VNM-DIPACAD", name: "Diplomatic Academy of Vietnam", nation: "VNM", tier: "national-flagship", fields: [...STATECRAFT] },

  { id: "SCH-IDN-UI", name: "University of Indonesia", nation: "IDN", tier: "national-flagship", fields: [...LAW_ECON, "medicine"] },
  { id: "SCH-IDN-ITB", name: "Bandung Institute of Technology", nation: "IDN", tier: "national-flagship", fields: [...TECH] },
  { id: "SCH-IDN-AKMIL", name: "Indonesian Military Academy", nation: "IDN", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-ISL-UI", name: "University of Iceland", nation: "ISL", tier: "national-flagship", fields: ["law", "natural-sciences", "medicine"] },
  { id: "SCH-ISL-REYKJAVIK", name: "Reykjavík University", nation: "ISL", tier: "regional", fields: ["engineering", "economics"] },

  { id: "SCH-BRA-USP", name: "University of São Paulo", nation: "BRA", tier: "global-elite", fields: [...LAW_ECON, "medicine", "engineering"] },
  { id: "SCH-BRA-UNB", name: "University of Brasília", nation: "BRA", tier: "national-flagship", fields: [...STATECRAFT, "law"] },
  { id: "SCH-BRA-AMAN", name: "Agulhas Negras Military Academy", nation: "BRA", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-COL-NACIONAL", name: "National University of Colombia", nation: "COL", tier: "national-flagship", fields: ["law", "engineering", "medicine"] },
  { id: "SCH-COL-ANDES", name: "University of the Andes", nation: "COL", tier: "national-flagship", fields: [...LAW_ECON, ...STATECRAFT] },

  { id: "SCH-VEN-UCV", name: "Central University of Venezuela", nation: "VEN", tier: "national-flagship", fields: ["law", "medicine", "engineering"] },
  { id: "SCH-VEN-ACADMIL", name: "Military Academy of Venezuela", nation: "VEN", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-CUB-HABANA", name: "University of Havana", nation: "CUB", tier: "national-flagship", fields: ["law", "medicine", "economics"] },
  { id: "SCH-CUB-CUJAE", name: "José Antonio Echeverría Technological University", nation: "CUB", tier: "national-flagship", fields: ["engineering", "natural-sciences"] },

  { id: "SCH-CAN-TORONTO", name: "University of Toronto", nation: "CAN", tier: "global-elite", fields: ["law", "medicine", "economics"] },
  { id: "SCH-CAN-MCGILL", name: "McGill University", nation: "CAN", tier: "global-elite", fields: ["medicine", "law", "international-relations"] },
  { id: "SCH-CAN-RMC", name: "Royal Military College of Canada", nation: "CAN", tier: "service-academy", fields: ["military-science", "engineering"] },

  { id: "SCH-MEX-UNAM", name: "National Autonomous University of Mexico", nation: "MEX", tier: "global-elite", fields: ["law", "economics", "medicine"] },
  { id: "SCH-MEX-ITAM", name: "Autonomous Technological Institute of Mexico", nation: "MEX", tier: "national-flagship", fields: ["economics", "public-administration"] },
  { id: "SCH-MEX-HCM", name: "Heroic Military Academy", nation: "MEX", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-IND-DELHI", name: "University of Delhi", nation: "IND", tier: "national-flagship", fields: [...LAW_ECON, "journalism"] },
  { id: "SCH-IND-IIT", name: "Indian Institute of Technology Bombay", nation: "IND", tier: "global-elite", fields: [...TECH] },
  { id: "SCH-IND-JNU", name: "Jawaharlal Nehru University", nation: "IND", tier: "national-flagship", fields: [...STATECRAFT] },
  { id: "SCH-IND-NDA", name: "National Defence Academy, Khadakwasla", nation: "IND", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-PAK-PUNJAB", name: "University of the Punjab", nation: "PAK", tier: "national-flagship", fields: ["law", "economics", "medicine"] },
  { id: "SCH-PAK-PMA", name: "Pakistan Military Academy", nation: "PAK", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-BGD-DHAKA", name: "University of Dhaka", nation: "BGD", tier: "national-flagship", fields: [...LAW_ECON, "journalism"] },
  { id: "SCH-BGD-BMA", name: "Bangladesh Military Academy", nation: "BGD", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-AFG-KABUL", name: "Kabul University", nation: "AFG", tier: "national-flagship", fields: ["law", "theology", "engineering"] },
  { id: "SCH-AFG-HERAT", name: "Herat University", nation: "AFG", tier: "regional", fields: ["economics", "natural-sciences"] },

  { id: "SCH-KAZ-ALFARABI", name: "Al-Farabi Kazakh National University", nation: "KAZ", tier: "national-flagship", fields: [...LAW_ECON, "natural-sciences"] },
  { id: "SCH-KAZ-NAZARBAYEV", name: "Nazarbayev University", nation: "KAZ", tier: "national-flagship", fields: [...TECH, "public-administration"] },

  { id: "SCH-IRN-TEHRAN", name: "University of Tehran", nation: "IRN", tier: "national-flagship", fields: ["law", "engineering", "medicine"] },
  { id: "SCH-IRN-SHARIF", name: "Sharif University of Technology", nation: "IRN", tier: "global-elite", fields: [...TECH] },
  { id: "SCH-IRN-QOM", name: "Qom Seminary", nation: "IRN", tier: "national-flagship", fields: ["theology", "law"] },

  { id: "SCH-ISR-HEBREW", name: "Hebrew University of Jerusalem", nation: "ISR", tier: "global-elite", fields: ["law", "natural-sciences", "international-relations"] },
  { id: "SCH-ISR-TECHNION", name: "Technion — Israel Institute of Technology", nation: "ISR", tier: "global-elite", fields: [...TECH] },

  { id: "SCH-ARE-UAEU", name: "United Arab Emirates University", nation: "ARE", tier: "national-flagship", fields: ["law", "economics", "engineering"] },
  { id: "SCH-ARE-KHALIFA", name: "Khalifa University", nation: "ARE", tier: "national-flagship", fields: [...TECH] },

  { id: "SCH-TUR-BOGAZICI", name: "Boğaziçi University", nation: "TUR", tier: "global-elite", fields: [...LAW_ECON, ...STATECRAFT] },
  { id: "SCH-TUR-ISTANBUL", name: "Istanbul University", nation: "TUR", tier: "national-flagship", fields: ["law", "medicine", "theology"] },
  { id: "SCH-TUR-HARPOKULU", name: "Turkish Military Academy", nation: "TUR", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-YEM-SANAA", name: "Sana'a University", nation: "YEM", tier: "national-flagship", fields: ["law", "theology", "medicine"] },
  { id: "SCH-YEM-ADEN", name: "University of Aden", nation: "YEM", tier: "regional", fields: ["engineering", "economics"] },

  { id: "SCH-SYR-DAMASCUS", name: "Damascus University", nation: "SYR", tier: "national-flagship", fields: ["law", "medicine", "engineering"] },
  { id: "SCH-SYR-HOMS", name: "Homs Military Academy", nation: "SYR", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-EGY-CAIRO", name: "Cairo University", nation: "EGY", tier: "national-flagship", fields: ["law", "medicine", "economics"] },
  { id: "SCH-EGY-AZHAR", name: "Al-Azhar University", nation: "EGY", tier: "national-flagship", fields: ["theology", "law"] },
  { id: "SCH-EGY-MILACAD", name: "Egyptian Military Academy", nation: "EGY", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-ZAF-WITS", name: "University of the Witwatersrand", nation: "ZAF", tier: "global-elite", fields: ["law", "engineering", "medicine"] },
  { id: "SCH-ZAF-CAPETOWN", name: "University of Cape Town", nation: "ZAF", tier: "global-elite", fields: [...LAW_ECON, ...STATECRAFT] },

  { id: "SCH-ETH-ADDIS", name: "Addis Ababa University", nation: "ETH", tier: "national-flagship", fields: ["law", "medicine", "public-administration"] },
  { id: "SCH-ETH-DEFENSE", name: "Ethiopian Defence University", nation: "ETH", tier: "service-academy", fields: ["military-science", "engineering"] },

  { id: "SCH-COD-KINSHASA", name: "University of Kinshasa", nation: "COD", tier: "national-flagship", fields: ["law", "medicine", "economics"] },
  { id: "SCH-COD-KANANGA", name: "Military Academy of Kananga", nation: "COD", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-RWA-RWANDA", name: "University of Rwanda", nation: "RWA", tier: "national-flagship", fields: ["medicine", "public-administration", "engineering"] },
  { id: "SCH-RWA-GAKO", name: "Rwanda Military Academy, Gako", nation: "RWA", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-MAR-MOHAMMEDV", name: "Mohammed V University", nation: "MAR", tier: "national-flagship", fields: [...LAW_ECON, "medicine"] },
  { id: "SCH-MAR-QARAWIYYIN", name: "University of al-Qarawiyyin", nation: "MAR", tier: "national-flagship", fields: ["theology", "law"] },

  { id: "SCH-DZA-ALGIERS", name: "University of Algiers", nation: "DZA", tier: "national-flagship", fields: ["law", "medicine", "economics"] },
  { id: "SCH-DZA-EMP", name: "École Militaire Polytechnique", nation: "DZA", tier: "service-academy", fields: ["military-science", "engineering"] },

  { id: "SCH-GBR-OXFORD", name: "University of Oxford", nation: "GBR", tier: "global-elite", fields: [...LAW_ECON, ...STATECRAFT, "theology"] },
  { id: "SCH-GBR-CAMBRIDGE", name: "University of Cambridge", nation: "GBR", tier: "global-elite", fields: [...TECH, "law", "economics"] },
  { id: "SCH-GBR-LSE", name: "London School of Economics", nation: "GBR", tier: "global-elite", fields: ["economics", ...STATECRAFT] },
  { id: "SCH-GBR-SANDHURST", name: "Royal Military Academy Sandhurst", nation: "GBR", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-FRA-SCIENCESPO", name: "Sciences Po", nation: "FRA", tier: "global-elite", fields: [...STATECRAFT, "economics"] },
  { id: "SCH-FRA-ENA", name: "National School of Administration", nation: "FRA", tier: "global-elite", fields: ["public-administration", "law"] },
  { id: "SCH-FRA-SORBONNE", name: "Sorbonne University", nation: "FRA", tier: "global-elite", fields: ["law", "natural-sciences", "medicine"] },
  { id: "SCH-FRA-SAINTCYR", name: "Saint-Cyr Military Academy", nation: "FRA", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-ITA-BOLOGNA", name: "University of Bologna", nation: "ITA", tier: "global-elite", fields: ["law", "medicine", "economics"] },
  { id: "SCH-ITA-SAPIENZA", name: "Sapienza University of Rome", nation: "ITA", tier: "national-flagship", fields: [...LAW_ECON, "engineering"] },
  { id: "SCH-ITA-MODENA", name: "Military Academy of Modena", nation: "ITA", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-ESP-COMPLUTENSE", name: "Complutense University of Madrid", nation: "ESP", tier: "national-flagship", fields: ["law", "medicine", "journalism"] },
  { id: "SCH-ESP-SALAMANCA", name: "University of Salamanca", nation: "ESP", tier: "national-flagship", fields: ["law", "theology", "economics"] },

  { id: "SCH-UKR-KYIV", name: "Taras Shevchenko National University of Kyiv", nation: "UKR", tier: "national-flagship", fields: [...LAW_ECON, "international-relations"] },
  { id: "SCH-UKR-KPI", name: "Kyiv Polytechnic Institute", nation: "UKR", tier: "national-flagship", fields: [...TECH] },

  { id: "SCH-RUS-MSU", name: "Moscow State University", nation: "RUS", tier: "global-elite", fields: ["law", "natural-sciences", "economics"] },
  { id: "SCH-RUS-MGIMO", name: "Moscow State Institute of International Relations", nation: "RUS", tier: "global-elite", fields: [...STATECRAFT] },
  { id: "SCH-RUS-FRUNZE", name: "Frunze Military Academy", nation: "RUS", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-SWE-UPPSALA", name: "Uppsala University", nation: "SWE", tier: "national-flagship", fields: ["law", "medicine", "natural-sciences"] },
  { id: "SCH-SWE-KTH", name: "KTH Royal Institute of Technology", nation: "SWE", tier: "national-flagship", fields: [...TECH] },

  { id: "SCH-CHE-ETH", name: "ETH Zurich", nation: "CHE", tier: "global-elite", fields: [...TECH] },
  { id: "SCH-CHE-GENEVA", name: "Graduate Institute Geneva", nation: "CHE", tier: "global-elite", fields: [...STATECRAFT, "law"] },

  { id: "SCH-HUN-EOTVOS", name: "Eötvös Loránd University", nation: "HUN", tier: "national-flagship", fields: ["law", "natural-sciences", "economics"] },
  { id: "SCH-HUN-CORVINUS", name: "Corvinus University of Budapest", nation: "HUN", tier: "national-flagship", fields: ["economics", "public-administration"] },

  { id: "SCH-JPN-TOKYO", name: "University of Tokyo", nation: "JPN", tier: "global-elite", fields: ["law", "economics", ...TECH] },
  { id: "SCH-JPN-KYOTO", name: "Kyoto University", nation: "JPN", tier: "global-elite", fields: ["natural-sciences", "medicine", "law"] },
  { id: "SCH-JPN-NDA", name: "National Defense Academy of Japan", nation: "JPN", tier: "service-academy", fields: ["military-science", "engineering"] },

  { id: "SCH-KOR-SNU", name: "Seoul National University", nation: "KOR", tier: "global-elite", fields: ["law", "economics", ...TECH] },
  { id: "SCH-KOR-KMA", name: "Korea Military Academy", nation: "KOR", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-TWN-NTU", name: "National Taiwan University", nation: "TWN", tier: "global-elite", fields: ["law", "economics", ...TECH] },
  { id: "SCH-TWN-ROCMA", name: "Republic of China Military Academy", nation: "TWN", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-AUS-MELBOURNE", name: "University of Melbourne", nation: "AUS", tier: "global-elite", fields: ["law", "medicine", "economics"] },
  { id: "SCH-AUS-ANU", name: "Australian National University", nation: "AUS", tier: "global-elite", fields: [...STATECRAFT, "natural-sciences"] },
  { id: "SCH-AUS-ADFA", name: "Australian Defence Force Academy", nation: "AUS", tier: "service-academy", fields: ["military-science", "engineering"] },

  { id: "SCH-NLD-LEIDEN", name: "Leiden University", nation: "NLD", tier: "global-elite", fields: ["law", ...STATECRAFT] },
  { id: "SCH-NLD-DELFT", name: "Delft University of Technology", nation: "NLD", tier: "global-elite", fields: [...TECH] },
  { id: "SCH-NLD-KMA", name: "Royal Military Academy Breda", nation: "NLD", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-BEL-LEUVEN", name: "KU Leuven", nation: "BEL", tier: "global-elite", fields: [...LAW_ECON, "medicine"] },
  { id: "SCH-BEL-ULB", name: "Free University of Brussels", nation: "BEL", tier: "national-flagship", fields: [...STATECRAFT, "law"] },
  { id: "SCH-BEL-ERM", name: "Royal Military Academy of Belgium", nation: "BEL", tier: "service-academy", fields: ["military-science", "engineering"] },

  { id: "SCH-IRL-TCD", name: "Trinity College Dublin", nation: "IRL", tier: "global-elite", fields: [...LAW_ECON, ...STATECRAFT] },
  { id: "SCH-IRL-UCD", name: "University College Dublin", nation: "IRL", tier: "national-flagship", fields: ["law", "economics", "medicine"] },

  { id: "SCH-NOR-OSLO", name: "University of Oslo", nation: "NOR", tier: "national-flagship", fields: [...LAW_ECON, "medicine"] },
  { id: "SCH-NOR-NHH", name: "Norwegian School of Economics", nation: "NOR", tier: "national-flagship", fields: ["economics"] },
  { id: "SCH-NOR-KRIGSSKOLEN", name: "Norwegian Military Academy", nation: "NOR", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-DNK-KU", name: "University of Copenhagen", nation: "DNK", tier: "global-elite", fields: ["law", "medicine", "natural-sciences"] },
  { id: "SCH-DNK-CBS", name: "Copenhagen Business School", nation: "DNK", tier: "national-flagship", fields: ["economics", "public-administration"] },
  { id: "SCH-DNK-FAK", name: "Forsvarsakademiet", nation: "DNK", tier: "service-academy", fields: ["military-science", "international-relations"] },

  { id: "SCH-THA-CHULA", name: "Chulalongkorn University", nation: "THA", tier: "national-flagship", fields: [...LAW_ECON, ...STATECRAFT] },
  { id: "SCH-THA-THAMMASAT", name: "Thammasat University", nation: "THA", tier: "national-flagship", fields: ["law", "public-administration", "journalism"] },
  { id: "SCH-THA-CRMA", name: "Chulachomklao Royal Military Academy", nation: "THA", tier: "service-academy", fields: ["military-science", "engineering"] },

  { id: "SCH-PHL-UP", name: "University of the Philippines", nation: "PHL", tier: "national-flagship", fields: [...LAW_ECON, "public-administration"] },
  { id: "SCH-PHL-ATENEO", name: "Ateneo de Manila University", nation: "PHL", tier: "national-flagship", fields: ["law", ...STATECRAFT] },
  { id: "SCH-PHL-PMA", name: "Philippine Military Academy", nation: "PHL", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-MYS-UM", name: "University of Malaya", nation: "MYS", tier: "national-flagship", fields: [...LAW_ECON, "medicine"] },
  { id: "SCH-MYS-UKM", name: "National University of Malaysia", nation: "MYS", tier: "national-flagship", fields: [...STATECRAFT, "natural-sciences"] },
  { id: "SCH-MYS-UPNM", name: "Universiti Pertahanan Nasional Malaysia", nation: "MYS", tier: "service-academy", fields: ["military-science", "engineering"] },

  { id: "SCH-QAT-QU", name: "Qatar University", nation: "QAT", tier: "national-flagship", fields: [...LAW_ECON, "theology"] },
  { id: "SCH-QAT-AHMED", name: "Ahmed Bin Mohammed Military College", nation: "QAT", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-ARG-UBA", name: "University of Buenos Aires", nation: "ARG", tier: "global-elite", fields: [...LAW_ECON, "medicine"] },
  { id: "SCH-ARG-UCA", name: "Pontifical Catholic University of Argentina", nation: "ARG", tier: "national-flagship", fields: ["law", "economics", "theology"] },
  { id: "SCH-ARG-CMN", name: "General San Martin Military Academy", nation: "ARG", tier: "service-academy", fields: ["military-science"] },

  { id: "SCH-CHL-UC", name: "Pontifical Catholic University of Chile", nation: "CHL", tier: "global-elite", fields: [...LAW_ECON, "engineering"] },
  { id: "SCH-CHL-UCHILE", name: "University of Chile", nation: "CHL", tier: "national-flagship", fields: ["law", "medicine", "natural-sciences"] },
  { id: "SCH-CHL-BERNARDO", name: "Bernardo O'Higgins Military School", nation: "CHL", tier: "service-academy", fields: ["military-science"] },
];

// Where a President may have studied, beyond the establishment schools above.
// A President can come from anywhere, so the founding list is long; the cast
// the game generates is still drawn from the short list above, because senior
// officials cluster at a few schools and those shared schools are what seat
// the alumni ties between them. Lengthening the cast's list would thin those
// ties and move every figure pinned over a founded cabinet.
const US_ALMA_MATER_INPUTS: readonly SchoolInput[] = [
  { id: "SCH-USA-STANFORD", name: "Stanford University", nation: "USA", tier: "global-elite", fields: [...LAW_ECON, "engineering"] },
  { id: "SCH-USA-CHICAGO", name: "University of Chicago", nation: "USA", tier: "global-elite", fields: [...LAW_ECON, "public-administration"] },
  { id: "SCH-USA-PENN", name: "University of Pennsylvania", nation: "USA", tier: "national-flagship", fields: ["economics", "law", "medicine"] },
  { id: "SCH-USA-DUKE", name: "Duke University", nation: "USA", tier: "national-flagship", fields: ["law", "public-administration", "medicine"] },
  { id: "SCH-USA-NORTHWESTERN", name: "Northwestern University", nation: "USA", tier: "national-flagship", fields: ["journalism", "law", "economics"] },
  { id: "SCH-USA-CORNELL", name: "Cornell University", nation: "USA", tier: "national-flagship", fields: ["engineering", "law", "natural-sciences"] },
  { id: "SCH-USA-BROWN", name: "Brown University", nation: "USA", tier: "national-flagship", fields: ["international-relations", "medicine", "public-administration"] },
  { id: "SCH-USA-DARTMOUTH", name: "Dartmouth College", nation: "USA", tier: "national-flagship", fields: ["economics", "public-administration"] },
  { id: "SCH-USA-JHU", name: "Johns Hopkins University", nation: "USA", tier: "national-flagship", fields: ["international-relations", "medicine", "natural-sciences"] },
  { id: "SCH-USA-BERKELEY", name: "University of California, Berkeley", nation: "USA", tier: "national-flagship", fields: ["law", "engineering", "public-administration"] },
  { id: "SCH-USA-UCLA", name: "University of California, Los Angeles", nation: "USA", tier: "national-flagship", fields: ["law", "medicine", "journalism"] },
  { id: "SCH-USA-UVA", name: "University of Virginia", nation: "USA", tier: "national-flagship", fields: ["law", "public-administration"] },
  { id: "SCH-USA-UNC", name: "University of North Carolina at Chapel Hill", nation: "USA", tier: "national-flagship", fields: ["journalism", "public-administration", "medicine"] },
  { id: "SCH-USA-VANDERBILT", name: "Vanderbilt University", nation: "USA", tier: "national-flagship", fields: ["law", "medicine"] },
  { id: "SCH-USA-NOTREDAME", name: "University of Notre Dame", nation: "USA", tier: "national-flagship", fields: ["law", "theology", "economics"] },
  { id: "SCH-USA-HOWARD", name: "Howard University", nation: "USA", tier: "national-flagship", fields: ["law", "medicine", "journalism"] },
  { id: "SCH-USA-TUFTS", name: "Tufts University", nation: "USA", tier: "national-flagship", fields: ["international-relations", "economics"] },
  { id: "SCH-USA-WISCONSIN", name: "University of Wisconsin-Madison", nation: "USA", tier: "national-flagship", fields: ["public-administration", "economics", "journalism"] },
  { id: "SCH-USA-GWU", name: "George Washington University", nation: "USA", tier: "regional", fields: ["international-relations", "public-administration", "law"] },
  { id: "SCH-USA-AMERICAN", name: "American University", nation: "USA", tier: "regional", fields: ["international-relations", "journalism", "law"] },
  { id: "SCH-USA-SYRACUSE", name: "Syracuse University", nation: "USA", tier: "regional", fields: ["public-administration", "journalism"] },
  { id: "SCH-USA-MISSOURI", name: "University of Missouri", nation: "USA", tier: "regional", fields: ["journalism", "law"] },
  { id: "SCH-USA-WASHINGTON", name: "University of Washington", nation: "USA", tier: "regional", fields: ["medicine", "engineering", "public-administration"] },
  { id: "SCH-USA-FLORIDA", name: "University of Florida", nation: "USA", tier: "regional", fields: ["law", "engineering", "economics"] },
  { id: "SCH-USA-GEORGIA", name: "University of Georgia", nation: "USA", tier: "regional", fields: ["law", "public-administration", "journalism"] },
  { id: "SCH-USA-ALABAMA", name: "University of Alabama", nation: "USA", tier: "regional", fields: ["law", "economics"] },
  { id: "SCH-USA-LSU", name: "Louisiana State University", nation: "USA", tier: "regional", fields: ["law", "engineering"] },
  { id: "SCH-USA-TEXASAM", name: "Texas A&M University", nation: "USA", tier: "regional", fields: ["engineering", "military-science", "public-administration"] },
  { id: "SCH-USA-BAYLOR", name: "Baylor University", nation: "USA", tier: "regional", fields: ["law", "theology"] },
  { id: "SCH-USA-OKLAHOMA", name: "University of Oklahoma", nation: "USA", tier: "regional", fields: ["law", "engineering"] },
  { id: "SCH-USA-KANSAS", name: "University of Kansas", nation: "USA", tier: "regional", fields: ["law", "public-administration"] },
  { id: "SCH-USA-NEBRASKA", name: "University of Nebraska-Lincoln", nation: "USA", tier: "regional", fields: ["law", "economics"] },
  { id: "SCH-USA-IOWA", name: "University of Iowa", nation: "USA", tier: "regional", fields: ["law", "journalism", "medicine"] },
  { id: "SCH-USA-INDIANA", name: "Indiana University Bloomington", nation: "USA", tier: "regional", fields: ["law", "public-administration", "journalism"] },
  { id: "SCH-USA-PENNSTATE", name: "Pennsylvania State University", nation: "USA", tier: "regional", fields: ["engineering", "economics"] },
  { id: "SCH-USA-RUTGERS", name: "Rutgers University", nation: "USA", tier: "regional", fields: ["law", "public-administration"] },
  { id: "SCH-USA-BU", name: "Boston University", nation: "USA", tier: "regional", fields: ["law", "journalism", "medicine"] },
  { id: "SCH-USA-KENTUCKY", name: "University of Kentucky", nation: "USA", tier: "regional", fields: ["law", "medicine"] },
  { id: "SCH-USA-TENNESSEE", name: "University of Tennessee", nation: "USA", tier: "regional", fields: ["law", "engineering"] },
  { id: "SCH-USA-ARIZONASTATE", name: "Arizona State University", nation: "USA", tier: "regional", fields: ["public-administration", "journalism", "engineering"] },
  { id: "SCH-USA-COLORADO", name: "University of Colorado Boulder", nation: "USA", tier: "regional", fields: ["law", "natural-sciences", "engineering"] },
  { id: "SCH-USA-UTAH", name: "University of Utah", nation: "USA", tier: "regional", fields: ["law", "medicine"] },
  { id: "SCH-USA-BYU", name: "Brigham Young University", nation: "USA", tier: "regional", fields: ["law", "economics", "theology"] },
  { id: "SCH-USA-SPELMAN", name: "Spelman College", nation: "USA", tier: "regional", fields: ["economics", "natural-sciences", "public-administration"] },
  { id: "SCH-USA-MOREHOUSE", name: "Morehouse College", nation: "USA", tier: "regional", fields: ["economics", "theology", "public-administration"] },
  { id: "SCH-USA-AIRFORCE", name: "United States Air Force Academy", nation: "USA", tier: "service-academy", fields: ["military-science", "engineering"] },
  { id: "SCH-USA-COASTGUARD", name: "United States Coast Guard Academy", nation: "USA", tier: "service-academy", fields: ["military-science", "engineering"] },
  { id: "SCH-USA-VMI", name: "Virginia Military Institute", nation: "USA", tier: "service-academy", fields: ["military-science", "engineering"] },
  { id: "SCH-USA-CITADEL", name: "The Citadel", nation: "USA", tier: "service-academy", fields: ["military-science", "public-administration"] },
];

/** The schools written by hand, for the countries the roster authored before the bake. */
export const AUTHORED_SCHOOLS: readonly School[] = SCHOOL_INPUTS.map((input) => School.parse(input));

const CAST_SCHOOLS: readonly School[] = [...AUTHORED_SCHOOLS, ...ROSTER_SCHOOLS.map((input) => School.parse(input))];
const ALMA_MATERS: readonly School[] = US_ALMA_MATER_INPUTS.map((input) => School.parse(input));

/** Every school the game knows, the cast's and the founding list's alike. */
export const schools: readonly School[] = [...CAST_SCHOOLS, ...ALMA_MATERS];

const SCHOOLS_BY_NATION: ReadonlyMap<string, readonly School[]> = (() => {
  const byNation = new Map<string, School[]>();
  for (const school of CAST_SCHOOLS) {
    const key = school.nation as string;
    byNation.set(key, [...(byNation.get(key) ?? []), school]);
  }
  return byNation;
})();

export const schoolById: ReadonlyMap<string, School> = new Map(schools.map((s) => [s.id as string, s]));

/**
 * Every school a nation's officials come out of: its own, or, for a small
 * state with no university of note, its region's hub schools, which is where
 * such a state's officials actually study. Throws rather than falling back
 * further: a nation with no entry would otherwise graduate its whole
 * government from whichever list a fallback happened to point at, and the
 * failure would be invisible.
 */
export function schoolsFor(nation: string): readonly School[] {
  const own = SCHOOLS_BY_NATION.get(nation);
  if (own && own.length > 0) return own;
  const hubs = (ROSTER_SCHOOL_HUBS[nation] ?? []).flatMap((hub) => SCHOOLS_BY_NATION.get(hub) ?? []);
  if (hubs.length === 0) throw new Error(`no schools authored for nation ${nation}`);
  return hubs;
}

/** Every school a President from this nation can name at founding: the cast's schools and the longer founding list. */
export function almaMatersFor(nation: string): readonly School[] {
  return [...schoolsFor(nation), ...ALMA_MATERS.filter((school) => school.nation === nation)];
}

/** The nations the catalogue covers, so a test can assert it covers all of them. */
export const SCHOOL_NATIONS: readonly string[] = worldNations.map((n) => n.id as string);
