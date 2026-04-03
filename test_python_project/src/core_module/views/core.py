from rest_framework import viewsets
from core_module.actions.add_task_to_list import AddTaskToList
from export_module.actions.perform_export import PerformExport
from export_module.tasks.run_exports import task_ExportAllTasks
from django.db import transaction


class CoreViewSet(viewsets.ModelViewSet):
    def create(self):
        return AddTaskToList().execute()