import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { Sheet } from "./Layer";
import { Input } from "./Input";
import { Icon, type IconName } from "./Icon";

export type PaletteItem = {
  readonly id: string;
  /** The heading the item is listed under: "Places", "Glossary". */
  readonly group: string;
  readonly title: string;
  readonly detail?: string;
  readonly icon?: IconName;
  /** What the item says when it is the active one: a definition, a place's purpose. */
  readonly body?: ReactNode;
  /** Absent, choosing the item only opens its body. */
  readonly onSelect?: () => void;
};

export type CommandPaletteProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  /** Already filtered and ranked for the query. */
  readonly items: readonly PaletteItem[];
  readonly placeholder?: string;
};

function Results({ items, active, listId, onPick }: { readonly items: readonly PaletteItem[]; readonly active: number; readonly listId: string; readonly onPick: (index: number) => void }) {
  return (
    <ul id={listId} role="listbox" aria-label="Results" className="ui-palette__results">
      {items.map((item, index) => (
        <li
          key={item.id}
          id={`${listId}-${index}`}
          role="option"
          aria-selected={index === active}
          className="ui-palette__item"
          data-first-in-group={index === 0 || items[index - 1]?.group !== item.group ? item.group : undefined}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(index)}
        >
          {item.icon ? <Icon name={item.icon} size={18} className="ui-palette__glyph" /> : <span className="ui-palette__glyph" />}
          <span className="ui-palette__text">
            <span className="ui-palette__title">{item.title}</span>
            {item.detail ? <span className="ui-palette__detail">{item.detail}</span> : null}
          </span>
          <span className="ui-palette__group">{item.group}</span>
        </li>
      ))}
    </ul>
  );
}

/** The highlighted result, moved by the arrows and chosen by Enter; a result with no action only opens its body. */
function useActiveItem(items: readonly PaletteItem[], query: string, onClose: () => void) {
  const [chosen, setChosen] = useState(0);
  useEffect(() => setChosen(0), [query]);
  const active = Math.max(0, Math.min(chosen, items.length - 1));
  const pick = (index: number) => {
    const item = items[index];
    setChosen(index);
    if (item?.onSelect) {
      item.onSelect();
      onClose();
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") setChosen(Math.min(items.length - 1, active + 1));
    else if (event.key === "ArrowUp") setChosen(Math.max(0, active - 1));
    else if (event.key === "Enter") pick(active);
    else return;
    event.preventDefault();
  };
  return { active, current: items[active], pick, onKeyDown };
}

/** Search across places and the glossary: type, move with the arrows, Enter to go, Escape to close. */
export function CommandPalette({ open, onClose, query, onQueryChange, items, placeholder = "Search places and terms" }: CommandPaletteProps) {
  const id = useId();
  const listId = `${id}-list`;
  const { active, current, pick, onKeyDown } = useActiveItem(items, query, onClose);

  return (
    <Sheet open={open} onClose={onClose} className="ui-palette" title="Search" placement="center">
      <div className="ui-palette__box">
        <div className="ui-palette__field">
          <Icon name="review" size={20} />
          <Input
            className="ui-palette__input"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls={listId}
            aria-activedescendant={current ? `${listId}-${active}` : undefined}
            aria-autocomplete="list"
            aria-label={placeholder}
            placeholder={placeholder}
            value={query}
            autoFocus
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        {items.length === 0 ? <p className="ui-palette__none" role="status">Nothing matches “{query}”.</p> : <Results items={items} active={active} listId={listId} onPick={pick} />}
        {current?.body ? (
          <div className="ui-palette__body" aria-live="polite">
            <p className="ui-palette__body-title">{current.title}</p>
            {current.body}
          </div>
        ) : null}
      </div>
    </Sheet>
  );
}
