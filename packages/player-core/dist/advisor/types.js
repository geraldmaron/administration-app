import { subjectHref, subjectHrefWith } from "../shell/subject";
export function subjectDoor(ref, query) {
    return {
        href: query === undefined ? subjectHref(ref) : subjectHrefWith(ref, query),
        subject: ref,
    };
}
