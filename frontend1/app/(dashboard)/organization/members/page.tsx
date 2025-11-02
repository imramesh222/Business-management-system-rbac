'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Plus, UserPlus, Loader2, MoreHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { toast, useToast } from '@/hooks/use-toast';
import { AddMemberForm } from '@/components/organization/AddMemberForm';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { getCurrentUser } from '@/lib/auth';
import { apiGet, apiPost, apiPut, apiDelete } from '@/services/apiService';

// Types
export type OrganizationRole = 'admin' | 'developer' | 'project_manager' | 'support' | 'verifier' | 'salesperson' | 'user';

export type Member = {
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
};

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

export default function OrganizationMembersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Fix hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Try multiple endpoints to find organization information
  const findOrganizationId = async (): Promise<string> => {
    // console.log('[ORG_MEMBERS] Attempting to find organization ID...');
    
    // Strategy 1: Try user profile endpoint
    try {
      const userResponse = await apiGet('/users/me/');
      const userData = userResponse?.data || userResponse;
      // console.log('[ORG_MEMBERS] User data received:', userData);
      
      // Check various possible locations for organization ID
      const orgPaths = [
        userData?.organization_id,
        userData?.organization?.id,
        userData?.current_organization?.id,
        userData?.profile?.organization_id,
        userData?.memberships?.[0]?.organization?.id,
      ];
      
      for (const orgId of orgPaths) {
        if (orgId && typeof orgId === 'string') {
          // console.log('[ORG_MEMBERS] Found organization ID:', orgId);
          return orgId;
        }
      }
    } catch (error) {
      // console.warn('[ORG_MEMBERS] Failed to get organization from user data:', error);
    }

    // Strategy 2: Try organizations list endpoint
    try {
      // console.log('[ORG_MEMBERS] Trying organizations list endpoint...');
      const orgsResponse = await apiGet('/org/organizations/');
      const orgsData = orgsResponse?.data || orgsResponse;
      
      if (Array.isArray(orgsData) && orgsData.length > 0) {
        const orgId = orgsData[0].id;
        // console.log('[ORG_MEMBERS] Found organization from list:', orgId);
        return orgId;
      } else if (orgsData?.results && Array.isArray(orgsData.results) && orgsData.results.length > 0) {
        const orgId = orgsData.results[0].id;
        // console.log('[ORG_MEMBERS] Found organization from paginated list:', orgId);
        return orgId;
      }
    } catch (error) {
      // console.warn('[ORG_MEMBERS] Failed to get organizations list:', error);
    }

    // Strategy 3: Try memberships endpoint
    try {
      // console.log('[ORG_MEMBERS] Trying memberships endpoint...');
      const membershipsResponse = await apiGet('/org/memberships/');
      const membershipsData = membershipsResponse?.data || membershipsResponse;
      
      if (Array.isArray(membershipsData) && membershipsData.length > 0) {
        const orgId = membershipsData[0]?.organization?.id;
        if (orgId) {
          // console.log('[ORG_MEMBERS] Found organization from memberships:', orgId);
          return orgId;
        }
      } else if (membershipsData?.results && Array.isArray(membershipsData.results) && membershipsData.results.length > 0) {
        const orgId = membershipsData.results[0]?.organization?.id;
        if (orgId) {
          // console.log('[ORG_MEMBERS] Found organization from paginated memberships:', orgId);
          return orgId;
        }
      }
    } catch (error) {
      // console.warn('[ORG_MEMBERS] Failed to get memberships:', error);
    }

    throw new Error('No organization found. Please ensure your account is associated with an organization or contact support.');
  };

  // Enhanced fetch members using correct backend endpoints
  const fetchMembers = useCallback(async () => {
    if (!organizationId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // console.log(`[ORG_MEMBERS] Fetching members for organization: ${organizationId}`);
      
      // Use the organization members endpoint with the organization ID in the URL
      const endpoint = `/org/organizations/${organizationId}/members/`;
      // console.log(`[ORG_MEMBERS] Using endpoint: ${endpoint}`);
      
      const membersResponse = await apiGet(endpoint);
      const data = membersResponse?.data || membersResponse;
      
      // console.log(`[ORG_MEMBERS] API Response from ${endpoint}:`, data);
      
      if (!data) {
        throw new Error('No data received from API');
      }
      
      // Handle different response structures from DRF ViewSet
      let membersArray: Member[] = [];
      
      if (Array.isArray(data)) {
        membersArray = data;
        // console.log('[ORG_MEMBERS] Data is array, using directly');
      } else if (data.results && Array.isArray(data.results)) {
        membersArray = data.results;
        // console.log('[ORG_MEMBERS] Data is paginated, using results array');
      } else {
        // console.warn('[ORG_MEMBERS] Unexpected API response structure:', data);
        throw new Error('Unexpected API response structure');
      }
      
      // console.log(`[ORG_MEMBERS] Found ${membersArray.length} members`);
      setMembers(membersArray);
      
      // Update debug info
      setDebugInfo((prev: any) => ({
        ...prev,
        membersResponse: data,
        membersCount: membersArray.length,
        endpointUsed: endpoint
      }));
      
    } catch (error) {
      // console.error('[ORG_MEMBERS] Error fetching members:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError('Failed to load organization members. Please try again or contact support.');
      setMembers([]);
      
      // Show error toast
      toast({
        title: 'Error',
        description: 'Failed to load organization members. Please check your organization settings.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, toast]);

  // Initialize and find organization
  useEffect(() => {
    if (!mounted) return;
    
    const initialize = async () => {
      try {
        const orgId = await findOrganizationId();
        setOrganizationId(orgId);
      } catch (error) {
        console.error('[ORG_MEMBERS] Error finding organization:', error);
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
  }, [mounted, toast]);

  // Fetch members when organization ID is available
  useEffect(() => {
    if (organizationId && mounted) {
      fetchMembers();
    }
  }, [organizationId, fetchMembers, mounted]);

  const handleMemberAdded = async () => {
    // console.log('[ORG_MEMBERS] Member added, refreshing list...');
    await fetchMembers();
  };

  const handleEditMember = async (member: Member) => {
    try {
      // console.log('[ORG_MEMBERS] Editing member:', member.id);
      
      if (!organizationId) {
        throw new Error('Organization ID not available');
      }
      
      // Use the correct backend endpoint structure
      const response = await apiPut(`/org/organizations/${organizationId}/members/${member.user.id}/`, {
        role: member.role,
        is_active: member.is_active
      });
      
      // console.log('[ORG_MEMBERS] Member updated:', response.data);
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

  const handleRemoveMember = async (member: Member) => {
    try {
      // console.log('[ORG_MEMBERS] Removing member:', member.id);
      
      if (!organizationId) {
        throw new Error('Organization ID not available');
      }
      
      // Use the correct backend endpoint structure with user ID
      const response = await apiDelete(`/org/organizations/${organizationId}/members/${member.user.id}/`);
      
      // console.log('[ORG_MEMBERS] Member removed:', response);
      await fetchMembers();
      
      toast({
        title: 'Success',
        description: 'Member removed successfully',
      });
    } catch (error) {
      // console.error('[ORG_MEMBERS] Error removing member:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove member';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Fixed columns with proper IDs for nested accessors
  const columns: ColumnDef<Member>[] = [
    {
      id: 'user_info', // Use id instead of accessorKey for complex cell
      header: 'User',
      cell: ({ row }) => {
        const user = row.original.user;
        const displayName = user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}`
          : user.username;
        
        return (
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
              {displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-medium">{displayName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
        );
      },
      // Add filterFn for search functionality
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
      cell: ({ row }) => {
        const roleInfo = getRoleInfo(row.original.role);
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${roleInfo.color}`}>
            {roleInfo.name}
          </span>
        );
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        const statusInfo = isActive 
          ? { label: 'Active', color: 'bg-green-100 text-green-800' }
          : { label: 'Inactive', color: 'bg-gray-100 text-gray-800' };
        
        return (
          <span className={`px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Member Since',
      cell: ({ row }) => {
        if (!row.original.created_at) return 'N/A';
        const date = new Date(row.original.created_at);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Last Updated',
      cell: ({ row }) => {
        if (!row.original.updated_at) return 'N/A';
        const date = new Date(row.original.updated_at);
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditMember(row.original)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleRemoveMember(row.original)}
              className="text-red-600"
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
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
      />

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={members}
          searchKey="user_info" // Use the column id instead of nested key
          className="w-full"
        />
      </div>
    </div>
  );
}