import { selectNation, type Campaign } from "@admin/engine";
import { place, type BriefMatter } from "@admin/player-core";
import { Button, Flag, Icon } from "@admin/ui-web";
import { stateById, type NationId } from "@admin/world";
import { nationFlagUrl, stateFlagUrl } from "../media/flags";
import { Door } from "../shell/Door";

/** The matter's existing geographic reference carries identity into evidence and the Record. */
export function SubjectEvidence({ campaign, matter }: { readonly campaign: Campaign; readonly matter: BriefMatter }) {
  const ref = matter.selection;
  if (!ref) return null;
  const [kind, id] = ref.split(":");
  if (!id) return null;
  const name = kind === "nation" ? selectNation(campaign, id as NationId)?.base.identity.name : kind === "state" ? stateById.get(id)?.name : undefined;
  if (!name) return null;
  const href = kind === "nation" ? place.country(id) : place.state(id);
  const flag = kind === "nation" ? nationFlagUrl(id) : stateFlagUrl(id);
  return <nav className="grid gap-2 sm:grid-cols-2" aria-label="Follow this matter's subject">
    <Button asChild kind="secondary" className="h-auto min-w-0 justify-start py-3 text-left"><Door href={href}><Flag name={name} src={flag} height={18} decorative /><span className="min-w-0"><strong className="block">{name}</strong><span className="block text-xs font-normal text-muted-foreground">Subject dossier</span></span><Icon name="chevron" size={16} className="ml-auto shrink-0" /></Door></Button>
    <Button asChild kind="secondary" className="h-auto min-w-0 justify-start py-3 text-left"><Door href={`/record?subject=${encodeURIComponent(ref)}`}><Icon name="record" size={20} /><span className="min-w-0"><strong className="block">Recorded changes</strong><span className="block text-xs font-normal text-muted-foreground">This subject on the Record</span></span><Icon name="chevron" size={16} className="ml-auto shrink-0" /></Door></Button>
  </nav>;
}
