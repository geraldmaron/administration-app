// The layer order before anything else, the route tree included: a component's
// own stylesheet is bundled where its module is first imported, and the first
// sheet to name a layer fixes that layer's place in the cascade.
import "@admin/design/layers.css";
import { TooltipProvider } from "@admin/ui-web";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/400-italic.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/source-sans-3/700.css";
import "@fontsource/source-serif-4/400.css";
import "@fontsource/source-serif-4/600.css";
import "@admin/design/tokens.css";
import "@admin/ui-web/ui.css";
import "./shell/shell.css";
import "./screens/screens.css";
import "./brief/brief.css";
import "./decision/decision.css";
import "./founding/founding.css";

const router = createRouter({ routeTree, scrollRestoration: false });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("The Administration has nowhere to mount.");

createRoot(root).render(
  <StrictMode>
    <TooltipProvider delayDuration={350}><RouterProvider router={router} /></TooltipProvider>
  </StrictMode>,
);
