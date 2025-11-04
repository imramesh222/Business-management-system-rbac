// Re-export all types for easier imports
export * from './project-manager';

// User roles type
export type UserRole = 'superadmin' | 'user';

export interface OrganizationMembership {
  id: string;
  organization: {
    id: string;
    name: string;
    is_active: boolean;
  };
  roles: string[]; // Multiple roles per organization
  joined_at: string;
  is_active: boolean;
  added_by?: {
    id: string;
    email: string;
  };
  last_updated?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole; // Global role (superadmin or user)
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  last_login: string | null;
  date_joined: string;
  organization_memberships: UserOrganizationMembership[];
  phone_number?: string;
  profile_picture?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

// Organization type
export interface Organization {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count: number;
  created_by?: string;
  organization_roles: string[]; // Available roles in this organization
}

// Organization role type
export interface OrganizationRole {
  id: string;
  name: string;
  permissions: string[];
  organization: string; // Organization ID
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// Base organization membership with required fields
interface BaseOrganizationMembership {
  id: string;
  is_active: boolean;
  joined_at: string;
  added_by?: {
    id: string;
    email: string;
  };
  last_updated?: string;
}

// User organization membership with details
export interface UserOrganizationMembership extends BaseOrganizationMembership {
  // Support both string and OrganizationRole formats for roles
  roles: string[] | OrganizationRole[] | string;
  // Support both organization object and ID
  organization: Organization | string;
  organization_id?: string;
  // Support single role format for backward compatibility
  role?: string;
  // Additional fields that might be present
  organization_name?: string;
}

// User with detailed organization memberships
export interface UserWithDetails extends Omit<User, 'organization_memberships'> {
  organization_memberships: UserOrganizationMembership[];
}
