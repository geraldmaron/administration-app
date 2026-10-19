import { useEffect, useMemo, useRef, useState } from "react";
import type { Campaign } from "@admin/engine";
import { formatDate, securityBoard, securityOverview, type SecurityBoard, type SecurityOverview } from "@admin/player-core";
import { EvidencePanel, Sheet, Tabs, type TabSpec } from "@admin/ui-web";
import { ActReceipt } from "../../nation/economy/ActReceipt";
import { useNationCommit, type NationCommit } from "../../nation/economy/commit";
import { Screen } from "../../shell/Screen";
import { ExplainerNote } from "../../shell/ExplainerNote";
import { CommissionPanel, PressPanel } from "./AssessmentActs";
import { CommitmentActPanel } from "./CommitmentAct";
import { CloseTaskingPanel, TaskPanel } from "./CollectionActs";
import { CollectionReports, ShareReportPanel } from "./CollectionReports";
import { Assessments, CollectionLedger, Daily } from "./Intelligence";
import { Kpis } from "./Kpis";
import { Operations } from "./Operations";
import { Readiness } from "./Readiness";
import { Commands } from "./Commands";
import { MapView } from "../../map/MapView";
import { CloseFindingPanel, SignFindingPanel } from "./FindingActs";
import { ForcesView } from "./ForcesView";
import { Obligations } from "./Obligations";
import { SECURITY_VIEWS, SECURITY_VIEW_LABELS, isSecurityView, type SecurityView } from "./security-search";
import { SECURITY_ACT_LABELS, type SecurityAct } from "./security-act";
import "../../nation/economy/economy.css";
import "../../nation/policy/policy.css";
import "../../washington/courts/courts.css";
import "../../washington/oversight/oversight.css";
import "./security.css";
import "./overview.css";

function ActPanel({ campaign, act, acts, onClose }: { readonly campaign: Campaign; readonly act: SecurityAct; readonly acts: NationCommit; readonly onClose: () => void }) {
  switch (act.kind) {
    case "sign-finding":
      return <SignFindingPanel campaign={campaign} acts={acts} onClose={onClose} />;
    case "close-finding":
      return <CloseFindingPanel campaign={campaign} id={act.id} acts={acts} onClose={onClose} />;
    case "task":
      return <TaskPanel campaign={campaign} acts={acts} onClose={onClose} />;
    case "close-tasking":
      return <CloseTaskingPanel campaign={campaign} id={act.id} acts={acts} onClose={onClose} />;
    case "share-report":
      return <ShareReportPanel campaign={campaign} id={act.id} acts={acts} onClose={onClose} />;
    case "commitment":
      return <CommitmentActPanel campaign={campaign} id={act.id} acts={acts} onClose={onClose} />;
    case "commission":
      return <CommissionPanel campaign={campaign} acts={acts} onClose={onClose} />;
    case "press":
      return <PressPanel campaign={campaign} id={act.id} acts={acts} onClose={onClose} />;
  }
}

export type SecurityScreenProps = {
  readonly campaign: Campaign;
  readonly action?: SecurityAct;
  readonly onAction?: (action: SecurityAct | undefined) => void;
  readonly view?: SecurityView;
  readonly onView?: (view: SecurityView) => void;
  /** The service the forces view is opened on. */
  readonly service?: string;
  readonly onService?: (service: string | undefined) => void;
};

const noop = () => undefined;

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/** The headline in a sentence, from the same counts the tiles draw. */
function lede({ readiness, postures, operations, obligations }: SecurityOverview): string {
  const raised = postures.surge + postures.heightened;
  const stance = raised === 0 ? "Every command stands at routine." : `${plural(raised, "command")} stand${raised === 1 ? "s" : ""} above routine.`;
  const owed = obligations.open > 0 ? ` ${plural(obligations.open, "War Powers paper")} ${obligations.open === 1 ? "is" : "are"} open${obligations.overdue > 0 ? `, ${obligations.overdue} overdue` : ""}.` : "";
  return `Readiness reads ${readiness.reading.figure}. ${stance} ${plural(operations.total, "operation")} ${operations.total === 1 ? "is" : "are"} open.${owed}`;
}

type ViewProps = {
  readonly campaign: Campaign;
  readonly board: SecurityBoard;
  readonly overview: SecurityOverview;
  readonly view: SecurityView;
  readonly service: string | undefined;
  readonly onService: (service: string | undefined) => void;
  readonly onOpen: (act: SecurityAct) => void;
};

