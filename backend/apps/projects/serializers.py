from rest_framework import serializers
from .models import Project  # Only import Project from current app
from apps.tasks.models import Task
from apps.support.models import SupportTicket
from apps.clients.models import Client
from apps.payments.models import Payment
from apps.users.serializers import UserSerializer
from apps.organization.models import OrganizationMember, OrganizationRoleChoices

class ClientSerializer(serializers.ModelSerializer):
    organization_id = serializers.UUIDField(source='organization.id', read_only=True)
    
    class Meta:
        model = Client
        fields = ['id', 'name', 'contact_person', 'salesperson', 'organization_id']
        read_only_fields = ['id']
        ref_name = 'projects.Client'  # Unique ref_name to avoid conflicts

class ProjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Project model with primary key relationships.
    Handles project manager assignment and validation.
    """
    project_manager_id = serializers.PrimaryKeyRelatedField(
        queryset=OrganizationMember.objects.filter(role=OrganizationRoleChoices.PROJECT_MANAGER),
        source='project_manager',
        required=False,
        allow_null=True,
        write_only=True
    )
    project_manager = serializers.SerializerMethodField(read_only=True)
    client = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(),
        write_only=True
    )
    organization = serializers.UUIDField(required=False, write_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'title', 'description', 'status', 'cost', 'discount',
            'start_date', 'deadline', 'client', 'salesperson', 'project_manager',
            'project_manager_id', 'verifier', 'is_verified', 'created_at', 
            'updated_at', 'completed_at', 'organization'  # Added 'organization' here
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'completed_at', 'is_verified']
        depth = 1
    def get_project_manager(self, obj):
        if obj.project_manager:
            return {
                'id': obj.project_manager.id,
                'name': str(obj.project_manager.user.get_full_name() or obj.project_manager.user.username),
                'email': obj.project_manager.user.email
            }
        return None
        
    def create(self, validated_data):
        """
        Create and return a new Project instance, given the validated data.
        """
        # Get the client object from validated_data
        client = validated_data.pop('client')
        
        # Create the project with the client
        project = Project.objects.create(
            client=client,
            **validated_data
        )
        
        return project
    
    def validate(self, data):
        """
        Validate that the project manager belongs to the same organization as the client.
        """
        project_manager = data.get('project_manager')
        client = data.get('client') or getattr(self.instance, 'client', None)
        
        if project_manager and client and project_manager.organization_id != client.organization_id:
            raise serializers.ValidationError({
                'project_manager_id': 'Project manager must belong to the same organization as the client.'
            })
            
        return data
    
    def to_representation(self, instance):
        """
        Custom representation to include project manager details.
        """
        representation = super().to_representation(instance)
        
        # Add project manager details if exists
        if instance.project_manager:
            representation['project_manager'] = {
                'id': instance.project_manager.id,
                'name': str(instance.project_manager.user.get_full_name() or instance.project_manager.user.username),
                'email': instance.project_manager.user.email,
                'role': instance.project_manager.get_role_display()
            }
            
        return representation

class TaskSerializer(serializers.ModelSerializer):
    """
    Serializer for Task model with primary key relationships.
    """
    class Meta:
        model = Task
        fields = ['id', 'title', 'status', 'developer', 'project', 'created_at']
        read_only_fields = ['id', 'created_at']
        depth = 1  # Show nested serialization one level deep

class SupportTicketSerializer(serializers.ModelSerializer):
    """
    Serializer for SupportTicket model in projects app.
    """
    class Meta:
        model = SupportTicket
        fields = ['id', 'issue', 'support', 'project', 'created_at']
        read_only_fields = ['id', 'created_at']
        depth = 1  # Show nested serialization one level deep
        ref_name = 'projects.SupportTicket'  # Unique ref_name to avoid conflicts

class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for Payment model in projects app.
    """
    class Meta:
        model = Payment
        fields = ['id', 'amount', 'verified', 'project', 'created_at']
        read_only_fields = ['id', 'created_at']
        depth = 1  # Show nested serialization one level deep
        ref_name = 'projects.Payment'  # Unique ref_name to avoid conflicts