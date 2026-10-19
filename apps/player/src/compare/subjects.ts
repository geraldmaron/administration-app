import { compareMetric, subjectKey, type CompareMetricId, type CompareWindow, type Subject } from "@admin/player-core";
import { NationId, StateId } from "@admin/world";

// The comparison a door opens, carried in the address so Back, reload and a
// shared link keep it: the reading, the subjects and the window. Only
// validated presentation state is kept; nothing here touches the campaign.

export type CompareAddress = { readonly metric: CompareMetricId; readonly subjects: readonly Subject[]; readonly window: CompareWindow };

export const DEFAULT_METRIC: CompareMetricId = "approval";
export const WINDOWS: readonly CompareWindow[] = [13, 26, 52, "term"];
export const MAX_SUBJECTS = 8;

/** One subject from its address token, or undefined for a token that names nothing. */
export function parseSubject(token: string): Subject | undefined {
  const at = token.indexOf(":");
  const kind = at === -1 ? token : token.slice(0, at);
  const rest = at === -1 ? "" : token.slice(at + 1);
  switch (kind) {
    case "self":
      return { kind: "self" };
    case "at": {
      const turn = Number(rest);
      return Number.isSafeInteger(turn) ? { kind: "self-at", turn } : undefined;
    }
    case "nation": {
      const id = NationId.safeParse(rest.toUpperCase());
      return id.success ? { kind: "nation", id: id.data } : undefined;
    }
    case "state": {
      const id = StateId.safeParse(rest.toUpperCase());
      return id.success ? { kind: "state", id: id.data } : undefined;
    }
    case "history":
      return rest ? { kind: "history", benchmarkId: rest } : undefined;
    default:
      return undefined;
  }
}

/** A subject's address token; the inverse of `parseSubject`. */
export function subjectToken(subject: Subject): string {
  switch (subject.kind) {
    case "self":
      return "self";
    case "self-at":
      return `at:${subject.turn}`;
    case "nation":
      return `nation:${subject.id}`;
    case "state":
      return `state:${subject.id}`;
    case "history":
      return `history:${subject.benchmarkId}`;
  }
}

/** Subjects without repeats, the President's own always first and kept. */
export function withSelf(subjects: readonly Subject[]): readonly Subject[] {
  const unique = [...new Map(subjects.map((subject) => [subjectKey(subject), subject])).values()].filter((subject) => subject.kind !== "self");
  const self: Subject = { kind: "self" };
  return [self, ...unique].slice(0, MAX_SUBJECTS);
}

function parseWindow(value: string | undefined): CompareWindow {
  if (value === "term") return "term";
  const weeks = Number(value);
  return WINDOWS.includes(weeks) ? weeks : 26;
}

/** The comparison an address names, defaulting to approval over half a year. */
export function parseAddress(params: { readonly metric?: string; readonly with?: string; readonly window?: string }): CompareAddress {
  const metric = (params.metric && compareMetric(params.metric)?.id) || DEFAULT_METRIC;
  const tokens = (params.with ?? "").split(",").map((token) => decodeURIComponent(token.trim())).filter(Boolean);
  const subjects = withSelf(tokens.flatMap((token) => {
    const subject = parseSubject(token);
    return subject ? [subject] : [];
  }));
  return { metric, subjects, window: parseWindow(params.window) };
}

/** The address of a comparison, for a door from any reading to the workspace. */
export function compareHref(address: CompareAddress): string {
  const others = withSelf(address.subjects).filter((subject) => subject.kind !== "self");
  const query = [`metric=${address.metric}`, `window=${address.window}`, ...(others.length ? [`with=${others.map((subject) => encodeURIComponent(subjectToken(subject))).join(",")}`] : [])];
  return `/compare?${query.join("&")}`;
}
