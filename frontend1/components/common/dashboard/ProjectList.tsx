'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DollarSign,
  Edit,
  Trash2,
  Eye,
  AlertCircle,
  Clock,
  CheckCircle,
  Users,
  Calendar,
  Loader2,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Define ProjectStatus enum
type ProjectStatus = 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

const PROJECT_STATUS_VALUES: ProjectStatus[] = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'];

type SortField = 'title' | 'client' | 'status' | 'team' | 'start_date' | 'cost';
type SortOrder = 'asc' | 'desc' | null;

// Define Project interface
interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  cost: number;
  discount: number;
  start_date: string | null;
  end_date: string | null;
  deadline?: string | null;
  budget?: number;
  client: {
    id: string;
    name: string;
  };
  project_manager?: {
    id: string;
    user: {
      id: string;
      name?: string;
      first_name?: string;
      last_name?: string;
    };
  };
  team_members: Array<{
    id: string;
    user: {
      name: string;
      first_name?: string;
      last_name?: string;
    };
  }>;
  created_at: string;
  updated_at: string;
  is_verified?: boolean;
}

interface ProjectFilters {
  status: string;
  client: string;
  projectManager: string;
}

interface ProjectListProps {
  organizationId?: string;
  isSuperAdmin?: boolean;
  searchQuery?: string;
  filters?: {
    status: string;
    client: string;
    projectManager: string;
  };
  onFiltersChange?: (filters: any) => void;
  key?: string | number;
  activeFilter?: string;
  setActiveFilter?: (filter: string) => void;
}

