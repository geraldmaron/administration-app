import { createFileRoute, redirect } from "@tanstack/react-router";

/** The press has one page, in Washington; the Record's old address leads there. */
export const Route = createFileRoute("/record/press/")({
  beforeLoad: () => {
    throw redirect({ to: "/washington/office/press", replace: true });
  },
});
