import { createRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  context: {},
  basepath: import.meta.env.BASE_URL,
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});
