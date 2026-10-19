import { GENRE_LABEL, type DispatchGenre } from "@admin/player-core";
import { Tag, type IconName, type TagTone } from "@admin/ui-web";

const MARK: Readonly<Record<DispatchGenre, { readonly icon: IconName; readonly tone: TagTone }>> = {
  journalism: { icon: "press", tone: "neutral" },
  official: { icon: "order", tone: "identity" },
  intelligence: { icon: "intel", tone: "action" },
};

/** The kind of paper a story is, in words and a mark, so journalism, an official notice and an intelligence summary never read alike. */
export function GenreTag({ genre }: { readonly genre: DispatchGenre }) {
  const { icon, tone } = MARK[genre];
  return (
    <Tag tone={tone} icon={icon}>
      {GENRE_LABEL[genre]}
    </Tag>
  );
}
