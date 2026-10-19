import { subjectHref, subjectHrefWith, type SubjectRef } from "../shell/subject";

export type AdvisorHref = string;

export function subjectDoor(
  ref: SubjectRef,
  query?: Readonly<Record<string, string>>,
): { readonly href: AdvisorHref; readonly subject: SubjectRef } {
  return {
    href: query === undefined ? subjectHref(ref) : subjectHrefWith(ref, query),
    subject: ref,
  };
}
