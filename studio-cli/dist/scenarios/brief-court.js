export function courtBriefSection(spec) {
    if (spec.cast !== "pendingOrderCase")
        return [];
    return [
        "Pending order case binding",
        'Use cast { "pick": "pendingOrderCase" } and exactly one matching gate. An ordinary { "kind": "pendingOrderCase" } gate freezes a filed, pending order challenge; one reply must carry commitment.orderRescission { "action": "rescind" }. An adverse lower judgment uses { "kind": "pendingOrderCase", "posture": "adverse-lower", "ruleState": "operative" } and three replies with commitment.orderReview choices "accept", "seek", and "seek-with-stay". The binder pins the engine-raised court-response case and its seven-day deadline. Do not combine either typed command with authored cost, impact, or another command.',
        "Write {{courtOrder}} and {{courtQuestion}} for the pinned order and legal question. Rescission ends future operation of the order; it does not erase past injury, dismiss the lawsuit, decide the merits, or promise how a court will rule. The engine rechecks the proceeding and order at commit.",
        "For an adverse lower judgment, accepting ends the order under the ruling; seeking review leaves the lower judgment in force. A separate stay request can be denied and does not pause the judgment when filed. Silence defaults to accepting the judgment at the engine case's own deadline. Do not claim an unimplemented-rule example until a real preview board reaches it.",
        "",
    ];
}
