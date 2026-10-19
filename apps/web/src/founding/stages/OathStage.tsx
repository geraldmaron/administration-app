import { CAMPAIGN_OPENING_DATE, type Campaign, type Chamber, type ChamberComposition, type ExecutiveOrder, type UsMajorParty } from "@admin/engine";
import { GOVERNING_STYLE_WORDS, STAGE_TITLE, chamberMajorityLine, formatDate, formatRatio, orderRejections, type FoundingStageId } from "@admin/player-core";
import { IDEOLOGY_AXES, leaderBackgroundById, schoolById } from "@admin/world";
import { Button, EmptyState, Gauge, Hemicycle, Icon, PartyBar, Portrait, Steps, type IconName, type PartySeats } from "@admin/ui-web";
import { CAREER_GLYPH, CardGlyph, PartyMark, STYLE_GLYPH } from "../glyphs";
import { AxisReading } from "../ProfileQuestionnaire";
import "../questions/questions.css";
import type { Founding } from "../useFounding";

// The oath the Constitution prescribes (Article II, Section 1), word for word.
const OATH =
  "I do solemnly swear (or affirm) that I will faithfully execute the Office of President of the United States, and will to the best of my Ability, preserve, protect and defend the Constitution of the United States.";

function seats(composition: ChamberComposition, anchor: UsMajorParty): readonly PartySeats[] {
  const of = (party: UsMajorParty) => (party === anchor ? composition.administration : composition.opposition);
  return [
    { party: "democrat", seats: of("democrat"), label: "Democrats" },
    { party: "independent", seats: composition.independent, label: "Independents" },
    { party: "republican", seats: of("republican"), label: "Republicans" },
  ];
}

function verdict(campaign: Campaign, chamber: Chamber): string {
  return chamberMajorityLine(campaign, chamber);
}

function Arrival({ campaign }: { readonly campaign: Campaign }) {
  const anchor = campaign.congress.caucusAnchor;
  const { house, senate } = campaign.congress.chambers;
  return (
    <section className="arrival" aria-label="What you arrive to">
      <Gauge label="Approval on the first morning" value={campaign.player.metrics.approval} valueText={formatRatio(campaign.player.metrics.approval)} tone="identity" marks={[{ at: 0.5, label: "Half the country" }]} />
      <Hemicycle label="The Senate" parties={seats(senate, anchor)} majority={Math.floor(senate.seats / 2) + 1} verdict={verdict(campaign, "senate")} />
      <PartyBar label="The House" parties={seats(house, anchor)} majority={Math.floor(house.seats / 2) + 1} verdict={verdict(campaign, "house")} />
    </section>
  );
}

const ORDER_GLYPH: Readonly<Record<ExecutiveOrder["domain"], IconName>> = {
  security: "shield",
  economy: "economyGrowth",
  civil: "law",
  emergency: "eventEmergency",
};

/** How far an order reaches past the office's own writ, which is what invites a challenge, in quarters. */
function reachSteps(overreach: number): number {
  return Math.min(4, Math.max(1, Math.ceil(overreach * 4)));
}

const REACH_WORD = ["Well within", "Near the edge", "Past the edge", "Far past"] as const;

