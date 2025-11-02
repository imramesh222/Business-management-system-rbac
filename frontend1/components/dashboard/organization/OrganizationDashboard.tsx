// 'use client';

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Progress } from '@/components/ui/progress';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// import { format } from 'date-fns';
// import { Activity, AlertCircle, ArrowUpRight, Clock, FolderOpen, RefreshCw, Users, Zap, UserPlus, MoreHorizontal } from 'lucide-react';
// import { useQuery } from '@tanstack/react-query';
// import { useRouter } from 'next/navigation';
// import { Skeleton } from '@/components/ui/skeleton';
// import { StatCard } from '@/components/dashboard/common/StatCard';
// import { CheckCircle2, DollarSign } from 'lucide-react';
// import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// // Helper function to format storage size
// const formatStorageSize = (bytes: number): string => {
//   if (bytes === 0) return '0 Bytes';
//   const k = 1024;
//   const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
//   const i = Math.floor(Math.log(bytes) / Math.log(k));
//   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
// };

// // Define types for the data we expect to receive
// interface User {
//   id: string;
//   name: string;
//   email: string;
//   avatar?: string;
//   role: string;
//   lastActive: string;
// }

// interface DashboardMetrics {
//   totalUsers: number;
//   activeUsers: number;
//   totalProjects: number;
//   activeProjects: number;
//   storageUsed: number;
//   storageTotal: number;
//   revenue: number;
//   tasksCompleted: number;
//   tasksInProgress: number;
//   tasksOverdue: number;
//   totalMembers: number;
//   completedTasks: number;
//   monthlyRevenue: number;
// }

// interface ActivityItem {
//   id: string;
//   user: User;
//   action: string;
//   target: string;
//   timestamp: string;
//   type?: string;
// }

// interface TaskItem {
//   id: string;
//   title: string;
//   dueDate: string;
//   priority: 'low' | 'medium' | 'high';
//   status: 'todo' | 'in-progress' | 'done' | 'cancelled';
//   projectId: string;
//   projectName: string;
// }

// interface ProjectItem {
//   id: string;
//   name: string;
//   status: 'active' | 'on-hold' | 'completed' | 'cancelled';
//   progress: number;
//   dueDate: string;
//   members?: User[];
// }

// interface OrganizationDashboardData {
//   metrics: DashboardMetrics;
//   recentActivity: ActivityItem[];
//   upcomingTasks: TaskItem[];
//   recentProjects: ProjectItem[];
// }

// // Mock fetch function - replace with your actual API call
// const fetchOrganizationDashboard = async (orgId: string): Promise<OrganizationDashboardData> => {
//   // Simulate API delay
//   await new Promise(resolve => setTimeout(resolve, 1000));
  
//   // Mock data - replace with actual API call
//   return {
//     metrics: {
//       totalUsers: 42,
//       activeUsers: 12,
//       totalProjects: 8,
//       activeProjects: 5,
//       storageUsed: 25 * 1024 * 1024 * 1024, // 25GB
//       storageTotal: 100 * 1024 * 1024 * 1024, // 100GB
//       revenue: 12500,
//       tasksCompleted: 42,
//       tasksInProgress: 12,
//       tasksOverdue: 3,
//       totalMembers: 15,
//       completedTasks: 42,
//       monthlyRevenue: 12500,
//     },
//     recentActivity: [
//       {
//         id: '1',
//         user: {
//           id: '1',
//           name: 'John Doe',
//           email: 'john@example.com',
//           role: 'admin',
//           lastActive: new Date().toISOString(),
//         },
//         action: 'created',
//         target: 'Project X',
//         timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
//         type: 'project',
//       },
//     ],
//     upcomingTasks: [
//       {
//         id: '1',
//         title: 'Complete project proposal',
//         dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
//         priority: 'high',
//         status: 'in-progress',
//         projectId: '1',
//         projectName: 'Project X',
//       },
//     ],
//     recentProjects: [
//       {
//         id: '1',
//         name: 'Project X',
//         status: 'active',
//         progress: 65,
//         dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
//         members: [
//           {
//             id: '1',
//             name: 'John Doe',
//             email: 'john@example.com',
//             role: 'admin',
//             lastActive: new Date().toISOString(),
//           },
//         ],
//       },
//     ],
//   };
// };

// // Props interface
// interface OrganizationDashboardProps {
//   orgId: string;
// }

