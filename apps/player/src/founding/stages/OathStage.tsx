import { CAMPAIGN_OPENING_DATE } from "@admin/engine";
import { GOVERNING_STYLE_WORDS, STAGE_TITLE, formatDate, orderRejections, type FoundingStageId, sealFor } from "@admin/player-core";
import { IDEOLOGY_AXES, leaderBackgroundById, schoolById } from "@admin/world";
import { Button, Seal, Column, DocParagraph, Document, Icon, Row, SignatureBlock, Surface, Text, type IconName } from "@admin/ui";
import { CAREER_GLYPH, PartyMark, STYLE_GLYPH } from "../glyphs";
import { Reading, RedactedPortrait, StageGrid } from "../parts";
import { AxisReading } from "../questions/ProfileQuestionnaire";
import type { Founding } from "../useFounding";
import { DrawnTeam } from "./DrawnTeam";
import { Arrival, Orders } from "./OathParts";

// The oath the Constitution prescribes (Article II, Section 1), word for word.
const OATH =
  "I do solemnly swear (or affirm) that I will faithfully execute the Office of President of the United States, and will to the best of my Ability, preserve, protect and defend the Constitution of the United States.";

function Certificate({ date, name }: { readonly date: string; readonly name: string }) {
  return (
    <Document issuer="The United States of America" kind="The Oath of Office" title="Article II, Section 1" date={date} seal={<Seal spec={sealFor("SEAL-PRESIDENT")} size={88} label="Seal of the President" />} footer={<SignatureBlock name={name || "Your name"} office="President of the United States" signed={date} />}>
      <DocParagraph>{OATH}</DocParagraph>
    </Document>
  );
}

function Readiness({ founding }: { readonly founding: Founding }) {
  const unnamed = founding.draft.leader.name.trim() === "";
  const problems = orderRejections(founding.routed).filter((entry) => !(entry.rejection.subject === "leader" && unnamed));
  if (problems.length === 0 && !unnamed) return null;
  const stages = [...new Set([...(unnamed ? (["person"] as FoundingStageId[]) : []), ...problems.map((problem) => problem.stage)])].filter((stage) => stage !== "oath");
  return (
    <Surface level="raised" pad="lg" accentEdge="warning" role="status" aria-label="Before you can take the oath">
      <Column gap="sm">
        <Text variant="label" weight="strong">
          Before you can take the oath
        </Text>
        {unnamed ? <Text variant="body">• Add your name. It goes on the oath.</Text> : null}
        {problems.map((problem) => (
          <Text key={`${problem.stage}-${problem.rejection.explanation}`} variant="body">
            • {problem.rejection.explanation}
          </Text>
        ))}
        <Row gap="sm" wrap>
          {stages.map((stage) => (
            <Button key={stage} size="compact" icon="return" onPress={() => founding.goTo(stage)}>
              {`Go to ${STAGE_TITLE[stage].toLowerCase()}`}
            </Button>
          ))}
        </Row>
      </Column>
    </Surface>
  );
}

function OathLine({ icon, children }: { readonly icon: IconName | undefined; readonly children: string }) {
  return (
    <Row gap="sm">
      {icon ? <Icon name={icon} size={20} tone="gold" /> : null}
      <Text variant="body" flex={1}>
        {children}
      </Text>
    </Row>
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
    <Reading icon="dossier" title="Your profile">
      <Row gap="lg" top wrap>
        <RedactedPortrait name={leader.name || "The President"} party={leader.party} size={72} />
        <Column flex={1} gap="xs" minWidth={200}>
          <Row gap="sm">
            <PartyMark party={leader.party} size={18} />
            <Text variant="body">{party}</Text>
          </Row>
          <OathLine icon={CAREER_GLYPH[leader.backgroundId as string]}>{`${career?.name ?? "Career"}, age ${leader.age} when sworn in`}</OathLine>
          <OathLine icon={leader.governingStyle ? STYLE_GLYPH[leader.governingStyle] : CAREER_GLYPH[leader.backgroundId as string]}>{leader.governingStyle ? GOVERNING_STYLE_WORDS[leader.governingStyle].label : "Style from your career"}</OathLine>
          <OathLine icon="departmentEducation">{school ? (schoolById.get(school)?.name ?? "Not recorded") : "College from your career"}</OathLine>
        </Column>
      </Row>
      {IDEOLOGY_AXES.map((axis) => (
        <AxisReading key={axis} axis={axis} value={leader.ideology[axis]} />
      ))}
      <Text variant="caption" tone="secondary">
        {setupMode === "long" ? "Your beliefs and style come from your 20 answers." : "You picked these yourself."} They shape who you are when you start and how well you get along with the people around you. The people you looked over earlier stay the same.
      </Text>
      <Button kind="quiet" size="compact" icon="return" onPress={() => founding.goTo(setupMode === "long" ? "politics" : "person")}>
        Change these choices
      </Button>
    </Reading>
  );
}

function FirstMorning({ founding }: { readonly founding: Founding }) {
  const preview = founding.currentPreview;
  if (preview?.ok) return <Arrival campaign={preview.campaign} />;
  const [title, words] =
    founding.oath.status === "failed"
      ? ["We couldn't show your first day", founding.oath.message]
      : preview && !preview.ok
        ? ["Your setup isn't ready for the oath yet", "Fix the items in the list, and you'll see your first day here."]
        : ["Getting your first day ready…", "You'll see the Congress you'll work with and how the public feels about you."];
  return (
    <Reading icon="loadingOrbit" title={title}>
      <Text variant="body" tone="secondary" role={founding.oath.status === "failed" ? "alert" : "status"}>
        {words}
      </Text>
    </Reading>
  );
}

/** The certificate, the Congress and public you arrive to, the first morning's orders, and what still stands in the way. */
export function OathStage({ founding, picks, toggle }: { readonly founding: Founding; readonly picks: readonly string[]; readonly toggle: (id: string) => void }) {
  const preview = founding.currentPreview;
  const date = formatDate(preview?.ok ? (preview.campaign.foundingDate ?? preview.campaign.calendar) : CAMPAIGN_OPENING_DATE);
  return (
    <StageGrid
      main={
        <>
          <Certificate date={date} name={founding.draft.leader.name.trim()} />
          <Readiness founding={founding} />
          {founding.draft.quickStart && !founding.draft.customizeSetup ? <DrawnTeam founding={founding} /> : null}
          {preview?.ok ? <Orders orders={preview.orders} picks={picks} toggle={toggle} /> : null}
          <ProfileReview founding={founding} />
        </>
      }
      side={<FirstMorning founding={founding} />}
    />
  );
}
