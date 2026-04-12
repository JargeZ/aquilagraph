import { type JobsOptions, Queue, Worker } from "bullmq";
import {
  type ExportAllTasksPayload,
  exportAllTasksJobName,
} from "@/export_module/tasks/run_exports";

export const exportsQueue = new Queue("exports", {
  connection: { host: "localhost", port: 6379 },
});

export function enqueueExportAllTasks(
  payload: ExportAllTasksPayload,
  opts: JobsOptions = {},
): Promise<unknown> {
  return exportsQueue.add(exportAllTasksJobName, payload, opts);
}

export function startExportsWorker() {
  return new Worker(
    "exports",
    async (job) => {
      switch (job.name) {
        case exportAllTasksJobName:
          // Normally you'd call real export logic here.
          return { ok: true, input: job.data };
        default:
          return { ok: false, reason: "unknown job" };
      }
    },
    { connection: { host: "localhost", port: 6379 } },
  );
}
