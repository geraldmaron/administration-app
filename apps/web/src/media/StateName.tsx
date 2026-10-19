import { Flag } from "@admin/ui-web";
import { stateFlagUrl } from "./flags";

/** A state named with its flag, the way a country is named with its own, so a list of places reads as places. */
export function StateName({ id, name, height = 14 }: { readonly id: string; readonly name: string; readonly height?: number }) {
  const src = stateFlagUrl(id);
  return (
    <span className="state-name">
      <Flag name={name} {...(src ? { src } : {})} height={height} decorative />
      <span className="state-name__text">{name}</span>
    </span>
  );
}
