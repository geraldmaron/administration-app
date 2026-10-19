import type { Authority } from "./types.js";

// War and force, intelligence and secrecy, emergencies and sanctions, borders.

export const uscode = (title: number, section: string): string =>
  `https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title${title}-section${section}&num=0&edition=prelim`;

const WAR_AND_FORCE: readonly Authority[] = [
  {
    id: "war-powers-resolution",
    cite: "50 U.S.C. §§1541–1548",
    title: "The War Powers Resolution",
    kind: "statute",
    summary:
      "A 1973 law, passed over President Nixon's veto, that sets a clock on military action. You consult Congress before sending the armed forces into hostilities, report within forty-eight hours, and bring them out within sixty days unless Congress authorizes the use of force.",
    enables: [
      "Introduce the armed forces into hostilities for up to sixty days without a vote, once reported",
      "Extend that by thirty days on a written certification that the forces' safety requires it to withdraw them",
    ],
    limits: [
      "Consult Congress in every possible instance before introducing forces (§1542)",
      "Report to the Speaker and the President pro tempore within forty-eight hours (§1543)",
      "Withdraw within sixty days unless Congress declares war, authorizes the use, or extends the period by law (§1544(b))",
      "It grants the President no authority to introduce forces that the office did not already hold (§1547(d))",
    ],
    sourceUrl: uscode(50, "1541"),
    glossaryTerms: ["war-powers-resolution", "war-powers-report", "sixty-day-clock"],
    aliases: ["War Powers Act", "Pub. L. 93-148"],
    covers: [{ code: "usc", title: 50, from: "1541", to: "1548" }],
  },
  {
    id: "aumf-2001",
    cite: "Pub. L. 107-40, 115 Stat. 224 (2001)",
    title: "The Authorization for Use of Military Force of 2001",
    shortTitle: "The 2001 AUMF",
    kind: "statute",
    summary:
      "This law lets you use all necessary and appropriate force against the nations, organizations or persons you determine planned, authorized, committed or aided the attacks of September 11, 2001, or harbored them.",
    enables: ["Use force against those responsible for the September 11 attacks and those who harbored them"],
    limits: [
      "It reaches only those tied to the September 11 attacks. A new adversary needs an authorization of its own",
      "It is the specific statutory authorization the War Powers Resolution's sixty-day limit asks for (§2(b))",
    ],
    sourceUrl: "https://www.govinfo.gov/content/pkg/PLAW-107publ40/pdf/PLAW-107publ40.pdf",
    glossaryTerms: ["use-of-force-authorization"],
    aliases: ["2001 AUMF", "Pub. L. 107-40"],
  },
  {
    id: "combatant-commands",
    cite: "10 U.S.C. §§161–163",
    title: "Combatant commands and the chain of command",
    kind: "statute",
    summary:
      "You establish the combatant commands and set their missions and forces, through the Secretary of Defense and with the advice of the Chairman of the Joint Chiefs. The chain of command runs from you to the Secretary of Defense to the combatant commander.",
    enables: ["Establish combatant commands and assign their missions and forces (§161)", "Direct a combatant commander through the Secretary of Defense (§162)"],
    limits: [
      "The President notifies Congress after establishing a new command or significantly changing one, except during hostilities (§161(b))",
      "The Chairman of the Joint Chiefs may carry orders but holds no command over the forces (§163)",
    ],
    sourceUrl: uscode(10, "161"),
    glossaryTerms: ["combatant-command", "unified-command-plan", "chain-of-command"],
    aliases: ["Unified Command Plan"],
    covers: [{ code: "usc", title: 10, from: "161", to: "163" }],
  },
  {
    id: "guard-federal-service",
    cite: "10 U.S.C. §12406",
    title: "National Guard in federal service",
    kind: "statute",
    summary:
      "You can call members and units of a state's National Guard into federal service on one of three occasions. They are an invasion or the danger of one, a rebellion or the danger of one, or a time when you can't execute the laws with the regular forces.",
    enables: ["Call a state's National Guard into federal service on one of the three named occasions"],
    limits: ["Orders are issued through the governor of the state", "Only on invasion, rebellion, or an inability to execute the laws with the regular forces"],
    sourceUrl: uscode(10, "12406"),
    covers: [{ code: "usc", title: 10, from: "12406" }],
  },
  {
    id: "insurrection-act",
    cite: "10 U.S.C. §§251–255",
    title: "The Insurrection Act",
    kind: "statute",
    summary:
      "You can use the militia and the armed forces in three situations. A state may ask for help suppressing an insurrection. Unlawful obstruction may make ordinary judicial proceedings impracticable, so federal law needs enforcing. Or violence may deprive people of rights that a state cannot or will not protect.",
    enables: [
      "Send forces to a state that asks for help against an insurrection (§251)",
      "Use forces to enforce federal law against rebellion or unlawful obstruction (§252)",
      "Use forces to suppress violence that denies people their constitutional rights (§253)",
    ],
    limits: [
      "First the President must by proclamation order the insurgents to disperse (§254)",
      "Help under §251 needs the request of the state's legislature, or its governor if the legislature cannot be convened",
    ],
    sourceUrl: uscode(10, "251"),
    covers: [{ code: "usc", title: 10, from: "251", to: "255" }],
  },
  {
    id: "posse-comitatus",
    cite: "18 U.S.C. §1385",
    title: "The Posse Comitatus Act",
    kind: "statute",
    summary:
      "It's a crime to use the Army, Navy, Marine Corps, Air Force or Space Force to execute the laws, except where the Constitution or an act of Congress expressly authorizes it.",
    enables: [],
    limits: ["Federal troops can't police at home unless a statute such as the Insurrection Act expressly allows it"],
    sourceUrl: uscode(18, "1385"),
    covers: [{ code: "usc", title: 18, from: "1385" }],
  },
  {
    id: "emergency-construction",
    cite: "10 U.S.C. §2808",
    title: "Military construction in a war or national emergency",
    kind: "statute",
    summary:
      "In a declared war, or in a national emergency declared under the National Emergencies Act that requires use of the armed forces, the Secretary of Defense may build military construction projects that aren't otherwise authorized, if they're necessary to support that use. The money comes from unobligated military construction funds.",
    enables: ["Redirect unobligated military construction money to projects the emergency's use of the forces needs"],
    limits: [
      "Only during a declared war or a national emergency that requires use of the armed forces",
      "Only from money Congress appropriated for military construction and not yet obligated",
      "The Secretary reports each decision to the appropriate committees of Congress",
    ],
    sourceUrl: uscode(10, "2808"),
    glossaryTerms: ["national-emergency"],
    covers: [{ code: "usc", title: 10, from: "2808" }],
  },
  {
    id: "arms-export-notification",
    cite: "22 U.S.C. §2776",
    title: "Congressional review of arms sales (Arms Export Control Act, §36)",
    kind: "statute",
    summary:
      "Before you offer a major sale of defense articles or services to a foreign government, you must notify Congress. Congress then has a review period in which it can block the sale by joint resolution.",
    enables: ["Offer a major arms sale to a foreign government after notifying Congress", "Waive the review period by stating that an emergency requires the sale"],
    limits: ["Congress may block the sale by joint resolution during the review period, thirty days for most buyers and fifteen for close allies"],
    sourceUrl: uscode(22, "2776"),
    aliases: ["Arms Export Control Act"],
    covers: [{ code: "usc", title: 22, from: "2776" }],
  },
];

