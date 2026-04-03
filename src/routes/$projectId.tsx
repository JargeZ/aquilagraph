import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { ProjectAnalysisProvider } from "@/contexts/project-analysis-context";
import { isValidUuid, PROJECTS_STORAGE_KEY, type Project } from "@/types/project";

function ProjectLayout() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const [projects] = useLocalStorage<Project[]>(PROJECTS_STORAGE_KEY, []);

  useEffect(() => {
    const exists = projects.some((p) => p.id === projectId);
    if (!exists) {
      void navigate({ to: "/" });
    }
  }, [projects, projectId, navigate]);

  return (
    <ProjectAnalysisProvider projectId={projectId}>
      <Outlet />
    </ProjectAnalysisProvider>
  );
}

export const Route = createFileRoute("/$projectId")({
  beforeLoad: ({ params }) => {
    if (!isValidUuid(params.projectId)) {
      throw redirect({ to: "/" });
    }
  },
  component: ProjectLayout,
});
