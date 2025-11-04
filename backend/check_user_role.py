from django.contrib.auth import get_user_model
from apps.organization.models import OrganizationMember

def check_user_roles():
    try:
        # Get the user by email
        user = get_user_model().objects.get(email='roshanrokaya413@gmail.com')
        print(f"\nUser: {user.email}")
        print(f"Is staff: {user.is_staff}")
        print(f"Is superuser: {user.is_superuser}")
        
        # Get all organization memberships for this user
        memberships = OrganizationMember.objects.filter(
            user=user
        ).select_related('organization')
        
        print(f"\nFound {memberships.count()} organization memberships:")
        
        for membership in memberships:
            role = getattr(membership, 'role', 'No role')
            print(f"\nOrganization: {membership.organization.name}")
            print(f"Role: {role}")
            print(f"Is Active: {membership.is_active}")
            print(f"All attributes: {membership.__dict__}")
            
    except get_user_model().DoesNotExist:
        print("User not found")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    import os
    import django
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()
    check_user_roles()
