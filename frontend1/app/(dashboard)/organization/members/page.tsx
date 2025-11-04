'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Plus, UserPlus, Loader2, MoreHorizontal, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { toast, useToast } from '@/hooks/use-toast';
import { AddMemberForm } from '@/components/organization/AddMemberForm';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { getCurrentUser } from '@/lib/auth';
import { apiGet, apiPost, apiPut, apiDelete } from '@/services/apiService';

// Types
export type OrganizationRole = 'admin' | 'developer' | 'project_manager' | 'support' | 'verifier' | 'salesperson' | 'user';

export interface Member {
  id: string;
  user: {
    id: string;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  organization: {
    id: string;
    name: string;
  };
  role: OrganizationRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type StatusVariant = 'active' | 'inactive' | 'suspended';

const statusVariants: Record<StatusVariant, { label: string; color: string }> = {
  active: { label: 'Active', color: 'bg-green-100 text-green-800' },
  inactive: { label: 'Inactive', color: 'bg-yellow-100 text-yellow-800' },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-800' },
};

const roleVariants: Record<OrganizationRole, string> = {
  admin: 'bg-purple-100 text-purple-800',
  developer: 'bg-blue-100 text-blue-800',
  project_manager: 'bg-green-100 text-green-800',
  support: 'bg-yellow-100 text-yellow-800',
  verifier: 'bg-indigo-100 text-indigo-800',
  salesperson: 'bg-teal-100 text-teal-800',
  user: 'bg-gray-100 text-gray-800',
};

// Map role to display name and color
const getRoleInfo = (role: OrganizationRole) => {
  const roleMap: Record<OrganizationRole, { name: string; color: string }> = {
    admin: { name: 'Admin', color: roleVariants.admin },
    developer: { name: 'Developer', color: roleVariants.developer },
    project_manager: { name: 'Project Manager', color: roleVariants.project_manager },
    support: { name: 'Support', color: roleVariants.support },
    verifier: { name: 'Verifier', color: roleVariants.verifier },
    salesperson: { name: 'Sales', color: roleVariants.salesperson },
    user: { name: 'User', color: roleVariants.user },
  };
  
  return roleMap[role] || { name: role, color: 'bg-gray-100 text-gray-800' };
};

// RoleDropdown component to handle role updates with local state
interface RoleDropdownProps {
  member: Member;
  onRoleUpdate: (memberId: string, newRole: OrganizationRole) => Promise<void>;
}

const RoleDropdown = ({ member, onRoleUpdate }: RoleDropdownProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRoleChange = async (newRole: OrganizationRole) => {
    if (newRole === member.role || isUpdating) return;
    
    try {
      setIsUpdating(true);
      await onRoleUpdate(member.id, newRole);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-40 justify-between"
          disabled={isUpdating}
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <span className="capitalize">{member.role.replace('_', ' ')}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {Object.entries(roleVariants).map(([role]) => (
          <DropdownMenuItem
            key={role}
            onSelect={() => handleRoleChange(role as OrganizationRole)}
            className="flex items-center justify-between"
          >
            <span className="capitalize">{role.replace('_', ' ')}</span>
            {member.role === role && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const OrganizationMembersPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Fix hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Find organization ID
  const findOrganizationId = useCallback(async (): Promise<string> => {
    try {
      const user = await getCurrentUser();
      if (user?.organization) {
        // Handle case where organization might be a string or an object
        const orgId = typeof user.organization === 'string' 
          ? user.organization 
          : user.organization.id;
        
        if (orgId) {
          return orgId;
        }
      }

      const orgs = await apiGet('/org/organizations/');
      if (orgs?.results?.length > 0) {
        const firstOrg = orgs.results[0];
        return typeof firstOrg === 'string' ? firstOrg : firstOrg.id;
      }

      throw new Error('No organizations found');
    } catch (error) {
      console.error('Error finding organization:', error);
      throw error;
    }
  }, []);

  // Update member role
  const updateMemberRole = useCallback(async (memberId: string, newRole: OrganizationRole) => {
    if (!organizationId) {
      throw new Error('Organization ID is not available');
    }
    
    try {
      await apiPut(`/org/organizations/${organizationId}/members/${memberId}/`, {
        role: newRole,
      });
      
      // Update local state
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId ? { ...member, role: newRole } : member
        )
      );
      
      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating member role:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update member role';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      throw error;
    }
  }, [organizationId, toast]);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!organizationId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const endpoint = `/org/organizations/${organizationId}/members/`;
      const membersResponse = await apiGet(endpoint);
      const data = membersResponse?.data || membersResponse;
      
      if (!data) {
        throw new Error('No data received from API');
      }
      
      // Handle different response structures from DRF ViewSet
      let membersArray: Member[] = [];
      
      if (Array.isArray(data)) {
        membersArray = data;
      } else if (data.results && Array.isArray(data.results)) {
        membersArray = data.results;
      } else {
        throw new Error('Unexpected API response structure');
      }
      
      setMembers(membersArray);
      
      // Update debug info
      setDebugInfo({
        membersResponse: data,
        membersCount: membersArray.length,
        endpointUsed: endpoint
      });
      
    } catch (error) {
      console.error('[ORG_MEMBERS] Error fetching members:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError('Failed to load organization members. Please try again or contact support.');
      setMembers([]);
      
      toast({
        title: 'Error',
        description: 'Failed to load organization members. Please check your organization settings.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, toast]);

  // Initialize component
  useEffect(() => {
    if (!mounted) return;
    
    const initialize = async () => {
      try {
        const orgId = await findOrganizationId();
        setOrganizationId(orgId);
      } catch (error) {
        console.error('Initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to find organization';
        setError(errorMessage);
        setIsLoading(false);
        
        toast({
          title: 'Organization Not Found',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    };
    
    initialize();
  }, [mounted, findOrganizationId, toast]);

  // Fetch members when organization ID changes
  useEffect(() => {
    if (organizationId && mounted) {
      fetchMembers();
    }
  }, [organizationId, fetchMembers, mounted]);

  // Handle member added
  const handleMemberAdded = async () => {
    await fetchMembers();
  };

  // Handle edit member
  const handleEditMember = async (member: Member) => {
    try {
      if (!organizationId) {
        throw new Error('Organization ID not available');
      }
      
      const response = await apiPut(`/org/organizations/${organizationId}/members/${member.user.id}/`, {
        role: member.role,
        is_active: member.is_active
      });
      
      await fetchMembers();
      
      toast({
        title: 'Success',
        description: 'Member updated successfully',
      });
    } catch (error) {
      console.error('[ORG_MEMBERS] Error editing member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update member';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Remove member
  const handleRemoveMember = async (member: Member) => {
    if (!organizationId) {
      toast({
        title: 'Error',
        description: 'Organization ID is not available',
        variant: 'destructive',
      });
      return;
    }
    
    const displayName = member.user.first_name && member.user.last_name 
      ? `${member.user.first_name} ${member.user.last_name}`
      : member.user.username;

    if (!confirm(`Are you sure you want to remove ${displayName} from the organization?`)) {
      return;
    }

    try {
      await apiDelete(`/org/organizations/${organizationId}/members/${member.id}/`);
      
      // Update local state
      setMembers(prevMembers => prevMembers.filter(m => m.id !== member.id));
      
      toast({
        title: 'Success',
        description: `${displayName} has been removed from the organization`,
      });
    } catch (error: any) {
      console.error('Error removing member:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to remove member';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Table columns
  const columns: ColumnDef<Member>[] = [
    {
      accessorKey: 'user',
      header: 'Member',
      cell: ({ row }) => {
        const user = row.original.user;
        const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-600 font-medium">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const user = row.original.user;
        const displayName = user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}`
          : user.username;
        const searchText = `${displayName} ${user.email}`.toLowerCase();
        return searchText.includes(value.toLowerCase());
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <RoleDropdown 
          member={row.original} 
          onRoleUpdate={updateMemberRole} 
        />
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.is_active ? 'active' : 'inactive';
        const variant = status === 'active' ? 'default' : 'outline';
        return (
          <Badge variant={variant as any}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Joined',
      cell: ({ row }) => {
        return format(new Date(row.original.created_at), 'MMM d, yyyy');
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const member = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditMember(member)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => handleRemoveMember(member)}
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Don't render anything until mounted (fixes hydration issues)
  if (!mounted) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading members...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Error:</strong> {error}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Page
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">
            Manage your organization members and their permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMembers} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsAddMemberOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Debug Information */}
      {debugInfo && process.env.NODE_ENV === 'development' && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <details>
              <summary className="cursor-pointer font-medium">Debug Information (Click to expand)</summary>
              <div className="mt-2 text-xs">
                <p><strong>Organization ID:</strong> {organizationId}</p>
                <p><strong>Members Count:</strong> {members.length}</p>
                <p><strong>Endpoint Used:</strong> {debugInfo.endpointUsed}</p>
              </div>
            </details>
          </AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!isLoading && !error && members.length === 0 && (
        <Alert className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No members found for this organization. Try adding some members or check if you have the correct permissions.
          </AlertDescription>
        </Alert>
      )}

      <AddMemberForm 
        open={isAddMemberOpen} 
        onOpenChange={setIsAddMemberOpen}
        onSuccess={handleMemberAdded}
        organizationId={organizationId || undefined}
      />

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={members}
          searchKey="user"
          className="w-full"
        />
      </div>
    </div>
  );
};

export default OrganizationMembersPage;