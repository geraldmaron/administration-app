import type { DocketCase } from "@admin/player-core";
import { Tag, type IconName, type TagTone } from "@admin/ui-web";

type Look = { readonly label: string; readonly tone: TagTone; readonly icon: IconName };

/** Pending, struck down and upheld are different facts: each has its own icon and words, and the color only repeats them. */
export const CASE_STATUS: Readonly<Record<DocketCase["status"], Look>> = {
  pending: { label: "Pending in the courts", tone: "caution", icon: "pending" },
  "struck-down": { label: "Struck down, final", tone: "risk", icon: "statusBlocked" },
  upheld: { label: "Upheld, in force", tone: "good", icon: "statusIssued" },
};

export function CaseStatus({ status, dismissedAtThreshold = false, subject, endReason }: { readonly status: DocketCase["status"]; readonly dismissedAtThreshold?: boolean; readonly subject?: DocketCase["subject"]; readonly endReason?: DocketCase["endReason"] }) {
  const look = CASE_STATUS[status];
  const ended = endReason === "sunset" ? "expired" : "rescinded";
  const claimLabel = status === "struck-down" && subject?.kind === "wage-hour-enforcement" ? "Overtime owed, final"
    : status === "struck-down" && subject?.kind === "unlawful-surveillance" ? "Damages awarded, final"
      : status === "struck-down" && subject?.kind === "fair-housing-enforcement" ? "Housing violation proved, final"
        : status === "upheld" && subject?.kind === "wage-hour-enforcement" ? "No shortfall proved"
          : status === "upheld" && subject?.kind === "fair-housing-enforcement" ? "Housing claim unproved"
            : undefined;
  return (
    <Tag tone={look.tone} icon={look.icon}>
      {endReason ? status === "pending" ? `Pending; order ${ended}`
        : dismissedAtThreshold ? `Challenge dismissed; order ${ended}`
          : status === "upheld" ? `Upheld; order ${ended}` : look.label
        : dismissedAtThreshold ? "Challenge dismissed; order remains in force" : claimLabel ?? look.label}
    </Tag>
  );
}
