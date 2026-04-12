import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Logo } from "@ui/atoms/logo/logo";
import { Button } from "@ui/molecules/button/button";
import { useCallback } from "react";
import { useLocalStorage } from "usehooks-ts";
import { PROJECTS_STORAGE_KEY, type Project } from "@/types/project";

export const Home: React.FC = () => {
  const [projects, setProjects] = useLocalStorage<Project[]>(
    PROJECTS_STORAGE_KEY,
    [],
  );
  const navigate = useNavigate();

  const createProject = useCallback(() => {
    const id = crypto.randomUUID();
    const next: Project = {
      id,
      name: `Проект ${projects.length + 1}`,
      createdAt: Date.now(),
    };
    setProjects([...projects, next]);
    void navigate({ to: "/$projectId", params: { projectId: id } });
  }, [projects, setProjects, navigate]);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <div>
        <Logo size="lg" className="mb-3" />
        <h1 className="text-xl font-semibold text-foreground">AquilaGraph</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Создайте проект — он появится во вкладках и получит свой адрес с UUID.
        </p>
      </div>
      <Button type="button" onClick={createProject}>
        Новый проект
      </Button>
      {projects.length > 0 ? (
        <ul className="list-inside list-disc text-sm text-muted-foreground">
          {projects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="text-left text-primary underline-offset-2 hover:underline"
                onClick={() =>
                  void navigate({
                    to: "/$projectId",
                    params: { projectId: p.id },
                  })
                }
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Пока нет проектов.</p>
      )}
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: Home,
});