const INTELLIGENCE: readonly Authority[] = [
  {
    id: "covert-action-findings",
    cite: "50 U.S.C. §3093",
    title: "National Security Act, §503: covert action findings",
    kind: "statute",
    summary:
      "You can authorize a covert action only through a written finding that it's necessary to support identifiable foreign policy objectives and important to national security. You must report the finding to the intelligence committees.",
    enables: ["Authorize a covert action by a written finding"],
    limits: [
      "The finding goes to the intelligence committees before the action begins, or to the eight congressional leaders alone in extraordinary circumstances",
      "No finding may authorize an act that violates the Constitution or a statute",
      "A covert action may not aim to influence American political processes, public opinion, policy or media",
    ],
    sourceUrl: uscode(50, "3093"),
    glossaryTerms: ["covert-action"],
    aliases: ["Covert action finding", "presidential finding"],
    covers: [{ code: "usc", title: 50, from: "3093" }],
  },
  {
    id: "eo-12333",
    cite: "Exec. Order No. 12333, 46 Fed. Reg. 59941 (1981)",
    title: "Executive Order 12333: United States Intelligence Activities",
    shortTitle: "Executive Order 12333",
    kind: "executive-order",
    summary:
      "This standing executive order sets the duties and limits of the intelligence agencies. Section 2.11 forbids anyone employed by or acting for the government to engage or conspire in assassination.",
    enables: ["Assign the intelligence agencies their tasks", "Amend the order, including its own prohibitions, by a later executive order"],
    limits: [
      "It binds the executive branch only and can be changed by the President who signs a new order",
      "It cannot authorize what a statute or the Constitution forbids",
    ],
    sourceUrl: "https://www.archives.gov/federal-register/codification/executive-order/12333.html",
    aliases: ["Exec. Order 12333", "Executive Order 12333", "EO 12333", "E.O. 12333", "United States Intelligence Activities"],
  },
  {
    id: "eo-13526",
    cite: "Exec. Order No. 13526, 75 Fed. Reg. 707 (2010)",
    title: "Executive Order 13526: Classified National Security Information",
    shortTitle: "Executive Order 13526",
    kind: "executive-order",
    summary: "This order sets the system for classifying, safeguarding and declassifying national security information, at three levels: Top Secret, Secret and Confidential.",
    enables: ["Classify information whose release could damage national security", "Declassify information"],
    limits: [
      "Information may not be classified to conceal a violation of law or to prevent embarrassment (§1.7)",
      "Records of permanent historical value are declassified automatically at twenty-five years unless exempted (§3.3)",
    ],
    sourceUrl: "https://www.archives.gov/isoo/policy-documents/cnsi-eo.html",
    aliases: ["Executive Order 13526", "Exec. Order 13526", "EO 13526", "E.O. 13526"],
  },
  {
    id: "fisa",
    cite: "50 U.S.C. §1801 et seq.",
    title: "The Foreign Intelligence Surveillance Act",
    shortTitle: "FISA",
    kind: "statute",
    summary:
      "Electronic surveillance of foreign powers and their agents inside the United States needs an order from the Foreign Intelligence Surveillance Court. Surveillance outside the Act's procedures is a crime (§1809), and the person surveilled has a claim for damages (§1810).",
    enables: ["Seek a court order for electronic surveillance of a foreign power or its agent"],
    limits: ["Surveillance outside the Act's procedures is a federal crime", "The person surveilled unlawfully may sue the officials responsible"],
    sourceUrl: uscode(50, "1801"),
    aliases: ["Foreign Intelligence Surveillance Act", "FISA"],
    covers: [{ code: "usc", title: 50, from: "1801", to: "1813" }],
  },
];

