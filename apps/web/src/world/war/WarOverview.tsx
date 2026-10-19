import { Card } from "@admin/ui-web";
import { place, type WarMeter, type WarScreenReading, type WarSide } from "@admin/player-core";
import { Bar, Flag, IconLabel, Tag } from "@admin/ui-web";
import { nationFlagUrl } from "../../media/flags";
import { Door } from "../../shell/Door";

const sides = (reading: WarScreenReading) => [reading.sides.defender, reading.sides.aggressor];
const score = (value: number) => `${Math.round(value * 100)}`;
const SETTLEMENT = { likely: "Likely", close: "Could go either way", unlikely: "Unlikely" } as const;

function Principal({ side }: { readonly side: WarSide }) {
  const principal = side.members.find((member) => member.role === "principal") ?? side.members[0];
  return <div className="war-principal" data-side={side.side}>
    <span className="war-kicker">{side.label}</span>
    {principal ? <Door href={place.country(principal.nation)} className="war-principal__identity"><Flag src={nationFlagUrl(principal.nation)} name={principal.name} height={40} decorative /><strong>{principal.name}</strong></Door> : <strong>Principal not recorded</strong>}
    <span className="war-note">{side.members.length} {side.members.length === 1 ? "government" : "governments"} participating</span>
  </div>;
}

export function WarOverview({ reading }: { readonly reading: WarScreenReading }) {
  const role = reading.usRole === "outside" ? "Not a belligerent" : `${reading.usRole === "principal" ? "Principal" : "Joined"} · ${reading.usSide === "defender" ? "defending side" : "attacking side"}`;
  return <Card role="region" className="war-overview" aria-labelledby="war-state">
    <div className="war-section-head"><h2 id="war-state"><IconLabel icon="conflict" size={20}>State of the war</IconLabel></h2><Tag tone={reading.over ? "neutral" : "risk"}>{reading.statusWord}</Tag></div>
    <div className="war-opponents"><Principal side={reading.sides.defender} /><div className="war-opponents__divider" aria-hidden="true"><span /><span aria-hidden="true">·</span><span /></div><Principal side={reading.sides.aggressor} /></div>
    <div className="war-operating-strip">
      <div><span className="war-kicker">Fighting intensity</span><div className="war-index"><strong>{score(reading.intensity.value)}<small>/100</small></strong><span>{reading.intensity.word}</span></div><Bar label={`Intensity of the fighting: ${reading.intensity.word}. Assessed index ${score(reading.intensity.value)} of 100`} value={reading.intensity.value} tone="reading" /><span className="war-note">Assessed index, not casualties</span></div>
      <div><span className="war-kicker">United States</span><strong className="war-operating-strip__value">{role}</strong><span className="war-note">{reading.usRole === "outside" ? "Entry requires a separate presidential decision" : "Decisions and authority are tracked below"}</span></div>
      <div><span className="war-kicker">Conflict record</span><strong className="war-operating-strip__value">{reading.age || "Predates this administration"}</strong><span className="war-note">{reading.beats.length} recorded {reading.beats.length === 1 ? "event" : "events"}</span></div>
    </div>
  </Card>;
}

function SideReading({ meter, label, adverse = false }: { readonly meter: WarMeter | undefined; readonly label: string; readonly adverse?: boolean }) {
  return <div className="war-side-reading"><span>{label}</span>{meter ? <><strong>{score(meter.value)}<small>/100 · {meter.word}</small></strong><Bar label={`${label}: assessed index ${score(meter.value)} of 100, ${meter.word}`} value={meter.value} tone={adverse ? "watch" : "reading"} /></> : <span className="war-unread"><IconLabel icon="info" size={14}>Not assessed</IconLabel></span>}</div>;
}

function SideEvidence({ side }: { readonly side: WarSide }) {
  return <Card role="region" className="war-side" data-side={side.side} aria-labelledby={`side-${side.side}`}>
    <h3 id={`side-${side.side}`}>{side.label}</h3>
    <div className="war-side__indices"><SideReading label="War support at home" meter={side.support} /><SideReading label="Exhaustion" meter={side.exhaustion} adverse /></div>
    <div className="war-losses"><span className="war-kicker">Cumulative losses</span><p>{side.casualties ?? "No loss estimate on file"}</p></div>
    <ul className="war-members" aria-label={`${side.label}: governments`}>{side.members.map((member) => <li key={member.nation}>
      <Door href={place.country(member.nation)} className="war-member__identity"><Flag name={member.name} src={nationFlagUrl(member.nation)} height={22} decorative /><strong>{member.name}</strong></Door>
      <span className="war-member__role">{member.role === "principal" ? "Principal" : "Joined"}{member.us ? " · United States" : ""}</span>
      {member.reasons.map((reason) => <p key={reason} className="war-note">{reason}</p>)}
      {member.committed.map((line) => <p key={line} className="war-member__commitment"><IconLabel icon="shield" size={15}>{line}</IconLabel></p>)}
    </li>)}</ul>
    {side.likely.length > 0 ? <div className="war-forecast"><span className="war-kicker">Possible future participants · assessment</span>{side.likely.map((joiner) => <p key={joiner.nation}><Door href={place.country(joiner.nation)}>{joiner.name}</Door><span>{joiner.forecast === "likely" ? "Likely" : "A close call"}</span></p>)}</div> : null}
  </Card>;
}

export function WarSides({ reading }: { readonly reading: WarScreenReading }) {
  return <Card role="region" className="war-panel" aria-labelledby="war-sides">
    <div className="war-section-head"><h2 id="war-sides"><IconLabel icon="shield" size={20}>The parties</IconLabel></h2><span className="war-note">Paired assessment · shared 0–100 scale</span></div>
    <p className="war-note">Support and exhaustion are staff indices, not surveys, force strength or a probability of victory. Unread sides remain unknown.</p>
    <div className="war-sides">{sides(reading).map((side) => <SideEvidence key={side.side} side={side} />)}</div>
  </Card>;
}

export function WarAssessment({ reading }: { readonly reading: WarScreenReading }) {
  return <Card role="region" className="war-panel war-assessment" aria-labelledby="war-assessment">
    <h2 id="war-assessment"><IconLabel icon="review" size={20}>Cause and leading assessment</IconLabel></h2>
    <div><span className="war-kicker">Recorded cause</span><p>{reading.cause}</p></div>
    <div><span className="war-kicker">Settlement outlook · staff assessment</span>{reading.peace ? <><strong>{SETTLEMENT[reading.peace.forecast]}</strong><p>{reading.peace.offered ? `Terms are on the table with ${reading.peace.counterpart}. ` : ""}{reading.peace.reasoning}</p></> : <p className="war-note">No settlement assessment is available for the United States in this conflict.</p>}</div>
  </Card>;
}
