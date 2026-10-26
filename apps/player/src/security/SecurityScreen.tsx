import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { securityBoard, securityOverview, type SecurityBoard, type SecurityOverview } from "@admin/player-core";
import { Column, Page, Row, Sheet, Text, useMedia } from "@admin/ui";
import { ViewTabs } from "@admin/ui/nation";
import { ActsReceipt, useWorldActs, type WorldActs } from "../world/acts";
import { MapPanelSlot, SealOf, TopicLaw, splitColumn } from "../world/parts";
import { CloseTaskingPanel, CommitmentActPanel, ShareReportPanel, TaskPanel } from "./CollectionActs";
import { Assessments, CollectionLedger, CollectionReports, Daily } from "./Intel";
import { CloseFindingPanel, CommissionPanel, PressPanel, SignFindingPanel } from "./IntelActs";
import { ForcesView, Operations } from "./Operations";
import { Commands, Kpis, Obligations, Readiness } from "./Overview";
import { SECURITY_ACT_LABELS, SECURITY_VIEWS, SECURITY_VIEW_LABELS, type SecurityAct, type SecurityView } from "./params";

function ActPanel({ campaign, act, acts, onClose }: { readonly campaign: Campaign; readonly act: SecurityAct; readonly acts: WorldActs; readonly onClose: () => void }) {
  const props = { campaign, acts, onClose };
  switch (act.kind) {
    case "sign-finding":
      return <SignFindingPanel {...props} />;
    case "close-finding":
      return <CloseFindingPanel {...props} id={act.id} />;
    case "task":
      return <TaskPanel {...props} />;
    case "close-tasking":
      return <CloseTaskingPanel {...props} id={act.id} />;
    case "share-report":
      return <ShareReportPanel {...props} id={act.id} />;
    case "commitment":
      return <CommitmentActPanel {...props} id={act.id} />;
    case "commission":
      return <CommissionPanel {...props} />;
    case "press":
      return <PressPanel {...props} id={act.id} />;
  }
}

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** The headline in a sentence, from the same counts the tiles draw. */
function lede({ readiness, postures, operations, obligations }: SecurityOverview): string {
  const raised = postures.surge + postures.heightened;
  const owed = obligations.overdue > 0 ? `, ${plural(obligations.overdue, "War Powers deadline")} overdue` : obligations.open > 0 ? `, ${plural(obligations.open, "War Powers deadline")} open` : "";
  return `Readiness ${readiness.reading.figure}, ${plural(raised, "command")} on high alert, ${plural(operations.total, "operation")} running${owed}.`;
}

type ViewProps = { readonly campaign: Campaign; readonly board: SecurityBoard; readonly overview: SecurityOverview; readonly view: SecurityView; readonly service: string | undefined; readonly onService: (service: string | undefined) => void; readonly onOpen: (act: SecurityAct) => void };

/** The commands' area until the map lands: where US forces are, from the commands' own placements. */
function ForcesArea({ board }: { readonly board: SecurityBoard }) {
  const placed = board.commands.filter((card) => card.hasArea && card.places > 0);
  return (
    <MapPanelSlot title="Where US forces are" lens="forces" camera="world" note="Each country is shaded by how many US forces it hosts.">
      <Text variant="body" tone="secondary">{placed.length === 0 ? "No regional command has forces abroad." : placed.map((card) => `${card.abbr}: ${plural(card.places, "place")}`).join(" · ")}</Text>
    </MapPanelSlot>
  );
}

function SecurityView({ campaign, board, overview, view, service, onService, onOpen }: ViewProps) {
  const media = useMedia();
  switch (view) {
    case "theaters":
      return (
        <Column gap="lg">
          <Row gap="lg" top wrap={!media.desktop}>
            <Column {...splitColumn(media.desktop)}><Readiness campaign={campaign} reading={overview.readiness} /></Column>
            {board.warPowers.length + board.authorizations.length > 0 ? <Column {...splitColumn(media.desktop)}><Obligations rows={board.warPowers} authorizations={board.authorizations} /></Column> : null}
          </Row>
          <Commands commands={board.commands} functional={board.functional} area={<ForcesArea board={board} />} />
        </Column>
      );
    case "forces":
      return <ForcesView campaign={campaign} services={board.readiness} service={service} onService={onService} />;
    case "intelligence":
      return (
        <Column gap="lg">
          <Daily campaign={campaign} pdb={board.pdb} />
          <CollectionLedger reading={board.collection} onOpen={onOpen} />
          <CollectionReports campaign={campaign} onOpen={onOpen} />
          <Assessments rows={board.assessments} onOpen={onOpen} />
        </Column>
      );
    case "operations":
      return <Operations rows={overview.rows} tally={overview.operations} covert={board.covert} onOpen={onOpen} signer={campaign.founding.leader.name} />;
  }
}

export type SecurityScreenProps = {
  readonly campaign: Campaign;
  readonly view: SecurityView;
  readonly onView: (view: SecurityView) => void;
  readonly service: string | undefined;
  readonly onService: (service: string | undefined) => void;
  readonly action: SecurityAct | undefined;
  readonly onAction: (action: SecurityAct | undefined) => void;
};

/**
 * The national-security desk: readiness and the legal obligations lead, then
 * four views of the work (the commands, the forces by service, the
 * intelligence, the operations). Every act opens in a sheet and still goes
 * through the presidential review.
 */
export function SecurityScreen({ campaign, view, onView, service, onService, action, onAction }: SecurityScreenProps) {
  const board = useMemo(() => securityBoard(campaign), [campaign]);
  const overview = useMemo(() => securityOverview(campaign, board), [campaign, board]);
  const acts = useWorldActs(campaign, "us");
  const open = (next: SecurityAct | undefined) => {
    acts.dismiss();
    onAction(next);
  };
  const tabs = SECURITY_VIEWS.map((entry) => ({ id: entry, label: SECURITY_VIEW_LABELS[entry], ...(entry === "intelligence" ? { count: board.pdb.items.length } : entry === "operations" ? { count: overview.operations.total } : {}) }));
  return (
    <Page eyebrow="National Security Council" icon="shield" title="Security" lede={lede(overview)} emblem={<SealOf id="INST-NSC" size={56} label="Seal of the National Security Council" />} actions={<TopicLaw topic="war-powers" />} wide>
      <Sheet open={action !== undefined} onClose={() => open(undefined)} title={action ? SECURITY_ACT_LABELS[action.kind] : "Security action"} eyebrow="National security" wide>
        {acts.committed ? <ActsReceipt acts={{ ...acts, dismiss: () => open(undefined) }} again="Back to Security" /> : action ? <ActPanel key={JSON.stringify(action)} campaign={campaign} act={action} acts={acts} onClose={() => open(undefined)} /> : null}
      </Sheet>
      <Kpis overview={overview} onView={onView} />
      <ViewTabs label="Views of national security" tabs={tabs} selected={view} onSelect={onView} />
      <SecurityView campaign={campaign} board={board} overview={overview} view={view} service={service} onService={onService} onOpen={open} />
    </Page>
  );
}