function View({ campaign, board, overview, view, service, onService, onOpen }: ViewProps) {
  switch (view) {
    case "theaters":
      return <Commands commands={board.commands} functional={board.functional} areaMap={<MapView title="Where US forces are" lens="forces" camera="world" note="Each government shaded by the US forces it hosts. Open one to see its file." />} />;
    case "forces":
      return <ForcesView campaign={campaign} services={board.readiness} service={service} onService={onService} />;
    case "intelligence":
      return (
        <div className="sec-view">
          <ExplainerNote id="collection-and-sharing" />
          <Daily pdb={board.pdb} />
          <CollectionLedger reading={board.collection} onOpen={onOpen} />
          <CollectionReports campaign={campaign} onOpen={onOpen} />
          <Assessments rows={board.assessments} onOpen={onOpen} />
        </div>
      );
    case "operations":
      return <Operations rows={overview.rows} tally={overview.operations} covert={board.covert} onOpen={onOpen} />;
  }
}

/**
 * The national-security overview. One readiness reading leads with its
 * history, followed by legal obligations and supporting readings (a statutory clock never waits below
 * a feed), then four views of the work: the commands, the forces by service,
 * the intelligence and the operations. Every act still opens the tiered
 * presidential review.
 */
export function SecurityScreen({ campaign, action, onAction, view = "theaters", onView = noop, service, onService = noop }: SecurityScreenProps) {
  const board = useMemo(() => securityBoard(campaign), [campaign]);
  const overview = useMemo(() => securityOverview(campaign, board), [campaign, board]);
  const acts = useNationCommit(campaign);
  const [localAction, setLocalAction] = useState<SecurityAct | undefined>();
  const open = onAction ? action : localAction;
  const setOpen = (next: SecurityAct | undefined) => { acts.dismiss(); if (onAction) onAction(next); else setLocalAction(next); };
  const dismiss = useRef(acts.dismiss);
  dismiss.current = acts.dismiss;
  useEffect(() => { if (!open) dismiss.current(); }, [open]);
  const close = () => {
    setOpen(undefined);
  };
  const tabs: readonly TabSpec[] = SECURITY_VIEWS.map((entry) => ({
    id: entry,
    label: SECURITY_VIEW_LABELS[entry],
    ...(entry === "intelligence" ? { count: board.pdb.items.length } : {}),
    ...(entry === "operations" ? { count: overview.operations.total } : {}),
  }));
  return (
    <Screen title="Security" icon="shield" eyebrow={`${formatDate(campaign.calendar)} · World · national security`} lede={lede(overview)} screenClass="workspace" measure="data" camera="keep">
      <Sheet open={Boolean(open)} onClose={close} title={open ? SECURITY_ACT_LABELS[open.kind] : "Security action"} placement="wide" dismissible={!acts.busy}>
        <div className="nation-room security">
          {acts.committed ? <ActReceipt committed={acts.committed} again="Back to the desk" onAgain={close} mapNote={null} /> : open ? <ActPanel key={JSON.stringify(open)} campaign={campaign} act={open} acts={acts} onClose={close} /> : null}
        </div>
      </Sheet>
        <div className="sec">
          <Kpis overview={overview} />
          <Tabs label="Views of national security" tabs={tabs} selected={view} onSelect={(next) => (isSecurityView(next) ? onView(next) : undefined)}>
            {view === "theaters" ? <div className="sec-pair"><Readiness campaign={campaign} reading={overview.readiness} /><Obligations rows={board.warPowers} authorizations={board.authorizations} /></div> : <>
              <div className="sec-context-tools">
                <EvidencePanel title="Military readiness evidence" label={`Readiness ${overview.readiness.reading.figure}`}><Readiness campaign={campaign} reading={overview.readiness} /></EvidencePanel>
                {board.warPowers.length === 0 && board.authorizations.length === 0 ? <EvidencePanel title="Legal obligations" label="No active force reporting clocks"><Obligations rows={board.warPowers} authorizations={board.authorizations} /></EvidencePanel> : null}
              </div>
              {board.warPowers.length > 0 || board.authorizations.length > 0 ? <Obligations rows={board.warPowers} authorizations={board.authorizations} /> : null}
            </>}
            <View campaign={campaign} board={board} overview={overview} view={view} service={service} onService={onService} onOpen={setOpen} />
          </Tabs>
        </div>
    </Screen>
  );
}
