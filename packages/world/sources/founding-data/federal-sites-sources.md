# Federal sites and state capitols: sources and caveats

Written 2026-10-10 for the map-first program's E3 (`packages/world/src/dataset/seed/federal-sites.tsv`, `seed/state-capitols.tsv` and their tables `dataset/federal-sites.ts`, `dataset/state-capitols.ts`). Every source below was opened on 2026-10-10. Coordinates are rounded to four decimal places (about 11 meters).

## Scope

- `federal-sites.tsv` has one row for each of the 76 institutions in `packages/engine/src/institution-catalog.ts`: 63 carry a sourced headquarters point and 13 record `location: none` with the reason. The engine test `institution-sites.test.ts` holds the table to the catalog, both ways.
- Every one of the fifteen cabinet departments has a sourced point. The validator refuses the table otherwise.
- `state-capitols.tsv` has 51 rows: the 50 state capitols and the District's seat of government.
- The validator (`validate/site-checks.ts`) holds every point inside the state it names, on the Census Bureau outlines the US map draws. Every seeded point sits strictly inside its own outline; none relies on the 4 kilometer water tolerance.

## How a point was chosen, in order of preference

1. **The headquarters building's own item.** Where the institution's Wikidata item has a "headquarters location" (P159) statement naming a building, the point is that building item's "coordinate location" (P625). `hq_source` cites the institution's item and the building it names; `source` cites the building's item.
2. **The headquarters statement's own coordinate.** Where P159 names only a city, but the statement carries a coordinate qualifier (and usually a street address), the point is that qualifier. Both `hq_source` and `source` cite the institution's item.
3. **A geocoded headquarters address.** Where the institution's item gives a headquarters street address but no coordinate (ICE, FDA, NOAA, ATF), the point is the U.S. Census Bureau geocoder's match for that address (`geocoding.geo.census.gov`, benchmark `Public_AR_Current`). The geocoder interpolates along the street segment, so the point is the address's place on its block rather than the building's footprint.
4. **No point.** Where no opened record gives an address or coordinate for the headquarters, or the institution has no single headquarters, the row records `none` and says which. A component is never placed at its parent's building unless its own record says it is headquartered there. That is why the four military bodies (Army, Navy, Air Force, Joint Chiefs) stand at the Pentagon: each item's own P159 names it. INR, Treasury's intelligence office and BIS stand nowhere: no record of theirs names a building.

The Wikidata API (`wbgetentities`) and query service were read with a generic user agent. The item label and description were checked against the row each time, so each item is the building or body the row names.

## Choices a reader might question

- **The presidency is the White House, not the executive office building.** The Executive Office of the President's item names the executive office building beside the White House (Q1312965) as its headquarters. The engine's `INST-PRESIDENCY` holds the President's own authorities (veto, pardon, command) and seats the Chief of Staff and the National Security Advisor, who work in the West Wing. So it stands at the White House (Q35525, "official residence and office of the President of the United States"). The Vice President's office, the National Security Council and OMB stand at the executive office building, because each of their own items names it.
- **Homeland Security is at St. Elizabeths, not the Nebraska Avenue Complex.** The department's Wikidata P159 still names the Nebraska Avenue Complex, with no dates. The English Wikipedia article's infobox (opened 2026-10-10) names the St. Elizabeths West Campus, with the coordinate 38.8547, -77.0000. That coordinate matches the department item's own coordinate location, which is the point used. Its longitude is rounded to whole thousandths in both places, so the pin is good to roughly 100 meters, not 11. DHS's Office of Intelligence and Analysis is placed separately, at the Nebraska Avenue Complex, because its own infobox names that complex.
- **The Secret Service is at 245 Murray Lane SW.** The agency's contact page (`https://www.secretservice.gov/contact`, opened 2026-10-10) gives "245 Murray Ln SW - BLDG T-5, Washington, DC 20223". The coordinate is the qualifier on the agency item's P159 statement, which carries the same address. The Census geocoder found no match for this campus address.
- **The FBI is at its Pennsylvania Avenue building.** Both the agency item's P159 and the English Wikipedia infobox name it, so the point follows them. A relocation, if one happens, is a row edit with a new opened date.
- **DEA is the weakest sourced row.** The agency item's P159 points at the wrong Arlington (the city in Texas). The English Wikipedia infobox names Arlington County, Virginia, citing a 2018 report that the agency recommitted to Pentagon City. The point is the agency item's own coordinate location, 38.8422, -77.0517, which falls in Pentagon City. No record opened ties that coordinate to a street address.
- **ATF.** The item's P159 names a building whose item carries the coordinate of 99 New York Avenue NE. The agency item's own street address is 99 New York Ave NE, so the point is the Census geocoder's match for that address, not the building item.
- **CDC.** The preferred P159 statement (Atlanta, since 2018) carries the coordinate of the Clifton Road campus, which the city annexed that year. That coordinate is used.
- **The Supreme Court's nine seats** stand at the Supreme Court Building (Q1579670, "seat of the Supreme Court of the United States"). The court's item names Washington with the building's coordinate as its preferred headquarters since 1935. The Federal Judiciary as a whole records no location. It is 94 district courts and 13 circuits, and placing it at the Court's building would be inheriting.

