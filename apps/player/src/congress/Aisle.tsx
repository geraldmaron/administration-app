import { useMemo, useState } from "react";
import type { Campaign } from "@admin/engine";
import { chamberReach, memberDepth, type CongressChamber, type MemberDepth, type NextSenateClass } from "@admin/player-core";
import { Button, Card, Column, Empty, ReadingFrame, Row, Slider, Surface, Text, View } from "@admin/ui";
import { PositionRidges, ridgeKeyEntries, type RidgeGroup } from "@admin/ui/legislature";
import { lensMembers, type AisleLens } from "./model";
import { Paged, RowLink } from "./parts";
import { PersonName } from "../dossier/PersonPeek";
import { termDoor } from "../handbook/term-door";

const PRESETS = [
  { value: "across", label: "Closest in the other party" },
  { value: "holdouts", label: "Your party" },
  { value: "near", label: "Near you" },
  { value: "all", label: "Everyone" },
  { value: "opponents", label: "Farthest from you" },
] as const;

const pct = (share: number) => `${Math.round(share * 100)}%`;

/** The whole row opens the member's file; a member with no file on record is shown, not pressable. */
function MemberRow({ campaign, member, showUp }: { readonly campaign: Campaign; readonly member: MemberDepth; readonly showUp: boolean }) {
  const body = <MemberFacts campaign={campaign} member={member} showUp={showUp} />;
  if (!member.href) return <View padding="sm">{body}</View>;
  return <RowLink label={`Open ${member.name}'s file`} href={member.href}>{body}</RowLink>;
}

function MemberFacts({ campaign, member, showUp }: { readonly campaign: Campaign; readonly member: MemberDepth; readonly showUp: boolean }) {
  const side = member.fromYou === undefined ? "No record" : Math.abs(member.fromYou) < 0.03 ? "Same as you" : member.fromYou < 0 ? "Left of you" : "Right of you";
  return (
    <Row gap="sm" top wrap>
      <Column flex={2} minWidth={160} gap="2xs">
        <PersonName campaign={campaign} id={member.personId} name={member.name} />
        <Text variant="caption" tone="secondary">
          {member.chamber === "house" ? member.seat : member.stateName}
          {member.post ? ` · ${member.post}` : ""}
        </Text>
      </Column>
      <Column flex={1} minWidth={110} gap="2xs">
        <Text variant="caption" tone="tertiary">On the economy</Text>
        <Text variant="caption">{side}</Text>
      </Column>
      <Column flex={1} minWidth={110} gap="2xs">
        <Text variant="caption" tone="tertiary">Home state approves</Text>
        <Text variant="caption" weight="strong" tone={member.homeApproval === undefined ? "tertiary" : member.homeApproval >= 0.5 ? "success" : "warning"}>
          {member.homeApproval === undefined ? "Not known" : pct(member.homeApproval)}
        </Text>
      </Column>
      <Column flex={1} minWidth={90} gap="2xs">
        <Text variant="caption" tone="tertiary">Last vote</Text>
        <Text variant="caption">{member.lastVote ? (member.lastVote === "yea" ? "Yea" : "Nay") : "None recorded"}</Text>
      </Column>
      {showUp ? (
        <Column flex={1} minWidth={80} gap="2xs">
          <Text variant="caption" tone="tertiary">Next election</Text>
          <Text variant="caption" tone={member.upNext ? "warning" : "secondary"}>{member.upNext ? "Up next" : "Not up"}</Text>
        </Column>
      ) : null}
    </Row>
  );
}

