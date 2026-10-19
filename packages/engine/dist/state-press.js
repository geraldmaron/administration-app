// The press corps' own state shape: the standing an administration has with the
// people who explain it to the country.
//
// Coverage existed as prose and as nothing else: articles were composed from
// feed items, and no matter what an administration did, said or refused to say,
// the papers wrote the same way about it forever. So the one lever a president
// spends more time on than any instrument on the board — talking, or declining
// to — was not a lever at all.
//
// It sits beside state-legislature.ts rather than inside it for the reason
// state-selectors.ts sits beside state-campaign.ts: the legislative vocabulary
// and the press vocabulary both grow, and one file holding both would cross the
// line this project refuses to cross. The rules that move these shapes live in
// press.ts, press-issued.ts, press-outlets.ts and press-framing.ts; every type
// here is re-exported from state-legislature.ts and from state.ts, which stays
// the single import path for campaign state.
export {};