function Orders({ orders, picks, toggle }: { readonly orders: readonly ExecutiveOrder[]; readonly picks: readonly string[]; readonly toggle: (id: string) => void }) {
  if (orders.length === 0) return <p className="stage-note">No order can be signed on the first morning under this draft.</p>;
  return (
    <fieldset className="orders">
      <legend className="ui-field__label">Orders to sign on the first morning</legend>
      <p className="stage-note">Each is signed the moment you take the oath and is the first entry on your Record. Signing none is a choice too.</p>
      <ul className="orders__list">
        {orders.map((order) => (
          <li key={order.id} className="order" data-picked={picks.includes(order.id) ? "true" : undefined}>
            <label className="order__pick">
              <input type="checkbox" checked={picks.includes(order.id)} onChange={() => toggle(order.id)} />
              <Icon name={ORDER_GLYPH[order.domain]} size={22} />
              <span className="order__name">{order.name}</span>
            </label>
            <p className="order__summary">{order.summary}</p>
            <div className="order__reads">
              <Steps label="Reach past the office" lit={reachSteps(order.overreach)} steps={4} word={REACH_WORD[reachSteps(order.overreach) - 1]!} tone="watch" />
              <p className="order__meta">
                <Icon name={order.viaRulemaking ? "schedule" : "sign"} size={18} />
                {order.viaRulemaking ? "Binds after notice and comment" : "Binds on signature"}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

function Readiness({ founding }: { readonly founding: Founding }) {
  const problems = orderRejections(founding.routed).filter((entry) => !(entry.rejection.subject === "leader" && founding.draft.leader.name.trim() === ""));
  const unnamed = founding.draft.leader.name.trim() === "";
  if (problems.length === 0 && !unnamed) return null;
  const stages = [...new Set([...(unnamed ? (["person"] as FoundingStageId[]) : []), ...problems.map((problem) => problem.stage)])].filter((stage) => stage !== "oath");
  return (
    <div className="readiness" role="status">
      <p className="readiness__title">Before you can take the oath</p>
      <ul>
        {unnamed ? <li>The oath needs your name.</li> : null}
        {problems.map((problem) => (
          <li key={`${problem.stage}-${problem.rejection.explanation}`}>{problem.rejection.explanation}</li>
        ))}
      </ul>
      <div className="readiness__fixes">
        {stages.map((stage) => (
          <Button key={stage} size="sm" kind="ghost" onClick={() => founding.goTo(stage)}>
            Go to {STAGE_TITLE[stage].toLowerCase()}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ProfileReview({ founding }: { readonly founding: Founding }) {
  const { leader, setupMode } = founding.draft;
  const campaign = founding.currentPreview?.ok ? founding.currentPreview.campaign : undefined;
  const leaderId = campaign?.player.cabinet[campaign.founding.leadRole];
  const school = leader.schoolId ?? (leaderId ? campaign?.people[leaderId]?.base.education.school : undefined);
  const party = { democrat: "Democratic Party", republican: "Republican Party", independent: "Independent" }[leader.party];
  const career = leaderBackgroundById.get(leader.backgroundId as string);
  return (
    <section className="setup-profile oath-profile" aria-label="Final leadership choices">
      <h3>
        <Icon name="dossier" size={20} /> Your administration
      </h3>
      <div className="oath-profile__body">
        <Portrait name={leader.name || "The President"} size="lg" party={leader.party} redacted />
        <ul className="oath-profile__facts">
          <li>
            <PartyMark party={leader.party} />
            <span>{party}</span>
          </li>
          <li>
            <CardGlyph name={CAREER_GLYPH[leader.backgroundId as string]} />
            <span>
              {career?.name ?? "Career"}, sworn in at {leader.age}
            </span>
          </li>
          <li>
            <CardGlyph name={leader.governingStyle ? STYLE_GLYPH[leader.governingStyle] : CAREER_GLYPH[leader.backgroundId as string]} />
            <span>{leader.governingStyle ? GOVERNING_STYLE_WORDS[leader.governingStyle].label : "Style from your career"}</span>
          </li>
          <li>
            <CardGlyph name="departmentEducation" />
            <span>{school ? (schoolById.get(school)?.name ?? "Not recorded") : "School from your career"}</span>
          </li>
        </ul>
      </div>
      <div className="derived-profile__beliefs">
        {IDEOLOGY_AXES.map((axis) => (
          <AxisReading key={axis} axis={axis} value={leader.ideology[axis]} />
        ))}
      </div>
      <p className="stage-note">{setupMode === "long" ? "Your beliefs and style were read from your 20 answers." : "These are your direct choices."} They shape your starting person and relationships. The world seed preserves the cast you reviewed.</p>
      <Button kind="ghost" size="sm" onClick={() => founding.goTo(setupMode === "long" ? "politics" : "person")}>
        Review leadership choices
      </Button>
    </section>
  );
}

/** The certificate, the Congress and public you arrive to, the first morning's orders, and what still stands in the way. */
export function OathStage({ founding, picks, toggle }: { readonly founding: Founding; readonly picks: readonly string[]; readonly toggle: (id: string) => void }) {
  const preview = founding.currentPreview;
  const date = formatDate(preview?.ok ? (preview.campaign.foundingDate ?? preview.campaign.calendar) : CAMPAIGN_OPENING_DATE);
  const name = founding.draft.leader.name.trim();
  return (
    <div className="stage-grid">
      <div className="stage-grid__main">
        <section className="certificate" aria-label="The oath of office">
          <p className="certificate__kicker">The oath of office · {date}</p>
          <blockquote className="certificate__oath">
            <p>{OATH}</p>
          </blockquote>
          <p className="certificate__signature" data-empty={name ? undefined : "true"}>
            <span className="certificate__hand">{name || "Your name"}</span>
            <span className="certificate__office">President of the United States</span>
          </p>
        </section>
        <Readiness founding={founding} />
        <ProfileReview founding={founding} />
        {preview?.ok ? <Orders orders={preview.orders} picks={picks} toggle={toggle} /> : null}
      </div>
      <div className="stage-grid__side">
        {preview?.ok ? (
          <Arrival campaign={preview.campaign} />
        ) : founding.oath.status === "failed" ? (
          <EmptyState title="The first morning could not be read">{founding.oath.message}</EmptyState>
        ) : preview && !preview.ok ? (
          <EmptyState title="The draft can't be sealed yet">Fix what is listed, and the first morning is read here.</EmptyState>
        ) : (
          <EmptyState busy title="Reading your first morning">The seal is drafted to show the Congress and the public you arrive to.</EmptyState>
        )}
      </div>
    </div>
  );
}
