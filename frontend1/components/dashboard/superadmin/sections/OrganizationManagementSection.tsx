'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MoreHorizontal, Plus, Building2, Users, HardDrive, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';

// Import services and types
import { DataTable, type DataTableColumnDef } from '@/components/dashboard/common';
import { Input } from '@/components/ui/input';
import { fetchOrganizations, createOrganization, deleteOrganization } from '@/services/organizationService';
import { fetchSubscriptionPlans, fetchPlanDurations, getDurationDisplay } from '@/services/subscriptionService';
import type { SubscriptionPlan, PlanDuration } from '@/types/subscription';
import type { Organization, OrganizationSubscriptionDetails } from '@/types/organization';
import { Skeleton } from '@/components/ui/skeleton';
import type { Row } from '@tanstack/react-table';

// Helper function to format bytes to human-readable format
function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const getStatusBadge = (status: Organization['status']) => {
  switch (status) {
    case 'active':
      return <Badge variant="default">Active</Badge>;
    case 'trial':
      return <Badge variant="outline">Trial</Badge>;
    case 'suspended':
      return <Badge variant="destructive">Suspended</Badge>;
    case 'inactive':
      return <Badge variant="secondary">Inactive</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

// Form schema for organization creation
const organizationFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Organization name must be at least 2 characters.',
  }),
  slug: z.string().min(2, {
    message: 'Slug must be at least 2 characters.',
  }).regex(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers, and hyphens.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }).min(1, {
    message: 'Email is required.',
  }),
  phone_number: z.string().optional(),
  website: z.string().url({
    message: 'Please enter a valid URL including http:// or https://',
  }).optional().or(z.literal('')),
  plan_id: z.string({
    required_error: 'Please select a subscription plan.',
  }),
  plan_duration: z.string({
    required_error: 'Please select a plan duration.',
  }),
  status: z.enum(['active', 'trial', 'suspended', 'inactive']).default('active'),
  max_users: z.number().min(1, {
    message: 'Maximum users must be at least 1.',
  }).optional(),
  max_storage: z.number().min(1, {
    message: 'Maximum storage must be at least 1GB.',
  }).optional(),
  description: z.string().optional(),
  skip_payment: z.boolean().default(true),
});

type OrganizationFormValues = z.infer<typeof organizationFormSchema>;

const getPlanBadge = (planName?: string | null) => {
  if (!planName) {
    return <Badge className="bg-gray-100 text-gray-700">No Plan</Badge>;
  }

  const planMap: Record<string, { label: string; variant: string }> = {
    'free': { label: 'Free', variant: 'bg-gray-100 text-gray-800' },
    'basic': { label: 'Basic', variant: 'bg-blue-100 text-blue-800' },
    'pro': { label: 'Pro', variant: 'bg-purple-100 text-purple-800' },
    'enterprise': { label: 'Enterprise', variant: 'bg-amber-100 text-amber-800' },
  };
  
  const normalizedPlanName = planName.toLowerCase();
  const { label, variant } = planMap[normalizedPlanName] || { 
    label: planName, 
    variant: 'bg-gray-100 text-gray-700' 
  };
  
  return <Badge className={variant}>{label}</Badge>;
};