// // Data fetching function
// const fetchOrganizationAdminDashboard = async (orgId: string): Promise<OrganizationDashboardData> => {
//   try {
//     // Mock data since organizationService is not available
//     return {
//       metrics: {
//         totalUsers: 0,
//         activeUsers: 0,
//         totalProjects: 0,
//         activeProjects: 0,
//         storageUsed: 0,
//         storageTotal: 100 * 1024 * 1024 * 1024, // 100GB
//         revenue: 0,
//         tasksCompleted: 0,
//         tasksInProgress: 0,
//         tasksOverdue: 0,
//         totalMembers: 0,
//         completedTasks: 0,
//         monthlyRevenue: 0,
//       },
//       recentActivity: [],
//       upcomingTasks: [],
//       recentProjects: [],
//     };
//   } catch (error) {
//     console.error('Error fetching dashboard data:', error);
//     throw error;
//   }
// };

// // Format storage size helper
// const formatStorage = (bytes: number): string => {
//   if (bytes < 1024) return `${bytes} B`;
//   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
//   if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
//   return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
// };

// // Calculate percentage change helper
// const getChangePercentage = (current: number, previous: number): string => {
//   if (previous === 0) return '0%';
//   const change = ((current - previous) / previous) * 100;
//   return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
// };

// // Get role badge variant
// const getRoleBadgeVariant = (role: string) => {
//   switch (role.toLowerCase()) {
//     case 'admin':
//       return 'default' as const;
//     case 'member':
//       return 'outline' as const;
//     case 'owner':
//       return 'secondary' as const;
//     default:
//       return 'outline' as const;
//   }
// };

// export default function OrganizationDashboard({ orgId }: OrganizationDashboardProps) {
//   const router = useRouter();
//   const handleRefresh = () => router.refresh();
  
//   // Fetch dashboard data
//   const { data: dashboardData, isLoading, isError } = useQuery<OrganizationDashboardData>({
//     queryKey: ['organization-dashboard', orgId],
//     queryFn: () => fetchOrganizationDashboard(orgId),
//   });

//   // Fetch organization members
//   const { data: membersData, isLoading: isLoadingMembers } = useQuery({
//     queryKey: ['organization-members', orgId],
//     queryFn: async () => {
//       const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
//       const response = await fetch(
//         `${baseUrl.replace(/\/+$/, '')}/org/organizations/${orgId}/members/`,
//         {
//           headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${localStorage.getItem('access_token')}`
//           }
//         }
//       );
      
//       if (!response.ok) {
//         throw new Error('Failed to fetch members');
//       }
      
//       const data = await response.json();
//       console.log('Members data:', data); // Debug log
//       return data;
//     }
//   });

//   // Use mock data if no data from API
//   const data: OrganizationDashboardData = dashboardData || {
//     metrics: {
//       totalUsers: 0,
//       activeUsers: 0,
//       totalProjects: 0,
//       activeProjects: 0,
//       storageUsed: 0,
//       storageTotal: 100 * 1024 * 1024 * 1024, // 100GB default
//       revenue: 0,
//       tasksCompleted: 0,
//       tasksInProgress: 0,
//       tasksOverdue: 0,
//       totalMembers: 0,
//       completedTasks: 0,
//       monthlyRevenue: 0,
//     },
//     recentActivity: [],
//     upcomingTasks: [],
//     recentProjects: [],
//   };

//   const metrics = data.metrics;

//   // Calculate storage percentage
//   const storagePercentage = metrics.storageTotal > 0 
//     ? Math.round((metrics.storageUsed / metrics.storageTotal) * 100) 
//     : 0;

//   // Prepare metric cards data
//   const stats = [
//     {
//       title: 'Total Members',
//       value: metrics.totalMembers?.toLocaleString() || '0',
//       description: 'across organization',
//       icon: <Users className="h-4 w-4 text-muted-foreground" />,
//       trend: {
//         value: getChangePercentage(metrics.totalMembers || 0, Math.max(0, (metrics.totalMembers || 0) - 5)),
//         type: 'up' as const,
//       }
//     },
//     {
//       title: 'Active Projects',
//       value: `${metrics.activeProjects || 0} / ${metrics.totalProjects || 0}`,
//       description: 'in progress',
//       icon: <FolderOpen className="h-4 w-4 text-muted-foreground" />,
//       trend: {
//         value: getChangePercentage(metrics.activeProjects || 0, Math.max(0, (metrics.activeProjects || 0) - 2)),
//         type: (metrics.activeProjects || 0) > 0 ? 'up' as const : 'neutral' as const,
//       }
//     },
//     {
//       title: 'Tasks Completed',
//       value: (metrics.completedTasks || 0).toLocaleString(),
//       description: 'this month',
//       icon: <CheckCircle2 className="h-4 w-4 text-muted-foreground" />,
//       trend: {
//         value: getChangePercentage(metrics.completedTasks || 0, Math.max(0, (metrics.completedTasks || 0) - 10)),
//         type: (metrics.completedTasks || 0) > 0 ? 'up' as const : 'neutral' as const,
//       }
//     },
//     {
//       title: 'Monthly Revenue',
//       value: `$${(metrics.monthlyRevenue || 0).toLocaleString()}`,
//       description: 'from last month',
//       icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
//       trend: {
//         value: getChangePercentage(metrics.monthlyRevenue || 0, Math.max(0, (metrics.monthlyRevenue || 0) - 1000)),
//         type: (metrics.monthlyRevenue || 0) > 0 ? 'up' as const : 'neutral' as const,
//       }
//     }
//   ];

