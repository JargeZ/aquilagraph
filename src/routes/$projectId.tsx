import {
  createFileRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router";
import { isValidUuid } from "@/types/project";

export const Route = createFileRoute("/$projectId")({
  beforeLoad: ({ params }) => {
    if (!isValidUuid(params.projectId)) {
      throw redirect({ to: "/" });
    }
  },
  component: lazyRouteComponent(() => import("./project-id-page")),
});
