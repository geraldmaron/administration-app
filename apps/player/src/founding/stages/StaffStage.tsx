import { roleTitle } from "@admin/player-core";
import { WHITE_HOUSE_STAFF_ROLE_IDS, type PersonId, type WhiteHouseStaffRoleId } from "@admin/world";
import { CardGrid, Column, Icon, Row, Text, type IconName } from "@admin/ui";
import { withStaff, type FoundingDraft, type ResolvedFounding } from "../draft";
import { CandidateList, Commits } from "../parts";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;

const POST_LINE: Readonly<Record<WhiteHouseStaffRoleId, string>> = {
  "role-chief-of-staff": "Runs the White House and the people who work there.",
  "role-national-security-adviser": "Runs the National Security Council, the group that advises you on keeping the country safe.",
  "role-press-secretary": "Speaks for you to reporters.",
};

const POST_GLYPH: Readonly<Record<WhiteHouseStaffRoleId, IconName>> = {
  "role-chief-of-staff": "westWing",
  "role-national-security-adviser": "departmentNationalSecurity",
  "role-press-secretary": "microphone",
};

function Post({ post, resolved, update }: { readonly post: WhiteHouseStaffRoleId; readonly resolved: ResolvedFounding; readonly update: Update }) {
  const slate = resolved.staffSlates[post] ?? [];
  return (
    <Column gap="sm" flexGrow={1} minWidth={0}>
      <Row gap="sm" top>
        <Icon name={POST_GLYPH[post]} size={26} tone="gold" />
        <Column flex={1}>
          <Text variant="title" role="heading" aria-level={3}>
            {roleTitle(post)}
          </Text>
          <Text variant="caption" tone="secondary">
            {POST_LINE[post]}
          </Text>
        </Column>
      </Row>
      {slate.length === 0 ? (
        <Text variant="body" tone="secondary">
          No one available is a good fit for you, so this job would start empty.
        </Text>
      ) : (
        <CandidateList
          label={`Shortlist for ${roleTitle(post)}`}
          chosen={resolved.seated.staff[post] as string | undefined}
          onChoose={(id) => update((current) => withStaff(current, post, id as PersonId))}
          candidates={slate.map((candidate) => ({ person: candidate.person, fit: candidate.band, crossesTheAisle: candidate.crossesTheAisle }))}
        />
      )}
    </Column>
  );
}

/** The President's own hires, each prefilled with the best fit and swappable. */
export function StaffStage({ resolved, update }: { readonly resolved: ResolvedFounding; readonly update: Update }) {
  return (
    <Column gap="xl">
      <Commits>You pick these three yourself, without a Senate vote. They start work on your first morning.</Commits>
      <CardGrid columns={{ phone: 1, tablet: 1, desktop: 3, wide: 3 }} gap="2xl">
        {WHITE_HOUSE_STAFF_ROLE_IDS.map((post) => (
          <Post key={post} post={post} resolved={resolved} update={update} />
        ))}
      </CardGrid>
    </Column>
  );
}
