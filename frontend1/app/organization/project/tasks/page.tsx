// app/organization/project/tasks/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Filter, Plus, MoreVertical, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { fetchTasks } from '@/services/projectManagerService';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'in_review' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  project: {
    id: string;
    name: string;
  };
  assignee: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    all: [],
    todo: [],
    in_progress: [],
    in_review: [],
    done: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const data = await fetchTasks();
        const tasksByStatus = data.reduce((acc: Record<string, Task[]>, task: Task) => {
          acc.all.push(task);
          acc[task.status] = [...(acc[task.status] || []), task];
          return acc;
        }, { all: [], todo: [], in_progress: [], in_review: [], done: [] });
        setTasks(tasksByStatus);
      } catch (err) {
        setError('Failed to load tasks');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, []);

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      low: { label: 'Low', variant: 'outline' },
      medium: { label: 'Medium', variant: 'default' },
      high: { label: 'High', variant: 'destructive' },
    };
    const priorityInfo = priorityMap[priority] || { label: priority, variant: 'outline' as const };
    return <Badge variant={priorityInfo.variant}>{priorityInfo.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'in_progress':
        return <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />;
      case 'in_review':
        return <AlertCircle className="h-4 w-4 text-purple-500" />;
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const filteredTasks = (status: string) => {
    const statusTasks = tasks[status as keyof typeof tasks] || [];
    return statusTasks.filter(task =>
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.project.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="flex justify-between items-center">
            <div className="h-10 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded w-1/6"></div>
          </div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
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
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-gray-500">Manage and track your tasks</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search tasks..."
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

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
          <TabsTrigger value="todo">To Do</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="in_review">In Review</TabsTrigger>
          <TabsTrigger value="done">Done</TabsTrigger>
        </TabsList>

        {(['all', 'todo', 'in_progress', 'in_review', 'done'] as const).map((status) => (
          <TabsContent key={status} value={status} className="space-y-4">
            {filteredTasks(status).length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No tasks found</p>
              </div>
            ) : (
              filteredTasks(status).map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {getStatusIcon(task.status)}
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-medium">{task.title}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>Project: {task.project.name}</span>
                            <span>•</span>
                            <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {getPriorityBadge(task.priority)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={task.assignee.avatar || ''} alt={task.assignee.name} />
                          <AvatarFallback>{task.assignee.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}