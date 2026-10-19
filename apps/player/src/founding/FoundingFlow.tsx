import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { AccessibilityInfo, ScrollView } from "react-native";
import { FOUNDING_STAGE_IDS, FOUNDING_STAGE_SPEC, blockedStages, stageIndex, stageStanding, vaultCapacity, MAX_ACTIVE_CAMPAIGNS, type FoundingStageId } from "@admin/player-core";
import { Button, Column, Surface, Text, useMedia } from "@admin/ui";
import { Stepper } from "@admin/ui/forms";
import { useLibrary } from "../library/use-library";
import { Notice } from "../settings/parts";
import { needsLeadershipReview } from "./draft";
import { FoundingFrame, StageHero } from "./FoundingFrame";
import { Footer, OathReview } from "./FoundingFooter";
import { ProfileQuestionnaire } from "./questions/ProfileQuestionnaire";
import { SetupChoice } from "./SetupChoice";
import { CabinetStage } from "./stages/CabinetStage";
import { OathStage } from "./stages/OathStage";
import { PersonStage } from "./stages/PersonStage";
import { PlatformStage } from "./stages/PlatformStage";
import { PoliticsStage } from "./stages/PoliticsStage";
import { RecordStage } from "./stages/RecordStage";
import { StaffStage } from "./stages/StaffStage";
import { TicketStage } from "./stages/TicketStage";
import { useOath } from "./useOath";
import { useFounding, type Founding } from "./useFounding";

const SHORT_STAGES: readonly FoundingStageId[] = ["person", "ticket", "cabinet", "oath"];
const QUICK_STAGES: readonly FoundingStageId[] = ["person", "oath"];

export function stagesFor(founding: Founding): readonly FoundingStageId[] {
  const { setupMode, customizeSetup, quickStart } = founding.draft;
  if (setupMode !== "short" || customizeSetup) return FOUNDING_STAGE_IDS;
  if (quickStart && QUICK_STAGES.includes(founding.stage)) return QUICK_STAGES;
  return SHORT_STAGES.includes(founding.stage) ? SHORT_STAGES : FOUNDING_STAGE_IDS;
}

function setupName(founding: Founding): string {
  if (founding.draft.setupMode === "long") return "Long setup";
  return founding.draft.quickStart ? "Quick start" : "Short setup";
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

function Rail({ founding }: { readonly founding: Founding }) {
  const media = useMedia();
  const blocked = blockedStages(founding.routed);
  const steps = stagesFor(founding).map((id) => ({ id, title: FOUNDING_STAGE_SPEC[stageIndex(id)]!.title, standing: stageStanding(id, founding.stage, blocked) }));
  const rail = <Stepper label="Setup steps" steps={steps} onSelect={(id) => founding.goTo(id as FoundingStageId)} />;
  // Eight named steps need about 1,200 points. Narrower than that, the rail scrolls in its own lane instead of pushing the whole page sideways.
  if (media.phone || media.wide) return rail;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
      {rail}
    </ScrollView>
  );
}

function Tools({ founding }: { readonly founding: Founding }) {
  const short = founding.draft.setupMode === "short" && !founding.draft.customizeSetup;
  const quick = short && founding.draft.quickStart;
  return (
    <>
      <Button size="compact" kind="quiet" icon="return" onPress={() => founding.update(({ setupMode: _mode, quickStart: _quick, ...rest }) => rest)}>
        Pick a different setup
      </Button>
      {quick ? (
        <Button size="compact" kind="quiet" icon="appoint" onPress={() => founding.update(({ quickStart: _quick, ...rest }) => rest)}>
          Pick my team myself
        </Button>
      ) : short ? (
        <Button size="compact" kind="quiet" icon="expandPanel" onPress={() => founding.update((draft) => ({ ...draft, customizeSetup: true }))}>
          Customize every step
        </Button>
      ) : null}
    </>
  );
}

