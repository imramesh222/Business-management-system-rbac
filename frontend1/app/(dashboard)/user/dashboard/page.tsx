'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Calendar, 
  CheckCircle, 
  Clock, 
  FileText, 
  MessageSquare, 
  PieChart, 
  Settings, 
  Star, 
  Target, 
  TrendingUp, 
  Users,
  Zap
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { apiGet } from '@/services/apiService';
import { API_URL } from '@/constant';

type Task = {
  id: string;
  title: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  progress: number;
};

type Project = {
  id: string;
  name: string;
  status: 'on_track' | 'at_risk' | 'delayed' | 'completed';
  progress: number;
  dueDate: string;
  members: { name: string; avatar: string }[];
};

type Notification = {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
};

export default function UserDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const currentUser = await getCurrentUser();
        if (!currentUser) return;
        
        setUser(currentUser);
        
        // Simulate API calls with mock data
        setTasks([
          {
            id: '1',
            title: 'Complete project proposal',
            dueDate: '2023-12-15',
            priority: 'high',
            status: 'in_progress',
            progress: 65
          },
          {
            id: '2',
            title: 'Review code changes',
            dueDate: '2023-12-10',
            priority: 'medium',
            status: 'todo',
            progress: 0
          },
          {
            id: '3',
            title: 'Update documentation',
            dueDate: '2023-12-05',
            priority: 'low',
            status: 'review',
            progress: 90
          }
        ]);

        setProjects([
          {
            id: '1',
            name: 'Website Redesign',
            status: 'on_track',
            progress: 75,
            dueDate: '2024-01-15',
            members: [
              { name: 'You', avatar: '' },
              { name: 'Alex', avatar: '' },
              { name: 'Sam', avatar: '' }
            ]
          },
          {
            id: '2',
            name: 'Mobile App Development',
            status: 'at_risk',
            progress: 45,
            dueDate: '2024-02-01',
            members: [
              { name: 'You', avatar: '' },
              { name: 'Taylor', avatar: '' }
            ]
          }
        ]);

        setNotifications([
          {
            id: '1',
            title: 'New message from Alex',
            message: 'Can you review the latest design changes?',
            time: '2m ago',
            read: false,
            type: 'info'
          },
          {
            id: '2',
            title: 'Project deadline updated',
            message: 'The deadline for Website Redesign has been extended',
            time: '1h ago',
            read: true,
            type: 'success'
          }
        ]);

      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const getPriorityBadge = (priority: string) => {
    const classes = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${classes[priority as keyof typeof classes]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; class: string }> = {
      todo: { text: 'To Do', class: 'bg-gray-100 text-gray-800' },
      in_progress: { text: 'In Progress', class: 'bg-blue-100 text-blue-800' },
      review: { text: 'In Review', class: 'bg-purple-100 text-purple-800' },
      done: { text: 'Completed', class: 'bg-green-100 text-green-800' },
      on_track: { text: 'On Track', class: 'bg-green-100 text-green-800' },
      at_risk: { text: 'At Risk', class: 'bg-yellow-100 text-yellow-800' },
      delayed: { text: 'Delayed', class: 'bg-red-100 text-red-800' },
      completed: { text: 'Completed', class: 'bg-green-100 text-green-800' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}</h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your projects today.</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 md:mt-0">
          <Button variant="outline" size="sm" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Button>
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {notifications.some(n => !n.read) && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500"></span>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">
              <Target className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
            <p className="text-xs text-muted-foreground">+2 from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tasks.length}</div>
            <p className="text-xs text-muted-foreground">+5 from yesterday</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">
              <Star className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasks.filter(t => t.status === 'done').length}/{tasks.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100) : 0}% completion
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.from(new Set(projects.flatMap(p => p.members.map(m => m.name)))).length}
            </div>
            <p className="text-xs text-muted-foreground">Active collaborators</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tasks Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Tasks</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-start p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{task.title}</h3>
                        <div className="flex items-center space-x-2">
                          {getPriorityBadge(task.priority)}
                          {getStatusBadge(task.status)}
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>Due {formatDate(task.dueDate)}</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Projects Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Active Projects</CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projects.map((project) => (
                  <div key={project.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className="text-sm text-gray-500">Due {formatDate(project.dueDate)}</span>
                          <span className="text-gray-300">•</span>
                          {getStatusBadge(project.status)}
                        </div>
                      </div>
                      <div className="flex -space-x-2">
                        {project.members.map((member, index) => (
                          <Avatar key={index} className="h-8 w-8 border-2 border-white">
                            <AvatarImage src={member.avatar} alt={member.name} />
                            <AvatarFallback className="text-xs">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...tasks, ...projects]
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .slice(0, 3)
                  .map((item, index) => (
                    <div key={`deadline-${index}`} className="flex items-start">
                      <div className="bg-primary/10 p-2 rounded-lg mr-3">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium">{"title" in item ? item.title : item.name}</h4>
                        <p className="text-xs text-gray-500">
                          Due {formatDate(item.dueDate)}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className={`p-3 rounded-lg ${
                      !notification.read ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="bg-primary/10 p-2 rounded-lg mr-3">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">{notification.title}</h4>
                          {!notification.read && (
                            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                        <span className="text-xs text-gray-400 mt-1 block">{notification.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="flex flex-col h-24">
                  <FileText className="h-5 w-5 mb-1" />
                  <span className="text-sm">New Task</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-24">
                  <Users className="h-5 w-5 mb-1" />
                  <span className="text-sm">New Project</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-24">
                  <MessageSquare className="h-5 w-5 mb-1" />
                  <span className="text-sm">New Message</span>
                </Button>
                <Button variant="outline" className="flex flex-col h-24">
                  <Settings className="h-5 w-5 mb-1" />
                  <span className="text-sm">Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
