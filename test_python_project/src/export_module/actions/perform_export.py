from utils.base_action import BaseBusinessAction
from core_module.actions.get_tasks_list import GetTasksList
from ..tasks.run_exports import task_ExportAllTasks
from core_module.tasks.run_todo_sync import task_RunTodoSync

class PerformExport(BaseBusinessAction):
    def execute(
        self,
        user_id: int,
    ) -> list[int]:
        list = GetTasksList().execute(user_id=user_id)
        task_RunTodoSync.si().apply_async()
        task_ExportAllTasks.si().apply_async()
        return list