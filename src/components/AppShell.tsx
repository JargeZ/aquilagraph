import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Logo } from "@ui/atoms/logo/logo";
import { Tabs, TabsList, TabsTrigger } from "@ui/molecules/tabs/tabs";
import { useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { PwaRegister } from "@/components/pwa-register";
import {
  isValidUuid,
  PROJECTS_STORAGE_KEY,
  type Project,
} from "@/types/project";

function activeTabValue(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg && isValidUuid(seg)) {
    return seg;
  }
  return "home";
}

export const AppShell: React.FC = () => {
  const [projects] = useLocalStorage<Project[]>(PROJECTS_STORAGE_KEY, []);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const value = activeTabValue(pathname);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <PwaRegister />
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-1">
        <Link
          to="/"
          className="rounded-md outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="На главную"
        >
          <Logo size="sm" />
        </Link>
        <Tabs
          className="min-w-0 flex-1"
          value={value}
          onValueChange={(next) => {
            if (next === "home") {
              navigate({ to: "/" });
            } else {
              navigate({ to: "/$projectId", params: { projectId: next } });
            }
          }}
        >
          <TabsList variant="line" className="flex-wrap gap-1">
            <TabsTrigger value="home">Главная</TabsTrigger>
            {hydrated &&
              projects.map((p) => (
                <TabsTrigger key={p.id} value={p.id}>
                  {p.name}
                </TabsTrigger>
              ))}
          </TabsList>
        </Tabs>
      </header>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
};
