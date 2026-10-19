import { uscode } from "./records-security.js";
import type { Authority } from "./types.js";

// Appointments and removal, succession, and the statutes that keep law
// enforcement and the independent bodies out of the President's direction.

const OFFICES: readonly Authority[] = [
  {
    id: "vacancies-reform-act",
    cite: "5 U.S.C. §§3345–3349d",
    title: "The Federal Vacancies Reform Act of 1998",
    shortTitle: "The Vacancies Act",
    kind: "statute",
    summary:
      "This law sets who may serve as acting head of an office that needs Senate confirmation while it's vacant, and for how long.",
    enables: [
      "Let the office's first assistant act, or direct another Senate-confirmed official or a senior employee of the agency to act (§3345)",
    ],
    limits: [
      "An acting officer may serve 210 days from the vacancy, longer while a nomination is pending (§3346)",
      "An act done by someone serving outside the Act's terms has no force or effect (§3348)",
    ],
    sourceUrl: uscode(5, "3345"),
    glossaryTerms: ["confirmation"],
    aliases: ["Vacancies Act", "Federal Vacancies Reform Act", "FVRA"],
    covers: [{ code: "usc", title: 5, from: "3345", to: "3349d" }],
  },
  {
    id: "inspector-general-act",
    cite: "5 U.S.C. §§401–424",
    title: "The Inspector General Act of 1978",
    kind: "statute",
    summary:
      "This law creates independent inspectors general inside the departments and agencies. They audit and investigate their programs and report to the agency head and to Congress.",
    enables: ["Nominate an inspector general", "Remove an inspector general, after notice to Congress (§403(b))"],
    limits: ["The President must give both houses the reasons in writing at least thirty days before removing an inspector general"],
    sourceUrl: uscode(5, "401"),
    glossaryTerms: ["inspector-general", "inspector-general-report"],
    aliases: ["Inspector General Act"],
    covers: [{ code: "usc", title: 5, from: "401", to: "424" }],
  },
  {
    id: "presidential-succession-act",
    cite: "3 U.S.C. §19",
    title: "The Presidential Succession Act of 1947",
    kind: "statute",
    summary:
      "If neither a President nor a Vice President can serve, the Speaker of the House acts as President. Next comes the President pro tempore of the Senate, then the cabinet secretaries in the order their departments were created.",
    enables: [],
    limits: [
      "The Speaker or President pro tempore must resign from Congress to act as President",
      "A cabinet officer must be eligible for the presidency and have been confirmed by the Senate",
    ],
    sourceUrl: uscode(3, "19"),
    glossaryTerms: ["inability"],
    aliases: ["Presidential Succession Act", "succession statute"],
    covers: [{ code: "usc", title: 3, from: "19" }],
  },
  {
    id: "federal-reserve-board",
    cite: "12 U.S.C. §§241–242",
    title: "Federal Reserve Act: the Board of Governors",
    shortTitle: "The Federal Reserve Act",
    kind: "statute",
    summary:
      "The Board of Governors of the Federal Reserve System has seven members. The President appoints them, with the Senate's consent, to fourteen-year terms, and can remove them only for cause.",
    enables: ["Nominate governors and designate the chair and vice chairs, with the Senate's consent"],
    limits: ["A governor may be removed only for cause (§242)", "The Board sets monetary policy on its own judgment, not the President's instruction"],
    sourceUrl: uscode(12, "242"),
    glossaryTerms: ["federal-reserve", "policy-rate"],
    aliases: ["Federal Reserve Act"],
    covers: [{ code: "usc", title: 12, from: "241", to: "242" }],
  },
];

