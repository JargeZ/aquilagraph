import { Trans, useLingui } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Logo } from "@ui/atoms/logo/logo";
import { Button } from "@ui/molecules/button/button";
import { Callout } from "@ui/molecules/callout/callout";
import { Calendar, ChevronRight, FolderOpen, Plus } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  getProjectDisplayTitle,
  PROJECT_PATHS_STORAGE_KEY,
  PROJECT_WEB_ROOT_LABELS_KEY,
  PROJECTS_STORAGE_KEY,
  type Project,
} from "@/types/project";

function formatProjectDate(timestamp: number, locale: string): string {
  try {
    return new Date(timestamp).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
}

export const Home: React.FC = () => {
  const { t, i18n } = useLingui();
  const [projects, setProjects] = useLocalStorage<Project[]>(
    PROJECTS_STORAGE_KEY,
    [],
  );
  const [pathsByProject] = useLocalStorage<Record<string, string>>(
    PROJECT_PATHS_STORAGE_KEY,
    {},
  );
  const [webRootLabels] = useLocalStorage<Record<string, string>>(
    PROJECT_WEB_ROOT_LABELS_KEY,
    {},
  );
  const navigate = useNavigate();

  const locale = i18n.locale;

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.createdAt - a.createdAt),
    [projects],
  );

  const createProject = useCallback(() => {
    const id = crypto.randomUUID();
    const next: Project = {
      id,
      name: t`Проект ${projects.length + 1}`,
      createdAt: Date.now(),
    };
    setProjects([...projects, next]);
    void navigate({ to: "/$projectId", params: { projectId: id } });
  }, [projects, setProjects, navigate, t]);

  return (
    <div className="relative min-h-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)_0%,transparent_55%)] opacity-[0.07] dark:opacity-[0.12]"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Logo size="lg" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                AquilaGraph
              </h1>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                <Trans>
                  Создавайте проекты и открывайте каталог с кодом — каждый
                  проект доступен отдельной вкладкой с собственным адресом.
                </Trans>
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="lg"
            className="shrink-0 gap-2 shadow-sm"
            onClick={createProject}
          >
            <Plus className="size-4" aria-hidden />
            <Trans>Новый проект</Trans>
          </Button>
        </header>

        <Callout icon="🔒" title={t`Локальная обработка`}>
          <Trans>
            Весь разбор кода и построение графа выполняются в вашем браузере на
            этом устройстве. Исходный код на сервер не отправляется.
          </Trans>
        </Callout>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-foreground">
              <Trans>Ваши проекты</Trans>
            </h2>
            {sortedProjects.length > 0 ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                {sortedProjects.length}
              </span>
            ) : null}
          </div>

          {sortedProjects.length > 0 ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {sortedProjects.map((p) => {
                const title = getProjectDisplayTitle(
                  p,
                  pathsByProject,
                  webRootLabels,
                );
                const diskPath = pathsByProject[p.id];
                const webLabel = webRootLabels[p.id];
                const pathHint = diskPath
                  ? diskPath
                  : webLabel
                    ? t`Локальная папка в браузере`
                    : t`Каталог ещё не выбран`;
                const dateStr = formatProjectDate(p.createdAt, locale);

                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() =>
                        void navigate({
                          to: "/$projectId",
                          params: { projectId: p.id },
                        })
                      }
                      className="group flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-[border-color,box-shadow,transform] hover:border-primary/25 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                            <FolderOpen
                              className="size-[1.125rem]"
                              aria-hidden
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-card-foreground">
                              {title}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar
                                className="size-3.5 shrink-0 opacity-70"
                                aria-hidden
                              />
                              <span>{t`Добавлен ${dateStr}`}</span>
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          className="size-5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                          aria-hidden
                        />
                      </div>
                      <p
                        className="line-clamp-2 break-all font-mono text-[0.7rem] leading-snug text-muted-foreground/90"
                        title={diskPath ?? webLabel ?? undefined}
                      >
                        {pathHint}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FolderOpen className="size-6" aria-hidden />
              </div>
              <p className="text-sm font-medium text-foreground">
                <Trans>Пока нет проектов</Trans>
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                <Trans>
                  Нажмите «Новый проект», чтобы начать и выбрать папку с кодом в
                  настройках.
                </Trans>
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/")({
  component: Home,
});
