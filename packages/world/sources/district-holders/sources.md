# District holding party: source and method

Opened 2026-10-10. Covers `incumbentParty` and the district-to-lean assignment in `packages/world/src/dataset/district-figures.ts` (BL-84).

## Source

Clerk of the U.S. House of Representatives, member data: https://clerk.house.gov/xml/lists/MemberData.xml. 119th Congress, 2nd session, `publish-date` October 1, 2026, fetched 2026-10-10 with a generic user agent. 441 entries: 217 D, 221 R, 1 independent (caucusing with the Republicans), 2 vacant, six of them delegates. Only the `statedistrict`, `party` and `caucus` fields are read. No member name is stored in the repo.

## Finding

The table was authored as a tanh spread of leans in district-number order (district 1 the most Democratic, the last the most Republican) with the party read off the sign. It was never matched to the seats, so a district's party was a property of its number, not of the seat. Against the Clerk's data 191 of 436 rows named the wrong holder (CA-01 among them: the Clerk lists it as Republican; the dataset said Democratic, lean -0.761). The lean sign was not flipped: negative is Democratic throughout. Per-state party counts already matched `house-delegations.ts`; the defect was which district carried which party.

## Fix

`scripts/vendor-district-holders.mjs` sets each district's party from the Clerk entry and re-deals the state's existing lean values so the state's Democratic seats take the lowest values, Republican seats the highest and independents and vacancies the middle (the order `packages/engine/src/house-seats.ts` ranks by). Within a party the order is by district number: the Clerk data has no measure of how safe a seat is, so the leans are a ranked spread, not a partisan-voting index. Populations are untouched.

Known residue: 67 rows have a lean sign opposite their holder's party, where the authored spread does not straddle zero at the roster's boundary. The engine already offsets each state's leans to the roster at runtime (`rosterOffset`), so seat math is unaffected; the map lens reads the holder.

## Open items

- FL-20 and TX-23 are vacant in the source, and the CA-3 seat is listed as an independent; none has a named party, so they carry the party of their lean slot (FL-20, TX-23) or the caucus (CA-3).
- Leans remain unmeasured. A real Cook PVI or presidential-result-by-district feed would replace them.