const EMERGENCIES: readonly Authority[] = [
  {
    id: "national-emergencies-act",
    cite: "50 U.S.C. §§1601–1651",
    title: "The National Emergencies Act",
    kind: "statute",
    summary:
      "This law sets how you declare a national emergency and use the standby powers other statutes grant during one. It also sets the ways Congress can end the emergency.",
    enables: [
      "Declare a national emergency by proclamation, published in the Federal Register and sent to Congress (§1621)",
      "Use the emergency powers other statutes grant, naming each one used (§1631)",
    ],
    limits: [
      "Congress may end a declaration by joint resolution (§1622(a))",
      "A declaration ends on its anniversary unless the President publishes a notice continuing it (§1622(d))",
      "The President keeps and reports to Congress the records of what the emergency spends (§1641)",
    ],
    sourceUrl: uscode(50, "1621"),
    glossaryTerms: ["national-emergency"],
    aliases: ["NEA"],
    covers: [{ code: "usc", title: 50, from: "1601", to: "1651" }],
  },
  {
    id: "ieepa",
    cite: "50 U.S.C. §§1701–1708",
    title: "The International Emergency Economic Powers Act",
    shortTitle: "IEEPA",
    kind: "statute",
    summary:
      "In a national emergency declared over an unusual and extraordinary threat from abroad, you can block property in which a foreign country or national has an interest, and you can regulate or prohibit transactions with them. It's the law most American sanctions run on.",
    enables: ["Freeze a foreign threat's property held in the United States (§1702(a)(1)(B))", "Bar Americans from transactions with a designated party"],
    limits: [
      "Only against a threat with its source in whole or substantial part outside the United States, under a declared national emergency (§1701)",
      "It does not reach personal communications, humanitarian donations or informational materials (§1702(b))",
      "The President consults and reports to Congress on each use (§1703)",
    ],
    sourceUrl: uscode(50, "1701"),
    glossaryTerms: ["sanctions", "national-emergency"],
    aliases: ["International Emergency Economic Powers Act", "IEEPA"],
    covers: [{ code: "usc", title: 50, from: "1701", to: "1708" }],
  },
  {
    id: "defense-production-act",
    cite: "50 U.S.C. §4501 et seq.",
    title: "The Defense Production Act of 1950",
    shortTitle: "The Defense Production Act",
    kind: "statute",
    summary:
      "You can require that contracts necessary for the national defense be performed ahead of others. You can also allocate materials and facilities, and fund the expansion of production for national defense.",
    enables: [
      "Require a supplier to fill defense contracts ahead of its other customers (§4511(a))",
      "Allocate materials, services and facilities to promote the national defense",
      "Fund new production capacity with appropriated money (§4533)",
    ],
    limits: [
      "It orders priority and allocation. It gives no power to seize or run a private plant",
      "Most of its authorities lapse unless Congress extends them (§4564)",
    ],
    sourceUrl: uscode(50, "4511"),
    aliases: ["Defense Production Act", "DPA"],
    covers: [{ code: "usc", title: 50, from: "4501", to: "4568" }],
  },
  {
    id: "economic-stabilization-act",
    cite: "Pub. L. 91-379, tit. II, §202, 84 Stat. 799",
    title: "The Economic Stabilization Act of 1970",
    kind: "statute",
    summary: "This law authorized the President to stabilize prices, rents, wages and salaries. President Nixon used it for the wage and price freeze of August 1971.",
    enables: ["Freeze prices, rents, wages and salaries, while it was in force"],
    limits: ["No standing statute now lets a President fix prices. Congress would have to pass a new act granting the power"],
    sourceUrl: "https://www.govinfo.gov/content/pkg/STATUTE-84/pdf/STATUTE-84-Pg796.pdf",
    aliases: ["Economic Stabilization Act", "Pub. L. 91-379"],
    lapsed: "Expired in 1974, and Congress has not granted the power since.",
  },
];

