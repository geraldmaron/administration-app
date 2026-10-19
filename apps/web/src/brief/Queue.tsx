import type { Campaign } from "@admin/engine";
import type { BriefMatter } from "@admin/player-core";
import { Collection, Icon } from "@admin/ui-web";
import { MatterRow } from "./MatterRow";

/** The ranked decision queue: aligned rows under named columns, the lead's followers in the order the Desk ranks them. */
export function Queue({ campaign, matters, onSettled }: { readonly campaign: Campaign; readonly matters: readonly BriefMatter[]; readonly onSettled: (said: string) => void }) {
  return (
    <section className="queue attention-worklist" aria-labelledby="queue-title">
      <h2 id="queue-title" className="brief-section__title">
        <Icon name="decision" size={20} /> Also waiting on you <span className="brief-section__count">{matters.length}</span>
      </h2>
      <div className="queue__head" aria-hidden="true">
        <span>Matter</span>
        <span>Deadline</span>
        <span>If you wait</span>
        <span>Action</span>
      </div>
      <Collection items={matters} initial={6} noun="matters" className="queue__list" empty="Nothing else waits on you." render={(matter) => <MatterRow key={matter.id} campaign={campaign} matter={matter} onSettled={onSettled} />} />
    </section>
  );
}