/** Scrolls to the top and says the new stage aloud whenever the stage changes, so a step lands at its title. */
function useStageArrival(founding: Founding) {
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scroller.current?.scrollTo({ y: 0, animated: false });
    AccessibilityInfo.announceForAccessibility(FOUNDING_STAGE_SPEC[stageIndex(founding.stage)]!.title);
  }, [founding.stage, founding.draft.setupMode]);
  return scroller;
}

/** The founding draft's day-one picks, kept to the orders the current preview still offers. */
function usePicks(founding: Founding) {
  const [chosen, setChosen] = useState<readonly string[]>([]);
  const offered = founding.currentPreview?.ok ? founding.currentPreview.orders : undefined;
  const picks = useMemo(() => chosen.filter((id) => offered?.some((order) => order.id === id) ?? true), [chosen, offered]);
  const toggle = useCallback((id: string) => setChosen((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id])), []);
  return { picks, toggle };
}

function FoundingStages({ founding }: { readonly founding: Founding }) {
  const { picks, toggle } = usePicks(founding);
  const oath = useOath(founding, picks);
  const scroller = useStageArrival(founding);
  const spec = FOUNDING_STAGE_SPEC[stageIndex(founding.stage)]!;
  const stages = stagesFor(founding);
  return (
    <FoundingFrame rail={<Rail founding={founding} />} footer={<Footer founding={founding} oath={oath} stages={stages} />} scroller={scroller}>
      <StageHero stage={founding.stage} eyebrow={`${setupName(founding)} · Step ${stages.indexOf(founding.stage) + 1} of ${stages.length}`} title={spec.title} question={spec.question} tools={<Tools founding={founding} />} />
      <StageBody founding={founding} picks={picks} toggle={toggle} />
      {founding.stage === "oath" && needsLeadershipReview(founding.draft) ? (
        <Column marginTop="lg">
          <Notice tone="danger">Before you take the oath, answer all 20 questions. Then press “See what your answers add up to” so your latest answers count.</Notice>
        </Column>
      ) : null}
      <OathReview oath={oath} />
    </FoundingFrame>
  );
}

function Gate({ title, children }: { readonly title: string; readonly children: React.ReactNode }) {
  return (
    <FoundingFrame>
      <Surface level="raised" pad="xl">
        <Column gap="md">
          <Text variant="heading" role="heading" aria-level={1}>
            {title}
          </Text>
          {children}
        </Column>
      </Surface>
    </FoundingFrame>
  );
}

/** Both setup paths share one draft, appointments and oath; the vault is read first so the oath never meets a full or unread store. */
export function FoundingFlow() {
  const founding = useFounding();
  const { library, error, reading, retry } = useLibrary();
  if (!library) {
    return reading ? (
      <Gate title="Checking your saves first">
        <Text variant="body" tone="secondary" role="status">Looking at the saves on this device…</Text>
      </Gate>
    ) : (
      <Gate title="We couldn't open your saves">
        <Text variant="body" tone="secondary">Without them, we can't tell whether there's room for a new presidency. Your saves weren't touched, and nothing new was put in their place. You can try again now.</Text>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <Button kind="primary" icon="review" onPress={retry}>Try opening saves again</Button>
      </Gate>
    );
  }
  // A full vault is met at the oath, where the player picks one to replace; blocking here would throw the draft away before it exists.
  const full = vaultCapacity(library.campaigns.length).full;
  if (!founding.draft.setupMode) {
    return (
      <FoundingFrame>
        <StageHero stage="oath" eyebrow="Before you take office" title="Taking office" question="Pick how much you'd like to set up yourself before you take office." />
        {full ? (
          <Column paddingBottom="md">
            <Notice tone="info">All {MAX_ACTIVE_CAMPAIGNS} save slots on this device are full. When you take the oath, you'll pick one saved presidency to replace, and you can save a copy of it first.</Notice>
          </Column>
        ) : null}
        <SetupChoice founding={founding} />
      </FoundingFrame>
    );
  }
  return <FoundingStages founding={founding} />;
}
