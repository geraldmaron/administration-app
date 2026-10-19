import { useRouterState } from "@tanstack/react-router";
import { PLACES, briefMatters } from "@admin/player-core";
import { Collection, EvidencePanel, Icon } from "@admin/ui-web";
import { useCampaignState, usePreferences } from "../app/hooks";
import { MatterRow } from "../brief/MatterRow";
import { Door } from "./Door";
import type { AttentionMark } from "./attention/marks";
import { currentPlace, WAITING_HERE_ID } from "./modes";
import { standingAttention } from "./standing-attention";
import "../brief/brief.css";
import "./attention/attention.css";

/** Work this destination owns that is not a Desk matter (orders to sign, a budget running out), each leading to the section that shows it. */
function StandingRow({ mark }: { readonly mark: AttentionMark }) {
  return (
    <li className="waiting-here__standing" data-attention-id={mark.id}>
      <Door href={mark.href} className="waiting-here__link attention-action" aria-label={`Review ${mark.subject ?? mark.title}`}>
        <Icon name={mark.place === "budget" ? "budget" : "order"} size={16} />
        <span className="waiting-here__subject">{mark.subject ?? mark.title}</span>
        {mark.status ? <span className="waiting-here__status">{mark.status}</span> : null}
        <span className="waiting-here__go" aria-hidden="true">Review →</span>
      </Door>
    </li>
  );
}

/**
 * Everything this destination's nav badge counts, at the top of its overview:
 * the Desk's matters answered here and the work the destination owns. Each row
 * leads to the section of a page that shows it, so a badge always lands
 * somewhere. Only on a destination's own page: a bill or a case already is the
 * matter.
 */
export function WaitingHere({ compact = false }: { readonly compact?: boolean }) {
  const state = useCampaignState();
  const { preferences } = usePreferences();
  const pathname = useRouterState({ select: (router) => router.location.pathname });
  const place = currentPlace(pathname);
  if (state.status !== "ready" || place === undefined || place === "brief" || place === "digest") return null;
  if (pathname.replace(/\/$/, "") !== PLACES[place].href.replace(/\/$/, "")) return null;
  const matters = briefMatters(state.campaign, preferences.attentionByKind).filter((matter) => matter.href !== undefined && currentPlace(matter.href.split(/[?#]/)[0] ?? matter.href) === place);
  const standing = standingAttention(state.campaign).filter((mark) => mark.place === place);
  const total = matters.length + standing.length;
  if (total === 0) return null;
  const content = (
    <section className="waiting-here attention-worklist" id={WAITING_HERE_ID} aria-labelledby="waiting-here-title">
      <h2 id="waiting-here-title" className="waiting-here__title">
        <Icon name="decision" size={16} /> Waiting on you here <span className="brief-section__count">{total}</span>
      </h2>
      {matters.length > 0 ? (
        <>
          <div className="queue__head" aria-hidden="true">
            <span>Matter</span>
            <span>Deadline</span>
            <span>If you wait</span>
            <span>Action</span>
          </div>
          <Collection items={matters} initial={8} noun="matters" className="queue__list" empty="Nothing here waits on you." render={(matter) => <MatterRow key={matter.id} campaign={state.campaign} matter={matter} />} />
        </>
      ) : null}
      {standing.length > 0 ? <Collection items={standing} initial={8} noun="items" className="waiting-here__list" empty="Nothing here waits on you." render={(mark) => <StandingRow key={mark.id} mark={mark} />} /> : null}
    </section>
  );
  return compact ? <EvidencePanel title="Matters and deadlines" label={`${total} waiting on you here`}>{content}</EvidencePanel> : content;
}
