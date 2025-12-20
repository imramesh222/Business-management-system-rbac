'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserPlus, Activity as ActivityIcon, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

type UserRoleStats = {
  role: string;
  count: number;
  change: number;
  color: string;
};

type UserActivityData = {
  date: string;
  active: number;
  new: number;
};

type UserSessionData = {
  hour: string;
  count: number;
};

export function UserStatisticsSection() {
  const { toast } = useToast();
  const [roleStats, setRoleStats] = useState<UserRoleStats[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivityData[]>([]);
  const [sessionHeatmap, setSessionHeatmap] = useState<UserSessionData[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Mock data - replace with real API calls
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock role statistics
        setRoleStats([
          { role: 'Admin', count: 24, change: 12, color: '#3b82f6' },
          { role: 'Manager', count: 45, change: 5, color: '#10b981' },
          { role: 'Developer', count: 128, change: -3, color: '#8b5cf6' },
          { role: 'Support', count: 32, change: 8, color: '#f59e0b' },
          { role: 'Viewer', count: 87, change: 15, color: '#6b7280' },
        ]);

        // Mock user activity data
        const activityData: UserActivityData[] = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          activityData.push({
            date: date.toISOString().split('T')[0],
            active: Math.floor(Math.random() * 500) + 100,
            new: Math.floor(Math.random() * 30) + 5,
          });
        }
        setUserActivity(activityData);

        // Mock session heatmap data
        const heatmapData: UserSessionData[] = [];
        for (let i = 0; i < 24; i++) {
          heatmapData.push({
            hour: `${i.toString().padStart(2, '0')}:00`,
            count: Math.floor(Math.random() * 1000) + 100,
          });
        }
        setSessionHeatmap(heatmapData);

        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error fetching user statistics:', error);
        toast({
          title: 'Error',
          description: 'Failed to load user statistics',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(interval);
  }, [timeRange, toast]);

  const handleRefresh = () => {
    setLastUpdated(new Date());
  };

  // Prepare data for charts
  const activityChartData = {
    labels: userActivity.map(item => format(new Date(item.date), 'MMM d')),
    datasets: [
      {
        label: 'Active Users',
        data: userActivity.map(item => item.active),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.3,
        fill: true,
      },
      {
        label: 'New Users',
        data: userActivity.map(item => item.new),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const heatmapData = {
    labels: sessionHeatmap.map(item => item.hour),
    datasets: [
      {
        label: 'Active Sessions',
        data: sessionHeatmap.map(item => item.count),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
  };

  return (
    // <Card className="w-full">
    //   <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 space-y-2 sm:space-y-0">
    //     <CardTitle className="text-lg font-medium">User Statistics</CardTitle>
    //     <div className="flex items-center space-x-2">
    //       <div className="flex items-center space-x-1">
    //         <Button
    //           variant={timeRange === '7d' ? 'default' : 'ghost'}
    //           size="sm"
    //           onClick={() => setTimeRange('7d')}
    //           className="h-8 px-2 text-xs"
    //         >
    //           7D
    //         </Button>
    //         <Button
    //           variant={timeRange === '30d' ? 'default' : 'ghost'}
    //           size="sm"
    //           onClick={() => setTimeRange('30d')}
    //           className="h-8 px-2 text-xs"
    //         >
    //           30D
    //         </Button>
    //         <Button
    //           variant={timeRange === '90d' ? 'default' : 'ghost'}
    //           size="sm"
    //           onClick={() => setTimeRange('90d')}
    //           className="h-8 px-2 text-xs"
    //         >
    //           90D
    //         </Button>
    //       </div>
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
    //     {/* Role Distribution */}
    //     <div>
    //       <h3 className="mb-4 text-sm font-medium">User Distribution by Role</h3>
    //       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
    //         {roleStats.map((stat) => (
    //           <div key={stat.role} className="rounded-lg border p-4">
    //             <div className="flex items-center justify-between">
    //               <p className="text-sm font-medium text-muted-foreground">{stat.role}</p>
    //               <Users className="h-4 w-4 text-muted-foreground" />
    //             </div>
    //             <div className="mt-2 flex items-baseline">
    //               <p className="text-2xl font-bold">{stat.count}</p>
    //               <span 
    //                 className={`ml-2 text-sm ${
    //                   stat.change >= 0 ? 'text-green-500' : 'text-red-500'
    //                 }`}
    //               >
    //                 {stat.change >= 0 ? '+' : ''}{stat.change}%
    //               </span>
    //             </div>
    //             <div className="mt-2">
    //               <div 
    //                 className="h-1.5 rounded-full" 
    //                 style={{
    //                   width: '100%',
    //                   backgroundColor: `${stat.color}20`,
    //                 }}
    //               >
    //                 <div 
    //                   className="h-full rounded-full" 
    //                   style={{
    //                     width: `${Math.min(100, (stat.count / 200) * 100)}%`,
    //                     backgroundColor: stat.color,
    //                   }}
    //                 />
    //               </div>
    //             </div>
    //           </div>
    //         ))}
    //       </div>
    //     </div>

    //     {/* User Activity Chart */}
    //     <div>
    //       <div className="mb-4 flex items-center justify-between">
    //         <h3 className="text-sm font-medium">User Activity</h3>
    //         <div className="flex items-center space-x-2 text-xs text-muted-foreground">
    //           <div className="flex items-center">
    //             <div className="mr-1 h-2 w-2 rounded-full bg-blue-500"></div>
    //             <span>Active Users</span>
    //           </div>
    //           <div className="flex items-center">
    //             <div className="mr-1 h-2 w-2 rounded-full bg-green-500"></div>
    //             <span>New Users</span>
    //           </div>
    //         </div>
    //       </div>
    //       <div className="h-64 w-full">
    //         <Line data={activityChartData} options={chartOptions} />
    //       </div>
    //     </div>

    //     {/* Session Heatmap */}
    //     <div>
    //       <h3 className="mb-4 text-sm font-medium">Daily Session Heatmap</h3>
    //       <div className="h-64 w-full">
    //         <Bar data={heatmapData} options={{
    //           ...chartOptions,
    //           scales: {
    //             ...chartOptions.scales,
    //             y: {
    //               ...chartOptions.scales.y,
    //               ticks: {
    //                 callback: (value: string | number) => {
    //                   const numValue = typeof value === 'string' ? parseFloat(value) : value;
    //                   if (numValue >= 1000) return `${numValue / 1000}k`;
    //                   return numValue.toString();
    //                 }
    //               }
    //             }
    //           },
    //           plugins: {
    //             ...chartOptions.plugins,
    //             legend: {
    //               display: false,
    //             },
    //             tooltip: {
    //               callbacks: {
    //                 label: (context) => {
    //                   return `${context.parsed.y} active sessions`;
    //                 }
    //               }
    //             }
    //           }
    //         }} />
    //       </div>
    //     </div>

    //     {/* Key Metrics */}
    //     <div className="grid gap-4 md:grid-cols-3">
    //       <div className="rounded-lg border p-4">
    //         <div className="flex items-center justify-between">
    //           <p className="text-sm font-medium text-muted-foreground">Total Users</p>
    //           <Users className="h-5 w-5 text-blue-500" />
    //         </div>
    //         <p className="mt-2 text-2xl font-bold">1,243</p>
    //         <p className="text-xs text-green-500">+12.5% from last month</p>
    //       </div>
    //       <div className="rounded-lg border p-4">
    //         <div className="flex items-center justify-between">
    //           <p className="text-sm font-medium text-muted-foreground">New Users (30d)</p>
    //           <UserPlus className="h-5 w-5 text-green-500" />
    //         </div>
    //         <p className="mt-2 text-2xl font-bold">248</p>
    //         <p className="text-xs text-green-500">+8.3% from last month</p>
    //       </div>
    //       <div className="rounded-lg border p-4">
    //         <div className="flex items-center justify-between">
    //           <p className="text-sm font-medium text-muted-foreground">Avg. Session</p>
    //           <Clock className="h-5 w-5 text-purple-500" />
    //         </div>
    //         <p className="mt-2 text-2xl font-bold">4m 32s</p>
    //         <p className="text-xs text-red-500">-2.1% from last month</p>
    //       </div>
    //     </div>
    //   </CardContent>
    // </Card>
    <>
    </>
  );
}