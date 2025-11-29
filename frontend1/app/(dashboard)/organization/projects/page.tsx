'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Download } from 'lucide-react';
import { ProjectList } from '@/components/common/dashboard/ProjectList';
import { NewProjectDialog } from '@/components/projects/NewProjectDialog';
import { useOrganization } from '@/contexts/OrganizationContext';

export default function OrganizationProjectsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { currentOrganization } = useOrganization();

  const handleProjectCreated = () => {
    setRefreshKey(prev => prev + 1); // This will trigger a re-render of ProjectList
  };

  // Filter projects based on search query and active tab
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

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
        <NewProjectDialog onProjectCreated={handleProjectCreated} organizationId={''} />
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
            <form onSubmit={handleSearch} className="flex space-x-2 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search projects..."
                  className="pl-8 w-full md:w-[300px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" type="submit">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
                <span className="sr-only">Export</span>
              </Button>
            </form>
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
                <ProjectList key={refreshKey} organizationId={currentOrganization.id} />
              </TabsContent>
              <TabsContent value="active" className="m-0">
                <ProjectList key={refreshKey} organizationId={currentOrganization.id} />
              </TabsContent>
              <TabsContent value="completed" className="m-0">
                <ProjectList key={refreshKey} organizationId={currentOrganization.id} />
              </TabsContent>
              <TabsContent value="on_hold" className="m-0">
                <ProjectList key={refreshKey} organizationId={currentOrganization.id} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
