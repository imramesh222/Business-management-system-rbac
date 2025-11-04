'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FolderOpen, 
  CheckSquare, 
  Users, 
  Calendar,
  Clock,
  AlertTriangle,
  Target,
  Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { fetchProjectManagerDashboard } from '@/services/projectManagerService';
import { ProjectManagerDashboardData, ProjectManagerProject, ProjectManagerTask } from '@/types/project-manager';

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'No deadline';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const projectProgressData = [
  { name: 'E-commerce Platform', progress: 85, deadline: '2024-02-15', status: 'on-track' },
  { name: 'Mobile App v2.0', progress: 62, deadline: '2024-03-01', status: 'on-track' },
  { name: 'API Integration', progress: 45, deadline: '2024-02-28', status: 'at-risk' },
  { name: 'Dashboard Redesign', progress: 78, deadline: '2024-02-20', status: 'on-track' },
  { name: 'Security Audit', progress: 30, deadline: '2024-03-15', status: 'delayed' },
];

const teamWorkloadData = [
  { member: 'Alice', tasks: 8, capacity: 10 },
  { member: 'Bob', tasks: 12, capacity: 10 },
  { member: 'Carol', tasks: 6, capacity: 10 },
  { member: 'David', tasks: 9, capacity: 10 },
  { member: 'Eve', tasks: 7, capacity: 10 },
];

const taskCompletionData = [
  { week: 'W1', completed: 23, planned: 25 },
  { week: 'W2', completed: 28, planned: 30 },
  { week: 'W3', completed: 32, planned: 28 },
  { week: 'W4', completed: 27, planned: 30 },
];

const upcomingDeadlines = [
  { project: 'E-commerce Platform', task: 'Payment Integration', deadline: '2024-01-18', priority: 'high' },
  { project: 'Mobile App v2.0', task: 'User Authentication', deadline: '2024-01-20', priority: 'medium' },
  { project: 'Dashboard Redesign', task: 'UI Components', deadline: '2024-01-22', priority: 'high' },
  { project: 'API Integration', task: 'Data Migration', deadline: '2024-01-25', priority: 'low' },
];

export default function ManagerOverview() {
  const [dashboardData, setDashboardData] = useState<ProjectManagerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchProjectManagerDashboard();
        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-md">
        <AlertTriangle className="inline-block w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-4 text-gray-500 bg-gray-50 rounded-md">
        No data available
      </div>
    );
  }

  const { stats, projects, recent_tasks } = dashboardData;

  // Prepare metrics for the top cards
  const metrics = [
    {
      title: 'Total Projects',
      value: stats.total_projects.toString(),
      change: `${stats.active_projects} active`,
      changeType: 'positive',
      icon: FolderOpen,
    },
    {
      title: 'Team Members',
      value: stats.total_team_members.toString(),
      change: `${stats.active_projects} active projects`,
      changeType: 'positive',
      icon: Users,
    },
    {
      title: 'Tasks In Progress',
      value: stats.in_progress_tasks.toString(),
      change: `${stats.completed_tasks} completed`,
      changeType: 'positive',
      icon: CheckSquare,
    },
    {
      title: 'Pending Tasks',
      value: stats.pending_tasks.toString(),
      change: 'Needs attention',
      changeType: stats.pending_tasks > 5 ? 'negative' : 'positive',
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${metric.changeType === 'positive' ? 'bg-green-100' : 'bg-red-100'}`}>
                <metric.icon className={`h-4 w-4 ${metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Progress and Team Workload */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Projects Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects.map((project) => (
                <div key={project.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{project.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Client: {project.client?.name || 'No client'}
                      </p>
                    </div>
                    <Badge className={getStatusColor(project.status)}>
                      {project.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{project.completed_tasks} of {project.total_tasks} tasks</span>
                      <span>Due: {formatDate(project.deadline)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Your team's task distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projects[0]?.team_members?.map((member) => (
                <div key={member.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {member.role}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ 
                          width: `${(member.tasks_completed / (member.tasks_assigned || 1)) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {member.tasks_completed}/{member.tasks_assigned}
                    </span>
                  </div>
                </div>
              ))}
              
              <div className="mt-6">
                <h4 className="font-medium mb-2">Recent Tasks</h4>
                <div className="space-y-3">
                  {recent_tasks.slice(0, 5).map((task) => (
                    <div key={task.id} className="flex items-start space-x-3">
                      <div className={`w-2 h-2 mt-2 rounded-full ${
                        task.status === 'completed' ? 'bg-green-500' : 
                        task.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{task.title}</p>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <span>{task.project?.title || 'No project'}</span>
                          <span className="mx-2">•</span>
                          <span>Due: {formatDate(task.due_date)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Completion Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Task Completion Trends</CardTitle>
          <CardDescription>Weekly task completion vs planned tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={recent_tasks}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="due_date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} name="Completed" />
              <Line type="monotone" dataKey="planned" stroke="#3B82F6" strokeWidth={2} name="Planned" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines and Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>Tasks due in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recent_tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-sm text-gray-500">{task.project?.title || 'No project'}</p>
                    <div className="flex items-center mt-1">
                      <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {task.due_date ? `Due: ${formatDate(task.due_date)}` : 'No due date'}
                      </span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(task.status)}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">
              View All Deadlines
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Frequently used project management functions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button className="h-20 flex-col space-y-2">
                <CheckSquare className="h-6 w-6" />
                <span>Create Task</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <FolderOpen className="h-6 w-6" />
                <span>New Project</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <Users className="h-6 w-6" />
                <span>Team Meeting</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <Calendar className="h-6 w-6" />
                <span>Schedule Review</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
            Project Risks & Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-800">API Integration behind schedule</p>
                  <p className="text-sm text-red-600">Project is 2 weeks behind the planned timeline</p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                Review
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Bob is overloaded</p>
                  <p className="text-sm text-yellow-600">Currently assigned 12 tasks (120% capacity)</p>
                </div>
              </div>
              <Button size="sm" variant="outline">
                Reassign
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}