function AisleChamber({ campaign, chamber, you, senateClass }: { readonly campaign: Campaign; readonly chamber: CongressChamber; readonly you: number; readonly senateClass?: NextSenateClass }) {
  const reach = chamberReach(chamber, you, 1);
  const [lens, setLens] = useState<AisleLens>(reach.need > 0 ? { kind: "across" } : { kind: "holdouts" });
  const shown = useMemo(() => lensMembers(chamber, you, lens), [chamber, you, lens]);
  const rows = useMemo(() => shown.members.map((member) => memberDepth(campaign, member, you, senateClass, chamber.lastRoll)), [campaign, shown, you, senateClass, chamber.lastRoll]);
  const groups: readonly RidgeGroup[] = (["democrat", "independent", "republican"] as const).map((party) => ({ party, positions: chamber.members.filter((member) => member.party === party && member.lean !== undefined && !member.vacant).map((member) => member.lean!) }));
  const name = chamber.name.replace(/^the /, "");
  // Every House seat faces the voters every second November, so only the Senate's classes tell members apart.
  const showUp = chamber.chamber === "senate" && senateClass !== undefined;
  return (
    <Surface level="raised" pad="md">
      <Column gap="md">
        <Row between wrap gap="sm">
          <Text variant="title" role="heading" aria-level={3}>The {name}</Text>
          <Text variant="label" tone={reach.need > 0 ? "warning" : "success"}>
            {reach.need > 0 ? `You need ${reach.need} ${reach.need === 1 ? "vote" : "votes"} from the other party to ${reach.line.toLowerCase()}` : `Your party can ${reach.line.toLowerCase()} on its own if every member sticks together`}
          </Text>
        </Row>
        <ReadingFrame
          title={`Where members of the ${name} stand on the economy`}
          unit="Members per spot, left to right on the economic scale"
          period="From past votes and statements"
          legend={ridgeKeyEntries(groups.filter((group) => group.positions.length > 0).map((group) => group.party), shown.members.length > 0)}
          pressHint="Press the hills, or use the slider below, to list the members at a spot."
          help={{ meaning: "Each hill is one party. It shows where that party's members stand on the economy, from left to right. The taller the hill, the more members stand there. The dashed line is each party's middle member, and the gold line is you. The shaded box is the part of the scale the list below covers. Where someone stands is a hint, not a promise of their vote.", term: termDoor("ideology", "political leaning") }}
        >
          <PositionRidges label={`Where members of the ${name} stand on the economy, with your spot marked. Press a point to list the members there.`} groups={groups} you={you} band={shown.members.length > 0 ? { from: shown.from, to: shown.to } : undefined} onPick={(at) => setLens({ kind: "slice", at })} keyed={false} />
        </ReadingFrame>
        <Slider label={`Spot on the scale in the ${name}`} min={-1} max={1} step={0.05} value={lens.kind === "slice" ? lens.at : you} onChange={(at) => setLens({ kind: "slice", at })} valueText={lens.kind === "slice" ? `${Math.round(lens.at * 100)}, on a scale from −100 on the left to 100 on the right` : "Your spot"} centered />
        <Column gap="xs">
          <Text variant="label">Who to list in the {name}</Text>
          <Row wrap gap="xs" role="radiogroup" aria-label={`Who to list in the ${name}`}>
            {[...PRESETS, ...(lens.kind === "slice" ? [{ value: "slice" as const, label: "Your selection" }] : [])].map((preset) => (
              <Button key={preset.value} kind={lens.kind === preset.value ? "primary" : "secondary"} size="compact" label={`${preset.label}${lens.kind === preset.value ? ", selected" : ""}`} onPress={() => (preset.value === "slice" ? undefined : setLens({ kind: preset.value }))}>
                {preset.label}
              </Button>
            ))}
          </Row>
        </Column>
        <Text variant="caption" aria-live="polite">
          <Text variant="caption" weight="strong">{shown.title}.</Text> {shown.line} You can see them shaded on the scale above.
        </Text>
        <Paged items={rows} initial={10} noun="members" empty="No one sits at that spot on the scale. Try another spot." render={(member) => <MemberRow key={member.seat} campaign={campaign} member={member} showUp={showUp} />} />
      </Column>
    </Surface>
  );
}

/** Where each chamber sits, where the President does, and any part of it listed member by member. */
export function WhereYouStand({ campaign, chambers, you, senateClass }: { readonly campaign: Campaign; readonly chambers: readonly CongressChamber[]; readonly you: number; readonly senateClass?: NextSenateClass }) {
  return (
    <Card
      title="Where you stand with Congress"
      icon="layerLean"
    >
      {chambers.length === 0 ? <Empty title="No members have taken their seats" detail="Where members stand on the economy appears once the chambers are seated." /> : null}
      {chambers.map((chamber) => <AisleChamber key={chamber.chamber} campaign={campaign} chamber={chamber} you={you} {...(senateClass ? { senateClass } : {})} />)}
    </Card>
  );
}
