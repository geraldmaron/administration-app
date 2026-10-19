/** References teach the legal framework; a source does not make every modeled action lawful. */
const CONSTITUTION = { label: "U.S. Constitution", url: "https://www.archives.gov/founding-docs/constitution-transcript", edition: "National Archives transcription" };
const code = (label: string, file: string, title: number) => ({ label, url: `https://www.govinfo.gov/content/pkg/USCODE-2024-title${title}/html/${file}.htm`, edition: "U.S. Code, 2024 edition" });

export const AUTHORITIES = {
  "war-powers": {
    title: "Force, Congress and War Powers", basis: "Article II, §2; 50 U.S.C. §§1542–1544",
    summary: "Commander in Chief authority operates alongside congressional war powers and statutory consultation, reporting and termination requirements.",
    limits: "Consult Congress in every possible instance before hostilities. Section 1543 requires reports within 48 hours in specified circumstances. Section 1544(b) generally requires termination within 60 days of a hostilities report being submitted or required, subject to its exceptions and a limited withdrawal extension. These clocks are not a general authorization to start any war.",
    model: "The workspace tracks modeled authorization, reporting and withdrawal obligations. Review the action's actual authority and restrictions separately from its operational forecast.",
    sources: [CONSTITUTION, code("Consultation · §1542", "USCODE-2024-title50-chap33-sec1542", 50), code("Reporting · §1543", "USCODE-2024-title50-chap33-sec1543", 50), code("Termination · §1544", "USCODE-2024-title50-chap33-sec1544", 50)],
  },
  appointments: {
    title: "Appointments and Senate consent", basis: "Article II, §2, clause 2",
    summary: "The President nominates ambassadors, Supreme Court judges and other officers covered by the Appointments Clause; appointment generally requires Senate advice and consent.",
    limits: "Congress may vest appointment of inferior officers in the President alone, courts of law or department heads. Acting service and vacancies have additional statutory conditions; a vacancy is not blanket permission to bypass confirmation.",
    model: "The available seat, nomination and service actions reflect the modeled office rules, not every appointment mechanism in federal law.", sources: [CONSTITUTION],
  },
  "judicial-review": {
    title: "Courts and the executive", basis: "Article III, §§1–2",
    summary: "The Constitution vests federal judicial power in the Supreme Court and inferior courts Congress establishes. Federal courts hear cases within their jurisdiction, including cases arising under federal law.",
    limits: "A judge's modeled outlook is not a prediction or instruction about a ruling. Nominating judges does not give the President control over their decisions. Article III judges hold office during good behavior.",
    model: "Follow the specific case, order, forum and response. A requested stay or review is distinct from a filed response or a granted order.", sources: [CONSTITUTION],
  },
  "inspectors-general": {
    title: "Inspector General independence", basis: "5 U.S.C. §403",
    summary: "The statute provides for specified presidentially appointed Inspectors General and protects their ability to initiate and complete audits and investigations.",
    limits: "Removal and transfer require written communication to both Houses of Congress at least 30 days beforehand. The source also includes additional detailed requirements and related amendments; choosing a reason in the interface is not itself proof that a removal is legally sufficient.",
    model: "The roster and notices represent the game's tracked offices and notice lifecycle. An investigation's findings must come from its recorded evidence, not a selected template.", sources: [code("Inspector General appointments and removal", "USCODE-2024-title5-partI-chap4-sec403", 5)],
  },
  "intelligence-findings": {
    title: "Covert findings and oversight", basis: "50 U.S.C. §3093",
    summary: "Covert action requires a presidential determination tied to identifiable foreign-policy objectives and national security, documented in a finding under statutory conditions.",
    limits: "A finding cannot authorize a violation of the Constitution or a federal statute. Congressional notification, restricted access and delayed notification each have conditions. Selecting a policy objective does not establish the legal sufficiency of a finding or justify withholding notice.",
    model: "The operation comparison, counsel assessment, finding and notice status remain separate. The model does not expose every statutory procedure.", sources: [code("Presidential approval and reporting", "USCODE-2024-title50-chap44-subchapIII-sec3093", 50)],
  },
  "intelligence-collection": {
    title: "Collection authority has limits", basis: "50 U.S.C. §3036",
    summary: "The CIA charter describes foreign-intelligence collection and other functions under national-security direction.",
    limits: "The charter expressly withholds police, subpoena, law-enforcement and internal-security functions. It is not a general authorization for domestic surveillance; other collection methods and agencies have their own legal requirements.",
    model: "A collection assignment changes the modeled foreign-intelligence task. An unobserved assessment remains unknown and a report's confidence is not certainty.", sources: [code("CIA Director and functions", "USCODE-2024-title50-chap44-subchapI-sec3036", 50)],
  },
  "executive-direction": {
    title: "Executive direction and statutory duties", basis: "Article II, §§1–3",
    summary: "The Constitution vests executive power in the President and requires faithful execution of the laws.",
    limits: "Direction remains subject to statutes, appropriations, judicial orders and the legal independence or protections of particular offices. A directive cannot create an appropriation or override a statute merely because the President signed it.",
    model: "Use the recorded institution and relevant action. The comparison shows modeled effects and refusals; it does not replace a legal finding.", sources: [CONSTITUTION],
  },
  "domestic-force": {
    title: "Domestic military use is exceptional", basis: "18 U.S.C. §1385; 10 U.S.C. §251",
    summary: "The Posse Comitatus Act restricts using specified armed forces to execute domestic laws except where expressly authorized by the Constitution or an Act of Congress.",
    limits: "Section 251 is one specific Insurrection Act pathway. It requires an insurrection against a state's government and a request from its legislature, or its governor if the legislature cannot convene. It is not a blanket response to protest or an ordinary emergency. Other statutory pathways have different prerequisites.",
    model: "Generic agent surges, military federalization and domestic troop deployment are unavailable because their mission, jurisdiction, findings, command status and statutory procedures are not modeled. State support coordination does not itself federalize or deploy forces.", sources: [code("Posse Comitatus restriction", "USCODE-2024-title18-partI-chap67-sec1385", 18), code("Federal aid for state governments", "USCODE-2024-title10-subtitleA-partI-chap13-sec251", 10)],
  },
  "emergency-relief": {
    title: "Disaster declarations and assistance", basis: "Stafford Act · 42 U.S.C. §5170",
    summary: "A major-disaster declaration generally follows a governor's request describing severity, state and local capacity, resources and applicable commitments. Tribal chief executives have a statutory request pathway.",
    limits: "A major-disaster declaration is not a general military or police power and is not unlimited funding. Other emergency declarations and assistance programs have their own authorities and conditions.",
    model: "The declaration, program funding, resources and delivered result should be read separately. A declaration alone is not evidence that assistance has reached a place.", sources: [code("Major-disaster declaration procedure", "USCODE-2024-title42-chap68-subchapIV-sec5170", 42)],
  },
  tariffs: {
    title: "Tariff powers are statutory", basis: "Trade Act of 1974, §301 · 19 U.S.C. §2411",
    summary: "Congress delegates particular trade powers through statutes. Section 301 provides one framework for action by the U.S. Trade Representative under presidential direction against specified trade practices.",
    limits: "Section 301 is an example of a legal framework, not blanket authority for any tariff. Procedures, findings, exceptions and challenges matter. A 100% duty is not legally synonymous with an import ban.",
    model: "This workflow models one tracked category and an additional rate per order, with trade, price and revenue effects. It does not implement every investigation or statutory route; goods and incidence do not establish legal authority by themselves.", sources: [code("Trade Act §301 actions", "USCODE-2024-title19-chap12-subchapIII-sec2411", 19)],
  },
  treaties: {
    title: "Treaties and consent", basis: "Article II, §2, clause 2",
    summary: "Article II treaties require Senate advice and consent, with two thirds of Senators present concurring.",
    limits: "Senate consent and presidential ratification are separate steps. International agreements can have other legal bases; duration, termination and obligations depend on the instrument and law, not a blanket rule about the current President's term.",
    model: "The agreement's signature and ratification mechanics describe the simulation's supported path, not every type of international agreement.", sources: [CONSTITUTION],
  },
} as const;
export type AuthorityTopic = keyof typeof AUTHORITIES;
