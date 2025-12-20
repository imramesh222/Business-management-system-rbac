'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, Users, HardDrive, BarChart4, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Badge } from '@/components/ui/badge';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type OrganizationStats = {
  total: number;
  active: number;
  trial: number;
  inactive: number;
  totalUsers: number;
  avgUsersPerOrg: number;
  storageUsed: number;
  storageLimit: number;
  growthRate: number;
};

type OrgActivity = {
  name: string;
  users: number;
  projects: number;
  storage: number;
  status: 'active' | 'trial' | 'inactive';
  lastActive: string;
};

type StorageUsage = {
  orgName: string;
  used: number;
  limit: number;
  percentage: number;
};

export function OrganizationMetricsSection() {
  const { toast } = useToast();
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [topOrgs, setTopOrgs] = useState<OrgActivity[]>([]);
  const [storageUsage, setStorageUsage] = useState<StorageUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Mock data - replace with real API calls
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock organization statistics
        setStats({
          total: 142,
          active: 98,
          trial: 24,
          inactive: 20,
          totalUsers: 5243,
          avgUsersPerOrg: 36.9,
          storageUsed: 1245.7,
          storageLimit: 5000,
          growthRate: 8.3,
        });

        // Mock top organizations
        setTopOrgs([
          { name: 'Acme Corp', users: 245, projects: 42, storage: 245, status: 'active', lastActive: '2023-05-15T14:32:00Z' },
          { name: 'Globex', users: 187, projects: 38, storage: 198, status: 'active', lastActive: '2023-05-16T09:15:00Z' },
          { name: 'Initech', users: 132, projects: 29, storage: 176, status: 'trial', lastActive: '2023-05-14T16:45:00Z' },
          { name: 'Umbrella', users: 98, projects: 31, storage: 154, status: 'active', lastActive: '2023-05-13T11:20:00Z' },
          { name: 'Stark Ind', users: 76, projects: 24, storage: 132, status: 'active', lastActive: '2023-05-12T13:10:00Z' },
        ]);

        // Mock storage usage
        setStorageUsage([
          { orgName: 'Acme Corp', used: 245, limit: 500, percentage: 49 },
          { orgName: 'Globex', used: 198, limit: 500, percentage: 40 },
          { orgName: 'Initech', used: 176, limit: 200, percentage: 88 },
          { orgName: 'Umbrella', used: 154, limit: 500, percentage: 31 },
          { orgName: 'Stark Ind', used: 132, limit: 200, percentage: 66 },
        ]);

        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error fetching organization metrics:', error);
        toast({
          title: 'Error',
          description: 'Failed to load organization metrics',
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

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="ml-2 bg-green-600 hover:bg-green-700">Active</Badge>;
      case 'trial':
        return <Badge variant="outline">Trial</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Inactive</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Prepare data for charts
  const orgChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'New Organizations',
        data: [12, 19, 15, 27, 23, 32],
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
        display: false,
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
        ticks: {
          precision: 0,
        },
      },
    },
  };

  if (isLoading && !stats) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Organization Metrics</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center space-y-2">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading organization data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    // <Card className="w-full">
    //   <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 space-y-2 sm:space-y-0">
    //     <div>
    //       <CardTitle>Organization Metrics</CardTitle>
    //       <CardDescription>
    //         Overview of all organizations in the system
    //         {lastUpdated && (
    //           <span className="text-xs text-muted-foreground ml-2">
    //             (Updated: {new Date(lastUpdated).toLocaleTimeString()})
    //           </span>
    //         )}
    //       </CardDescription>
    //     </div>
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
    //     {/* Key Metrics */}
    //     {stats && (
    //       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    //         <Card>
    //           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    //             <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
    //             <Building2 className="h-4 w-4 text-muted-foreground" />
    //           </CardHeader>
    //           <CardContent>
    //             <div className="text-2xl font-bold">{stats.total.toLocaleString()}</div>
    //             <div className="flex items-center text-xs text-muted-foreground">
    //               {stats.growthRate >= 0 ? (
    //                 <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
    //               ) : (
    //                 <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
    //               )}
    //               {Math.abs(stats.growthRate)}% from last month
    //             </div>
    //           </CardContent>
    //         </Card>
            
    //         <Card>
    //           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    //             <CardTitle className="text-sm font-medium">Active Organizations</CardTitle>
    //             <Users className="h-4 w-4 text-muted-foreground" />
    //           </CardHeader>
    //           <CardContent>
    //             <div className="text-2xl font-bold">{stats.active}</div>
    //             <p className="text-xs text-muted-foreground">
    //               {stats.trial} in trial, {stats.inactive} inactive
    //             </p>
    //           </CardContent>
    //         </Card>
            
    //         <Card>
    //           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    //             <CardTitle className="text-sm font-medium">Total Users</CardTitle>
    //             <Users className="h-4 w-4 text-muted-foreground" />
    //           </CardHeader>
    //           <CardContent>
    //             <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
    //             <p className="text-xs text-muted-foreground">
    //               ~{stats.avgUsersPerOrg.toFixed(1)} users per org
    //             </p>
    //           </CardContent>
    //         </Card>
            
    //         <Card>
    //           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    //             <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
    //             <HardDrive className="h-4 w-4 text-muted-foreground" />
    //           </CardHeader>
    //           <CardContent>
    //             <div className="text-2xl font-bold">{formatBytes(stats.storageUsed * 1024 * 1024)}</div>
    //             <p className="text-xs text-muted-foreground">
    //               {((stats.storageUsed / stats.storageLimit) * 100).toFixed(1)}% of {formatBytes(stats.storageLimit * 1024 * 1024)} limit
    //             </p>
    //           </CardContent>
    //         </Card>
    //       </div>
    //     )}

    //     {/* Growth Chart */}
    //     <div className="rounded-lg border p-4">
    //       <h3 className="mb-4 text-sm font-medium">Organization Growth</h3>
    //       <div className="h-64 w-full">
    //         <Bar data={orgChartData} options={chartOptions} />
    //       </div>
    //     </div>

    //     {/* Top Organizations */}
    //     <div className="grid gap-6 md:grid-cols-2">
    //       <div className="rounded-lg border p-4">
    //         <h3 className="mb-4 text-sm font-medium">Top Organizations</h3>
    //         <div className="space-y-4">
    //           {topOrgs.map((org) => (
    //             <div key={org.name} className="flex items-center justify-between">
    //               <div className="flex items-center space-x-3">
    //                 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
    //                   <Building2 className="h-5 w-5" />
    //                 </div>
    //                 <div>
    //                   <p className="text-sm font-medium">{org.name}</p>
    //                   <div className="flex items-center space-x-2 text-xs text-muted-foreground">
    //                     <span>{org.users} users</span>
    //                     <span>•</span>
    //                     <span>{org.projects} projects</span>
    //                   </div>
    //                 </div>
    //               </div>
    //               <div className="text-right">
    //                 {getStatusBadge(org.status)}
    //                 <p className="text-xs text-muted-foreground">
    //                   Last active: {new Date(org.lastActive).toLocaleDateString()}
    //                 </p>
    //               </div>
    //             </div>
    //           ))}
    //         </div>
    //       </div>

    //       {/* Storage Usage */}
    //       <div className="rounded-lg border p-4">
    //         <h3 className="mb-4 text-sm font-medium">Storage Usage</h3>
    //         <div className="space-y-4">
    //           {storageUsage.map((org) => (
    //             <div key={org.orgName}>
    //               <div className="mb-1 flex items-center justify-between text-sm">
    //                 <span className="font-medium">{org.orgName}</span>
    //                 <span className="text-muted-foreground">
    //                   {formatBytes(org.used * 1024 * 1024)} / {formatBytes(org.limit * 1024 * 1024)}
    //                 </span>
    //               </div>
    //               <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
    //                 <div
    //                   className={`h-full ${
    //                     org.percentage > 80 ? 'bg-red-500' : org.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
    //                   }`}
    //                   style={{ width: `${org.percentage}%` }}
    //                 />
    //               </div>
    //             </div>
    //           ))}
    //         </div>
    //       </div>
    //     </div>
    //   </CardContent>
    // </Card>
    <>
    </>
  );
}
