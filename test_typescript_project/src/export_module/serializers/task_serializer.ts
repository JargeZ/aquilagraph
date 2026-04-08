import type { Task } from "@/core_module/domain/task";

export type TaskDTO = Readonly<{
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}>;

export function serializeTask(task: Task): TaskDTO {
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    createdAt: task.createdAt.toISOString()
  };
}

export function serializeTasks(tasks: Task[]): TaskDTO[] {
  return tasks.map(serializeTask);
}

