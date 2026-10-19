import type { Campaign, ConversationBeat } from "@admin/engine";
import type { CastScenario } from "@admin/content";
import { formatDate, monogramFor, place, pressureSourceLabel, roleTitle, scenarioFiledDate, type MatterClock } from "@admin/player-core";
import { Card, CardContent, CardHeader, Countdown, Flag, Icon, IconBadge, OpenEnded, Portrait, Tag, type IconName } from "@admin/ui-web";
import { faceOf, type Face } from "../media/faces";
import { nationFlagUrl, stateFlagUrl } from "../media/flags";
import { ScenarioTags } from "./ScenarioTags";
import { executiveSeal } from "../media/authority";
import { Door } from "../shell/Door";

type Plate = Face & { readonly role: string };

/** Who is speaking, with their face where they have one. A narrator has none. */
function plateOf(campaign: Campaign, beat: ConversationBeat): Plate | undefined {
  const speaker = beat.speaker;
  switch (speaker.kind) {
    case "narrator":
      return undefined;
    case "vacant":
      return { name: "Vacant", monogram: "?", role: roleTitle(speaker.role) };
    case "player":
      return { name: speaker.name, monogram: monogramFor(speaker.name), role: speaker.title };
    case "official":
      return { ...faceOf(campaign, speaker.person, speaker.name), role: roleTitle(speaker.role) };
    case "counterpart":
      return { ...(speaker.person ? faceOf(campaign, speaker.person, speaker.name) : { name: speaker.name, monogram: monogramFor(speaker.name) }), role: "Their government" };
  }
}

/** The one sentence that says what happened, before anyone's opinion of it. */
function lede(cast: CastScenario, beats: readonly ConversationBeat[]): string {
  return beats.find((beat) => beat.speaker.kind === "narrator")?.text ?? cast.def.context?.standing ?? beats[0]?.text ?? cast.script.subject;
}

