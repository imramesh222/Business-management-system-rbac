'use client';

import { useState, useEffect } from 'react';
import { apiGet } from '@/services/apiService';
import { API_URL } from '@/constant';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, AlertCircle, CheckCircle, Clock, Users, Calendar, DollarSign } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  cost: number;
  discount: number;
  start_date: string | null;
  deadline: string | null;
  client: {
    id: string;
    name: string;
  };
  project_manager?: {
    id: string;
    user: {
      name: string;
    };
  };
  team_members: Array<{
    id: string;
    user: {
      name: string;
    };
  }>;
  created_at: string;
  updated_at: string;
  is_verified: boolean;
}

interface ProjectListProps {
  organizationId?: string; // For organization admin to filter projects
  isSuperAdmin?: boolean; // For superadmin to see all projects
}

export function ProjectList({ organizationId, isSuperAdmin = false }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        let url = `${API_URL}/projects/projects/`;
        
        // If organizationId is provided, filter projects by organization
        if (organizationId) {
          url = `${API_URL}/projects/projects/?organization=${organizationId}`;
        }
        
        const response = await apiGet(url);
        // Ensure we have an array, even if the response is an object
        const projectsData = Array.isArray(response) ? response : [];
        setProjects(projectsData);
      } catch (err) {
        console.error('Error fetching projects:', err);
        setError('Failed to load projects. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [organizationId]);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'planning': { variant: 'secondary', label: 'Planning' },
      'in_progress': { variant: 'default', label: 'In Progress' },
      'on_hold': { variant: 'outline', label: 'On Hold' },
      'completed': { variant: 'secondary', label: 'Completed' }, // Changed from 'success' to 'secondary'
      'cancelled': { variant: 'destructive', label: 'Cancelled' },
    };

    const statusInfo = statusMap[status] || { variant: 'outline' as const, label: status };
    
    return (
      <Badge variant={statusInfo.variant}>
        {status === 'in_progress' ? (
          <Clock className="w-3 h-3 mr-1" />
        ) : status === 'completed' ? (
          <CheckCircle className="w-3 h-3 mr-1" />
        ) : (
          <AlertCircle className="w-3 h-3 mr-1" />
        )}
        {statusInfo.label}
      </Badge>
    );
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

  if (projects.length === 0) {
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Timeline</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.isArray(projects) && projects.length > 0 ? (
            projects.map((project) => (
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
                {project.project_manager && (
                  <div className="text-xs text-muted-foreground">
                    PM: {project.project_manager.user.name}
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
                  {project.deadline && (
                    <div className="text-xs text-muted-foreground">
                      Due: {format(new Date(project.deadline), 'MMM d, yyyy')}
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
                <Button variant="ghost" size="sm">
                  View
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
  );
}
