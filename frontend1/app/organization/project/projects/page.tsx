// app/organization/project/projects/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Calendar, Users, DollarSign, Check, X, UserPlus, UserX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fetchProjects } from '@/services/projectManagerService';
import { useParams, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { toast } from "@/components/ui/use-toast";

interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  progress: number;
  start_date?: string;
  due_date: string;
  cost?: number;
  discount?: number;
  client?: {
    id: string;
    name: string;
  };
  team_members: Array<{
    id: string;
    name: string;
    avatar: string | null;
    role?: string; // Add role field
  }>;
  project_manager?: {
    id: string;
    user: {
      name: string;
    };
  };
}

export default function ProjectsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState('member');
  const { toast } = useToast();

  const memberRoles = [
    { value: 'admin', label: 'Admin' },
    { value: 'member', label: 'Member' },
    { value: 'viewer', label: 'Viewer' },
  ];
  // Get organizationId from user context, params, or searchParams
  const organizationId = (
    user?.organization_id ||
    params?.organizationId ||
    searchParams.get('organizationId')
  ) as string;

  // Debug log the params
  useEffect(() => {
    console.log('Route params:', params);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    console.log('User organization ID:', user?.organization_id);
    console.log('Organization ID:', organizationId);
  }, [params, searchParams, organizationId, user?.organization_id]);

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddTeamMemberOpen, setIsAddTeamMemberOpen] = useState(false);
  const [availableMembers, setAvailableMembers] = useState<Array<{ id: string, name: string, email: string }>>([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const handleRemoveTeamMember = async (memberId: string) => {
    if (!selectedProject) return;

    if (!confirm('Are you sure you want to remove this team member?')) return;

    try {
      setIsLoadingMembers(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${selectedProject.id}/team-members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to remove team member');

      // Refresh the project data
      const updatedProjects = await fetchProjects();
      setProjects(updatedProjects);

      // Update the selected project
      const updatedProject = updatedProjects.find(p => p.id === selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      // Handle error (e.g., show error toast)
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleAddTeamMember = async () => {
    if (!selectedProject || !selectedMember) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a team member to add"
      });
      return;
    }

    // Check if member is already in the team
    if (selectedProject.team_members?.some(member => member.id === selectedMember)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "This member is already part of the team"
      });
      setSelectedMember('');
      return;
    }

    try {
      setIsLoadingMembers(true);
      console.log('Adding member:', { projectId: selectedProject.id, memberId: selectedMember });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${selectedProject.id}/team-members/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            user_id: selectedMember
          }),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error || responseData.detail || 'Failed to add team member';
        throw new Error(errorMessage);
      }

      // Update the selected project with the new team members list
      if (responseData.team_members) {
        setSelectedProject(prev => {
          if (!prev) return null;
          return {
            ...prev,
            team_members: responseData.team_members
          };
        });
      } else {
        // Fallback: Refresh the entire projects list if team members not in response
        const updatedProjects = await fetchProjects();
        setProjects(updatedProjects);

        const updatedProject = updatedProjects.find(p => p.id === selectedProject.id);
        if (updatedProject) {
          setSelectedProject(updatedProject);
        }
      }

      // Reset form and show success
      setSelectedMember('');
      setIsAddTeamMemberOpen(false);
      toast({
        title: "Success",
        description: "Team member added successfully"
      });

    } catch (error) {
      console.error('Error in handleAddTeamMember:', error);
      toast({
        title: "Error",
        description: "Failed to add team member"
      });
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const fetchAvailableMembers = useCallback(async (orgId: string) => {
    console.log('fetchAvailableMembers called', {
      selectedProject: !!selectedProject,
      organizationId: !!orgId
    });

    if (!selectedProject || !orgId) {
      console.error('Cannot fetch members - missing:', {
        missingProject: !selectedProject,
        missingOrgId: !orgId
      });
      return;
    }

    try {
      setIsLoadingMembers(true);
      console.log('Fetching available members for org:', orgId);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/org/organizations/${orgId}/members/`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch members:', response.status, errorText);
        throw new Error(`Failed to fetch available members: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Raw API response:', data);

      // Handle different API response formats
      const membersList = Array.isArray(data) ? data : data.results || data.members || data.data || [];
      console.log('Processed members list:', membersList);

      // Get current member IDs, handling potential undefined
      const currentMemberIds = selectedProject.team_members?.map(m => m.id) || [];
      console.log('Current member IDs in project:', currentMemberIds);

      // Filter out members already in the project and map to correct format
      const available = membersList
        .filter((member: any) => {
          const memberId = member.id || member.user_id || member.user?.id;
          const isAvailable = memberId && !currentMemberIds.includes(memberId);

          // Construct full name from first_name and last_name
          const firstName = member.first_name || member.user?.first_name || '';
          const lastName = member.last_name || member.user?.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();
          const name = fullName || member.name || member.user?.name || '';

          console.log('Member:', {
            id: memberId,
            firstName,
            lastName,
            fullName,
            name,
            email: member.email || member.user?.email,
            available: isAvailable
          });
          return isAvailable;
        })
        .map((member: any) => {
          // Construct full name from first_name and last_name
          const firstName = member.first_name || member.user?.first_name || '';
          const lastName = member.last_name || member.user?.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim();

          return {
            id: member.id || member.user_id || member.user?.id,
            name: fullName || member.name || member.user?.name || '',
            email: member.email || member.user?.email || ''
          };
        });

      console.log('Final available members:', available);
      setAvailableMembers(available);
    } catch (error) {
      console.error('Error in fetchAvailableMembers:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [selectedProject]);

  // Load available members when the dialog opens
  useEffect(() => {
    const fetchData = async () => {
      if (isAddTeamMemberOpen) {
        if (!organizationId) {
          console.error('Organization ID is missing. Current state:', {
            params,
            searchParams: Object.fromEntries(searchParams.entries()),
            userOrgId: user?.organization_id,
            organizationId
          });
          // Show user-friendly error message
          alert('Unable to fetch team members. Organization ID is missing. Please make sure you are logged in and have an organization assigned.');
          setIsAddTeamMemberOpen(false);
          return;
        }
        console.log('Fetching members with organizationId:', organizationId);
        try {
          await fetchAvailableMembers(organizationId);
        } catch (error) {
          console.error('Error in fetchAvailableMembers:', error);
        }
      }
    };

    fetchData();
  }, [isAddTeamMemberOpen, organizationId, fetchAvailableMembers, params, searchParams, user?.organization_id]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await fetchProjects();
        setProjects(data);
      } catch (err) {
        setError('Failed to load projects');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, []);

  const filteredProjects = projects.filter(project => {
    if (!searchQuery.trim()) return true; // Return all projects if search is empty

    const query = searchQuery.toLowerCase().trim();

    // Get all searchable fields as strings
    const searchableFields = [
      project.title || '',
      project.status || '',
      project.description || '',
      project.client?.name || '',
      project.project_manager?.user?.name || '',
      ...(project.team_members?.map(member => member.name || '') || [])
    ].filter(Boolean) as string[]; // Filter out any empty strings and ensure type safety
    console.log('Searching for:', query, 'in project:', {
      title: project.title,
      status: project.status,
      description: project.description?.substring(0, 50) + '...', // Just first 50 chars
      client: project.client?.name,
      projectManager: project.project_manager?.user?.name,
      teamMembers: project.team_members?.map(m => m.name)
    });
    // Check if any field includes the search query
    return searchableFields.some(field =>
      field.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      planning: { label: 'Planning', variant: 'outline' },
      in_progress: { label: 'In Progress', variant: 'default' },
      on_hold: { label: 'On Hold', variant: 'secondary' },
      completed: { label: 'Completed', variant: 'default' },
      cancelled: { label: 'Cancelled', variant: 'destructive' },
    };
    const statusInfo = statusMap[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="flex justify-between items-center">
            <div className="h-10 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded w-1/6"></div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border rounded-lg space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-sm text-gray-500">Manage and track your projects</p>
        </div>
        {/* <NewProjectDialog
          organizationId={organizationId}
          isSuperAdmin={user?.role === 'superadmin'}
          isOrgAdmin={user?.organization_role === 'admin'}
          currentUser={user}
          onProjectCreated={() => {
            // Refresh projects list when a new project is created
            console.log('New project created, refresh projects list');
            // Add project refresh logic here if needed
          }}
        /> */}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search projects..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No projects found</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{project.title}</h3>
                      {getStatusBadge(project.status)}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Progress</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {(project.team_members || []).slice(0, 3).map((member) => (
                        <Avatar key={member.id} className="h-8 w-8 border-2 border-white">
                          <AvatarImage src={member.avatar || ''} alt={member.name} />
                          <AvatarFallback>{member.name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                      ))}
                      {(project.team_members?.length || 0) > 3 && (
                        <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-medium">
                          +{(project.team_members?.length || 0) - 3}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProject(project)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Project Details Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedProject && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProject.title}</DialogTitle>
                <DialogDescription className="line-clamp-2">
                  {selectedProject.description}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                    {getStatusBadge(selectedProject.status)}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Progress</h4>
                    <div className="flex items-center gap-2">
                      <Progress value={selectedProject.progress} className="h-2" />
                      <span className="text-sm">{selectedProject.progress}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Timeline</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {selectedProject.start_date
                          ? format(new Date(selectedProject.start_date), 'MMM d, yyyy')
                          : 'Not started'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {selectedProject.due_date
                          ? format(new Date(selectedProject.due_date), 'MMM d, yyyy')
                          : 'No deadline'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-muted-foreground">Team Members</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => setIsAddTeamMemberOpen(true)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add Member
                      </Button>
                    </div>
                    <div className="border rounded-lg divide-y">
                      {selectedProject.team_members?.length ? (
                        selectedProject.team_members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-3 hover:bg-muted/50">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={member.avatar || ''} alt={member.name} />
                                <AvatarFallback>
                                  {member.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{member.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveTeamMember(member.id);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No team members added yet
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Budget</h4>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${selectedProject.cost?.toLocaleString()}</span>
                    </div>
                  </div>
                  {selectedProject.discount && selectedProject.discount > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Discount</h4>
                      <div className="text-green-500 flex items-center">
                        <DollarSign className="h-4 w-4" />
                        <span>{selectedProject.discount.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Team Member Dialog */}
      <Dialog open={isAddTeamMemberOpen} onOpenChange={setIsAddTeamMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Select a team member to add to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none" htmlFor="member">
                Team Member
              </label>
              <select
                id="member"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                disabled={isLoadingMembers}
              >
                <option value="">Select a team member</option>
                {availableMembers.map((member) => {
                  // If name exists, show "Name (email)", otherwise just show "email"
                  const displayText = member.name
                    ? `${member.name}${member.email ? ` (${member.email})` : ''}`
                    : member.email || 'Unknown User';

                  return (
                    <option key={member.id} value={member.id}>
                      {displayText}
                    </option>
                  );
                })}
                {!isLoadingMembers && availableMembers.length === 0 && (
                  <option value="" disabled>
                    No available members found
                  </option>
                )}
                {isLoadingMembers && (
                  <option value="" disabled>
                    Loading members...
                  </option>
                )}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsAddTeamMemberOpen(false)}
                disabled={isLoadingMembers}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  console.log('Add Member clicked', {
                    selectedMember,
                    selectedProject: selectedProject?.id,
                    isLoadingMembers
                  });
                  handleAddTeamMember();
                }}
                disabled={!selectedMember || isLoadingMembers}
              >
                {isLoadingMembers ? 'Adding...' : 'Add Member'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}