import { counselOnReply, selectPerson, type Campaign, type ConversationScript, type ReplyProjection } from "@admin/engine";
import { counselSentence, monogramFor, place } from "@admin/player-core";
import { Badge, Column, EntityLink, Text } from "@admin/ui";
import { Voice } from "@admin/ui/review";
import type { PersonId } from "@admin/world";
import { go } from "./parts";

function nameOf(campaign: Campaign, person: PersonId): string {
  return selectPerson(campaign, person)?.base.name ?? "An adviser";
}

/**
 * What the cabinet says about the answer picked: the chair whose call it is,
 * and a second voice exactly when the engine finds one. Composed only from
 * what the engine returned; a vacant chair says so. Faces are redacted to
 * initials, as the briefing carries them.
 */
export function Counsel({ campaign, script, reply }: { readonly campaign: Campaign; readonly script: ConversationScript; readonly reply: ReplyProjection }) {
  const counsel = counselOnReply(campaign, script, reply);
  if (!counsel) return null;
  if (counsel.kind === "vacant") {
    return (
      <Text variant="body" tone="secondary">
        The job of advising you on this is empty right now, so nobody has weighed in.
      </Text>
    );
  }
  const sentence = counselSentence(campaign, script, reply);
  if (!sentence) return null;
  const voices = [
    { key: "lead", person: sentence.speaker, line: sentence.line, label: "Your adviser", tone: "accent" as const },
    ...(sentence.dissent ? [{ key: "dissent", person: sentence.dissent.speaker, line: sentence.dissent.line, label: "A different view", tone: "danger" as const }] : []),
  ];
  return (
    <Column gap="md" role="list" aria-label="What your advisers say about the answer you picked">
      {voices.map((voice) => {
        const name = nameOf(campaign, voice.person);
        return (
          <Voice
            key={voice.key}
            letters={monogramFor(name)}
            name={name}
            line={voice.line}
            tone={voice.tone}
            nameSlot={<EntityLink label={name} href={place.person(voice.person)} onPress={() => go(place.person(voice.person))} />}
            tag={<Badge status={voice.key === "lead" ? "info" : "warning"}>{voice.label}</Badge>}
          />
        );
      })}
    </Column>
  );
}
