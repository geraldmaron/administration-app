import { createFileRoute } from "@tanstack/react-router";
import { FoundingFlow } from "../founding/FoundingFlow";

export const Route = createFileRoute("/founding")({
  component: FoundingFlow,
});
