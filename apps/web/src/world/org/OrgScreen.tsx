import { Card } from "@admin/ui-web";
import { useState } from "react";
import { place, type OrgCommitment, type OrgMember, type OrgScreenReading } from "@admin/player-core";
import { Collection, EmptyState, Field, Icon, Tag as StatusTag } from "@admin/ui-web";
import { MapView } from "../../map/MapView";
import { bodyLensId } from "../../map/lenses/set-lenses";
import { useBuilt } from "../../shell/built-routes";
import { Door } from "../../shell/Door";
import { Screen } from "../../shell/Screen";
import type { Valence } from "../../shell/valence";
import { Party } from "../set/Party";
import "../set/set.css";

const STANCE_VALENCE: Readonly<Record<OrgMember["stance"], Valence>> = { favorable: "good", neutral: "neutral", caution: "watch", adverse: "bad", unread: "neutral" };

function Alignment({ reading }: { readonly reading: OrgScreenReading }) {
  const { alignment } = reading;
  const counts = [
    { key: "favorable", label: "trust you" },
    { key: "neutral", label: "stand on the merits" },
    { key: "caution", label: "are wary" },
    { key: "adverse", label: "are hostile" },
    { key: "unread", label: "are unread" },
  ] as const;
  return (
    <Card role="region" className="set-section" aria-labelledby="org-alignment">
      <h2 id="org-alignment" className="set-section__title">
        <Icon name="layerBlocs" size={20} /> Where the coalition stands
      </h2>
      {alignment.readable > 0 ? (
        <div className="coalition">
          <p className="coalition__figure" data-valence={alignment.warm >= 0.66 ? "good" : alignment.warm >= 0.4 ? "watch" : "bad"}>
            <span className="coalition__number ui-valence-ink" data-valence={alignment.warm >= 0.66 ? "good" : alignment.warm >= 0.4 ? "watch" : "bad"}>
              {alignment.counts.favorable + alignment.counts.neutral}
              <span className="coalition__of"> of {alignment.readable}</span>
            </span>
            <span className="coalition__caption">foreign members trust you or stand on the merits. {alignment.word}.</span>
          </p>
          <div className="coalition__bar" role="img" aria-label={`Members by how they stand: ${counts.filter((entry) => alignment.counts[entry.key] > 0).map((entry) => `${alignment.counts[entry.key]} ${entry.label}`).join(", ")}`}>
            {counts.map((entry) => (alignment.counts[entry.key] > 0 ? <span key={entry.key} className="coalition__segment" data-stance={entry.key} style={{ flexGrow: alignment.counts[entry.key] }} /> : null))}
          </div>
        </div>
      ) : (
        <EmptyState icon="hidden" title="Their positions are unread">No known position is counted as support or opposition.</EmptyState>
      )}
      <ul className="set-counts" aria-label="Members by how they stand">
        {counts.map((entry) => (alignment.counts[entry.key] > 0 ? <li key={entry.key} className="ui-valence-ink" data-valence={STANCE_VALENCE[entry.key]}>
            <strong>{alignment.counts[entry.key]}</strong> {entry.label}
          </li> : null))}
      </ul>
      {reading.trade ? <p className="set-note">{reading.trade}</p> : null}
      {reading.scope ? <p className="set-note">{reading.scope}</p> : null}
    </Card>
  );
}

function MemberRow({ member }: { readonly member: OrgMember }) {
  return (
    <Party
      nation={member.nation}
      name={member.name}
      us={member.us}
      tags={
        <>
          {member.us ? <StatusTag tone="identity">You</StatusTag> : null}
          {member.atWar ? <StatusTag tone="risk">At war</StatusTag> : null}
        </>
      }
    >
      {!member.us ? <span className="org-member-standing ui-valence-ink" data-valence={STANCE_VALENCE[member.stance]}>
          <Icon name={member.stance === "unread" ? "hidden" : member.stance === "adverse" ? "caution" : member.stance === "favorable" ? "approve" : "neutral"} size={16} />
          {member.word}
        </span> : null}
    </Party>
  );
}

function Members({ reading }: { readonly reading: OrgScreenReading }) {
  return (
    <Card role="region" className="set-section" aria-labelledby="org-members">
      <h2 id="org-members" className="set-section__title">
        <Icon name="flag" size={20} /> Membership, by how members stand toward you
      </h2>
      <Collection items={reading.members} initial={12} noun="members" className="set-parties set-parties--wide" render={(member) => <MemberRow key={member.nation} member={member} />} />
    </Card>
  );
}

