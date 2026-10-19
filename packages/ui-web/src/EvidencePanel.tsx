import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { Sheet } from "./Layer";

export type EvidencePanelProps = {
  readonly title: string;
  readonly label?: string;
  readonly children: ReactNode | ((close: () => void) => ReactNode);
};

/** One contextual drill-down: keep the subject, route, selection and scroll behind the inspector. */
export function EvidencePanel({ title, label = title, children }: EvidencePanelProps) {
  const [open, setOpen] = useState(false);
  return <>
    <Button kind="secondary" size="sm" icon={<Icon name="info" size={16} />} onClick={() => setOpen(true)}>{label}</Button>
    <Sheet open={open} onClose={() => setOpen(false)} title={title} placement="side" foot={<Button kind="secondary" onClick={() => setOpen(false)}>Return to workspace</Button>}>
      <div className="ui-evidence-panel">{typeof children === "function" ? children(() => setOpen(false)) : children}</div>
    </Sheet>
  </>;
}