function Voices({ campaign, beats }: { readonly campaign: Campaign; readonly beats: readonly ConversationBeat[] }) {
  const spoken = beats.filter((beat) => beat.speaker.kind !== "narrator");
  if (spoken.length === 0) return null;
  return (
    <ol className="voices">
      {spoken.map((beat, index) => {
        const plate = plateOf(campaign, beat);
        return (
          <li key={index} className="voice">
            {plate ? <Portrait name={plate.name} {...(plate.src ? { src: plate.src } : {})} monogram={plate.monogram} size="md" decorative /> : null}
            <div>
              {plate ? (
                <p className="voice__who">
                  <span className="voice__name">{plate.name}</span> <span className="voice__role">{plate.role}</span>
                </p>
              ) : null}
              <p className="voice__text">{beat.text}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

type PressureSource = NonNullable<CastScenario["def"]["context"]>["pressures"][number]["source"];

/** Who is pressing, by the glyph a briefing reader would expect. */
const PRESSURE_ICON: Readonly<Record<PressureSource, IconName>> = {
  cabinet: "building",
  legislature: "subjectChamber",
  street: "eventUnrest",
  press: "press",
  military: "instrumentMilitary",
  business: "sectorFinance",
  ally: "world",
  adversary: "escalate",
  court: "court",
};

function Actors({ campaign, cast }: { readonly campaign: Campaign; readonly cast: CastScenario }) {
  const home = cast.counterpart === campaign.founding.nation;
  const nation = campaign.nations[cast.counterpart];
  const pressures = cast.def.context?.pressures ?? [];
  if (home && pressures.length === 0) return null;
  const flag = nationFlagUrl(cast.counterpart);
  return (
    <section className="grid gap-3" aria-labelledby="decision-who">
      <h2 id="decision-who" className="m-0 flex items-center gap-2 text-base font-semibold"><Icon name="subjectPerson" size={18} /> Parties and pressures</h2>
      <ul className="actors">
        {!home && nation ? (
          <li className="actor ui-row-target">
            <span className="actor__mark">
              <Flag name={nation.base.identity.name} {...(flag ? { src: flag } : {})} height={20} decorative />
            </span>
            <Door className="actor__name ui-row-link text-foreground no-underline hover:no-underline" href={place.country(cast.counterpart)}>{nation.base.identity.name}</Door>
            <span className="actor__want">The other government</span>
          </li>
        ) : null}
        {pressures.map((pressure) => (
          <li key={`${pressure.source}-${pressure.want}`} className="actor" data-source={pressure.source}>
            <span className="actor__mark">
              <IconBadge name={PRESSURE_ICON[pressure.source]} tone={pressure.source === "adversary" ? "red" : "neutral"} size={28} />
            </span>
            <span className="actor__name">{pressureSourceLabel(pressure.source)}</span>
            <span className="actor__want">{pressure.want}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The author and location remain visible without repeating the screen subject. */
function Masthead({ campaign, cast, beats }: { readonly campaign: Campaign; readonly cast: CastScenario; readonly beats: readonly ConversationBeat[] }) {
  const state = cast.locus?.state;
  const flagSrc = state ? stateFlagUrl(state) : nationFlagUrl(cast.counterpart);
  const from = beats.map((beat) => beat.speaker.kind === "official" ? plateOf(campaign, beat) : undefined).find(Boolean);
  return <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
    <div className="flex min-w-0 items-center gap-3">
      <img src={executiveSeal} alt="" className="size-12 shrink-0 object-contain" />
      <div className="min-w-0"><p className="m-0 text-sm font-semibold">The White House</p><p className="m-0 text-xs text-muted-foreground">Decision briefing · {formatDate(scenarioFiledDate(campaign, cast.script.subject))}</p></div>
    </div>
    <div className="flex flex-wrap gap-2"><ScenarioTags cast={cast} /></div>
    <dl className="m-0 grid w-full gap-3 text-sm sm:grid-cols-2">
      <div className="min-w-0"><dt className="text-xs text-muted-foreground">Prepared by</dt><dd className="m-0">{from ? <><strong>{from.name}</strong><span className="block text-xs text-muted-foreground">{from.role}</span></> : "The Situation Room"}</dd></div>
      {cast.locus ? <div className="min-w-0"><dt className="text-xs text-muted-foreground">Location</dt><dd className="m-0 flex flex-wrap items-center gap-2"><Flag name={cast.locus.placeName} {...(flagSrc ? { src: flagSrc } : {})} height={16} decorative />{cast.locus.placeName}{cast.locus.descriptor ? <span className="w-full text-xs text-muted-foreground">{cast.locus.descriptor}</span> : null}</dd></div> : null}
    </dl>
  </header>;
}

/** Known now: the deadline, what waiting costs and what is not yet known, kept beside the situation and never behind a disclosure. */
function Status({ cast, clock }: { readonly cast: CastScenario; readonly clock?: MatterClock }) {
  return (
    <Card role="region" className="min-w-0" aria-labelledby="decision-status"><CardHeader>
      <h2 id="decision-status" className="m-0 situation__label">
        <Icon name="pending" size={18} /> Timing and uncertainty
      </h2>
      </CardHeader><CardContent><dl className="status__list">
        <div>
          <dt>
            <Icon name="schedule" size={16} /> Deadline
          </dt>
          <dd>{clock ? <Countdown left={clock.left} window={clock.window} unit={clock.unit} {...(clock.due ? { dueText: formatDate(clock.due) } : {})} /> : <OpenEnded holds note="No rule sets one" />}</dd>
        </div>
        <div>
          <dt>
            <Icon name="caution" size={16} /> If you wait
          </dt>
          <dd>{cast.def.context?.inaction ?? "It stays on your desk, and time stays paused until you deal with it."}</dd>
        </div>
        <div>
          <dt>
            <Icon name="hidden" size={16} /> Not yet known
          </dt>
          <dd>{cast.def.context?.unknown ?? "Nothing the briefing flags. The estimates below are staff assessments, not outcomes."}</dd>
        </div>
      </dl></CardContent></Card>
  );
}

/**
 * What a President needs before weighing the answers: what happened, where
 * and when, who is involved, the facts, and beside them the deadline and the
 * cost of waiting.
 */
export function Situation({ campaign, cast, beats, clock }: { readonly campaign: Campaign; readonly cast: CastScenario; readonly beats: readonly ConversationBeat[]; readonly clock?: MatterClock }) {
  const particulars = cast.def.particulars ?? [];
  return (
    <article className="grid min-w-0 gap-4" aria-label="The briefing">
      <Card><CardContent className="pt-5"><Masthead campaign={campaign} cast={cast} beats={beats} /></CardContent></Card>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(16rem,1fr)]">
        <Card><CardHeader><h2 id="decision-what" className="m-0 flex items-center gap-2 text-base font-semibold"><Icon name="intel" size={18} /> Situation at a glance</h2></CardHeader><CardContent className="grid gap-5">
          {particulars.length > 0 ? <dl className="m-0 grid gap-3 sm:grid-cols-2" aria-label="Known facts">{particulars.map((particular) => <div key={particular.label} className="min-w-0 border-l-2 border-primary pl-3"><dt className="text-xs text-muted-foreground">{particular.label}</dt><dd className="m-0 text-base font-semibold tabular-nums [overflow-wrap:anywhere]">{particular.value}</dd></div>)}</dl> : <Tag tone="neutral" icon="info">No quantified facts filed</Tag>}
          <p className="m-0 text-sm leading-relaxed">{lede(cast, beats)}</p>
          <Actors campaign={campaign} cast={cast} />
        </CardContent></Card>
        <Status cast={cast} {...(clock ? { clock } : {})} />
      </div>
    </article>
  );
}

/** Who said what, how it arrived and similar cases: the evidence behind the briefing. */
export function Background({ campaign, cast, beats }: { readonly campaign: Campaign; readonly cast: CastScenario; readonly beats: readonly ConversationBeat[] }) {
  const empty = beats.every((beat) => beat.speaker.kind === "narrator") && !cast.def.context && !cast.transmission;
  if (empty) return <p className="moves__none">The briefing has no further background on this matter.</p>;
  return (
    <div className="background">
      <Voices campaign={campaign} beats={beats} />
      {cast.def.context ? (
        <>
          <p>
            <strong>How it arrived.</strong> {cast.def.context.standing}
          </p>
          <p>
            <strong>Similar cases.</strong> {cast.def.context.precedent}
          </p>
        </>
      ) : null}
      {cast.transmission ? (
        <blockquote className="situation__transmission">
          <p>{cast.transmission.text}</p>
          <footer>{cast.transmission.attribution}</footer>
        </blockquote>
      ) : null}
    </div>
  );
}
