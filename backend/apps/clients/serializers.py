from rest_framework import serializers
from apps.clients.models import Client  # Updated import
from apps.organization.models import Organization
from apps.users.serializers import UserSerializer
from apps.projects.serializers import ClientSerializer  # Updated import

class ClientCreateSerializer(ClientSerializer):
    """Serializer for client creation with additional validation."""
    organization = serializers.PrimaryKeyRelatedField(
        queryset=Organization.objects.all(),
        required=True,
        write_only=True
    )
    
    class Meta(ClientSerializer.Meta):
        fields = ['organization'] + [f for f in ClientSerializer.Meta.fields 
                 if f not in ['id', 'created_at', 'updated_at', 'organization_name', 'salesperson_name']]
        extra_kwargs = {
            'organization': {'required': True, 'write_only': True}
        }
    
    def validate(self, data):
        """
        Additional validation for client creation.
        - Ensure the organization is provided and active
        - If salesperson is provided, ensure they belong to the same organization
        """
        organization = data.get('organization')
        salesperson = data.get('salesperson')
        user = self.context['request'].user
        
        if not organization:
            raise serializers.ValidationError({
                'organization': ['This field is required.']
            })
        
        # Ensure the organization exists and is active
        if not organization or not hasattr(organization, 'is_active') or not organization.is_active:
            raise serializers.ValidationError({
                'organization': ['Cannot assign to an inactive or invalid organization.']
            })
        
        # If user is admin, they can create clients for their organization
        if hasattr(user, 'admin') and user.admin.organization:
            if organization != user.admin.organization:
                raise serializers.ValidationError({
                    'organization': ['You can only create clients for your own organization.']
                })
        
        # If user is salesperson, they can only create clients for their organization
        elif hasattr(user, 'salesperson') and user.salesperson.organization:
            if organization != user.salesperson.organization:
                raise serializers.ValidationError({
                    'organization': ['You can only create clients for your own organization.']
                })
            # Auto-assign the salesperson if not provided
            if not salesperson:
                data['salesperson'] = user.salesperson
        
        if salesperson and (not hasattr(salesperson, 'organization') or salesperson.organization != organization):
            raise serializers.ValidationError({
                'salesperson': ['The salesperson must belong to the same organization.']
            })
            
        return data

class ClientDetailSerializer(ClientSerializer):
    """Detailed client serializer with related fields."""
    organization_detail = serializers.SerializerMethodField()
    salesperson_detail = serializers.SerializerMethodField()
    total_projects = serializers.SerializerMethodField()
    total_value = serializers.SerializerMethodField()
    
    class Meta(ClientSerializer.Meta):
        fields = ClientSerializer.Meta.fields + [
            'organization_detail', 'salesperson_detail',
            'total_projects', 'total_value', 'notes'
        ]
    
    def get_organization_detail(self, obj):
        from apps.organization.serializers import OrganizationSerializer
        return OrganizationSerializer(obj.organization).data
    
    def get_salesperson_detail(self, obj):
        if not obj.salesperson:
            return None
        return UserSerializer(obj.salesperson).data
    
    def get_total_projects(self, obj):
        # This will need to be updated once the Project model is properly set up
        return 0
    
    def get_total_value(self, obj):
        # This will need to be updated once the Project model is properly set up
        return 0


class ClientUpdateSerializer(ClientSerializer):
    """Serializer for updating clients with role-based field validation."""
    class Meta(ClientSerializer.Meta):
        read_only_fields = ClientSerializer.Meta.read_only_fields + ['organization']
    
    def validate(self, data):
        """
        Additional validation for client updates.
        - If salesperson is provided, ensure they belong to the same organization
        """
        salesperson = data.get('salesperson')
        organization = data.get('organization', getattr(self.instance, 'organization', None))
        
        if salesperson and organization and salesperson.organization != organization:
            raise serializers.ValidationError({
                'salesperson': 'The salesperson must belong to the same organization.'
            })
            
        return data
