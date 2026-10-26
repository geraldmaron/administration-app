import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Linking } from "react-native";
import { authorityByCite, authorityView, type AuthorityView } from "@admin/player-core";
import { Button, Column, LegalCitation, Row, Sheet, Surface, Tag, Text } from "@admin/ui";

type OpenAuthority = (cite: string) => void;

const AuthorityContext = createContext<OpenAuthority>(() => undefined);

/** Opens the law behind a citation from anywhere in the player. */
export function useOpenAuthority(): OpenAuthority {
  return useContext(AuthorityContext);
}

function Points({ title, items }: { readonly title: string; readonly items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <Column gap="xs">
      <Text variant="eyebrow" tone="secondary">
        {title}
      </Text>
      {items.map((item) => (
        <Row key={item} gap="sm" top>
          <Text variant="body" tone="gold">
            ·
          </Text>
          <Text variant="body" flex={1}>
            {item}
          </Text>
        </Row>
      ))}
    </Column>
  );
}

function AuthorityBody({ view }: { readonly view: AuthorityView }) {
  return (
    <>
      <Row gap="sm" wrap>
        <Tag tone="authority" icon="law">
          {view.kindLabel}
        </Tag>
        {view.inForce ? null : <Tag tone="warning">{view.lapsed ?? "No longer in effect"}</Tag>}
      </Row>
      <LegalCitation citation={{ cite: view.cite, title: view.title }} />
      <Text variant="body">{view.summary}</Text>
      <Points title="What it lets you do" items={view.enables} />
      <Points title="What limits it" items={view.limits} />
      <Surface level="raised" pad="md">
        <Column gap="xs">
          <Text variant="caption" tone="secondary">
            You can read the full text at {view.sourceLabel}.
          </Text>
          <Button kind="secondary" size="compact" icon="open" onPress={() => void Linking.openURL(view.sourceUrl).catch((cause: unknown) => console.warn("The source could not be opened.", cause))}>
            Open the original text
          </Button>
        </Column>
      </Surface>
    </>
  );
}

/**
 * One sheet for every citation the player shows (DECISIONS §8.12): the law in
 * plain words, what it enables, what limits it, and its primary source. A
 * citation the registry does not hold says so rather than inventing a summary.
 */
export function AuthorityProvider({ children }: { readonly children: ReactNode }) {
  const [cite, setCite] = useState<string | undefined>(undefined);
  const open = useCallback<OpenAuthority>((next) => setCite(next), []);
  const view = useMemo(() => {
    const authority = cite ? authorityByCite(cite) : undefined;
    return authority ? authorityView(authority) : undefined;
  }, [cite]);
  return (
    <AuthorityContext.Provider value={open}>
      {children}
      <Sheet open={cite !== undefined} onClose={() => setCite(undefined)} title={view?.title ?? cite ?? ""} eyebrow="The law">
        {view ? (
          <AuthorityBody view={view} />
        ) : (
          <Text variant="body" tone="secondary">
            The Handbook doesn't explain {cite} yet.
          </Text>
        )}
      </Sheet>
    </AuthorityContext.Provider>
  );
}
