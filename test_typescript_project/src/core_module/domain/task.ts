export type TaskId = string & { readonly __brand: "TaskId" };

export type Task = Readonly<{
  id: TaskId;
  title: string;
  done: boolean;
  createdAt: Date;
}>;

export function makeTaskId(raw: string): TaskId {
  return raw as TaskId;
}

