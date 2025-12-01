'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Download, ChevronDown, X } from 'lucide-react';
import { ProjectList } from '@/components/common/dashboard/ProjectList';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { useOrganization } from '@/contexts/OrganizationContext';

interface Project {
  id: string;
  title: string;
  description?: string;
  status: string;
  client?: {
    id: string;
    name: string;
  };
  project_manager?: {
    id: string;
    user: {
      name?: string;
      first_name?: string;
      last_name?: string;
    };
  };
  team_members?: Array<{
    id: string;
    name: string;
  }>;
}

interface ProjectListProps {
  projects: Project[];
  organizationId: string;
}

export default function OrganizationProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    client: '',
    projectManager: ''
  });
  const { currentOrganization } = useOrganization();

  const handleProjectCreated = () => {
    setRefreshKey(prev => prev + 1); // This will trigger a re-render of ProjectList
  };

  // Get unique filter options
  const statusOptions = Array.from(new Set(projects.map(p => p.status))).filter(Boolean);
  const clientOptions = Array.from(new Set(
    projects
      .map(p => p.client?.name)
      .filter((name): name is string => Boolean(name))
  ));
  const projectManagerOptions = Array.from(new Set(
    projects
      .map(p => {
        if (p.project_manager?.user?.name) {
          return p.project_manager.user.name;
        }
        if (p.project_manager?.user?.first_name || p.project_manager?.user?.last_name) {
          return `${p.project_manager.user.first_name || ''} ${p.project_manager.user.last_name || ''}`.trim();
        }
        return '';
      })
      .filter((name): name is string => Boolean(name))
  ));

  // Filter projects based on search query and filters
  const filteredProjects = projects.filter(project => {
    // Apply status filter
    if (filters.status && project.status !== filters.status) {
      return false;
    }

    // Apply client filter
    if (filters.client && project.client?.name !== filters.client) {
      return false;
    }

    // Apply project manager filter
    if (filters.projectManager) {
      const managerName = project.project_manager?.user?.name || 
        (project.project_manager?.user?.first_name || project.project_manager?.user?.last_name
          ? `${project.project_manager.user.first_name || ''} ${project.project_manager.user.last_name || ''}`.trim()
          : '');
      if (managerName !== filters.projectManager) {
        return false;
      }
    }
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const searchableText = [
        project.title || '',
        project.status || '',
        project.description || '',
        project.client?.name || '',
        project.project_manager?.user?.name || '',
        ...(project.team_members?.map((member: { name: string }) => member.name || '') || [])
      ].join(' ').toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    // Apply status filter
    if (filters.status && project.status !== filters.status) {
      return false;
    }

    // Apply client filter
    if (filters.client && project.client?.name !== filters.client) {
      return false;
    }

    // Apply project manager filter
    if (filters.projectManager && project.project_manager?.user?.name !== filters.projectManager) {
      return false;
    }

    return true;
  });

  const resetFilters = () => {
    setFilters({
      status: '',
      client: '',
      projectManager: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please select an organization to view projects.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage projects for {currentOrganization.name}
          </p>
        </div>
        <NewProjectDialog onProjectCreated={handleProjectCreated} organizationId={currentOrganization.id} />
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
            <div>
              <CardTitle>Organization Projects</CardTitle>
              <CardDescription>
                View and manage projects for {currentOrganization.name}
              </CardDescription>
            </div>
            <div className="relative w-full md:w-auto">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search projects..."
                className="pl-8 w-full md:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* <div className="flex items-center space-x-2 relative">
              <div className="relative">
                <Button 
                  variant="outline" 
                  onClick={() => setShowFilters(!showFilters)}
                  className="relative"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  {(filters.status || filters.client || filters.projectManager) && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary"></span>
                  )}
                </Button>
                
                {showFilters && (
                  <div className="absolute right-0 mt-2 w-64 bg-background border rounded-md shadow-lg z-10 p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Filters</h4>
                      <div className="flex space-x-2">
                        {(filters.status || filters.client || filters.projectManager) && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-xs"
                            onClick={() => setFilters({ status: '', client: '', projectManager: '' })}
                          >
                            Reset
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => setShowFilters(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status</label>
                      <select
                        className="w-full p-2 border rounded-md text-sm"
                        value={filters.status}
                        onChange={(e) => setFilters({...filters, status: e.target.value})}
                      >
                        <option value="">All Statuses</option>
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Client</label>
                      <select
                        className="w-full p-2 border rounded-md text-sm"
                        value={filters.client}
                        onChange={(e) => setFilters({...filters, client: e.target.value})}
                      >
                        <option value="">All Clients</option>
                        {clientOptions.map((client) => (
                          <option key={client} value={client}>
                            {client}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Project Manager</label>
                      <select
                        className="w-full p-2 border rounded-md text-sm"
                        value={filters.projectManager}
                        onChange={(e) => setFilters({...filters, projectManager: e.target.value})}
                      >
                        <option value="">All Managers</option>
                        {projectManagerOptions.map((manager) => (
                          <option key={manager} value={manager}>
                            {manager}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
                <span className="sr-only">Export</span>
              </Button>
            </div> */}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
            {/* <div className="border-b px-6">
              <TabsList className="w-full justify-start rounded-none bg-transparent p-0">
                <TabsTrigger 
                  value="all" 
                  className="relative h-10 rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  All Projects
                </TabsTrigger>
                <TabsTrigger 
                  value="active" 
                  className="relative h-10 rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Active
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  className="relative h-10 rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Completed
                </TabsTrigger>
                <TabsTrigger 
                  value="on_hold" 
                  className="relative h-10 rounded-none border-b-2 border-transparent px-4 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  On Hold
                </TabsTrigger>
              </TabsList>
            </div> */}
            <div className="p-6">
              <TabsContent value="all" className="m-0">
                <ProjectList
                  organizationId={currentOrganization.id}
                  searchQuery={searchQuery}
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </TabsContent>
              <TabsContent value="active" className="m-0">
                <ProjectList
                  organizationId={currentOrganization.id}
                  searchQuery={activeTab === 'active' ? searchQuery : ''}
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              </TabsContent>
              <TabsContent value="completed" className="m-0">
                <ProjectList
                  organizationId={currentOrganization.id}
                  searchQuery={activeTab === 'completed' ? searchQuery : ''}
                />
              </TabsContent>
              <TabsContent value="on_hold" className="m-0">
                <ProjectList
                  organizationId={currentOrganization.id}
                  searchQuery={activeTab === 'on_hold' ? searchQuery : ''}
                />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
