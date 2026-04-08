import { Hono } from "hono";
import { GetTasksList } from "@/core_module/actions/get_tasks_list";

export const reportsRouter = new Hono().get("/reports/tasks", async (c) => {
  const { tasks } = await new GetTasksList().execute();
  return c.json({ total: tasks.length });
});

