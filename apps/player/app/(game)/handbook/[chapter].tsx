import { Link, useLocalSearchParams } from "expo-router";
import { HANDBOOK, handbookChapter } from "@admin/player-core";
import { Button, Column, Row, Text } from "@admin/ui";
import { ChapterBody } from "../../../src/handbook/ChapterBody";
import { HandbookPage } from "../../../src/handbook/HandbookPage";

/** One chapter of the Handbook; `?at=` lands on an explainer or a section of the law. */
export default function HandbookChapterPage() {
  const { chapter: id, at } = useLocalSearchParams<{ chapter: string; at?: string }>();
  const chapter = typeof id === "string" ? handbookChapter(id) : undefined;
  if (!chapter) {
    return (
      <HandbookPage eyebrow="Handbook" title="Chapter not found">
        <Column gap="sm">
          <Text variant="body">We couldn't find that chapter. You can pick one from the contents.</Text>
          <Row>
            <Link href="/handbook" asChild>
              <Button kind="secondary" icon="info">
                Open the contents
              </Button>
            </Link>
          </Row>
        </Column>
      </HandbookPage>
    );
  }
  return (
    <HandbookPage eyebrow={`Handbook, chapter ${HANDBOOK.indexOf(chapter) + 1} of ${HANDBOOK.length}`} title={chapter.title} lede={chapter.opens} current={chapter.id} {...(typeof at === "string" ? { landOn: at } : {})}>
      <ChapterBody chapter={chapter} />
    </HandbookPage>
  );
}