const LAW_ENFORCEMENT: readonly Authority[] = [
  {
    id: "attorney-general-functions",
    cite: "28 U.S.C. §509",
    title: "Functions of the Attorney General",
    kind: "statute",
    summary: "The functions of the Department of Justice, its officers and its agencies belong to the Attorney General, with a few named exceptions.",
    enables: ["Set the Department's priorities through the Attorney General the President appoints"],
    limits: [
      "The decision to open, close or direct a case belongs to the Attorney General, not the President",
      "Department policy confines White House contact about a pending case to the Attorney General and the Deputy Attorney General",
    ],
    sourceUrl: uscode(28, "509"),
    glossaryTerms: ["attorney-general"],
    covers: [{ code: "usc", title: 28, from: "509" }],
  },
  {
    id: "irs-audit-prohibition",
    cite: "26 U.S.C. §7217",
    title: "Prohibition on executive branch influence over taxpayer audits",
    kind: "statute",
    summary:
      "The President, the Vice President and the staff of the Executive Office may not ask the Internal Revenue Service, directly or indirectly, to open or end an audit or investigation of a particular taxpayer.",
    enables: [],
    limits: ["An IRS employee who receives such a request must report it to the Treasury Inspector General for Tax Administration"],
    sourceUrl: uscode(26, "7217"),
    covers: [{ code: "usc", title: 26, from: "7217" }],
  },
  {
    id: "non-detention-act",
    cite: "18 U.S.C. §4001(a)",
    title: "The Non-Detention Act",
    kind: "statute",
    summary: "The United States may imprison or otherwise detain a citizen only under an act of Congress.",
    enables: [],
    limits: ["The President has no power of their own to hold a citizen without a statute that allows it"],
    sourceUrl: uscode(18, "4001"),
    aliases: ["Non-Detention Act"],
    covers: [{ code: "usc", title: 18, from: "4001" }],
  },
  {
    id: "fair-housing-act",
    cite: "42 U.S.C. §§3601–3619",
    title: "The Fair Housing Act",
    kind: "statute",
    summary:
      "The Act forbids discrimination in the sale or rental of housing (§3604). Housing and Urban Development takes complaints, the Attorney General sues over a pattern or practice, and a person who was harmed may sue in court (§3613).",
    enables: ["Direct the enforcement priorities of HUD and the Department of Justice under the Act"],
    limits: ["A private person may sue without the government (§3613)"],
    sourceUrl: uscode(42, "3601"),
    aliases: ["Fair Housing Act"],
    covers: [{ code: "usc", title: 42, from: "3601", to: "3619" }],
  },
  {
    id: "fair-labor-standards-act",
    cite: "29 U.S.C. §201 et seq.",
    title: "The Fair Labor Standards Act",
    kind: "statute",
    summary:
      "The Act sets the federal minimum wage and overtime pay (§207). The Secretary of Labor may supervise payment of back wages or sue for them (§216(c)), and a worker may sue the employer (§216(b)).",
    enables: ["Direct the Labor Department's wage and hour enforcement"],
    limits: ["A court may reduce liquidated damages for an employer who acted in good faith (§260)"],
    sourceUrl: uscode(29, "201"),
    aliases: ["Fair Labor Standards Act", "FLSA"],
    covers: [{ code: "usc", title: 29, from: "201", to: "262" }],
  },
  {
    id: "help-america-vote-act",
    cite: "52 U.S.C. §20901 et seq.",
    title: "The Help America Vote Act of 2002",
    kind: "statute",
    summary:
      "The Act sets minimum standards for the voting systems used in federal elections, including access for voters with disabilities (§301, 52 U.S.C. §21081). The Attorney General can sue to enforce them (§401, 52 U.S.C. §21111).",
    enables: ["Direct the Attorney General's enforcement of the federal voting system standards"],
    limits: ["The states run elections. The Act sets standards, and the Attorney General enforces them in court"],
    sourceUrl: uscode(52, "20901"),
    aliases: ["Help America Vote Act", "HAVA"],
    covers: [{ code: "usc", title: 52, from: "20901", to: "21145" }],
  },
];

export const OFFICE_AUTHORITIES: readonly Authority[] = [...OFFICES, ...LAW_ENFORCEMENT];
