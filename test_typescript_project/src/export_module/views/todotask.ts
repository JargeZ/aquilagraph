import { Hono } from "hono";
import { GetTasksList } from "@/core_module/actions/get_tasks_list";
import { PerformExport } from "@/export_module/actions/perform_export";
import { serializeTasks } from "@/export_module/serializers/task_serializer";
import { task_ExportAllTasks_si } from "@/export_module/tasks/run_exports";
import { withTransaction } from "@/infra/tx/on_commit";

export const todoTaskRouter = new Hono()
  .get("/tasks", async (c) => {
    const { tasks } = await new GetTasksList().execute();
    return c.json({ tasks: serializeTasks(tasks) });
  })
  .post("/tasks/export", async (c) => {
    const { tasks } = await new GetTasksList().execute();

    const exportResult = await withTransaction(async (tx) => {
      const sig = task_ExportAllTasks_si({
        requestedBy: "api",
        requestedAt: new Date().toISOString(),
      });
      tx.onCommit(sig.apply_async);

      const payload = serializeTasks(tasks);
      return new PerformExport().execute({ tasks: payload });
    });

    return c.json({ export: exportResult });
  });
