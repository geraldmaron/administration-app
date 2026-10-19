import { useMemo } from "react";
import type { Campaign } from "@admin/engine";
import { briefMatters, formatDate } from "@admin/player-core";
import { SideNav, TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, type NavLinkProps } from "@admin/ui-web";
import { usePreferences } from "../app/hooks";
import { ContinueControl } from "./ContinueControl";
import { Door } from "./Door";
import { standingAttention } from "./standing-attention";
import { navGroups, navPlace, navUtilities, PHONE_GROUPS } from "./modes";
import { AttentionWatch } from "./attention/AttentionWatch";
import { attentionMarks, countsByPlace } from "./attention/marks";
import { useSeenLedger } from "./attention/seen-store";
import { SaveStatus } from "./SaveStatus";
import { ThemeSwitch } from "./ThemeControl";

// The frame's parts that exist only while a presidency is in play. They read
// the engine and the corpus, so they load with the stores rather than with
// the title screen.

function RouterLink({ href, children, ...rest }: NavLinkProps) {
  return (
    <Door href={href} {...rest}>
      {children}
    </Door>
  );
}

/** "February 3, 2029" as "Feb 3, 2029": the masthead's date on a phone, where the full month does not fit. */
function shortDate(full: string): string {
  const [month, ...rest] = full.split(" ");
  return month && rest.length > 0 ? `${month.slice(0, 3)} ${rest.join(" ")}` : full;
}

export function TermStatus({ campaign }: { readonly campaign: Campaign }) {
  const date = formatDate(campaign.calendar);
  return (
    <span>
      <TooltipProvider><Tooltip><TooltipTrigger asChild><Door href="/brief?view=calendar" className="bar-status__date" aria-label={`Open calendar: ${date}`}>
        <span className="ui-visually-hidden">{date}</span>
        <span className="bar-status__long" aria-hidden="true">{date}</span>
        <span className="bar-status__short" aria-hidden="true">
          {shortDate(date)}
        </span>
      </Door></TooltipTrigger><TooltipContent>Calendar and recorded deadlines</TooltipContent></Tooltip></TooltipProvider>
      <span className="bar-status__week"> · Week {campaign.turn}</span>
    </span>
  );
}

export function TermActions({ campaign }: { readonly campaign: Campaign }) {
  return (
    <>
      <ContinueControl campaign={campaign} />
      <SaveStatus />
    </>
  );
}

/**
 * The navigation with its badges: red for what the President has not seen,
 * quiet for what has been seen and still waits. Each badge's things are tied
 * to the section of a page that shows them, and are recorded as seen once that
 * section, or their row on a list, has been on screen.
 */
export function TermNav({ campaign, pathname }: { readonly campaign: Campaign; readonly pathname: string }) {
  const { preferences } = usePreferences();
  const marks = useMemo(() => attentionMarks(briefMatters(campaign, preferences.attentionByKind), standingAttention(campaign)), [campaign, preferences.attentionByKind]);
  const [ledger, setLedger] = useSeenLedger(campaign.seed);
  return (
    <>
      <SideNav groups={navGroups(countsByPlace(marks, ledger))} utilities={navUtilities()} current={navPlace(pathname, campaign)} phoneGroups={PHONE_GROUPS} drawerFoot={<ThemeSwitch />} Link={RouterLink} />
      <AttentionWatch marks={marks} ledger={ledger} onSeen={setLedger} />
    </>
  );
}
