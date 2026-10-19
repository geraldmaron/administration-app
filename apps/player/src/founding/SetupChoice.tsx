import { CardGrid, CardLink, Column, Icon, Row, Text, View, type IconName } from "@admin/ui";
import type { Founding } from "./useFounding";

/** The whole card is the choice; the bar at its foot only shows where to press. */
function Path({ icon, title, body, note, verb, onChoose }: { readonly icon: IconName; readonly title: string; readonly body: string; readonly note: string; readonly verb: string; readonly onChoose: () => void }) {
  return (
    <CardLink role="button" label={verb} onPress={onChoose} level="raised" pad="xl" elevated flexGrow={1}>
      <Column gap="md" flexGrow={1}>
        <View width={64} height={64} borderRadius="pill" backgroundColor="goldFill" alignItems="center" justifyContent="center">
          <Icon name={icon} size={34} tone="goldInk" weight="fill" />
        </View>
        <Text variant="heading" role="heading" aria-level={2}>
          {title}
        </Text>
        <Text variant="body">{body}</Text>
        <Text variant="caption" tone="secondary">
          {note}
        </Text>
        <View flexGrow={1} />
        <Row gap="sm" justifyContent="center" minHeight={52} borderRadius="control" backgroundColor="accentFill" aria-hidden>
          <Text variant="label" tone="inverse">
            {verb}
          </Text>
          <Icon name="chevron" size={16} tone="accentInk" weight="bold" />
        </Row>
      </Column>
    </CardLink>
  );
}

/** Every setup path shares one draft, appointments and oath; the choice is how much the player sets by hand. */
export function SetupChoice({ founding }: { readonly founding: Founding }) {
  const choose = (setupMode: "short" | "long", quickStart = false) => founding.update(({ quickStart: _quick, ...draft }) => ({ ...draft, setupMode, ...(quickStart ? { quickStart } : {}) }));
  return (
    <CardGrid columns={{ phone: 1, tablet: 3, desktop: 3, wide: 3 }} gap="xl">
      <Path
        icon="quickStart"
        title="Quick start"
        body="Tell us who you are, your party, and how you lead. We'll pick a running mate, a Cabinet, and a White House staff for you at random from the people who fit, and take you straight to the oath."
        note="You can see who you got before you take the oath, pick again, or change anyone yourself."
        verb="Choose Quick start"
        onChoose={() => choose("short", true)}
      />
      <Path
        icon="subjectPerson"
        title="Short setup"
        body="Pick who you are, your party, your career, how you lead, and where you went to college. Then look over your running mate and Cabinet."
        note="This gets you to the oath faster. You can still set your promises, beliefs, and White House staff if you want to."
        verb="Choose Short setup"
        onChoose={() => choose("short")}
      />
      <Path
        icon="dossier"
        title="Long setup"
        body="Answer 20 questions about the issues and how you'd lead. Your answers decide your beliefs and your style. Then you pick your team and the promises you make to voters."
        note="You get the same people to choose from and the same rules. The longer path doesn't give you extra points."
        verb="Choose Long setup"
        onChoose={() => choose("long")}
      />
    </CardGrid>
  );
}
