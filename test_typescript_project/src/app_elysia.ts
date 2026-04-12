import { Elysia, t } from "elysia";
import { AddTaskToList } from "@/core_module/actions/add_task_to_list";
import { GetTasksList } from "@/core_module/actions/get_tasks_list";
import { serializeTasks } from "@/export_module/serializers/task_serializer";

export const app = new Elysia({ prefix: "/api" })
  .post(
    "/tasks",
    async ({ body }) => {
      const { task } = await new AddTaskToList().execute({ title: body.title });
      return { task };
    },
    { body: t.Object({ title: t.String({ minLength: 1 }) }) },
  )
  .get("/tasks", async () => {
    const { tasks } = await new GetTasksList().execute();
    return { tasks: serializeTasks(tasks) };
  });
