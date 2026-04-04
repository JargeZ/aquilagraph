from rest_framework import serializers
from core_module.actions.get_tasks_list import GetTasksList

#@extend_schema_serializer(
#    deprecate_fields=[
#        "___FIELD____",
#    ]
#)
#@extend_schema_serializer(component_name="TaskSerializer")
#class TaskSerializer(serializers.Serializer): # for non-model, any req/resp
class TaskSerializer(serializers.ModelSerializer):
    #amount = MoneySerializer(read_only=True)
    #related_entity_details = EntitySerializer(source="related_entity")
    custom_field = serializers.SerializerMethodField()

    class Meta:
        fields = [
            "id",
        ]


    #@extend_schema_field(XeroTrackingCategoryOptionSerializer(many=True, read_only=True, allow_null=False,))
    #@extend_schema_field(OpenApiTypes.BOOL)
    #@extend_schema_field(serializers.ChoiceField(choices=ISO8583MessageTypeIdentifier))
    def get_custom_field(self, instance):
        return GetTasksList().execute()
        pass