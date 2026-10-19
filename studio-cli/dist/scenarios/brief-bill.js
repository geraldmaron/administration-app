export function billBriefSection(spec) {
    if (spec.cast !== "liveBill")
        return [];
    return [
        "Live-bill binding",
        'Use cast { "pick": "liveBill" } and exactly one condition { "kind": "liveBill", "stage": "markup" | "conference", "act"?: "...", "responseText"?: "base" | "targeted" | "both" }. For markup, omit responseText and give one reply commitment.billText { "action": "propose" }. For conference, a single responseText matches one recommendation. A two-way conference choice uses responseText "both" and two replies recommending "house" and "senate"; the binder requires different text actually passed by each chamber. An optional act pins a specific amendable measure.',
        "Write {{billTitle}} for the live measure and {{billProvision}} for a single proposed provision. A two-way conference choice uses {{billHouseProvision}} and {{billSenateProvision}} for the distinct passed texts. The binder freezes the bill id, stage, text and introduction turn; do not assert a chamber vote or future outcome the frozen state cannot support. The command uses the existing congressional action and costs no authored metric. Do not combine it with another typed action or impact.",
        "A bill still belongs to Congress after the President's answer. Rejoinders may say the proposal or recommendation was delivered; they may not say Congress adopted it or the law changed at commit.",
        "",
    ];
}
