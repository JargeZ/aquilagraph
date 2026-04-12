export const exportAllTasksJobName = "ExportAllTasks" as const;

export type ExportAllTasksPayload = Readonly<{
  requestedBy: "api" | "cron" | "manual";
  requestedAt: string;
}>;

export function task_ExportAllTasks_si(payload: ExportAllTasksPayload) {
  return {
    apply_async: async () => {
      const { enqueueExportAllTasks } = await import(
        "@/export_module/tasks/queue"
      );
      return enqueueExportAllTasks(payload, { removeOnComplete: true });
    },
  };
}
