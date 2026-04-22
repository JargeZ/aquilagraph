import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/$projectId/")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/$projectId/view/full-graph",
      params: { projectId: params.projectId },
    });
  },
});
