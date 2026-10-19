import { raiseForFamily } from "@admin/engine";
export function familyRaise(kind, id, title, subject, dueAt) {
    return raiseForFamily({ kind, id, title, subject, ...(dueAt === undefined ? {} : { dueAt }) });
}