export function ProjectList({
  organizationId,
  isSuperAdmin = false,
  searchQuery = '',
  filters = { status: '', client: '', projectManager: '' },
  onFiltersChange,
  key,
  activeFilter = 'all',
  setActiveFilter = () => { }
}: ProjectListProps) {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(null);
  const router = useRouter();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      let url = `${API_URL}/projects/`;

      if (organizationId) {
        url = `${API_URL}/projects/?organization=${organizationId}`;
      }

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const projectsData = response?.data?.results || (Array.isArray(response.data) ? response.data : []);
      setAllProjects(projectsData);
      setFilteredProjects(projectsData);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [organizationId, key]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    let newOrder: SortOrder = 'asc';
    
    if (sortField === field) {
      if (sortOrder === 'asc') {
        newOrder = 'desc';
      } else if (sortOrder === 'desc') {
        newOrder = null;
        setSortField(null);
        setSortOrder(null);
        return;
      }
    }
    
    setSortField(field);
    setSortOrder(newOrder);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
    }
    if (sortOrder === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    if (sortOrder === 'desc') {
      return <ArrowDown className="ml-2 h-4 w-4" />;
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 text-muted-foreground" />;
  };

  const sortProjects = (projects: Project[]) => {
    if (!sortField || !sortOrder) return projects;

    return [...projects].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'client':
          aValue = a.client?.name.toLowerCase() || '';
          bValue = b.client?.name.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'team':
          aValue = a.team_members?.length || 0;
          bValue = b.team_members?.length || 0;
          break;
        case 'start_date':
          aValue = a.start_date ? new Date(a.start_date).getTime() : 0;
          bValue = b.start_date ? new Date(b.start_date).getTime() : 0;
          break;
        case 'cost':
          aValue = a.cost;
          bValue = b.cost;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Handle search and filtering
  useEffect(() => {
    let result = [...allProjects];

    // Apply tab filter
    if (activeTab && activeTab !== 'all') {
      result = result.filter(project => project.status === activeTab);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(project =>
        project.title.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query) ||
        project.status.toLowerCase().includes(query) ||
        project.client?.name.toLowerCase().includes(query) ||
        (project.project_manager?.user?.first_name + ' ' + project.project_manager?.user?.last_name)
          .toLowerCase().includes(query) ||
        project.team_members?.some(member =>
          member.user.name.toLowerCase().includes(query)
        )
      );
    }

    // Apply additional filters
    if (filters.status) {
      result = result.filter(project => project.status === filters.status);
    }
    if (filters.client) {
      result = result.filter(project => project.client?.name === filters.client);
    }
    if (filters.projectManager) {
      result = result.filter(project =>
        `${project.project_manager?.user?.first_name} ${project.project_manager?.user?.last_name}`.trim() === filters.projectManager
      );
    }

    // Apply sorting
    result = sortProjects(result);

    setFilteredProjects(result);
  }, [searchQuery, activeTab, allProjects, filters, sortField, sortOrder]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'planning': { variant: 'secondary', label: 'Planning' },
      'in_progress': { variant: 'default', label: 'In Progress' },
      'on_hold': { variant: 'outline', label: 'On Hold' },
      'completed': { variant: 'secondary', label: 'Completed' },
      'cancelled': { variant: 'destructive', label: 'Cancelled' },
    };

    const statusInfo = statusMap[status] || { variant: 'outline' as const, label: status };

    return (
      <Badge variant={statusInfo.variant}>
        {statusInfo.label}
      </Badge>
    );
  };

  const handleUpdateProject = async () => {
    if (!selectedProject) return;

    try {
      const token = localStorage.getItem('access_token');
      await axios.patch(
        `${API_URL}/projects/${selectedProject.id}/`,
        editedProject,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );

      toast({
        title: "Project updated",
        description: "The project has been updated successfully.",
      });
      setIsEditing(false);
      setIsViewOpen(false);
      await fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProject) return;

    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(
        `${API_URL}/projects/${selectedProject.id}/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      toast({
        title: "Project deleted",
        description: "The project has been deleted successfully.",
      });
      setIsDeleteOpen(false);
      setIsViewOpen(false);
      await fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-md flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  const projectTabs = [
    { value: 'all', label: 'All Projects', icon: <List className="w-4 h-4 mr-1" /> },
    { value: 'in_progress', label: 'Active', icon: <Clock className="w-4 h-4 mr-1" /> },
    { value: 'completed', label: 'Completed', icon: <CheckCircle className="w-4 h-4 mr-1" /> },
    { value: 'on_hold', label: 'On Hold', icon: <AlertCircle className="w-4 h-4 mr-1" /> },
    { value: 'planning', label: 'Planning', icon: <AlertCircle className="w-4 h-4 mr-1" /> },
  ] as const;

  if (allProjects.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No projects found.</p>
        <Button className="mt-4" variant="outline">
          Create New Project
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-5">
            {projectTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center justify-center py-2 text-xs"
              >
                {tab.icon}
                <span className="ml-1">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('title')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Project
                  {getSortIcon('title')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('client')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Client
                  {getSortIcon('client')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('status')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Status
                  {getSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('team')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Team
                  {getSortIcon('team')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('start_date')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Timeline
                  {getSortIcon('start_date')}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('cost')}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Budget
                  {getSortIcon('cost')}
                </Button>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(filteredProjects) && filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{project.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {project.description.length > 50
                          ? `${project.description.substring(0, 50)}...`
                          : project.description}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{project.client?.name || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(project.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                      <span>{project.team_members?.length || 0} members</span>
                    </div>
                    {project.project_manager?.user && (
                      <div className="text-xs text-muted-foreground">
                        PM: {project.project_manager.user.name ||
                          `${project.project_manager.user.first_name || ''} ${project.project_manager.user.last_name || ''}`.trim() ||
                          'N/A'}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1 text-muted-foreground" />
                        <span>
                          {project.start_date
                            ? format(new Date(project.start_date), 'MMM d, yyyy')
                            : 'Not started'}
                        </span>
                      </div>
                      {(project.deadline || project.end_date) && (
                        <div className="text-xs text-muted-foreground">
                          Due: {format(new Date(project.deadline || project.end_date!), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="w-3 h-3 mr-1 text-muted-foreground" />
                      <span>${project.cost.toLocaleString()}</span>
                      {project.discount > 0 && (
                        <span className="ml-1 text-xs text-green-500">
                          (${project.discount.toLocaleString()} off)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedProject(project);
                        setEditedProject({ ...project });
                        setIsViewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {loading ? 'Loading projects...' : 'No projects found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Project Details Modal */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedProject && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <DialogTitle>
                    {isEditing ? 'Edit Project' : selectedProject.title}
                  </DialogTitle>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (isEditing) {
                          setIsEditing(false);
                          setEditedProject({ ...selectedProject });
                        } else {
                          setIsEditing(true);
                        }
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
                <DialogDescription>
                  {!isEditing && (
                    <div className="mt-2">
                      {getStatusBadge(selectedProject.status)}
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedProject.description}
                      </p>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                {isEditing ? (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="title" className="text-right">
                        Title
                      </Label>
                      <Input
                        id="title"
                        value={editedProject.title || ''}
                        onChange={(e) => setEditedProject({ ...editedProject, title: e.target.value })}
                        className="col-span-3"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="description" className="text-right">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        value={editedProject.description || ''}
                        onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                        className="col-span-3"
                        rows={4}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="status" className="text-right">
                        Status
                      </Label>
                      <Select
                        value={editedProject.status}
                        onValueChange={(value) => setEditedProject({ ...editedProject, status: value as ProjectStatus })}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_STATUS_VALUES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <span className="font-medium w-32">Client:</span>
                      <span>{selectedProject.client?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium w-32">Project Manager:</span>
                      <span>
                        {selectedProject.project_manager?.user?.name ||
                          (selectedProject.project_manager?.user?.first_name || selectedProject.project_manager?.user?.last_name
                            ? `${selectedProject.project_manager.user.first_name || ''} ${selectedProject.project_manager.user.last_name || ''}`.trim()
                            : 'N/A')}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium w-32">Start Date:</span>
                      <span>
                        {selectedProject.start_date ? format(new Date(selectedProject.start_date), 'MMM d, yyyy') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium w-32">End Date:</span>
                      <span>
                        {selectedProject.end_date ? format(new Date(selectedProject.end_date), 'MMM d, yyyy') : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium w-32">Budget:</span>
                      <span>${selectedProject.budget?.toLocaleString() || selectedProject.cost.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium w-32">Team Members:</span>
                      <span>{selectedProject.team_members?.length || 0}</span>
                    </div>
                  </div>
                )}
              </div>

              {isEditing && (
                <DialogFooter>
                  <Button type="button" onClick={handleUpdateProject}>
                    Save changes
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the project "{selectedProject?.title}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}