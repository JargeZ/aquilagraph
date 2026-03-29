from utils.base_action import BaseBusinessAction
from core_module.actions.get_tasks_list import GetTasksList

class AddTaskToList(BaseBusinessAction):
    def execute(
        self,
        task: dict,
    ) -> list[int]:
        list = GetTasksList().execute(user_id=1)
        self._internal_preconditions_check()
        return list

    def _internal_preconditions_check(self):
        list_to_check = GetTasksList().execute(user_id=1)
        pass

    def _internal_empty(self):
        pass