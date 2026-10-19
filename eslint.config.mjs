// Root flat ESLint config for the pnpm workspace (packages/, apps/, services/, studio-cli).
// The dependency-direction rule lives in the packages/engine override below: it is the
// mechanism, not documentation, that keeps packages/engine pure.
import tseslint from "typescript-eslint";

const ENGINE_FORBIDDEN_IMPORTS = [
  // Platform / UI
  "react",
  "react-dom",
  "react-native",
  "react-native-web",
  "expo",
  "electron",
  "steamworks.js",
  "next",
  // Network
  "express",
  "@supabase/supabase-js",
  "axios",
  "node-fetch",
  "ws",
  // Node I/O built-ins
  "fs",
  "fs/promises",
  "net",
  "http",
  "https",
  "dgram",
  "child_process",
  "node:fs",
  "node:fs/promises",
  "node:net",
  "node:http",
  "node:https",
  "node:child_process",
];

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/dist-native/**", "**/.expo/**", "**/node_modules/**", "**/*.gen.ts", "apps/player/*.config.js", "apps/player/expo-env.d.ts"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // A leading underscore means "this parameter exists because the signature
      // requires it, and this implementation genuinely does not use it" — an
      // interface method whose isolation is enforced by the database rather
      // than by an argument, a tuple element skipped in a destructure. The
      // convention was already in use across the repo without the rule being
      // told about it, so an unused-by-design parameter had to either be
      // deleted from a signature it belongs in or left as a lint error.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "packages/ui-web/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/^#[0-9a-fA-F]{3,8}$/]`,
          message: "Color comes from packages/design tokens — no raw hex literals in the web player.",
        },
      ],
    },
  },
  {
    files: ["apps/desktop/src/preload.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // The boundary rule: packages/engine may depend on packages/world's data and
    // nothing else. No I/O, no platform, no network, no UI — proven by CI, not discipline.
    files: ["packages/engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ENGINE_FORBIDDEN_IMPORTS.map((name) => ({
            name,
            message: `packages/engine must stay pure: no I/O, platform, network, or UI imports. "${name}" is forbidden here.`,
          })),
          patterns: [
            {
              group: ["@admin/ui", "@admin/ui/*", "@admin/ui-web", "@admin/ui-web/*", "@admin/player-core", "@admin/player-core/*", "@admin/contracts", "@admin/contracts/*"],
              message:
                "packages/engine may depend on packages/world's data only (DECISIONS.md §1.1).",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: "packages/engine must be deterministic: no Date.now().",
        },
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "packages/engine must be deterministic: no argless `new Date()`.",
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: "packages/engine must be deterministic: no Math.random() — draw from packages/engine/rng instead.",
        },
      ],
    },
  },
  {
    files: ["packages/player-core/**/*.ts", "packages/design/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "player-core/design stay renderer-free (DECISIONS.md §8)." },
            { name: "react-dom", message: "player-core/design stay renderer-free (DECISIONS.md §8)." },
            { name: "react-native", message: "player-core/design stay renderer-free (DECISIONS.md §8)." },
            { name: "react-native-web", message: "player-core/design stay renderer-free (DECISIONS.md §8)." },
            { name: "expo", message: "player-core/design stay renderer-free (DECISIONS.md §8)." },
            { name: "expo-router", message: "player-core/design stay renderer-free (DECISIONS.md §8)." },
            { name: "electron", message: "player-core/design stay renderer-free (DECISIONS.md §8)." },
            { name: "steamworks.js", message: "player-core/design stay renderer-free (DECISIONS.md §8)." },
            { name: "tamagui", message: "player-core/design stay renderer-free (DECISIONS.md §8)." },
          ],
          patterns: [
            { group: ["@tamagui/*", "expo-*", "@expo/*", "react-native-*"], message: "player-core/design stay renderer-free (DECISIONS.md §8)." },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/ui/**/*.{ts,tsx}", "apps/player/**/*.{ts,tsx}"],
    ignores: ["packages/ui/src/theme/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/^#[0-9a-fA-F]{3,8}$/]`,
          message: "Color comes from the theme (packages/ui/src/theme, built from packages/design) — no raw hex literals in the player.",
        },
        {
          selector: `Literal[value=/^\\s*rgba?\\(/i]`,
          message: "Color comes from the theme (packages/ui/src/theme, built from packages/design) — no rgb()/rgba() literals in the player; a dimming layer uses veil() from @admin/ui.",
        },
        {
          selector: `TemplateElement[value.raw=/^\\s*rgba?\\(/i]`,
          message: "Color comes from the theme (packages/ui/src/theme, built from packages/design) — no rgb()/rgba() literals in the player; a dimming layer uses veil() from @admin/ui.",
        },
      ],
    },
  },
  {
    // The design system draws what it is handed: it never routes, never reaches
    // a host and never reads the simulation (DECISIONS.md §8.2).
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "expo-router", message: "packages/ui takes a LinkComponent from the app; screens own navigation (DECISIONS.md §8.2)." },
            { name: "expo", message: "packages/ui is host-free (DECISIONS.md §8.2)." },
            { name: "react-dom", message: "packages/ui renders through React Native primitives (DECISIONS.md §8.1)." },
            { name: "electron", message: "packages/ui is host-free (DECISIONS.md §8.2)." },
            { name: "steamworks.js", message: "packages/ui is host-free (DECISIONS.md §8.2)." },
          ],
          patterns: [
            { group: ["@admin/engine", "@admin/engine/*", "@admin/player-core", "@admin/player-core/*", "@admin/ui-web", "@admin/ui-web/*"], message: "packages/ui draws view models it is handed; it does not read the simulation (DECISIONS.md §8.2)." },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/player/**/*.{ts,tsx}"],
    rules: {
      // Metro resolves images and fonts only through a static require.
      "@typescript-eslint/no-require-imports": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "electron", message: "The player reaches the desktop host only through its typed bridge (DECISIONS.md §8.3)." },
            { name: "steamworks.js", message: "Steamworks stays in Electron main (DECISIONS.md §8.4)." },
            { name: "react-dom", message: "The player renders through React Native primitives (DECISIONS.md §8.1)." },
          ],
          patterns: [{ group: ["@admin/ui-web", "@admin/ui-web/*"], message: "The universal player uses @admin/ui (DECISIONS.md §8.2)." }],
        },
      ],
    },
  },
  {
    files: ["apps/web/**/*.{ts,tsx}", "packages/ui-web/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react-native", message: "apps/web is the legacy DOM player until cut-over; new work goes to apps/player (DECISIONS.md §8.1)." },
            { name: "react-native-web", message: "apps/web is the legacy DOM player until cut-over; new work goes to apps/player (DECISIONS.md §8.1)." },
            { name: "expo", message: "apps/web is the legacy DOM player until cut-over; new work goes to apps/player (DECISIONS.md §8.1)." },
            { name: "expo-router", message: "apps/web routes with TanStack Router until cut-over (DECISIONS.md §8.1)." },
            { name: "electron", message: "The renderer talks to desktop only through window.administrationDesktop." },
            { name: "steamworks.js", message: "Steamworks stays in Electron main (DECISIONS.md §8)." },
          ],
        },
      ],
    },
  },
);