export function OrganizationManagementSection() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planDurations, setPlanDurations] = useState<Record<string, PlanDuration[]>>({});
  
  const isValidPlanId = (id: string | null): id is string => {
    return id !== null && id in planDurations;
  };
  
  const getSelectedPlan = (): SubscriptionPlan | null => {
    if (!selectedPlanId) return null;
    const plan = subscriptionPlans.find(p => p && p.id.toString() === selectedPlanId);
    return plan || null;
  };
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [totalItems, setTotalItems] = useState(0);
  const { toast } = useToast();
  
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        console.log('Fetching subscription plans...');
        const { data: plans, error } = await fetchSubscriptionPlans();
        
        if (error) {
          console.error('Error fetching plans:', error);
          toast({
            title: 'Error',
            description: error,
            variant: 'destructive',
          });
          return;
        }
        
        if (!plans || plans.length === 0) {
          console.warn('No subscription plans available');
          toast({
            title: 'Warning',
            description: 'No subscription plans available. Please contact support.',
            variant: 'destructive',
          });
          return;
        }
        
        console.log('Fetched plans:', plans);
        setSubscriptionPlans(plans);
        
        const durations: Record<string, PlanDuration[]> = {};
        for (const plan of plans) {
          try {
            console.log(`Fetching durations for plan ${plan.id}...`);
            const { data: planDurations, error: durationError } = await fetchPlanDurations(plan.id);
            
            if (durationError || !planDurations) {
              console.error(`Error fetching durations for plan ${plan.id}:`, durationError);
              continue;
            }
            
            console.log(`Durations for plan ${plan.id}:`, planDurations);
            durations[plan.id.toString()] = planDurations;
          } catch (err) {
            console.error(`Error processing plan ${plan.id}:`, err);
          }
        }
        
        setPlanDurations(durations);
        
        if (plans.length > 0) {
          setSelectedPlanId(plans[0].id.toString());
        }
      } catch (error) {
        console.error('Failed to fetch subscription plans:', error);
        toast({
          title: 'Error',
          description: 'Failed to load subscription plans. Please try again.',
          variant: 'destructive',
        });
      }
    };
    
    fetchPlans();
  }, [toast]);
  
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      email: '',
      phone_number: '',
      website: '',
      status: 'active',
      plan_id: '',
      plan_duration: undefined,
      max_users: undefined,
      max_storage: undefined,
      description: '',
      skip_payment: true,
    },
  });

  useEffect(() => {
    if (selectedPlanId && planDurations[selectedPlanId]?.length > 0) {
      const defaultDuration = planDurations[selectedPlanId].find(d => d.is_default) || planDurations[selectedPlanId][0];
      if (defaultDuration) {
        form.setValue('plan_duration', defaultDuration.id.toString());
      }
    } else if (selectedPlanId) {
      form.setValue('plan_duration', '');
    }
  }, [selectedPlanId, planDurations, form]);
  
  const handleCreateOrganization = async (values: OrganizationFormValues) => {
    try {
      setIsSubmitting(true);
      
      const plan = subscriptionPlans.find(p => p.id.toString() === values.plan_id);
      if (!plan) {
        throw new Error('Selected plan not found');
      }
      
      const selectedDuration = planDurations[values.plan_id]?.find(
        d => d.id.toString() === values.plan_duration
      );
      
      if (!selectedDuration) {
        throw new Error('Selected duration not found');
      }
      
      const organizationData = {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        slug: values.slug.trim().toLowerCase(),
        status: (values.status || 'active') as 'active' | 'trial' | 'suspended' | 'inactive',
        plan_duration: parseInt(values.plan_duration, 10),
        max_users: values.max_users ?? 10,
        max_storage: values.max_storage ?? 10 * 1024 * 1024 * 1024,
        description: values.description,
        phone_number: values.phone_number?.trim() || '',
        website: values.website || '',
        skip_payment: true,
      };
      
      const organization = await createOrganization(organizationData);
      
      setOrganizations(prev => [organization, ...prev]);
      
      setIsCreateDialogOpen(false);
      form.reset();
      setSelectedPlanId(null);
      
      toast({
        title: 'Success',
        description: 'Organization created successfully with subscription.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to create organization:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create organization. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const orgs = await fetchOrganizations({
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize,
          search: searchQuery,
          status: statusFilter,
          sortBy: 'created_at',
          sortOrder: 'desc',
        });
        setOrganizations(orgs.organizations);
        setTotalItems(orgs.total);
        
        const { data: plans, error: plansError } = await fetchSubscriptionPlans();
        
        if (plansError || !plans) {
          console.error('Error fetching subscription plans:', plansError);
          toast({
            title: 'Error',
            description: 'Failed to load subscription plans',
            variant: 'destructive',
          });
          return;
        }
        
        setSubscriptionPlans(plans);
        
        const durations: Record<string, PlanDuration[]> = {};
        for (const plan of plans) {
          try {
            const { data: planDurations, error: durationError } = await fetchPlanDurations(plan.id);
            if (durationError || !planDurations) {
              console.error(`Error fetching durations for plan ${plan.id}:`, durationError);
              continue;
            }
            const planId = plan.id.toString();
            durations[planId] = planDurations;
          } catch (err) {
            console.error(`Error processing plan ${plan.id}:`, err);
          }
        }
        
        setPlanDurations(durations);
        
        if (plans.length > 0) {
          const firstPlanId = plans[0].id.toString();
          setSelectedPlanId(firstPlanId);
          form.setValue('plan_id', firstPlanId);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [pagination, searchQuery, statusFilter, toast, form]);

  const handlePaginationChange = (pageIndex: number, pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      pageIndex,
      pageSize,
    }));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPagination(prev => ({ ...prev, pageIndex: 0 }));
  };

  const getRowData = (row: Row<Organization>): Organization => row.original;

  const columns: DataTableColumnDef<Organization>[] = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (row) => row.name,
      cell: ({ row }) => {
        const data = getRowData(row);
        const planName = data.plan;
        return (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{data.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{data.name}</div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">{data.slug}</span>
                {getPlanBadge(planName)}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'plan',
      header: 'Plan',
      accessorFn: (row) => row.plan,
      cell: ({ row }) => {
        const data = getRowData(row);
        const subscription = data.subscription;
        if (!subscription) {
          return <span className="text-muted-foreground">No active subscription</span>;
        }
        
        const planName = subscription.plan_details?.plan?.name || data.plan || 'Unknown';
        const duration = subscription.plan_details?.duration;
        
        return (
          <div>
            <div className="font-medium">{planName}</div>
            {duration && (
              <div className="text-sm text-gray-500">
                {duration.months} months (${duration.price})
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => row.status,
      cell: ({ row }) => getStatusBadge(getRowData(row).status),
    },
    {
      id: 'member_count',
      header: 'Members',
      accessorFn: (row) => row.member_count,
      cell: ({ row }) => {
        const data = getRowData(row);
        return (
          <div className="flex items-center">
            <Users className="mr-2 h-4 w-4 text-gray-500" />
            {data.member_count}
          </div>
        );
      },
    },
    {
      id: 'storage',
      header: 'Storage',
      accessorFn: (row) => row.storage_used,
      cell: ({ row }) => {
        const data = getRowData(row);
        return (
          <div className="w-full">
            <div className="mb-1 text-sm font-medium">
              {formatBytes(data.storage_used)} / {formatBytes(data.storage_limit)}
            </div>
            <Progress
              value={(data.storage_used / data.storage_limit) * 100}
              className="h-2"
            />
          </div>
        );
      },
    },
    {
      id: 'last_active',
      header: 'Last Active',
      accessorFn: (row) => row.last_active,
      cell: ({ row }) => {
        const data = getRowData(row);
        return (
          <div className="text-sm text-gray-500">
            {data.last_active ? formatDistanceToNow(new Date(data.last_active), { addSuffix: true }) : 'Never'}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const data = getRowData(row);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(data.id)}
              >
                Copy organization ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View organization</DropdownMenuItem>
              <DropdownMenuItem>Edit organization</DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onSelect={(e) => {
                  e.preventDefault();
                  setOrganizationToDelete(data);
                  setIsDeleteDialogOpen(true);
                }}
              >
                Delete organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-medium">Organizations</CardTitle>
              <CardDescription>Manage all organizations in the system</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  className="pl-9 w-[200px] lg:w-[300px]"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="whitespace-nowrap">
                    {statusFilter && statusFilter !== 'all' ? `Status: ${statusFilter}` : 'Filter by status'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleStatusFilterChange('all')}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilterChange('active')}>
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilterChange('trial')}>
                    Trial
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilterChange('suspended')}>
                    Suspended
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilterChange('inactive')}>
                    Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Organization
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && organizations.length === 0 ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-muted p-4 rounded-full mb-4">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No organizations found</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {searchQuery || (statusFilter && statusFilter !== 'all')
                  ? 'Try adjusting your search or filter criteria'
                  : 'Get started by adding a new organization'}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Organization
              </Button>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={organizations}
              isLoading={loading}
              error={null}
              pageIndex={pagination.pageIndex}
              pageSize={pagination.pageSize}
              onPaginationChange={handlePaginationChange}
              pageCount={Math.ceil(totalItems / pagination.pageSize)}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="px-1">
            <DialogTitle>Create Organization</DialogTitle>
            <DialogDescription>
              Add a new organization to the platform. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateOrganization)} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Inc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Slug *</FormLabel>
                        <FormControl>
                          <div className="flex items-center">
                            <span className="text-sm text-muted-foreground mr-2 whitespace-nowrap">
                              {typeof window !== 'undefined' ? window.location.hostname.split('.')[0] : 'app'}.example.com/
                            </span>
                            <Input placeholder="acme-inc" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input placeholder="contact@example.com" type="email" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} value={field.value || ''} />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Include https:// in the URL
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="trial">Trial</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="max_users"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Users</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="plan_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subscription Plan</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedPlanId(value);
                            form.setValue('plan_duration', '');
                          }}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a plan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subscriptionPlans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id.toString()}>
                                {plan.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />



                {isValidPlanId(selectedPlanId) && (
                  <div className="rounded-lg border p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">
                          {getSelectedPlan()?.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {getSelectedPlan()?.description}
                        </p>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="plan_duration"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Billing Cycle</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {isValidPlanId(selectedPlanId) && planDurations[selectedPlanId]?.map((duration) => {
                                const durationId = duration.id.toString();
                                return (
                                  <SelectItem 
                                    key={durationId}
                                    value={durationId}
                                  >
                                    {duration.duration_months} month{duration.duration_months > 1 ? 's' : ''} - 
                                    ${(typeof duration.price === 'string' ? parseFloat(duration.price) : duration.price).toFixed(2)}
                                    {Number(duration.discount_percentage || 0) > 0 && 
                                      ` (Save ${duration.discount_percentage}%)`}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>
              <FormField
                control={form.control}
                name="max_storage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Storage (GB)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description of the organization..."
                        className="resize-none min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="pt-4 border-t mt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Organization</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the organization "{organizationToDelete?.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={async () => {
              if (!organizationToDelete) return;
              
              try {
                setIsDeleting(true);
                await deleteOrganization(organizationToDelete.id);
                toast({
                  title: 'Success',
                  description: 'Organization deleted successfully',
                });
                
                // Refresh the organizations list
                const orgs = await fetchOrganizations();
                setOrganizations(orgs.organizations);
                
                setIsDeleteDialogOpen(false);
                setOrganizationToDelete(null);
              } catch (error) {
                console.error('Error deleting organization:', error);
                toast({
                  title: 'Error',
                  description: error instanceof Error ? error.message : 'Failed to delete organization',
                  variant: 'destructive',
                });
              } finally {
                setIsDeleting(false);
              }
            }}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
</>
);
};
