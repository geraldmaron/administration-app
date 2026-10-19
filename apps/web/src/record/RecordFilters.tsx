import { useId } from "react";
import type { EffectActor } from "@admin/engine";
import type { TimelineOption, TimelineReading } from "@admin/player-core";
import { Button, Choice, Field, Input, NativeSelect } from "@admin/ui-web";
import { isFiltered, type RecordPatch, type RecordSearch } from "./search";

type Actor = "all" | EffectActor;

const ACTORS: readonly { readonly value: Actor; readonly label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "player", label: "Your administration" },
  { value: "world", label: "The world" },
];

function OptionSelect({ label, options, value, onChange }: { readonly label: string; readonly options: readonly TimelineOption[]; readonly value: string | undefined; readonly onChange: (next: string | undefined) => void }) {
  const id = useId();
  const missing = value !== undefined && !options.some((option) => option.value === value);
  return (
    <div className="ui-field">
      <label className="ui-field__label" htmlFor={id}>
        {label}
      </label>
      <NativeSelect id={id} className="ui-input" value={value ?? ""} onChange={(event) => onChange(event.target.value || undefined)}>
        <option value="">Any</option>
        {missing ? <option value={value}>{value} (0)</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.count})
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

/** What the filters keep, said in words beside them so the number never lives only in a screen reader's label. */
export function matchCount(matching: number, total: number, filtered: boolean): string {
  if (total === 0) return "No entries yet";
  return filtered ? `${matching.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} entries match` : `${total.toLocaleString("en-US")} ${total === 1 ? "entry" : "entries"}`;
}

/** Search, who acted, and the domain, place and outcome an entry can be narrowed by, each with how many entries it keeps. */
export function RecordFilters({ reading, search, onSearch }: { readonly reading: TimelineReading; readonly search: RecordSearch; readonly onSearch: (patch: RecordPatch) => void }) {
  const filtered = isFiltered(search);
  return (
    <form className="rec-filters" role="search" aria-label="Search and filter the Record" onSubmit={(event) => event.preventDefault()}>
      <Field label="Search the Record">
        {(control) => <Input {...control} type="search" value={search.q ?? ""} placeholder="A word from an act, a state or a country" onChange={(event) => onSearch({ q: event.target.value || undefined })} />}
      </Field>
      <Choice legend="Who acted" value={search.actor ?? "all"} options={ACTORS} onChange={(actor) => onSearch({ actor: actor === "all" ? undefined : actor })} />
      <fieldset className="rec-filters__dimensions">
        <legend>Domain, place and outcome</legend>
        <div className="rec-filters__selects">
          <OptionSelect label="Domain" options={reading.domains} value={search.domain} onChange={(domain) => onSearch({ domain })} />
          <OptionSelect label="Place" options={reading.subjects} value={search.subject} onChange={(subject) => onSearch({ subject })} />
          <OptionSelect label="Outcome" options={reading.outcomes} value={search.outcome} onChange={(outcome) => onSearch({ outcome: outcome as RecordSearch["outcome"] })} />
        </div>
      </fieldset>
      <div className="rec-filters__foot">
        <p className="rec-count" role="status">
          {matchCount(reading.rows.length, reading.total, filtered)}
        </p>
        {filtered ? (
          <Button kind="ghost" size="sm" onClick={() => onSearch({ q: undefined, actor: undefined, domain: undefined, subject: undefined, outcome: undefined })}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </form>
  );
}
