import { useMemo, useState } from "react";
import { framedThisWeek, type Campaign, type DecisionFramingKey } from "@admin/engine";
import {
  PRESS_ACTIONS,
  framingComparison,
  framingOffers,
  framingPacket,
  pressActComparison,
  pressActPacket,
  pressDesks,
  takeTheHitComparison,
  takeTheHitPacket,
} from "@admin/player-core";
import { Collection, Field, Icon } from "@admin/ui-web";
import { HillAct, type HillCommit } from "../congress/HillAct";

/** The three plays with the press against saying nothing, the interview and the leak aimed at the desk picked above them. */
export function PressPlays({ campaign, acts }: { readonly campaign: Campaign; readonly acts: HillCommit }) {
  const desks = pressDesks(campaign);
  const [desk, setDesk] = useState<string | undefined>(desks[0]?.id);
  const comparison = useMemo(() => pressActComparison(campaign, desk), [campaign, desk]);
  return (
    <div className="pr-act" role="group" aria-labelledby="press-plays">
      <h3 id="press-plays" className="ui-visually-hidden">
        <Icon name="microphone" size={20} /> Go in front of the press
      </h3>
      <HillAct tier="confirm"
        id="press"
        title="Compare the plays"
        comparison={comparison}
        acts={acts}
        packet={(option) => {
          const kind = PRESS_ACTIONS.find((entry) => entry === option);
          if (!kind) throw new Error("Pick a play to authorize.");
          return pressActPacket(campaign, kind, desk);
        }}
        again="Compare the plays again"
        projectAs={{
          campaign,
          act: (option) => {
            const kind = PRESS_ACTIONS.find((entry) => entry === option);
            return kind ? { act: "press", kind, ...(desk ? { desk } : {}) } : undefined;
          },
        }}
        terms={
          <Field label="The desk an interview or a story goes to" hint="A press conference is the whole corps, whichever desk is picked.">
            {(control) => (
              <select {...control} className="ui-input" value={desk ?? ""} onChange={(event) => setDesk(event.target.value || undefined)}>
                {desks.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        }
      />
    </div>
  );
}

/** The orders the podium can still explain, each framing compared against letting the order speak for itself. */
export function Framing({ campaign, acts }: { readonly campaign: Campaign; readonly acts: HillCommit }) {
  const offers = framingOffers(campaign);
  const [record, setRecord] = useState<string | undefined>(offers[0]?.id);
  const picked = offers.find((offer) => offer.id === record) ?? offers[0];
  const received = acts.committed && acts.by === "framing";
  return (
    <div className="pr-act" role="group" aria-labelledby="press-framing">
      <h3 id="press-framing" className="ui-visually-hidden">
        <Icon name="decision" size={20} /> Frame a decision
      </h3>
      {framedThisWeek(campaign) ? <p className="pr-note">The podium has already explained one act this week.</p> : null}
      {offers.length === 0 && !received ? <p className="pr-note">No order signed in the last two weeks is waiting to be explained.</p> : null}
      {picked || received ? (
        <>
          {picked ? (
            <Collection
              items={offers}
              initial={6}
              noun="orders to explain"
              className="pr-list"
              render={(offer) => (
                <li key={offer.id} data-picked={offer.id === picked.id ? "true" : undefined}>
                  <div>
                    <p className="pr-list__title">
                      {offer.name} <span className="pr-note">Signed {offer.signed}</span>
                    </p>
                    <p className="pr-note">{offer.weeksLeft === 0 ? "This is the last week it can be explained." : `${offer.weeksLeft} more week${offer.weeksLeft === 1 ? "" : "s"} to explain it.`}</p>
                  </div>
                </li>
              )}
            />
          ) : null}
          <HillAct tier="confirm"
            key={picked?.id ?? "framed"}
            id="framing"
            title={picked ? `Compare how to explain ${picked.name}` : "Compare the framings"}
            comparison={framingComparison(campaign, picked?.id ?? "")}
            acts={acts}
            packet={(option) => framingPacket(campaign, picked?.id ?? "", option as DecisionFramingKey)}
            again="Back to the framing offers"
            {...(picked ? { projectAs: { campaign, act: (option: string) => ({ act: "framing" as const, record: picked.id, framing: option as DecisionFramingKey }) } } : {})}
            receiptTitle={(column) => `Framed as ${column.label.toLowerCase()}: ${picked?.name ?? "the order"}`}
            terms={
              offers.length > 1 ? (
                <Field label="The order to explain">
                  {(control) => (
                    <select {...control} className="ui-input" value={picked?.id ?? ""} onChange={(event) => setRecord(event.target.value)}>
                      {offers.map((offer) => (
                        <option key={offer.id} value={offer.id}>
                          {offer.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
              ) : undefined
            }
          />
        </>
      ) : null}
    </div>
  );
}

/** Sending the press secretary out to take the week's bad answer, against letting it stand. */
export function TakeTheHit({ campaign, acts }: { readonly campaign: Campaign; readonly acts: HillCommit }) {
  const comparison = useMemo(() => takeTheHitComparison(campaign), [campaign]);
  return (
    <div className="pr-act" role="group" aria-labelledby="press-hit">
      <h3 id="press-hit" className="ui-visually-hidden">
        <Icon name="caution" size={20} /> Press secretary at the podium
      </h3>
      <HillAct tier="confirm" id="hit" title="Compare sending the press secretary" comparison={comparison} acts={acts} tone="danger" packet={() => takeTheHitPacket(campaign)} again="Back to the press office" projectAs={{ campaign, act: () => ({ act: "take-the-hit" }) }} />
    </div>
  );
}
