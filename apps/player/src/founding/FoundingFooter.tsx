import { FOUNDING_STAGE_SPEC, stageIndex, type FoundingStageId } from "@admin/player-core";
import { BrandMark, Button, Column, Divider, Row, Sheet, Text, useMedia } from "@admin/ui";
import { Notice } from "../settings/parts";
import { Haiku } from "../title/Haiku";
import { needsLeadershipReview } from "./draft";
import { drawPlayableTeam } from "./seal";
import type { Oath } from "./useOath";
import type { Founding } from "./useFounding";

const titleOf = (stage: FoundingStageId): string => FOUNDING_STAGE_SPEC[stageIndex(stage)]?.title ?? stage;

function Forward({ founding, oath, next }: { readonly founding: Founding; readonly oath: Oath; readonly next: FoundingStageId | undefined }) {
  const media = useMedia();
  const needsProfile = needsLeadershipReview(founding.draft);
  if (drawsTeam(founding)) {
    return (
      <Button
        kind="primary"
        size="large"
        icon="shuffle"
        iconAfter="chevron"
        disabled={founding.draft.leader.name.trim() === ""}
        label="Pick my team at random and go to the oath"
        onPress={() => {
          founding.update((draft) => drawPlayableTeam(draft));
          founding.goTo("oath");
        }}
        testID="founding-draw-team"
      >
        {media.phone ? "Pick my team" : "Pick my team and go to the oath"}
      </Button>
    );
  }
  if (next) {
    return (
      <Button
        kind="primary"
        size="large"
        iconAfter="chevron"
        disabled={founding.stage === "politics" && needsProfile}
        label={`Next: ${titleOf(next)}`}
        onPress={() => founding.goTo(next)}
        testID="founding-next"
      >
        {media.phone ? "Next" : `Next: ${titleOf(next)}`}
      </Button>
    );
  }
  const blocked = founding.routed.length > 0 || founding.draft.leader.name.trim() === "" || needsProfile;
  return (
    <Button kind="gold" size="large" icon="sign" disabled={blocked || !founding.currentPreview?.ok || oath.phase === "sealing"} onPress={oath.review} testID="founding-take-oath">
      {oath.phase === "sealing" ? "Saving…" : "Take the oath"}
    </Button>
  );
}

/** On a quick start, the first step's way forward is the draw itself. */
function drawsTeam(founding: Founding): boolean {
  const { setupMode, quickStart, customizeSetup } = founding.draft;
  return setupMode === "short" && Boolean(quickStart) && !customizeSetup && founding.stage === "person";
}

/** The stage's actions at the foot: back, a shortcut to the oath on the short path, and forward, with the oath's refusal said above them. */
export function Footer({ founding, oath, stages }: { readonly founding: Founding; readonly oath: Oath; readonly stages: readonly FoundingStageId[] }) {
  const at = stages.indexOf(founding.stage);
  const back = stages[at - 1];
  const next = stages[at + 1];
  return (
    <Column gap="sm">
      {oath.error ? <Notice tone="danger">{oath.error}</Notice> : null}
      {drawsTeam(founding) && founding.draft.leader.name.trim() === "" ? (
        <Text variant="caption" tone="secondary" textAlign="right">
          Add your name first. Everything else on this step is up to you.
        </Text>
      ) : null}
      <Row gap="sm" between>
        {back ? (
          <Button kind="quiet" icon="return" label={`Back: ${titleOf(back)}`} onPress={() => founding.goTo(back)}>
            Back
          </Button>
        ) : (
          <Row />
        )}
        <Row gap="sm" flexShrink={1} justifyContent="flex-end" wrap>
          {founding.stage === "person" && founding.draft.setupMode === "short" && !founding.draft.quickStart ? (
            <Button kind="secondary" onPress={() => founding.goTo("oath")} testID="founding-skip">
              Skip to the oath
            </Button>
          ) : null}
          <Forward founding={founding} oath={oath} next={next} />
        </Row>
      </Row>
    </Column>
  );
}

/** The presidential review before the oath: what is signed with it, then the one press that founds the administration. */
export function OathReview({ oath }: { readonly oath: Oath }) {
  const open = oath.phase === "reviewing" || oath.phase === "sealing";
  return (
    <>
      <Sheet
        open={open}
        onClose={oath.cancel}
        eyebrow="Final check"
        title="Take the oath of office"
        footer={
          <Row gap="sm" wrap>
            <Button kind="gold" size="large" icon="sign" disabled={oath.phase === "sealing"} onPress={() => void oath.confirm()} testID="founding-confirm-oath">
              {oath.phase === "sealing" ? "Starting your presidency…" : "Confirm and take the oath"}
            </Button>
            <Button kind="quiet" disabled={oath.phase === "sealing"} onPress={oath.cancel}>
              Go back and make changes
            </Button>
          </Row>
        }
      >
        <Column gap="md" alignItems="center">
          <BrandMark size={56} tone="color" />
          {oath.phase === "sealing" ? (
            <>
              <Text variant="body" center>
                Your presidency is being saved on this device. Stay here, and the Brief opens when it's ready.
              </Text>
              <Haiku id="oath-sealing" center />
            </>
          ) : (
            <Text variant="body" center>
              This step can't be undone. When you confirm, your presidency begins and is saved on this device right away.
            </Text>
          )}
        </Column>
        <Divider />
        <Column gap="2xs">
          <Text variant="caption" tone="secondary">
            Orders you'll sign on day one
          </Text>
          <Text variant="label">{oath.orders.length > 0 ? oath.orders.join("; ") : "None"}</Text>
        </Column>
      </Sheet>
      {oath.roomSheet}
    </>
  );
}
