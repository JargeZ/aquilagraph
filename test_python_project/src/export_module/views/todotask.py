from rest_framework import viewsets
from core_module.actions.get_tasks_list import GetTasksList
from export_module.actions.perform_export import PerformExport
from export_module.tasks.run_exports import task_ExportAllTasks
from django.db import transaction
from export_module.serializers.task_serializer import TaskSerializer


class TodoTaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    def list(self):
        tasks = GetTasksList().execute()
        return TaskSerializer(tasks).data


    def export(self):
        sig = task_ExportAllTasks.si()
        transaction.on_commit(sig.apply_async)
        return PerformExport().execute()