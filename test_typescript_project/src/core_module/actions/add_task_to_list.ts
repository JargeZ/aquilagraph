import { makeTaskId, type Task } from "@/core_module/domain/task";
import { InMemoryTasksRepo } from "@/core_module/repo/in_memory_tasks_repo";
import { BaseBusinessAction } from "@/utils/base_action";

export type AddTaskInput = Readonly<{ title: string }>;
export type AddTaskOutput = Readonly<{ task: Task }>;

export class AddTaskToList extends BaseBusinessAction<
  AddTaskInput,
  AddTaskOutput
> {
  constructor(private readonly repo = new InMemoryTasksRepo()) {
    super();
  }

  async execute(input: AddTaskInput): Promise<AddTaskOutput> {
    const task: Task = {
      id: makeTaskId(`task_${Date.now()}`),
      title: input.title,
      done: false,
      createdAt: new Date(),
    };

    await this.repo.add(task);
    return { task };
  }
}
