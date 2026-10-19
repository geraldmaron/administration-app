import { PARTY_WORDS, leanWords, peopleWords, place, type DistrictDossier, type StateDossier } from "@admin/player-core";
import { Collection, Icon, PartyBar } from "@admin/ui-web";

/** Lean as a mark on a short line from D+30 to R+30, so a column of districts reads as a spread before any figure. */
function LeanBar({ lean }: { readonly lean: number }) {
  const at = Math.min(1, Math.max(0, 0.5 + lean / 0.6));
  return (
    <span className="lean-bar" aria-hidden="true">
      <span className="lean-bar__mid" />
      <span className="lean-bar__dot" data-side={lean > 0.02 ? "r" : lean < -0.02 ? "d" : "even"} style={{ insetInlineStart: `${at * 100}%` }} />
    </span>
  );
}
import { Door } from "../../shell/Door";

function DistrictLine({ district, current }: { readonly district: DistrictDossier; readonly current: boolean }) {
  return (
    <li className="district-line ui-card-door" data-party={district.holder} aria-current={current ? "true" : undefined}>
      <span className="district-line__mark" aria-hidden="true" />
      <Door href={`${place.district(district.id)}&view=representation`} className="district-line__name ui-card-door__link">
        {district.code}
        {district.place ? <span className="district-line__place"> · {district.place}</span> : null}
      </Door>
      <span className="district-line__holder">{district.holder ? PARTY_WORDS[district.holder] : "No major-party holder"}</span>
      <span className="district-line__lean">
        <LeanBar lean={district.lean} />
        {leanWords(district.lean)}
      </span>
      <span className="district-line__people">{peopleWords(district.population)}</span>
    </li>
  );
}

/** Who the state sends to Congress: its two senators, its House delegation by party, and every district, each a door. */
export function Politics({ dossier, district }: { readonly dossier: StateDossier; readonly district?: string }) {
  const { house } = dossier;
  return (
    <section id="state-politics" className="state-section" aria-labelledby="state-politics-title">
      <h2 id="state-politics-title" className="brief-section__title">
        <Icon name="ballot" size={20} /> Representation in Congress
      </h2>
      {dossier.senate.length > 0 ? (
        <ul className="senate-seats" aria-label="Senate seats">
          {dossier.senate.map((seat, index) => (
            <li key={index} className={seat.senator ? "senate-seat ui-row-target" : "senate-seat"} data-party={seat.party}>
              <Icon name="subjectChamber" size={22} className="senate-seat__mark" />
              {seat.senator ? (
                <Door href={seat.senator.href} className="senate-seat__name ui-row-link">
                  {seat.senator.name}
                </Door>
              ) : null}
              <span className="senate-seat__party">{seat.partyWord}</span>
              <span className="senate-seat__class">Senate seat, {seat.up}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="brief-section__note">No senators: the District has no seat in the Senate.</p>
      )}
      <p className="brief-section__note">Electoral College allocation: {dossier.electoralVotes} votes. This is constitutional representation, not a current election forecast.</p>
      <PartyBar
        label={`House delegation, ${house.seats} ${house.seats === 1 ? "seat" : "seats"}`}
        parties={[
          { party: "democrat", seats: house.democrat, label: "Democratic" },
          { party: "republican", seats: house.republican, label: "Republican" },
          ...(house.unheld > 0 ? [{ party: "independent" as const, seats: house.unheld, label: "Other or vacant" }] : []),
        ]}
      />
      {dossier.districts.length > 0 ? (
        <>
          <h3 className="industry__title">
            {dossier.districts.length} {dossier.districts.length === 1 ? "district" : "districts"}
          </h3>
          <Collection
            as="ol"
            items={dossier.districts}
            initial={8}
            noun="districts"
            className="district-list"
            render={(entry) => <DistrictLine key={entry.id} district={entry} current={entry.id === district} />}
          />
        </>
      ) : null}
    </section>
  );
}
