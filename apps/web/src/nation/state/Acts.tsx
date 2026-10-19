import { AuthorityHelp } from "../../help/AuthorityHelp";
import type { Campaign, ConditionKind } from "@admin/engine";
import { localeActOptions, place, type LocaleMatter, type StateDossier } from "@admin/player-core";
import type { StateId } from "@admin/world";
import { EmptyState, Icon, buttonClass } from "@admin/ui-web";
import { useBuilt } from "../../shell/built-routes";
import { Door } from "../../shell/Door";

/** The desk for sending federal power into a state with nothing there to answer. */
export function powerHref(state: StateId): string {
  return `${place.state(state)}?power=1`;
}

/** The state's act desk for one matter: the same route, opened on the comparison. */
export function actHref(state: StateId, cause: ConditionKind): string {
  return `${place.state(state)}?${new URLSearchParams({ act: cause }).toString()}`;
}

function MatterCard({ campaign, state, matter, lead }: { readonly campaign: Campaign; readonly state: StateId; readonly matter: LocaleMatter; readonly lead: boolean }) {
  const options = localeActOptions(campaign, state, matter.cause);
  return (
    <li className="act-matter ui-card-door">
      <p className="act-matter__title">
        <Icon name="caution" size={16} />
        <Door href={actHref(state, matter.cause)} className="ui-card-door__link">
          {matter.title}
        </Door>
      </p>
      <p className="act-matter__line">{matter.request ? `${matter.request.reason} ${matter.request.weeksLeft} ${matter.request.weeksLeft === 1 ? "week" : "weeks"} left to answer.` : "Nothing has been asked of Washington over this."}</p>
      <ul className="act-options" aria-label={`What you can do about the ${matter.title.toLowerCase()}`}>
        {options.map((option) => (
          <li key={option.id} className="act-option" data-locked={option.locked ? "true" : undefined}>
            <span className="act-option__name">{option.name}</span>
            <span className="act-option__cost">{option.locked ? "Not available" : option.costText}</span>
            {option.locked ? <span className="act-option__why">{option.locked}</span> : null}
          </li>
        ))}
      </ul>
      {lead ? null : (
        <Door href={actHref(state, matter.cause)} className={buttonClass("secondary", "sm")}>
          Compare the acts on the {matter.title.toLowerCase()}
        </Door>
      )}
    </li>
  );
}

/**
 * What the President can do about this state: each matter open in it, with
 * every locale act's price and what blocks the ones that are blocked. The
 * first matter's door is the screen's own verb, at the foot of the panel.
 */
export function Acts({ campaign, dossier, matters }: { readonly campaign: Campaign; readonly dossier: StateDossier; readonly matters: readonly LocaleMatter[] }) {
  const built = useBuilt();
  return (
    <section id="state-acts" className="state-section" aria-labelledby="state-acts-title">
      <h2 id="state-acts-title" className="brief-section__title">
        <Icon name="sign" size={20} /> Federal response
      </h2>
      <p className="brief-section__note">
        Some acts need a declared emergency reaching the state.{" "}
        {built(place.emergency()) ? <Door href={place.emergency()}>Declarations are made on the emergencies screen.</Door> : null}
      </p>
      <AuthorityHelp topic="domestic-force" compact />
      <div className="act-matter act-power ui-card-door">
        <p className="act-matter__title">
          <Icon name="shield" size={16} />
          <Door href={powerHref(dossier.id)} className="ui-card-door__link">
            Review federal authority in {dossier.name}
          </Door>
        </p>
        <p className="act-matter__line">Generic agent surges, military federalization and domestic troop deployments are unavailable. This simulation does not model their required mission, jurisdiction, findings and procedures. An emergency declaration or unrest score cannot establish those prerequisites. A presidential order to surveil residents is refused.</p>
      </div>
      {matters.length === 0 ? (
        <EmptyState icon="emptyInbox" title="Nothing here to answer">
          A locale act answers a condition {dossier.name} is living through or a request it has made, and there is neither this week.
        </EmptyState>
      ) : (
        <ul className="act-matters">
          {matters.map((matter, index) => (
            <MatterCard key={matter.cause} campaign={campaign} state={dossier.id} matter={matter} lead={index === 0} />
          ))}
        </ul>
      )}
    </section>
  );
}
