// app/organization/project/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, Filter, Calendar, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { fetchReports } from '@/services/projectManagerService';

interface ReportData {
  projectStats: Array<{
    name: string;
    completed: number;
    inProgress: number;
    notStarted: number;
  }>;
  taskStats: Array<{
    name: string;
    completed: number;
    inProgress: number;
    overdue: number;
  }>;
  teamPerformance: Array<{
    name: string;
    completed: number;
    inProgress: number;
    efficiency: number;
  }>;
  taskDistribution: Array<{
    name: string;
    value: number;
  }>;
  overallStats: {
    totalProjects: number;
    tasksCompleted: number;
    teamProductivity: number;
    avgTaskTime: string;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

const StatCard = ({ title, value, change, isPositive, icon: Icon }: { title: string; value: string; change: string; isPositive: boolean; icon: any }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
          <div className={`flex items-center mt-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            <span className="text-sm font-medium ml-1">{change}</span>
            <span className="text-xs text-gray-500 ml-1">vs last month</span>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-blue-50">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const data = await fetchReports();
        setReportData(data);
      } catch (err) {
        setError('Failed to load reports');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="p-6">
        <div className="text-red-500">{error || 'No data available'}</div>
      </div>
    );
  }

  const { projectStats, taskStats, teamPerformance, taskDistribution, overallStats } = reportData;

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Track and analyze your project performance</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            This Month
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Projects" 
          value={overallStats.totalProjects.toString()} 
          change="+12%" 
          isPositive={true} 
          icon={({ className }: { className: string }) => (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          )} 
        />
        <StatCard 
          title="Tasks Completed" 
          value={overallStats.tasksCompleted.toString()} 
          change="+8%" 
          isPositive={true} 
          icon={({ className }: { className: string }) => (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          )} 
        />
        <StatCard 
          title="Team Productivity" 
          value={`${overallStats.teamProductivity}%`} 
          change="+5%" 
          isPositive={true} 
          icon={({ className }: { className: string }) => (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          )} 
        />
        <StatCard 
          title="Avg. Task Time" 
          value={overallStats.avgTaskTime} 
          change="-0.3h" 
          isPositive={false} 
          icon={({ className }: { className: string }) => (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          )} 
        />
      </div>
      
      <Tabs defaultValue="projects" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Export as PDF</DropdownMenuItem>
                <DropdownMenuItem>Export as CSV</DropdownMenuItem>
                <DropdownMenuItem>Print</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Project Completion Rate</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div> Completed</span>
                  <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-yellow-500 mr-1"></div> In Progress</span>
                  <span className="flex items-center"><div className="w-3 h-3 rounded-full bg-gray-300 mr-1"></div> Not Started</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#3b82f6" name="Completed" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="inProgress" fill="#eab308" name="In Progress" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="notStarted" fill="#d1d5db" name="Not Started" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={taskStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="completed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Completed" />
                    <Line type="monotone" dataKey="inProgress" stroke="#eab308" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="In Progress" />
                    <Line type="monotone" dataKey="overdue" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Overdue" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="team" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamPerformance}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                      <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="completed" fill="#3b82f6" name="Tasks Completed" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="left" dataKey="inProgress" fill="#eab308" name="In Progress" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2} name="Efficiency %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Task Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={taskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {taskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold">
                        {taskDistribution.find(d => d.name === 'Completed')?.value || 0}%
                      </text>
                      <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="text-sm text-gray-500">
                        Tasks Completed
                      </text>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}