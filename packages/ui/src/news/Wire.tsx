import type { ComponentProps } from "react";
import { Surface } from "../primitives/Surface";
import { ArticleRow, type ArticleSummary } from "./ArticleCard";

type WireProps = {
  readonly stories: readonly ArticleSummary[];
  /** The list's name for a screen reader; the order it states is the order drawn. */
  readonly label?: string;
  /** Stamps a story with its own key when its position can change; defaults to the headline and time. */
  readonly storyKey?: (story: ArticleSummary, index: number) => string;
} & Pick<ComponentProps<typeof Surface>, "flexGrow">;

/**
 * The dispatch feed: stories the simulation produced, in the order the
 * caller gives them (the feed newest first, a front page by reach), each
 * stamped in game time. It holds what it is given and moves only when the
 * simulation does, never on a timer.
 */
export function Wire({ stories, label = "Dispatches", storyKey = (story, index) => `${index}:${story.when}:${story.headline}`, flexGrow }: WireProps) {
  return (
    <Surface pad="none" role="list" aria-label={label} {...(flexGrow !== undefined ? { flexGrow } : {})}>
      {stories.map((story, index) => (
        <ArticleRow key={storyKey(story, index)} story={story} first={index === 0} />
      ))}
    </Surface>
  );
}
