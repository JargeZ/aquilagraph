import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger } from "@ui/molecules/tabs/tabs";
import { useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border bg-card px-4 py-2">
        <Tabs
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
        <p className="mt-2 text-xs text-muted-foreground">
          Создавайте проекты на{" "}
          <Link
            to="/"
            className="text-primary underline-offset-2 hover:underline"
          >
            главной
          </Link>
          .
        </p>
      </header>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  );
};