## Rows with no location, and why

| Institution | Reason |
|---|---|
| INST-JUDICIARY | No single headquarters: 94 district courts and 13 circuits. The Court's building is recorded on its nine seats. |
| INST-STATES | Fifty state governments and the District's, each at its own capitol in `state-capitols.tsv`. |
| INST-CAREER-SERVICE | The career workforce across every department's field offices; no headquarters of its own. |
| INST-NRC | The item and the encyclopedia name only North Bethesda, Maryland; no address or coordinate. |
| INST-NLRB | The item and the encyclopedia name only Washington, D.C.; no address or coordinate. |
| INST-TSA | The item's P159 names Pentagon City and the encyclopedia names Springfield, Virginia; neither gives an address, and they disagree. |
| INST-CISA | Only Washington, D.C.; the agency's contact page gives a mail address for legal service in Capitol Heights, Maryland, which is not a headquarters. |
| INST-BIS | Only Washington, D.C.; the bureau's building is not recorded on its item. |
| INST-USMS | Only Crystal City and Arlington County, Virginia; no address or coordinate. |
| INST-INR | A bureau inside the State Department; no record of its own names a building. |
| INST-OIA | An office inside the Treasury; no record of its own names a building. |
| INST-NCSC | No opened record names a headquarters. |
| INST-ODNI | The item names only McLean, Virginia; no address or coordinate. The counterterrorism center does carry a coordinate in McLean and is placed by its own record. |

A future pass should try each agency's own published headquarters address. Several agency sites refused automated reads on 2026-10-10 (nrc.gov, usmarshals.gov, dea.gov, fbi.gov, dni.gov returned 403). An address found there can be geocoded the way the ICE, FDA, NOAA and ATF rows were.

## State capitols

Each point is the capitol building item's coordinate location (P625), found by its English label through the Wikidata query service and checked against its description ("state capitol building of the U.S. state of …"). Where a label matched more than one item (California, Minnesota, Oregon), the item described as the current capitol was taken. Delaware's is Legislative Hall in Dover (Q1183954). Hawaii's item carries two normal-rank coordinates a few meters apart, and the first listed is used. The District's seat of government is its city hall (Q3180858), labeled by function because the building is named for a person. The `city` column is the capital city the item places the building in.

## Names

Many headquarters buildings honor people. The `site` column labels them by place or function, as the basing table does ("Justice Department headquarters, Pennsylvania Avenue", "Executive office building, 17th Street"). The Wikidata item URLs are item numbers alone, and the encyclopedia URLs name only agencies. `federal-sites.test.ts` refuses a site label that carries one of the building names the opened records use.
