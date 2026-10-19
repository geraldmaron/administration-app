import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { executiveOrder } from "@admin/engine";
import { FOUNDING_STAGE_IDS, FOUNDING_STAGE_SPEC, blockedStages, formatDate, isVaultFull, vaultCapacity, stageIndex, stageStanding, type FoundingStageId } from "@admin/player-core";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, EmptyState, Icon } from "@admin/ui-web";
import { useCampaignStore } from "../app/hooks";
import { rememberOath } from "../app/session";
import { useReviewer } from "../review/PresidentialReview";
import { useLibrary } from "../screens/use-library";
import { Screen } from "../shell/Screen";
import { takeOath } from "./seal";
import { needsLeadershipReview } from "./draft";
import { CabinetStage } from "./stages/CabinetStage";
import { OathStage } from "./stages/OathStage";
import { PersonStage } from "./stages/PersonStage";
import { PlatformStage } from "./stages/PlatformStage";
import { PoliticsStage } from "./stages/PoliticsStage";
import { RecordStage } from "./stages/RecordStage";
import { StaffStage } from "./stages/StaffStage";
import { TicketStage } from "./stages/TicketStage";
import { useFounding, type Founding } from "./useFounding";
import { SetupChoice } from "./SetupChoice";
import { ProfileQuestionnaire } from "./ProfileQuestionnaire";
import "./setup.css";

const SHORT_STAGES: readonly FoundingStageId[] = ["person", "ticket", "cabinet", "oath"];
function stagesFor(founding: Founding): readonly FoundingStageId[] {
  return founding.draft.setupMode === "short" && !founding.draft.customizeSetup && SHORT_STAGES.includes(founding.stage) ? SHORT_STAGES : FOUNDING_STAGE_IDS;
}

const painted = () => new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

type Sealing = { readonly phase: "idle" | "sealing"; readonly error?: string; readonly vaultFull?: boolean };

/**
 * The oath: the full presidential review, then seal, store and the Brief. One
 * confirmed press founds one administration; a return to the terms or a
 * refusal opens the latch again.
 */
function useOath(founding: Founding, picks: readonly string[]) {
  const store = useCampaignStore();
  const navigate = useNavigate();
  const reviewer = useReviewer();
  const latch = useRef(false);
  const [state, setState] = useState<Sealing>({ phase: "idle" });
  const run = useCallback(async () => {
    if (latch.current) return;
    latch.current = true;
    const orders = picks.map((id) => executiveOrder(id)?.name ?? id);
    const session = reviewer?.open({
      tier: "full",
      title: "Take the oath of office",
      lines: [{ label: "Orders signed on day one", value: orders.length > 0 ? orders.join("; ") : "None" }],
      verb: "Confirm and take the oath",
      danger: false,
    });
    if (session && !(await session.decision)) {
      latch.current = false;
      return;
    }
    setState({ phase: "sealing" });
    try {
      await painted();
      const campaign = takeOath(founding.draft, founding.currentPreview, picks);
      await store.begin(campaign);
      rememberOath({ campaign, orders });
      session?.settle({ kind: "applied", date: formatDate(campaign.calendar) });
      await navigate({ to: "/brief" });
    } catch (cause) {
      latch.current = false;
      const words = cause instanceof Error ? cause.message : String(cause);
      session?.settle({ kind: "refused", words });
      setState({ phase: "idle", error: words, vaultFull: isVaultFull(cause) });
    }
  }, [founding.draft, founding.currentPreview, picks, store, navigate, reviewer]);
  return { ...state, run };
}

/** Keeps the current stage in view where the rail scrolls sideways (a phone). */
function useCurrentInView(stage: FoundingStageId) {
  const rail = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const current = rail.current?.querySelector<HTMLElement>('[aria-current="step"]');
    const list = current?.closest("ol");
    if (!current || !list || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: current.offsetLeft - list.clientWidth / 2 + current.clientWidth / 2 });
  }, [stage]);
  return rail;
}

