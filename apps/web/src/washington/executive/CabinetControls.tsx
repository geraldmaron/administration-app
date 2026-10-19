import { Field } from "@admin/ui-web";
import { executiveSearch, type ExecutiveSearch } from "./cabinet-view";

export function CabinetControls({ search, onChange }: { readonly search: ExecutiveSearch; readonly onChange: (next: ExecutiveSearch) => void }) {
  const change = (patch: Record<string, unknown>) => onChange(executiveSearch({ ...search, ...patch }));
  return <div className="cabinet-tools" aria-label="Find and organize offices">
    <Field label="Find an office or person">{(control) => <input {...control} type="search" className="ui-input" maxLength={120} value={search.q ?? ""} onChange={(event) => change({ q: event.target.value })} />}</Field>
    <Field label="Staffing">{(control) => <select {...control} className="ui-input" value={search.staffing ?? "all"} onChange={(event) => change({ staffing: event.target.value })}><option value="all">All chairs</option><option value="confirmed">Confirmed</option><option value="acting">Acting</option><option value="vacant">Vacant</option></select>}</Field>
    <Field label="Group offices by">{(control) => <select {...control} className="ui-input" value={search.group ?? "role"} onChange={(event) => change({ group: event.target.value })}><option value="role">Government role</option><option value="staffing">Staffing status</option><option value="assessment">Officer assessment</option></select>}</Field>
    <Field label="Order offices by">{(control) => <select {...control} className="ui-input" value={search.order ?? "attention"} onChange={(event) => change({ order: event.target.value })}><option value="attention">Needs you first</option><option value="name">Office name</option><option value="delivery">Highest delivery</option></select>}</Field>
  </div>;
}
