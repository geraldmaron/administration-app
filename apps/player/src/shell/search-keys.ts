export type SearchKeys = {
  readonly open: boolean;
  readonly count: number;
  readonly onOpen: () => void;
  readonly onClose: () => void;
  readonly onMove: (by: number) => void;
};

/** Native has no hardware keyboard to bind; the search button and its sheet are the whole entry. */
export function useSearchKeys(_keys: SearchKeys): void {
  return undefined;
}

export const SHORTCUT_HINT = "";