function StageRail({ founding }: { readonly founding: Founding }) {
  const blocked = blockedStages(founding.routed);
  const rail = useCurrentInView(founding.stage);
  return (
    <nav className="stage-rail" aria-label="The transition" ref={rail}>
      <ol className="stage-rail__list">
        {stagesFor(founding).map((id, index) => {
          const spec = FOUNDING_STAGE_SPEC[stageIndex(id)]!;
          const standing = stageStanding(spec.id, founding.stage, blocked);
          return (
            <li key={spec.id}>
              <button type="button" className="stage-rail__step" data-standing={standing} aria-label={`${spec.title}${standing === "blocked" ? ", needs attention" : ""}`} aria-current={standing === "current" ? "step" : undefined} onClick={() => founding.goTo(spec.id)}>
                <span className="stage-rail__number" aria-hidden="true">
                  {standing === "settled" ? <Icon name="approve" size={16} /> : index + 1}
                </span>
                <span className="stage-rail__title">{spec.title}</span>
                {standing === "blocked" ? <span className="ui-visually-hidden">, needs attention</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StageBody({ founding, picks, toggle }: { readonly founding: Founding; readonly picks: readonly string[]; readonly toggle: (id: string) => void }) {
  const { draft, update, resolved } = founding;
  switch (founding.stage) {
    case "person":
      return <PersonStage draft={draft} update={update} />;
    case "record":
      return <RecordStage draft={draft} update={update} />;
    case "politics":
      return draft.setupMode === "long" ? <ProfileQuestionnaire draft={draft} update={update} /> : <PoliticsStage draft={draft} update={update} />;
    case "ticket":
      return <TicketStage draft={draft} resolved={resolved} update={update} />;
    case "platform":
      return <PlatformStage draft={draft} update={update} />;
    case "staff":
      return <StaffStage resolved={resolved} update={update} />;
    case "cabinet":
      return <CabinetStage resolved={resolved} update={update} />;
    case "oath":
      return <OathStage founding={founding} picks={picks} toggle={toggle} />;
  }
}

function Footer({ founding, oath }: { readonly founding: Founding; readonly oath: ReturnType<typeof useOath> }) {
  const stages = stagesFor(founding);
  const at = stages.indexOf(founding.stage);
  const back = stages[at - 1];
  const next = stages[at + 1];
  const unnamed = founding.draft.leader.name.trim() === "";
  const needsProfile = needsLeadershipReview(founding.draft);
  const blocked = founding.routed.length > 0 || unnamed || needsProfile;
  return (
    <div className="stage-foot">
      {oath.error ? (
        <p className="stage-foot__error" role="alert">
          {oath.error} {oath.vaultFull ? <Link to="/administrations">Open your administrations</Link> : null}
        </p>
      ) : null}
      <div className="stage-foot__buttons">
        {back ? (
          <Button kind="ghost" onClick={() => founding.goTo(back)}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {founding.stage === "person" && founding.draft.setupMode === "short" ? (
          <Button kind="ghost" onClick={() => founding.goTo("oath")}>
            Skip to the oath
          </Button>
        ) : null}
        {next ? (
          <Button kind="primary" disabled={founding.stage === "politics" && needsProfile} aria-label={`Next: ${FOUNDING_STAGE_SPEC[stageIndex(next)]?.title}`} onClick={() => founding.goTo(next)}>
            Next<span className="stage-foot__what">: {FOUNDING_STAGE_SPEC[stageIndex(next)]?.title}</span>
          </Button>
        ) : (
          <Button kind="commit" busy={oath.phase === "sealing"} disabled={blocked || !founding.currentPreview?.ok} onClick={() => void oath.run()}>
            Take the oath
          </Button>
        )}
      </div>
    </div>
  );
}

/** Both setup paths share one draft, appointments and oath. */
export function FoundingFlow() {
  const founding = useFounding();
  const { library, error, reading, retry } = useLibrary();
  const [chosen, setChosen] = useState<readonly string[]>([]);
  const offered = founding.currentPreview?.ok ? founding.currentPreview.orders : undefined;
  const picks = useMemo(() => chosen.filter((id) => offered?.some((order) => order.id === id) ?? true), [chosen, offered]);
  const toggle = useCallback((id: string) => setChosen((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id])), []);
  const oath = useOath(founding, picks);
  const spec = FOUNDING_STAGE_SPEC[stageIndex(founding.stage)]!;
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) first.current = false;
    else titleRef.current?.focus();
  }, [founding.stage]);
  if (!library) return <Screen title="The transition" icon="sign" eyebrow="Save storage" screenClass="workspace" camera="us">
    {reading ? <EmptyState busy title="Checking save storage before taking office" /> : <Card><CardHeader><CardTitle>Save storage must open first</CardTitle><CardDescription>We cannot verify the existing administrations or a free save slot. No empty replacement vault was created.</CardDescription></CardHeader><CardContent><p className="notice" data-tone="risk" role="alert">{error}</p></CardContent><CardFooter><Button kind="primary" onClick={retry}>Retry reading saves</Button><Button asChild><Link to="/recovery">Save recovery</Link></Button></CardFooter></Card>}
  </Screen>;
  if (vaultCapacity(library.campaigns.length).full) return <Screen title="The transition" icon="archive" eyebrow="Save capacity" screenClass="workspace" camera="us"><EmptyState icon="archive" title="All administration slots are in use">Export an administration you want to retain, then discard a slot before starting another. Existing saves remain available.</EmptyState><Button asChild><Link to="/administrations">Manage saved administrations</Link></Button></Screen>;
  if (!founding.draft.setupMode) return <SetupChoice founding={founding} />;
  const stages = stagesFor(founding);
  return (
    <Screen
      title="The transition"
      icon="sign"
      eyebrow={`${founding.draft.setupMode === "short" ? "Short" : "Long"} setup · Step ${stages.indexOf(founding.stage) + 1} of ${stages.length}`}
      screenClass="workspace"
      camera="us"
      footer={<Footer founding={founding} oath={oath} />}
    >
      <div className="founding" data-stage={founding.stage satisfies FoundingStageId}>
        <StageRail founding={founding} />
        <section className="founding__stage" aria-labelledby="stage-title">
          <div className="setup-tools">
            <Button size="sm" kind="ghost" onClick={() => founding.update((draft) => { const { setupMode: _mode, ...rest } = draft; return rest; })}>Change setup path</Button>
            {founding.draft.setupMode === "short" && !founding.draft.customizeSetup ? <Button size="sm" kind="ghost" onClick={() => founding.update((draft) => ({ ...draft, customizeSetup: true }))}>Customize every stage</Button> : null}
          </div>
          <h2 id="stage-title" className="founding__title" ref={titleRef} tabIndex={-1}>
            {spec.title}
          </h2>
          <p className="founding__question">{spec.question}</p>
          <StageBody founding={founding} picks={picks} toggle={toggle} />
          {founding.stage === "oath" && needsLeadershipReview(founding.draft) ? <div className="readiness" role="status"><p>Complete the 20 questions and apply your latest answers before taking the oath.</p><Button kind="ghost" onClick={() => founding.goTo("politics")}>Complete your leadership profile</Button></div> : null}
        </section>
      </div>
    </Screen>
  );
}
