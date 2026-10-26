import { govinfoCode, uscode } from "./records-security.js";
import type { Authority } from "./types.js";

// Disasters, trade, budget and spending, rules and procurement.

const DISASTERS: readonly Authority[] = [
  {
    id: "stafford-act",
    cite: "42 U.S.C. §5121 et seq.",
    title: "The Robert T. Stafford Disaster Relief and Emergency Assistance Act",
    shortTitle: "The Stafford Act",
    kind: "statute",
    summary:
      "This is the law under which the federal government helps states after disasters. A governor asks, the President declares a major disaster or an emergency, and the Federal Emergency Management Agency directs the help.",
    enables: ["Declare a major disaster or an emergency at a governor's request", "Direct federal agencies to help states and localities respond and recover"],
    limits: ["Federal help answers a state's request and supplements its own effort. It does not replace the state's"],
    sourceUrl: uscode(42, "5121"),
    glossaryTerms: ["stafford-act", "fema"],
    aliases: ["Stafford Act", "Stafford Disaster Relief and Emergency Assistance Act", "Disaster Relief Act"],
    covers: [{ code: "usc", title: 42, from: "5121", to: "5207" }],
  },
  {
    id: "stafford-major-disaster",
    cite: "42 U.S.C. §5170",
    title: "Stafford Act, §401: major disaster declarations",
    kind: "statute",
    summary:
      "A governor asks you to declare a major disaster, on a finding that the disaster is beyond what the state and its local governments can effectively meet. You decide whether to declare one.",
    enables: ["Declare a major disaster in a state whose governor has asked, opening federal recovery assistance"],
    limits: [
      "Needs the governor's request, made on a finding that the disaster is beyond the state's capability",
      "The governor must first have put the state's own emergency plan into effect",
    ],
    sourceUrl: uscode(42, "5170"),
    glossaryTerms: ["stafford-act", "fema"],
    aliases: ["Stafford Act §401"],
    covers: [{ code: "usc", title: 42, from: "5170" }],
  },
  {
    id: "guard-state-duty-502f",
    cite: "32 U.S.C. §502(f)",
    title: "National Guard duty at the President's request",
    kind: "statute",
    summary:
      "Members of a state's National Guard can be ordered to duty beyond their usual training, including to support a mission their unit takes on at the request of the President or the Secretary of Defense. They stay in state status rather than being called into federal service.",
    enables: ["Request a mission a state's Guard can take on while it stays in state status"],
    limits: [
      "It supports missions undertaken at the President's or the Secretary of Defense's request (§502(f)(2)(A)). Calling the Guard into federal service is a different law (10 U.S.C. §12406)",
      "The duty runs under regulations the Secretary of the Army or of the Air Force prescribes",
    ],
    sourceUrl: govinfoCode(32, "502"),
    aliases: ["Title 32 duty", "Section 502(f)"],
    covers: [{ code: "usc", title: 32, from: "502" }],
  },
  {
    id: "stafford-emergency",
    cite: "42 U.S.C. §5191",
    title: "Stafford Act, §501: emergency declarations",
    kind: "statute",
    summary:
      "A governor may ask you to declare an emergency. It's a smaller and faster declaration, for the help needed to save lives, protect property or lessen the threat of a catastrophe.",
    enables: [
      "Declare an emergency in a state whose governor has asked",
      "Declare one without a request where the emergency falls mainly on a federal responsibility (§5191(b))",
    ],
    limits: ["Assistance under one emergency is capped at $5,000,000 unless the President finds more immediately required and reports to Congress (§5193)"],
    sourceUrl: uscode(42, "5191"),
    glossaryTerms: ["stafford-act", "fema"],
    aliases: ["Stafford Act §501"],
    covers: [{ code: "usc", title: 42, from: "5191", to: "5193" }],
  },
];

const TRADE: readonly Authority[] = [
  {
    id: "trade-expansion-232",
    cite: "19 U.S.C. §1862",
    title: "Imports that threaten national security (Trade Expansion Act of 1962, §232)",
    shortTitle: "Section 232",
    kind: "statute",
    summary:
      "The Secretary of Commerce investigates whether an article is being imported in quantities or circumstances that threaten to impair national security. If it is, you may then adjust its imports by tariffs, quotas or other means.",
    enables: ["Adjust the imports of an article, by tariff or quota, after a Commerce finding that they threaten national security"],
    limits: [
      "Commerce reports within 270 days of starting the investigation",
      "The President decides within ninety days of the report whether to act",
    ],
    sourceUrl: uscode(19, "1862"),
    aliases: ["Section 232", "Trade Expansion Act"],
    covers: [{ code: "usc", title: 19, from: "1862" }],
  },
  {
    id: "trade-act-301",
    cite: "19 U.S.C. §2411",
    title: "Answering unfair foreign trade practices (Trade Act of 1974, §301)",
    shortTitle: "Section 301",
    kind: "statute",
    summary:
      "The Trade Representative, subject to your direction, may impose duties or other import restrictions on a country whose acts, policies or practices violate a trade agreement or unjustifiably burden American commerce.",
    enables: ["Impose duties or restrictions on a country found to trade unfairly", "Suspend trade agreement concessions to that country"],
    limits: [
      "Action follows an investigation and consultation with the foreign country",
      "Action is required where a trade agreement is violated and discretionary where a practice is unreasonable or discriminatory",
    ],
    sourceUrl: uscode(19, "2411"),
    aliases: ["Section 301"],
    covers: [{ code: "usc", title: 19, from: "2411" }],
  },
  {
    id: "trade-act-122",
    cite: "19 U.S.C. §2132",
    title: "Trade Act of 1974, §122: balance-of-payments authority",
    shortTitle: "Section 122",
    kind: "statute",
    summary:
      "To deal with large and serious balance-of-payments deficits, you may proclaim a temporary import surcharge of up to 15 percent, quotas, or both.",
    enables: ["Proclaim a temporary import surcharge of up to 15 percent across imports"],
    limits: ["Lasts at most 150 days unless Congress extends it by law"],
    sourceUrl: uscode(19, "2132"),
    aliases: ["Section 122"],
    covers: [{ code: "usc", title: 19, from: "2132" }],
  },
  {
    id: "trade-act-201",
    cite: "19 U.S.C. §2251",
    title: "Safeguards against import surges (Trade Act of 1974, §201)",
    shortTitle: "Section 201",
    kind: "statute",
    summary:
      "First the International Trade Commission must find that rising imports are a substantial cause of serious injury to a domestic industry. Then you may impose temporary tariffs or quotas to give the industry time to adjust.",
    enables: ["Impose a temporary tariff or quota on a surging import after the Commission finds serious injury"],
    limits: ["Needs an affirmative injury finding by the International Trade Commission", "Relief lasts up to four years, extendable to eight in all"],
    sourceUrl: uscode(19, "2251"),
    aliases: ["Section 201"],
    covers: [{ code: "usc", title: 19, from: "2251" }],
  },
  {
    id: "tariff-act-338",
    cite: "19 U.S.C. §1338",
    title: "Duties against countries that discriminate (Tariff Act of 1930, §338)",
    shortTitle: "Section 338",
    kind: "statute",
    summary:
      "When a country treats American goods worse than other countries' goods, you may proclaim new or added duties of up to 50 percent on its goods.",
    enables: ["Proclaim added duties of up to 50 percent on a country that discriminates against American commerce"],
    limits: ["Needs your finding that the country discriminates against American goods", "First used in 2026, and courts haven't ruled on how far it reaches"],
    sourceUrl: uscode(19, "1338"),
    aliases: ["Section 338"],
    covers: [{ code: "usc", title: 19, from: "1338" }],
  },
];

const BUDGET: readonly Authority[] = [
  {
    id: "antideficiency-act",
    cite: "31 U.S.C. §§1341–1342, 1517",
    title: "The Antideficiency Act",
    kind: "statute",
    summary:
      "Federal officers can't spend or obligate money beyond what Congress has appropriated, or before it has. That's why the government shuts down when appropriations lapse.",
    enables: ["Keep excepted work going in a lapse, for emergencies involving the safety of human life or the protection of property (§1342)"],
    limits: ["No obligation or expenditure beyond or ahead of an appropriation (§1341)", "Violations are reported to the President and Congress, and officers face discipline (§§1349–1351)"],
    sourceUrl: uscode(31, "1341"),
    glossaryTerms: ["shutdown", "appropriation"],
    aliases: ["Antideficiency Act", "Anti-Deficiency Act"],
    covers: [
      { code: "usc", title: 31, from: "1341", to: "1351" },
      { code: "usc", title: 31, from: "1511", to: "1519" },
    ],
  },
  {
    id: "impoundment-control-act",
    cite: "2 U.S.C. §§681–688",
    title: "The Impoundment Control Act of 1974",
    kind: "statute",
    summary:
      "This law governs when a President may hold back money Congress appropriated. To cancel spending, you ask Congress to rescind it, and you may hold the money only while Congress considers the request.",
    enables: [
      "Propose a rescission and withhold the money for up to forty-five days of continuous session while Congress decides (§683)",
      "Defer spending for contingencies or efficiency savings, reported to Congress (§684)",
    ],
    limits: [
      "If Congress does not pass the rescission within forty-five days, the money must be spent",
      "A deferral may not be used to override a policy Congress set",
      "The Comptroller General may sue to make the money available (§687)",
    ],
    sourceUrl: uscode(2, "681"),
    glossaryTerms: ["appropriation"],
    aliases: ["Impoundment Control Act"],
    covers: [{ code: "usc", title: 2, from: "681", to: "688" }],
  },
  {
    id: "budget-reconciliation",
    cite: "2 U.S.C. §641",
    title: "Congressional Budget Act, §310: reconciliation",
    kind: "statute",
    summary:
      "A budget resolution can instruct committees to change spending or revenue law. The bill that carries the changes moves under limited debate, so it can't be filibustered in the Senate.",
    enables: ["Ask Congress for a budget resolution whose instructions let a fiscal bill pass the Senate by a simple majority"],
    limits: ["The Byrd rule strikes provisions extraneous to the budget (2 U.S.C. §644)"],
    sourceUrl: uscode(2, "641"),
    glossaryTerms: ["reconciliation", "filibuster"],
    aliases: ["Congressional Budget Act", "Byrd rule"],
    covers: [{ code: "usc", title: 2, from: "641", to: "644" }],
  },
  {
    id: "debt-limit",
    cite: "31 U.S.C. §3101",
    title: "The statutory limit on the public debt",
    shortTitle: "The debt limit",
    kind: "statute",
    summary: "This caps the face amount of the obligations the Treasury may have outstanding. Only Congress can raise or suspend it.",
    enables: ["Ask Congress to raise or suspend the limit"],
    limits: ["Once the limit binds, the Treasury cannot borrow more without an act of Congress"],
    sourceUrl: uscode(31, "3101"),
    glossaryTerms: ["debt-limit"],
    aliases: ["debt ceiling"],
    covers: [{ code: "usc", title: 31, from: "3101" }],
  },
];

const RULES: readonly Authority[] = [
  {
    id: "congressional-review-act",
    cite: "5 U.S.C. §§801–808",
    title: "The Congressional Review Act",
    kind: "statute",
    summary:
      "Agencies send each new rule to Congress. Congress can overturn a rule by a joint resolution of disapproval, which moves under fast-track procedures in the Senate.",
    enables: ["Veto a resolution of disapproval aimed at the administration's own rule"],
    limits: [
      "A disapproval resolution signed into law voids the rule",
      "The agency may not then issue a substantially similar rule without new authority from Congress (§801(b)(2))",
    ],
    sourceUrl: uscode(5, "801"),
    glossaryTerms: ["rulemaking"],
    aliases: ["Congressional Review Act", "CRA"],
    covers: [{ code: "usc", title: 5, from: "801", to: "808" }],
  },
  {
    id: "eo-12866",
    cite: "Exec. Order No. 12866, 58 Fed. Reg. 51735 (1993)",
    title: "Executive Order 12866: Regulatory Planning and Review",
    shortTitle: "Executive Order 12866",
    kind: "executive-order",
    summary:
      "Executive agencies must send significant proposed and final rules to the Office of Information and Regulatory Affairs before they're published. The office reviews each rule along with an analysis of its costs and benefits.",
    enables: ["Review an agency's significant rule at the White House before it issues"],
    limits: ["Review of a rule is normally completed within ninety days (§6(b))", "It reaches executive agencies, not the independent regulatory agencies"],
    sourceUrl: "https://www.archives.gov/files/federal-register/executive-orders/pdf/12866.pdf",
    glossaryTerms: ["rulemaking", "omb"],
    aliases: ["Executive Order 12866", "Exec. Order 12866", "EO 12866", "E.O. 12866"],
  },
  {
    id: "eo-11030",
    cite: "Exec. Order No. 11030 (1962), as amended",
    title: "Executive Order 11030: preparing and publishing executive orders",
    shortTitle: "Executive Order 11030",
    kind: "executive-order",
    summary:
      "This order sets how a proposed executive order or proclamation is drafted and cleared. It goes to the Director of the Office of Management and Budget, then to the Attorney General for form and legality. After that, you sign it and it's published.",
    enables: ["Sign an executive order or proclamation once it has been cleared"],
    limits: ["The Attorney General reviews each proposed order for form and legality"],
    sourceUrl: "https://www.archives.gov/federal-register/codification/executive-order/11030.html",
    glossaryTerms: ["executive-order", "omb"],
    aliases: ["Executive Order 11030", "Exec. Order 11030", "EO 11030", "E.O. 11030"],
  },
  {
    id: "uniform-guidance-award-terms",
    cite: "2 C.F.R. §200.211",
    title: "Uniform Guidance, §200.211: information contained in a federal award",
    kind: "regulation",
    summary: "A federal award must contain certain information, including its general terms and conditions and any specific conditions the awarding agency attaches.",
    enables: ["Attach terms and conditions to a federal grant through the awarding agency"],
    limits: ["A condition has to rest on the program's own statute. Courts strike a condition Congress never attached"],
    sourceUrl: "https://www.ecfr.gov/current/title-2/section-200.211",
    aliases: ["Uniform Guidance"],
    covers: [{ code: "cfr", title: 2, from: "200.211" }],
  },
  {
    id: "fpasa-121",
    cite: "40 U.S.C. §121(a)",
    title: "Federal Property and Administrative Services Act: presidential policies",
    kind: "statute",
    summary: "You can prescribe the policies and directives needed to carry out the law on federal procurement and property management.",
    enables: ["Set policy for what the government buys and how it manages its property"],
    limits: ["Reaches federal procurement and property, not what anyone else does", "The policies must be consistent with the Act"],
    sourceUrl: uscode(40, "121"),
    aliases: ["Federal Property and Administrative Services Act", "Procurement Act"],
    covers: [{ code: "usc", title: 40, from: "121" }],
  },
  {
    id: "federal-property-protection",
    cite: "40 U.S.C. §1315",
    title: "Law enforcement authority to protect federal property",
    kind: "statute",
    summary:
      "The Secretary of Homeland Security protects the buildings, grounds and property the federal government owns or occupies, and the people on them. The Secretary may designate officers to do it.",
    enables: ["Assign federal officers to protect a federal building or grounds"],
    limits: ["This covers federal property only. The streets around it are the state's and the city's to police"],
    sourceUrl: uscode(40, "1315"),
    covers: [{ code: "usc", title: 40, from: "1315" }],
  },
  {
    id: "ocsla",
    cite: "43 U.S.C. §1344",
    title: "The five-year offshore leasing program (Outer Continental Shelf Lands Act, §18)",
    shortTitle: "The Outer Continental Shelf Lands Act",
    kind: "statute",
    summary:
      "The Secretary of the Interior prepares a five-year program of offshore oil and gas lease sales, after comment from states and the public, and sends it to Congress and the President.",
    enables: ["Direct the Interior Department to plan lease sales in a federal offshore area", "Withdraw unleased offshore areas from leasing (43 U.S.C. §1341(a))"],
    limits: ["A lease sale must be in an approved five-year program", "Environmental review, the sale and drilling permits are separate decisions"],
    sourceUrl: uscode(43, "1344"),
    aliases: ["Outer Continental Shelf Lands Act", "OCSLA"],
    covers: [{ code: "usc", title: 43, from: "1331", to: "1356" }],
  },
];

export const DOMESTIC_AUTHORITIES: readonly Authority[] = [...DISASTERS, ...TRADE, ...BUDGET, ...RULES];
