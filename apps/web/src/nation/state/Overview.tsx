import type { Campaign } from "@admin/engine";
import { formatDate, formatRatio, place, type GovernorReading, type StateApprovalReading, type StateDossier } from "@admin/player-core";
import { Flag, Gauge, Portrait, Series, Tag } from "@admin/ui-web";
import { PeopleStrip } from "./People";
import { Dossier, IdPlate, Vitals } from "../../shell/dossier/Dossier";
import { faceOf } from "../../media/faces";
import { Door } from "../../shell/Door";
import { stateFlagUrl } from "../../media/flags";

function Governor({ campaign, governor, personId }: { readonly campaign: Campaign; readonly governor: GovernorReading; readonly personId: string }) {
  const face = faceOf(campaign, personId, governor.name);
  return (
    <div id="state-governor" className="governor ui-card-door" data-party={governor.party}>
      <Portrait name={face.name} {...(face.src ? { src: face.src } : {})} monogram={face.monogram} size="md" decorative />
      <div className="governor__body">
        <p className="governor__role">Governor</p>
        <p className="governor__name">
          <Door href={place.person(personId)} className="ui-card-door__link">
            {governor.name}
          </Door>{" "}
          <span className="governor__party">{governor.partyWord}</span>
        </p>
      </div>
      <div className="governor__reading">
        <Gauge
          shape="meter"
          label="Toward your administration"
          value={governor.disposition}
          valueText={governor.dispositionWord}
          tone={governor.assents ? "good" : "bad"}
          marks={[{ at: governor.assentFloor, label: "Agrees to a request" }]}
          caption={governor.assents ? "Will go along with a request that needs the governor's assent." : "Withholds assent to anything that needs it."}
        />
      </div>
    </div>
  );
}

function Approval({ approval }: { readonly approval: StateApprovalReading }) {
  const history = approval.history.map((point) => point.approval);
  return (
    <div className="state-approval">
      <Gauge label="Approval here" value={approval.approval} valueText={formatRatio(approval.approval)} tone={approval.approval >= 0.5 ? "good" : approval.approval >= 0.4 ? "watch" : "bad"} marks={[{ at: 0.5, label: "Half the state" }]} caption="Simulated state approval · 50% reference" />
      <div className="state-approval__trend">
        {history.length > 1 ? (
          <Series label="Approval here, week by week" values={history} format={formatRatio} reference={{ value: 0.5, label: "Half the state" }} />
        ) : (
          <p className="brief-section__note">One week on record so far. The trend draws from the second week.</p>
        )}
        <p className="brief-section__note">{approval.historyNote}</p>
        {approval.divergence ? <p className="state-approval__divergence">{approval.divergence}</p> : null}
      </div>
    </div>
  );
}

/** The state's identity and its governor, ahead of any view: the flag, the seat, how the call reads, and who governs and how they stand. */
export function StateHead({ campaign, dossier }: { readonly campaign: Campaign; readonly dossier: StateDossier }) {
  const src = stateFlagUrl(dossier.id);
  const governorId = campaign.states[dossier.id]?.governor?.person;
  return (
    <Dossier kind="State file" house={dossier.id === "DC" ? "District of Columbia" : `State of ${dossier.name}`}>
      <IdPlate
        mark={<Flag name={dossier.name} {...(src ? { src } : {})} height={64} />}
        post={dossier.capitol ? `Seat of government: ${dossier.capitol.city}` : dossier.name}
        tags={
          <>
            <Tag icon="layerLean">{dossier.leanText}</Tag>
            {dossier.governor ? <Tag tone="identity" icon="subjectCapitol">{`${dossier.governor.partyWord} governor`}</Tag> : null}
          </>
        }
        reference={{ id: dossier.id, dated: formatDate(campaign.calendar) }}
      />
      {dossier.governor && governorId ? <Governor campaign={campaign} governor={dossier.governor} personId={governorId} /> : null}
    </Dossier>
  );
}

/** The overview view: the state's size and how approval here stands and has moved. */
export function Overview({ campaign, dossier }: { readonly campaign: Campaign; readonly dossier: StateDossier }) {
  return (
    <section className="state-section" aria-labelledby="state-overview-title">
      <h2 id="state-overview-title" className="ui-visually-hidden">
        Overview
      </h2>
      <Vitals
        label="The state's size"
        items={[
          { icon: "subjectChamber", label: "House seats", value: String(dossier.house.seats) },
          { icon: "layerLean", label: "Partisan lean", value: dossier.leanText },
          { icon: "subjectPerson", label: "People", value: dossier.populationText },
          { icon: "economyGrowth", label: "Output a year", value: dossier.grpText },
        ]}
      />
      {dossier.approval ? <Approval approval={dossier.approval} /> : null}
      <PeopleStrip campaign={campaign} dossier={dossier} />
    </section>
  );
}
