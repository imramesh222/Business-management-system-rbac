'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Server, Database, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

type SystemMetric = {
  name: string;
  value: number;
  max: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
};

type ServerStatus = {
  name: string;
  status: 'online' | 'degraded' | 'offline';
  responseTime: number;
  uptime: number;
  lastChecked: string;
};

export function SystemHealthSection() {
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Mock data - replace with real API calls
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setMetrics([
          {
            name: 'API Response Time',
            value: 145,
            max: 500,
            unit: 'ms',
            trend: 'down',
            icon: <Activity className="h-5 w-5 text-blue-500" />
          },
          {
            name: 'Database Load',
            value: 65,
            max: 100,
            unit: '%',
            trend: 'stable',
            icon: <Database className="h-5 w-5 text-green-500" />
          },
          {
            name: 'Error Rate',
            value: 2.3,
            max: 100,
            unit: '%',
            trend: 'up',
            icon: <AlertCircle className="h-5 w-5 text-red-500" />
          },
          {
            name: 'Uptime',
            value: 99.98,
            max: 100,
            unit: '%',
            trend: 'stable',
            icon: <Clock className="h-5 w-5 text-purple-500" />
          }
        ]);

        setServers([
          {
            name: 'Web Server',
            status: 'online',
            responseTime: 45,
            uptime: 99.99,
            lastChecked: new Date().toISOString()
          },
          {
            name: 'Database Server',
            status: 'degraded',
            responseTime: 120,
            uptime: 99.8,
            lastChecked: new Date().toISOString()
          },
          {
            name: 'Cache Server',
            status: 'online',
            responseTime: 12,
            uptime: 100,
            lastChecked: new Date().toISOString()
          },
          {
            name: 'Worker Server',
            status: 'online',
            responseTime: 30,
            uptime: 99.95,
            lastChecked: new Date().toISOString()
          }
        ]);

        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error fetching system health data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load system health data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(interval);
  }, [toast]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500';
      case 'offline':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handleRefresh = () => {
    // Trigger a manual refresh
    setLastUpdated(new Date());
    // The useEffect will handle the refresh
  };

  return (
    // <Card className="w-full">
    //   <CardHeader className="flex flex-row items-center justify-between pb-2">
    //     <CardTitle className="text-lg font-medium">System Health</CardTitle>
    //     <div className="flex items-center space-x-2">
    //       {lastUpdated && (
    //         <span className="text-xs text-muted-foreground">
    //           Updated: {new Date(lastUpdated).toLocaleTimeString()}
    //         </span>
    //       )}
    //       <Button
    //         variant="ghost"
    //         size="sm"
    //         onClick={handleRefresh}
    //         disabled={isLoading}
    //         className="h-8 w-8 p-0"
    //       >
    //         <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
    //         <span className="sr-only">Refresh</span>
    //       </Button>
    //     </div>
    //   </CardHeader>
    //   <CardContent className="space-y-6">
    //     <div>
    //       <h3 className="mb-4 text-sm font-medium">System Metrics</h3>
    //       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    //         {metrics.map((metric) => (
    //           <div key={metric.name} className="flex items-center space-x-4 rounded-lg border p-4">
    //             <div className="flex-shrink-0">
    //               <div className="rounded-full bg-opacity-20 p-2">
    //                 {metric.icon}
    //               </div>
    //             </div>
    //             <div className="min-w-0 flex-1">
    //               <p className="text-sm font-medium text-muted-foreground">{metric.name}</p>
    //               <div className="flex items-baseline">
    //                 <p className="text-2xl font-bold">
    //                   {metric.value}{metric.unit}
    //                 </p>
    //                 {metric.trend === 'up' && (
    //                   <span className="ml-2 text-sm text-red-500">↑ 2.1%</span>
    //                 )}
    //                 {metric.trend === 'down' && (
    //                   <span className="ml-2 text-sm text-green-500">↓ 1.3%</span>
    //                 )}
    //               </div>
    //               <div className="mt-2">
    //                 <Progress
    //                   value={metric.value}
    //                   max={metric.max}
    //                   className={`h-2 [&>div]:${metric.trend === 'up' ? 'bg-red-500' : metric.trend === 'down' ? 'bg-green-500' : 'bg-blue-500'}`}
    //                 />
    //               </div>
    //             </div>
    //           </div>
    //         ))}
    //       </div>
    //     </div>

    //     <div>
    //       <h3 className="mb-4 text-sm font-medium">Server Status</h3>
    //       <div className="overflow-hidden rounded-md border">
    //         <table className="w-full">
    //           <thead className="bg-muted/50">
    //             <tr>
    //               <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Server</th>
    //               <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
    //               <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Response Time</th>
    //               <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Uptime</th>
    //               <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Checked</th>
    //             </tr>
    //           </thead>
    //           <tbody className="divide-y divide-border">
    //             {servers.map((server) => (
    //               <tr key={server.name}>
    //                 <td className="whitespace-nowrap px-4 py-4">
    //                   <div className="flex items-center">
    //                     <div className="flex-shrink-0">
    //                       <Server className="h-5 w-5 text-muted-foreground" />
    //                     </div>
    //                     <div className="ml-4">
    //                       <div className="text-sm font-medium">{server.name}</div>
    //                     </div>
    //                   </div>
    //                 </td>
    //                 <td className="whitespace-nowrap px-4 py-4">
    //                   <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(server.status)}`}>
    //                     {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
    //                   </span>
    //                 </td>
    //                 <td className="whitespace-nowrap px-4 py-4 text-sm">
    //                   {server.responseTime}ms
    //                 </td>
    //                 <td className="whitespace-nowrap px-4 py-4 text-sm">
    //                   {server.uptime.toFixed(2)}%
    //                 </td>
    //                 <td className="whitespace-nowrap px-4 py-4 text-sm text-muted-foreground">
    //                   {new Date(server.lastChecked).toLocaleTimeString()}
    //                 </td>
    //               </tr>
    //             ))}
    //           </tbody>
    //         </table>
    //       </div>
    //     </div>
    //   </CardContent>
    // </Card>
    <>
    </>
  );
}
