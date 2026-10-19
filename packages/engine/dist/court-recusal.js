/** 28 U.S.C. §455(b)(3): prior government advice about this controversy bars participation. */
export function priorGovernmentAdviceRecusal(personId, challenged) {
    return challenged?.legalReviewer?.person === personId;
}
