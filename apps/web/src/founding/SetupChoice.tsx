import { Button, Icon, IconBadge } from "@admin/ui-web";
import { Screen } from "../shell/Screen";
import type { Founding } from "./useFounding";

export function SetupChoice({ founding }: { readonly founding: Founding }) {
  const choose = (setupMode: "short" | "long") => founding.update((draft) => ({ ...draft, setupMode }));
  return <Screen title="The transition" icon="sign" eyebrow="Taking office" lede="Choose how you want to shape your presidency." screenClass="workspace" camera="us">
    <div className="setup-options">
      <section className="setup-option ui-card-door">
        <IconBadge name="subjectPerson" size={48} tone="gold" />
        <h2>Short setup</h2>
        <p>Choose your identity, party, career, governing style and alma mater, then review your running mate and Cabinet.</p>
        <p className="stage-note">A focused path to the oath. Your platform, beliefs and White House staff remain available to customize.</p>
        <Button className="ui-card-door__link" kind="primary" icon={<Icon name="chevron" size={18} />} onClick={() => choose("short")}>Choose Short setup</Button>
      </section>
      <section className="setup-option ui-card-door">
        <IconBadge name="dossier" size={48} tone="gold" />
        <h2>Long setup</h2>
        <p>Answer 20 policy and leadership questions. Your beliefs and governing style are read from your answers; then choose your team and platform.</p>
        <p className="stage-note">The same appointment choices and starting rules. No extra attribute points for taking the longer path.</p>
        <Button className="ui-card-door__link" kind="primary" icon={<Icon name="chevron" size={18} />} onClick={() => choose("long")}>Choose Long setup</Button>
      </section>
    </div>
  </Screen>;
}
