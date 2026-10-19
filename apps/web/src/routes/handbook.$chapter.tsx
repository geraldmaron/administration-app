import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { HANDBOOK, chapterForExplainer, handbookChapter } from "@admin/player-core";
import { ChapterView, HandbookLayout, useHashScroll } from "../handbook";
import { Screen } from "../shell/Screen";

function HandbookChapterPage() {
  const { chapter: id } = Route.useParams();
  const navigate = useNavigate();
  const chapter = handbookChapter(id);
  useHashScroll();
  if (!chapter) return null;
  const open = (explainerId: string) => {
    const home = chapterForExplainer(explainerId);
    if (home) void navigate({ to: "/handbook/$chapter", params: { chapter: home.id }, hash: explainerId });
  };
  return (
    <Screen icon="info" title={chapter.title} eyebrow={`Handbook, chapter ${HANDBOOK.indexOf(chapter) + 1} of ${HANDBOOK.length}`} lede={chapter.opens} screenClass="workspace" camera="world">
      <HandbookLayout current={chapter.id}>
        <ChapterView chapter={chapter} onOpen={open} />
      </HandbookLayout>
    </Screen>
  );
}

export const Route = createFileRoute("/handbook/$chapter")({
  loader: ({ params }) => {
    if (!handbookChapter(params.chapter)) throw notFound();
  },
  component: HandbookChapterPage,
});