//   // Process recent activity
//   const recentActivity = dashboardData?.recentActivity?.map(activity => ({
//     id: activity.id,
//     type: activity.type,
//     action: activity.action,
//     user: activity.user,
//     timestamp: activity.timestamp,
//     time: format(new Date(activity.timestamp), 'MMM d, yyyy'),
//     ...(activity.type === 'project' && { project: (activity as any).project }),
//     ...(activity.type === 'task' && { task: (activity as any).task })
//   })) || [];

//   // Mock upcoming tasks (replace with actual data from your API)
//   const upcomingTasks: TaskItem[] = [
//     {
//       id: '1',
//       title: 'Complete project proposal',
//       dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
//       priority: 'high',
//       projectId: '1',
//       projectName: 'Website Redesign',
//       status: 'in-progress'
//     },
//     {
//       id: '2',
//       title: 'Review design mockups',
//       dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
//       priority: 'medium',
//       projectId: '2',
//       projectName: 'Mobile App',
//       status: 'todo'
//     }
//   ];

//   // Mock recent projects (replace with actual data from your API)
//   const recentProjects: ProjectItem[] = [
//     {
//       id: '1',
//       name: 'Website Redesign',
//       status: 'active',
//       progress: 65,
//       dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
//       members: [
//         {
//           id: '1',
//           name: 'John Doe',
//           email: 'john@example.com',
//           role: 'admin',
//           lastActive: new Date().toISOString()
//         }
//       ]
//     },
//     {
//       id: '2',
//       name: 'Mobile App Development',
//       status: 'active',
//       progress: 30,
//       dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
//       members: [
//         {
//           id: '2',
//           name: 'Jane Smith',
//           email: 'jane@example.com',
//           role: 'developer',
//           lastActive: new Date().toISOString()
//         }
//       ]
//     }
//   ];

//   // Get priority badge variant
//   const getPriorityVariant = (priority: 'low' | 'medium' | 'high') => {
//     switch (priority) {
//       case 'high':
//         return 'destructive' as const;
//       case 'medium':
//         return 'default' as const; // Changed from 'warning' to 'default' to match Badge variant type
//       case 'low':
//       default:
//         return 'outline' as const;
//     }
//   };

// // Get status variant for badges
// const getStatusVariant = (status: string) => {
//   switch (status) {
//     case 'completed':
//       return 'default' as const;
//     case 'active':
//     case 'in-progress':
//       return 'secondary' as const;
//     case 'on-hold':
//       return 'outline' as const;
//     case 'cancelled':
//       return 'destructive' as const;
//     default:
//       return 'outline' as const;
//   }
// };

//   if (isLoading) {
//     return (
//       <div className="p-6 space-y-6">
//         <div className="flex justify-between items-center">
//           <div>
//             <Skeleton className="h-8 w-48 mb-2" />
//             <Skeleton className="h-4 w-64" />
//           </div>
//           <Skeleton className="h-10 w-32" />
//         </div>
//         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
//           {[...Array(4)].map((_, i) => (
//             <Skeleton key={i} className="h-32 rounded-lg" />
//           ))}
//         </div>
//         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
//           <Skeleton className="h-80 rounded-lg" />
//           <Skeleton className="h-80 rounded-lg" />
//           <Skeleton className="h-80 rounded-lg md:col-span-2 lg:col-span-1" />
//         </div>
//       </div>
//     );
//   }