const BORDERS: readonly Authority[] = [
  {
    id: "ina-border-control",
    cite: "8 U.S.C. §1103(a)(5)",
    title: "Control of the borders (Immigration and Nationality Act, §103)",
    kind: "statute",
    summary:
      "The Secretary of Homeland Security administers and enforces the immigration laws. The Secretary also has the power and duty to control and guard the borders against illegal entry.",
    enables: ["Direct the enforcement of the entry laws at the borders and ports of entry"],
    limits: ["Enforcement follows the grounds of entry Congress wrote. It adds none of its own"],
    sourceUrl: uscode(8, "1103"),
    aliases: ["Immigration and Nationality Act", "INA §103"],
    covers: [{ code: "usc", title: 8, from: "1103" }],
  },
  {
    id: "ina-212f",
    cite: "8 U.S.C. §1182(f)",
    title: "Immigration and Nationality Act, §212(f): suspension of entry",
    kind: "statute",
    summary:
      "Whenever you find that the entry of any aliens or class of aliens would be detrimental to the interests of the United States, you may suspend their entry by proclamation, or restrict it, for as long as you deem necessary.",
    enables: ["Suspend or restrict the entry of a class of aliens by proclamation"],
    limits: ["Needs a finding that the class's entry would be detrimental", "Reaches entry from abroad, not people already lawfully admitted"],
    sourceUrl: uscode(8, "1182"),
    aliases: ["INA §212(f)", "Section 212(f)"],
    covers: [{ code: "usc", title: 8, from: "1182" }],
  },
  {
    id: "case-zablocki",
    cite: "1 U.S.C. §112b",
    title: "The Case-Zablocki Act",
    kind: "statute",
    summary: "The Secretary of State must send Congress the text of the international agreements, other than treaties, that the United States enters.",
    enables: ["Enter executive agreements that do not go to the Senate as treaties, reporting them to Congress"],
    limits: ["Congress is told of every such agreement, so none is secret from it"],
    sourceUrl: uscode(1, "112b"),
    glossaryTerms: ["executive-agreement"],
    aliases: ["Case-Zablocki Act", "Case Act"],
    covers: [{ code: "usc", title: 1, from: "112b" }],
  },
];

export const SECURITY_AUTHORITIES: readonly Authority[] = [...WAR_AND_FORCE, ...INTELLIGENCE, ...EMERGENCIES, ...BORDERS];