function Calls({ reading }: { readonly reading: OrgScreenReading }) {
  const open = reading.calls;
  if (open.length === 0) return null;
  return (
    <Card role="region" className="set-section" aria-labelledby="org-calls">
      <h2 id="org-calls" className="set-section__title">
        <Icon name="conflict" size={20} /> An ally under attack
      </h2>
      <ul className="set-list">
        {open.map((call) => (
          <li key={call.conflict} className="ui-row-target">
            <Door href={place.war(call.conflict)} className="ui-row-link">
              {call.aggressor} against {call.ally}
            </Door>
            <StatusTag tone={call.answered ? "good" : "caution"} icon={call.answered ? "favorable" : "caution"}>
              {call.answered ? "Answered" : "Waiting on you"}
            </StatusTag>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const COMMITMENT_STATUS: Readonly<Record<OrgCommitment["status"], string>> = { proposed: "Proposed", active: "Active", suspended: "Suspended", "wound-down": "Wound down" };

function Commitments({ reading }: { readonly reading: OrgScreenReading }) {
  return (
    <Card role="region" className="set-section" aria-labelledby="org-commitments">
      <h2 id="org-commitments" className="set-section__title">
        <Icon name="shield" size={20} /> Commitments
      </h2>
      <Collection
        items={reading.commitments}
        initial={8}
        noun="commitments"
        className="set-list"
        render={(commitment) => (
          <li key={commitment.id}>
            <span>{commitment.line}</span>
            <span className="set-list__word">
              <StatusTag tone={commitment.status === "active" ? "good" : commitment.status === "suspended" ? "caution" : "neutral"}>{COMMITMENT_STATUS[commitment.status]}</StatusTag> {commitment.toward === "body" ? "To the body" : "To a member"}
            </span>
          </li>
        )}
        empty="The United States has promised nothing to this body or to its members."
      />
      <p className="set-note">Commitments are changed in national security, where each is priced as its change from today.</p>
    </Card>
  );
}

/** Engaging a member or pledging to one is done on that government's own act workspace, which this opens at the member picked. */
function Engage({ reading, member, onMember }: { readonly reading: OrgScreenReading; readonly member?: string; readonly onMember?: (member: string) => void }) {
  const others = reading.members.filter((member) => !member.us);
  const [localMember, setLocalMember] = useState<string | undefined>();
  const requested = onMember ? member : localMember;
  const nation = requested ? others.find((entry) => entry.nation === requested)?.nation : others[0]?.nation;
  const setNation = (next: string) => onMember ? onMember(next) : setLocalMember(next);
  const built = useBuilt();
  const href = nation ? place.countryAct(nation) : undefined;
  if (others.length === 0) return null;
  return (
    <Card role="region" className="set-section" aria-labelledby="org-engage">
      <h2 id="org-engage" className="set-section__title">
        <Icon name="summit" size={20} /> Act toward a member
      </h2>
      <Field label="The member" hint="A call, an envoy, a visit, a summit or aid is made toward one government at a time, in its act workspace. Commitments to the body or its members are listed above and changed in national security.">
        {(control) => (
          <select {...control} className="ui-input" value={nation ?? ""} onChange={(event) => setNation(event.target.value)}>
            <option value="" disabled>Choose a member</option>
            {others.map((member) => (
              <option key={member.nation} value={member.nation}>
                {member.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      {requested && !nation ? <p className="set-note" role="status">The selected identifier is not a foreign member of this body. Choose a listed member.</p> : null}
      <div className="set-doors">
        {href && built(href) ? (
          <Door href={href} className="set-door">
            Act toward {others.find((member) => member.nation === nation)?.name}
          </Door>
        ) : (
          <p className="set-note">The act workspace for a member opens from its country file.</p>
        )}
      </div>
    </Card>
  );
}

/** An international body: its members set apart on the map, how they stand, the United States' seat and what is pledged. */
export function OrgScreen({ reading, member, onMember }: { readonly reading: OrgScreenReading; readonly member?: string; readonly onMember?: (member: string) => void }) {
  return (
    <Screen
      title={reading.name}
      icon="building"
      eyebrow={`${reading.kind} · ${reading.members.length} members`}
      lede={
        <>
          {reading.usRole} <Door href={place.world()}>World</Door>
        </>
      }
      screenClass="workspace"
      camera="keep"
    >
      <div className="set-room">
        <MapView title={`The ${reading.name} on the map`} lens={bodyLensId(reading.id)} camera={`set:${reading.set}`} selection={reading.set} note="Members set apart from the rest of the world." height={320} />
        <Calls reading={reading} />
        <Alignment reading={reading} />
        <Members reading={reading} />
        <Commitments reading={reading} />
        <Engage reading={reading} member={member} onMember={onMember} />
        <Card role="region" className="set-section" aria-labelledby="org-about">
          <h2 id="org-about" className="set-section__title">
            <Icon name="record" size={16} /> About the {reading.name}
          </h2>
          <p className="set-lede">{reading.history}</p>
        </Card>
      </div>
    </Screen>
  );
}

export function NoSuchOrg() {
  return (
    <Screen title="No such body" eyebrow="World" screenClass="workspace" camera="keep">
      <EmptyState icon="emptyRecord" title="That body is not one the game follows">
        <Door href={place.world()}>Back to the world</Door>
      </EmptyState>
    </Screen>
  );
}
