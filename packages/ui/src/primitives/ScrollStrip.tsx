import { useRef, useState, type ReactNode } from "react";
import { ScrollView, type ScrollViewInstance, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { View } from "@tamagui/core";
import { Icon } from "../icons/Icon";
import { Pressable } from "./Button";

// How much of the visible width one press of an edge arrow moves, so the last
// item seen stays in view as a landmark.
const STEP = 0.7;

function EdgeButton({ side, noun, onPress }: { readonly side: "start" | "end"; readonly noun: string; readonly onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      aria-label={side === "end" ? `Show more ${noun}` : `Show earlier ${noun}`}
      position="absolute"
      top={0}
      bottom={0}
      {...(side === "end" ? { right: 0 } : { left: 0 })}
      width={36}
      alignItems="center"
      justifyContent="center"
      backgroundColor={{ default: "background", hover: "surfaceHover" }}
      borderColor="borderColor"
      {...(side === "end" ? { borderLeftWidth: 1 } : { borderRightWidth: 1 })}
      zIndex="raised"
    >
      <View transform={side === "start" ? [{ rotate: "180deg" }] : undefined}>
        <Icon name="chevron" size={16} tone="accent" />
      </View>
    </Pressable>
  );
}

/**
 * A row that keeps one line and scrolls sideways when it does not fit. When
 * items are hidden past an edge, that edge shows an arrow that scrolls to
 * them, so a clipped last tab never reads as the end of the row.
 */
export function ScrollStrip({ children, id, noun = "tabs" }: { readonly children: ReactNode; /** The scroller's element id, for a caller that scrolls it into place itself. */ readonly id?: string; /** What the hidden items are, for the arrows' names: "tabs", "columns". */ readonly noun?: string }) {
  const scroller = useRef<ScrollViewInstance>(null);
  const [view, setView] = useState(0);
  const [content, setContent] = useState(0);
  const [offset, setOffset] = useState(0);
  const hiddenStart = offset > 1;
  const hiddenEnd = content - view - offset > 1;
  const move = (direction: 1 | -1) => scroller.current?.scrollTo({ x: Math.max(0, offset + direction * view * STEP), animated: true });
  return (
    <View position="relative" onLayout={(event: LayoutChangeEvent) => setView(event.nativeEvent.layout.width)}>
      <ScrollView
        ref={scroller}
        {...(id ? { nativeID: id } : {})}
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onContentSizeChange={(width: number) => setContent(width)}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => setOffset(event.nativeEvent.contentOffset.x)}
      >
        {children}
      </ScrollView>
      {hiddenStart ? <EdgeButton side="start" noun={noun} onPress={() => move(-1)} /> : null}
      {hiddenEnd ? <EdgeButton side="end" noun={noun} onPress={() => move(1)} /> : null}
    </View>
  );
}
