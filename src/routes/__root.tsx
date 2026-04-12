import { createRootRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";

export const RootComponent: React.FC = () => <AppShell />;

export const Route = createRootRoute({
  component: RootComponent,
});