//   if (isError) {
//     return (
//       <div className="p-6">
//         <div className="flex flex-col items-center justify-center p-8">
//           <AlertCircle className="h-12 w-12 text-destructive mb-4" />
//           <h2 className="text-xl font-semibold mb-4">Failed to load dashboard data</h2>
//           <Button variant="outline" onClick={handleRefresh}>
//             <RefreshCw className="mr-2 h-4 w-4" />
//             Retry
//           </Button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 space-y-6">
//       <div className="grid gap-6">
//         {/* Upcoming Tasks */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Upcoming Tasks</CardTitle>
//             <CardDescription>Tasks due soon</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-4">
//               {data?.upcomingTasks && data.upcomingTasks.length > 0 ? (
//                 data.upcomingTasks.map((task: TaskItem) => (
//                   <div key={task.id} className="space-y-2 p-4 border rounded-lg">
//                     <div className="flex items-center justify-between">
//                       <p className="text-sm font-medium">{task.title}</p>
//                       <Badge variant={getPriorityVariant(task.priority)}>
//                         {task.priority}
//                       </Badge>
//                     </div>
//                     <div className="flex items-center justify-between text-xs text-muted-foreground">
//                       <span>{task.projectName}</span>
//                       <span>Due: {format(new Date(task.dueDate), 'MMM d')}</span>
//                     </div>
//                   </div>
//                 ))
//               ) : (
//                 <div className="text-center py-8 text-muted-foreground">
//                   <p>No upcoming tasks</p>
//                 </div>
//               )}
//             </div>
//           </CardContent>
//         </Card>

//         {/* Recent Projects */}
//         <Card>
//           <CardHeader>
//             <CardTitle>Recent Projects</CardTitle>
//             <CardDescription>Project progress overview</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-4">
//               {data?.recentProjects?.map((project: ProjectItem) => (
//                 <div key={project.id} className="space-y-2 p-4 border rounded-lg">
//                   <div className="flex items-center justify-between">
//                     <p className="text-sm font-medium">{project.name}</p>
//                     <Badge variant={getStatusVariant(project.status)}>
//                       {project.status}
//                     </Badge>
//                   </div>
//                   <Progress value={project.progress} className="h-2" />
//                   <div className="flex items-center justify-between text-xs text-muted-foreground">
//                     <span>{project.members?.length || 0} members</span>
//                     <span>{project.progress}% complete</span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Storage Usage */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Storage Usage</CardTitle>
//           <CardDescription>Organization storage consumption</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="space-y-2">
//             <div className="flex items-center justify-between">
//               <span className="text-sm font-medium">
//                 {formatStorage(metrics?.storageUsed || 0)} / {formatStorage(metrics?.storageTotal || 0)}
//               </span>
//               <span className="text-sm text-muted-foreground">
//                 {storagePercentage}% used
//               </span>
//             </div>
//             <Progress value={storagePercentage} className="h-2" />
//           </div>
//         </CardContent>
//       </Card>

//       {/* Members Table */}
//       <Card>
//         <CardHeader>
//           <div className="flex items-center justify-between">
//             <div>
//               <CardTitle>Team Members</CardTitle>
//               <CardDescription>Manage your organization members and their roles</CardDescription>
//             </div>
//             <Button size="sm">
//               <UserPlus className="mr-2 h-4 w-4" />
//               Add Member
//             </Button>
//           </div>
//         </CardHeader>
//         <CardContent>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead>Name</TableHead>
//                 <TableHead>Email</TableHead>
//                 <TableHead>Role</TableHead>
//                 <TableHead className="text-right">Actions</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {isLoadingMembers ? (
//                 <TableRow>
//                   <TableCell colSpan={4}>
//                     <Skeleton className="h-4 w-full" />
//                   </TableCell>
//                 </TableRow>
//               ) : membersData?.length > 0 ? (
//                 membersData.map((member: any) => {
//                   // Handle both direct user object and nested user_details
//                   const user = member.user_details || member.user || {};
//                   const firstName = user.first_name || '';
//                   const lastName = user.last_name || '';
//                   const email = user.email || '';
                  
//                   return (
//                     <TableRow key={member.id}>
//                       <TableCell className="font-medium">
//                         <div className="flex items-center space-x-3">
//                           <Avatar className="h-8 w-8">
//                             <AvatarImage src={user.avatar} alt={`${firstName} ${lastName}`} />
//                             <AvatarFallback>
//                               {firstName?.[0]}{lastName?.[0]}
//                             </AvatarFallback>
//                           </Avatar>
//                           <span>{firstName} {lastName}</span>
//                         </div>
//                       </TableCell>
//                       <TableCell>{email}</TableCell>
//                       <TableCell>
//                         <Badge variant={getRoleBadgeVariant(member.role)}>
//                           {member.role_display || member.role}
//                         </Badge>
//                       </TableCell>
//                       <TableCell className="text-right">
//                         <Button variant="ghost" size="icon">
//                           <MoreHorizontal className="h-4 w-4" />
//                         </Button>
//                       </TableCell>
//                     </TableRow>
//                   );
//                 })
//               ) : (
//                 <TableRow>
//                   <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
//                     No members found
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }