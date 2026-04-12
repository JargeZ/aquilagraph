import { Hono } from "hono";
import { z } from "zod";
import { AddTaskToList } from "@/core_module/actions/add_task_to_list";

export const coreRouter = new Hono().post("/tasks", async (c) => {
  const body = await c.req.json();
  const input = z.object({ title: z.string().min(1) }).parse(body);

  const result = await new AddTaskToList().execute(input);
  return c.json({ task: result.task });
});
