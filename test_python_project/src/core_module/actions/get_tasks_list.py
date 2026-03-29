from utils.base_action import BaseBusinessAction


class GetTasksList(BaseBusinessAction):
    def execute(
        self,
        user_id: str,
    ) -> list[int]:
        return [1,2]