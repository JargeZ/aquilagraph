export const todoSyncJobName = "RunTodoSync" as const;

export type TodoSyncPayload = Readonly<{
  fullRescan: boolean;
}>;

export function task_RunTodoSync(payload: TodoSyncPayload) {
  return { name: todoSyncJobName, payload };
}

