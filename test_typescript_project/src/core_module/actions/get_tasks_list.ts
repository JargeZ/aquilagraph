import { BaseBusinessAction } from "@/utils/base_action";
import { InMemoryTasksRepo } from "@/core_module/repo/in_memory_tasks_repo";
import type { Task } from "@/core_module/domain/task";

export type GetTasksListOutput = Readonly<{ tasks: Task[] }>;

export class GetTasksList extends BaseBusinessAction<void, GetTasksListOutput> {
  constructor(private readonly repo = new InMemoryTasksRepo()) {
    super();
  }

  async execute(): Promise<GetTasksListOutput> {
    const tasks = await this.repo.list();
    return { tasks };
  }
}

