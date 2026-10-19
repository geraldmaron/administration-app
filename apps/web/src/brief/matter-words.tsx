import { daysBetween, type Campaign } from "@admin/engine";
import { formatDate, pendingConversations, scenarioMatterId, type BriefMatter } from "@admin/player-core";
import { Countdown, isIconName, OpenEnded, Tag, type IconName } from "@admin/ui-web";

/** A matter's severity as a label with its glyph, so urgency is never carried by color alone. */
export function SeverityTag({ matter }: { readonly matter: BriefMatter }) {
  if (matter.stance === "adverse") return <Tag tone="risk" icon="adverse" solid>Critical</Tag>;
  if (matter.stance === "caution") return <Tag tone="caution" icon="caution">Serious</Tag>;
  return <Tag tone="neutral" icon="neutral">Routine</Tag>;
}

export function kindIconOf(matter: BriefMatter): IconName {
  return isIconName(matter.kindIcon) ? matter.kindIcon : "brief";
}

/** When it closes, in words: the date and what is left, else how long it has waited, else that no rule sets one. */
export function deadlineWords(matter: BriefMatter): string {
  const clock = matter.clock;
  if (clock) {
    const unit = clock.unit === "week" ? (clock.left === 1 ? "week" : "weeks") : clock.left === 1 ? "day" : "days";
    const left = `${clock.left} ${unit} left`;
    return clock.due ? `${formatDate(clock.due)} (${left})` : left;
  }
  if (matter.due) return `Due ${formatDate(matter.due)}`;
  return matter.age ? `No deadline; ${matter.age.toLowerCase()}` : "No deadline set";
}

/** What happens if the President does not answer: a decision's own words where it wrote some, else what the Desk itself does. */
export function inactionOf(campaign: Campaign, matter: BriefMatter): string {
  if (matter.kind === "decision") {
    const cast = pendingConversations(campaign).find((entry) => scenarioMatterId(entry.def.id) === matter.id);
    return cast?.def.context?.inaction ?? "It stays on your desk, and time stays paused until you deal with it.";
  }
  return matter.holds ? "Time stays paused until you deal with it." : "It stays on the Desk and time keeps running; it is not answered for you.";
}

/** The deadline drawn: a draining track where a rule gave a window, a figure and date for a bare due date, and a glyph for none. */
export function DeadlineMark({ campaign, matter }: { readonly campaign: Campaign; readonly matter: BriefMatter }) {
  const clock = matter.clock;
  if (clock) return <Countdown left={clock.left} window={clock.window} unit={clock.unit} {...(clock.due ? { dueText: formatDate(clock.due) } : {})} />;
  if (matter.due) {
    const stanceTone = matter.stance === "adverse" ? "bad" : matter.stance === "caution" ? "watch" : "neutral";
    return <Countdown left={daysBetween(campaign.calendar, matter.due)} unit="day" dueText={formatDate(matter.due)} tone={stanceTone} />;
  }
  return <OpenEnded holds={matter.holds} {...(matter.age ? { note: matter.age } : {})} />;
}
