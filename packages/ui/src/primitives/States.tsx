import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing } from "react-native";
import { motion } from "@admin/design";
import { Icon, type IconName, type InkRole } from "../icons/Icon";
import { Button } from "./Button";
import { useReducedMotion } from "./motion";
import { Column } from "./Stack";
import { Text } from "./Text";

export type StateAction = { readonly label: string; readonly onPress: () => void; readonly icon?: IconName };

type StateProps = {
  readonly icon: IconName;
  readonly ink: InkRole;
  readonly title: string;
  readonly detail?: string | undefined;
  readonly action?: StateAction | undefined;
  readonly glyph?: ReactNode;
  readonly role: "status" | "alert";
};

/** The one layout every waiting, empty and failed state shares: a glyph, a sentence, a line of detail and at most one way forward. */
function StateBody({ icon, ink, title, detail, action, glyph, role }: StateProps) {
  return (
    <Column center gap="sm" paddingVertical="xl" paddingHorizontal="lg" role={role} aria-live={role === "alert" ? "assertive" : "polite"}>
      {glyph ?? <Icon name={icon} size={32} tone={ink} />}
      <Text variant="body" weight="medium" center>
        {title}
      </Text>
      {detail ? (
        <Text variant="label" tone="secondary" weight="regular" center maxWidth={480}>
          {detail}
        </Text>
      ) : null}
      {action ? (
        <Button kind="secondary" size="compact" icon={action.icon} onPress={action.onPress}>
          {action.label}
        </Button>
      ) : null}
    </Column>
  );
}

/** The orbit glyph turning; still when the system asks for reduced motion. */
function Orbit() {
  const reduced = useReducedMotion();
  const turn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced) return undefined;
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: motion.duration.settle * 3, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduced, turn]);
  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }} aria-hidden>
      <Icon name="loadingOrbit" size={32} tone="accent" weight="bold" />
    </Animated.View>
  );
}

/** Work under way: what is being read, said as a sentence. */
export function Loading({ title = "Loading", detail }: { readonly title?: string; readonly detail?: string }) {
  return <StateBody icon="loadingOrbit" ink="accent" title={title} detail={detail} glyph={<Orbit />} role="status" />;
}

/** Nothing to show yet: what would appear here, and the way to make it appear when there is one. */
export function Empty({ title, detail, action, icon = "emptyRecord" }: { readonly title: string; readonly detail?: string; readonly action?: StateAction; readonly icon?: IconName }) {
  return <StateBody icon={icon} ink="colorTertiary" title={title} detail={detail} action={action} role="status" />;
}

/** Something failed: what did, in plain words, and the one way to try again. Announced at once. */
export function ErrorState({ title, detail, action }: { readonly title: string; readonly detail?: string; readonly action?: StateAction }) {
  return <StateBody icon="caution" ink="danger" title={title} detail={detail} action={action} role="alert" />;
}
