import { BaseBusinessAction } from "@/utils/base_action";
import type { TaskDTO } from "@/export_module/serializers/task_serializer";

export type ExportResult = Readonly<{
  exported: number;
  destination: "s3" | "local" | "noop";
}>;

export class PerformExport extends BaseBusinessAction<{ tasks: TaskDTO[] }, ExportResult> {
  execute(input: { tasks: TaskDTO[] }): ExportResult {
    return { exported: input.tasks.length, destination: "noop" };
  }
}

