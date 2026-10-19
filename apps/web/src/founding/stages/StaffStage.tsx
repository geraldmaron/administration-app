import { useId } from "react";
import { WHITE_HOUSE_STAFF_ROLE_IDS, type WhiteHouseStaffRoleId } from "@admin/world";
import { roleTitle } from "@admin/player-core";
import { Icon, type IconName } from "@admin/ui-web";
import { withStaff, type FoundingDraft, type ResolvedFounding } from "../draft";
import { CandidateCard, Commits } from "../parts";

type Update = (change: (draft: FoundingDraft) => FoundingDraft) => void;

const POST_LINE: Readonly<Record<WhiteHouseStaffRoleId, string>> = {
  "role-chief-of-staff": "Runs the Executive Office and the building.",
  "role-national-security-adviser": "Runs the National Security Council.",
  "role-press-secretary": "Speaks for you from the briefing room.",
};

const POST_GLYPH: Readonly<Record<WhiteHouseStaffRoleId, IconName>> = {
  "role-chief-of-staff": "westWing",
  "role-national-security-adviser": "departmentNationalSecurity",
  "role-press-secretary": "microphone",
};

function Post({ post, resolved, update }: { readonly post: WhiteHouseStaffRoleId; readonly resolved: ResolvedFounding; readonly update: Update }) {
  const name = useId();
  const slate = resolved.staffSlates[post] ?? [];
  return (
    <fieldset className="candidates">
      <legend className="candidates__post">
        <Icon name={POST_GLYPH[post]} size={22} />
        <span>
          <span className="candidates__title">{roleTitle(post)}</span>
          <span className="candidates__line">{POST_LINE[post]}</span>
        </span>
      </legend>
      {slate.length === 0 ? <p className="stage-note">Nobody on this bench fits your ticket, so the post would open empty.</p> : null}
      {slate.map((candidate) => (
        <CandidateCard
          key={candidate.person.id}
          name={name}
          person={candidate.person}
          checked={resolved.seated.staff[post] === candidate.person.id}
          onChoose={() => update((current) => withStaff(current, post, candidate.person.id))}
          fit={candidate.band}
          crossesTheAisle={candidate.crossesTheAisle}
        />
      ))}
    </fieldset>
  );
}

/** The President's own hires, each prefilled with the best fit and swappable. */
export function StaffStage({ resolved, update }: { readonly resolved: ResolvedFounding; readonly update: Update }) {
  return (
    <div className="stage-stack">
      <Commits>These three need no Senate vote. They serve from the first morning.</Commits>
      <div className="stage-columns">
        {WHITE_HOUSE_STAFF_ROLE_IDS.map((post) => (
          <Post key={post} post={post} resolved={resolved} update={update} />
        ))}
      </div>
    </div>
  );
}
