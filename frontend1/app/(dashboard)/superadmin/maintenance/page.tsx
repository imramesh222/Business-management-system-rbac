'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Database, Server, HardDrive, RefreshCw, AlertTriangle, CheckCircle, X, Clock, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type MaintenanceTask = {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  progress: number;
  lastRun: string;
  duration: string;
  canRun: boolean;
};

type SystemMetric = {
  name: string;
  value: string;
  status: 'normal' | 'warning' | 'error';
  trend: 'up' | 'down' | 'stable';
};

export default function MaintenancePage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([
    {
      id: 'clear-cache',
      name: 'Clear Application Cache',
      description: 'Clears all cached data to free up memory',
      status: 'idle',
      progress: 0,
      lastRun: '2023-05-15 14:30',
      duration: '2m 15s',
      canRun: true,
    },
    {
      id: 'optimize-db',
      name: 'Optimize Database',
      description: 'Optimizes database tables and indexes',
      status: 'idle',
      progress: 0,
      lastRun: '2023-05-14 03:00',
      duration: '8m 45s',
      canRun: true,
    },
    {
      id: 'backup',
      name: 'Create System Backup',
      description: 'Creates a complete system backup',
      status: 'idle',
      progress: 0,
      lastRun: '2023-05-15 00:00',
      duration: '15m 22s',
      canRun: true,
    },
    {
      id: 'update',
      name: 'Check for Updates',
      description: 'Checks for system updates',
      status: 'idle',
      progress: 0,
      lastRun: '2023-05-15 09:15',
      duration: '45s',
      canRun: true,
    },
    {
      id: 'clean-logs',
      name: 'Clean Log Files',
      description: 'Removes old log files',
      status: 'idle',
      progress: 0,
      lastRun: '2023-05-15 00:15',
      duration: '1m 30s',
      canRun: true,
    },
  ]);

  const [systemMetrics] = useState<SystemMetric[]>([
    { name: 'CPU Usage', value: '24%', status: 'normal', trend: 'down' },
    { name: 'Memory Usage', value: '3.2GB / 16GB', status: 'normal', trend: 'stable' },
    { name: 'Disk Space', value: '256GB / 1TB', status: 'warning', trend: 'up' },
    { name: 'Database Size', value: '12.4GB', status: 'normal', trend: 'up' },
    { name: 'Active Users', value: '142', status: 'normal', trend: 'up' },
    { name: 'API Response Time', value: '128ms', status: 'normal', trend: 'stable' },
  ]);

  const runTask = (taskId: string) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, status: 'running', progress: 0 };
      }
      return task;
    }));

    // Simulate task progress
    const interval = setInterval(() => {
      setTasks(currentTasks => {
        const updatedTasks = currentTasks.map(task => {
          if (task.id === taskId && task.status === 'running') {
            const newProgress = Math.min(task.progress + Math.random() * 20, 100);
            const isCompleted = newProgress >= 100;
            return {
              ...task,
              progress: newProgress,
              status: isCompleted ? 'completed' as const : 'running' as const,
              lastRun: new Date().toISOString(),
            };
          }
          return task;
        });
        
        // Clear interval if task is completed
        const task = updatedTasks.find(t => t.id === taskId);
        if (task?.status === 'completed' || task?.status === 'failed') {
          clearInterval(interval);
        }
        
        return updatedTasks;
      });
    }, 500);
  };

  const runAllTasks = () => {
    tasks.forEach(task => {
      if (task.canRun) {
        runTask(task.id);
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-green-500';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Maintenance</h1>
          <p className="mt-2 text-gray-600">Perform system maintenance and diagnostics</p>
        </div>
        <Button onClick={runAllTasks}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Run All Tasks
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Tasks</CardTitle>
              <CardDescription>Run system maintenance tasks to keep your application running smoothly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(task.status)}
                          <h3 className="font-medium">{task.name}</h3>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                        
                        {task.status === 'running' && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Progress: {Math.round(task.progress)}%</span>
                              <span>Running...</span>
                            </div>
                            <Progress value={task.progress} className="h-2" />
                          </div>
                        )}
                        
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>Last run: {task.lastRun}</span>
                          <span className="mx-2">•</span>
                          <span>Duration: {task.duration}</span>
                        </div>
                      </div>
                      <div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => task.status === 'idle' && runTask(task.id)}
                          disabled={task.status === 'running' || !task.canRun}
                        >
                          {task.status === 'idle' ? 'Run' : task.status === 'running' ? 'Running...' : 'Run Again'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>Recent system events and logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                  <div className="text-sm font-medium">System Logs</div>
                  <Button variant="ghost" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                <div className="h-64 overflow-y-auto p-4 font-mono text-sm bg-black text-green-400">
                  <div className="mb-2">
                    <span className="text-gray-500">[2023-05-15 14:32:10]</span> System check completed. No issues found.
                  </div>
                  <div className="mb-2">
                    <span className="text-gray-500">[2023-05-15 14:30:45]</span> Database backup completed successfully.
                  </div>
                  <div className="mb-2">
                    <span className="text-gray-500">[2023-05-15 14:28:12]</span> Cache cleared.
                  </div>
                  <div className="mb-2">
                    <span className="text-gray-500">[2023-05-15 14:25:33]</span> User authentication service restarted.
                  </div>
                  <div className="mb-2">
                    <span className="text-gray-500">[2023-05-15 14:20:15]</span> Security scan completed. No threats detected.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Current system status and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {systemMetrics.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-700">{metric.name}</div>
                    <div className={`text-sm font-mono ${getMetricStatusColor(metric.status)}`}>
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Activity className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">System Status</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>All systems are operational. No critical issues detected.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common maintenance tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Server className="h-4 w-4 mr-2" />
                Restart Services
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Database className="h-4 w-4 mr-2" />
                Backup Database
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <HardDrive className="h-4 w-4 mr-2" />
                Clear Cache
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500" />
                Run Diagnostics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
