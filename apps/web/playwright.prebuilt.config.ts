import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

// Reuse the normal suite and viewports against a coordinated workspace build.
// Rebuilding Vite here would replace the bundle under other browser checks.
const server = config.webServer;
if (!server || Array.isArray(server) || !server.command.startsWith("pnpm run build && ")) {
  throw new Error("The prebuilt suite requires the normal build-and-preview server command.");
}

export default defineConfig({
  ...config,
  webServer: {
    ...server,
    command: server.command.slice("pnpm run build && ".length),
    reuseExistingServer: true,
  },
});
