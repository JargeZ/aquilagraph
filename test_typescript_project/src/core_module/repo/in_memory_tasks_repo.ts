import type { Task, TaskId } from "@/core_module/domain/task";

export interface TasksRepo {
  list(): Promise<Task[]>;
  add(task: Task): Promise<void>;
  markDone(id: TaskId): Promise<void>;
}

export class InMemoryTasksRepo implements TasksRepo {
  #tasks: Task[] = [];

  async list(): Promise<Task[]> {
    return [...this.#tasks];
  }

  async add(task: Task): Promise<void> {
    this.#tasks = [...this.#tasks, task];
  }

  async markDone(id: TaskId): Promise<void> {
    this.#tasks = this.#tasks.map((t) => (t.id === id ? { ...t, done: true } : t));
  }
}

