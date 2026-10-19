export const TARIFF_STATUTES = {
    s232: {
        id: "s232", name: "Section 232", cite: "19 U.S.C. §1862", purpose: "National security",
        // The statute gives Commerce 270 days and the President 90 more; the 2025
        // copper and lumber investigations each took about five months.
        investigation: { by: "Commerce", subject: "goods", weeks: 20 },
        cap: null, clockDays: null, reach: "one-country", courts: "settled",
        courtNote: "Courts have upheld these tariffs since 1976, as long as Commerce found a security threat first.",
    },
    s301: {
        id: "s301", name: "Section 301", cite: "19 U.S.C. §2411", purpose: "Unfair trade practices",
        // Twelve months by statute; the 2017 China investigation took seven.
        investigation: { by: "the Trade Representative", subject: "partner", weeks: 26 },
        cap: null, clockDays: null, reach: "one-country", courts: "settled",
        courtNote: "Courts upheld the China tariffs under this law. They can still be challenged at the Court of International Trade.",
    },
    s201: {
        id: "s201", name: "Section 201", cite: "19 U.S.C. §2251", purpose: "A surge of imports hurting an industry",
        // The Commission has 120 days after a petition.
        investigation: { by: "the International Trade Commission", subject: "goods", weeks: 17 },
        // 19 U.S.C. §2253(e)(3): no more than 50 points above the rate in force.
        cap: 0.5, clockDays: 4 * 365, reach: "every-supplier", courts: "settled",
        courtNote: "A safeguard applies to every country that sells the goods, and it starts to phase down after its first year.",
    },
    s122: {
        id: "s122", name: "Section 122", cite: "19 U.S.C. §2132", purpose: "A balance-of-payments deficit",
        investigation: null, cap: 0.15, clockDays: 150, reach: "one-country", courts: "untested",
        courtNote: "No President had used this law before 2026, so courts haven't settled how far it reaches. After 150 days only Congress can extend it.",
    },
    s338: {
        id: "s338", name: "Section 338", cite: "19 U.S.C. §1338", purpose: "A country discriminating against American goods",
        investigation: null, cap: 0.5, clockDays: null, reach: "one-country", courts: "untested",
        courtNote: "This 1930 law was first used in 2026, and courts haven't ruled on it. Expect a lawsuit.",
    },
};
export const TARIFF_STATUTE_ORDER = ["s232", "s301", "s201", "s122", "s338"];
export function isTariffStatute(value) {
    return value !== undefined && value in TARIFF_STATUTES;
}
