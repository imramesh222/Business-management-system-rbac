'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPost, apiPut } from '@/services/apiService';

// Form validation schema
const projectFormSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  status: z.enum(['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high']),
  client_id: z.string().min(1, 'Client is required'),
  project_manager_id: z.string().optional(),
  start_date: z.date({
    required_error: 'Start date is required',
  }),
  end_date: z.date().nullable(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  organization_role?: string;
  organization_id?: string;
  organization_name?: string;
  // Add these lines to support nested user objects
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ProjectFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: any;
  organizationId: string;
  isSuperAdmin?: boolean;
  isOrgAdmin?: boolean;
  currentUser?: User | null;
}

export function ProjectForm({ 
  onSuccess, 
  onCancel, 
  initialData, 
  organizationId: propOrganizationId, 
  isSuperAdmin: propIsSuperAdmin = false,
  isOrgAdmin: propIsOrgAdmin = false,
  currentUser: propCurrentUser 
}: ProjectFormProps) {
  const { toast } = useToast?.() || { toast: (props: any) => console.log('Toast:', props) };
  const router = useRouter();
  const { user: authUser } = useAuth();
  
  // Use props with fallback to auth context
  const currentUser = propCurrentUser || authUser;
  const organizationId = propOrganizationId || currentUser?.organization_id;
  const isSuperAdmin = propIsSuperAdmin || currentUser?.role === 'superadmin';
  const isOrgAdmin = propIsOrgAdmin || currentUser?.organization_role === 'admin';
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projectManagers, setProjectManagers] = useState<User[]>([]);
  
  // Debug mount
  useEffect(() => {
    console.log('ProjectForm mounted with:', {
      propOrganizationId,
      propIsSuperAdmin,
      propIsOrgAdmin,
      propCurrentUser,
      authUser,
      derivedValues: {
        currentUser,
        organizationId,
        isSuperAdmin,
        isOrgAdmin
      }
    });
  }, [propOrganizationId, propIsSuperAdmin, propIsOrgAdmin, propCurrentUser, authUser, currentUser, organizationId, isSuperAdmin, isOrgAdmin]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      status: initialData?.status || 'planning',
      priority: initialData?.priority || 'medium',
      start_date: initialData?.start_date ? new Date(initialData.start_date) : new Date(),
      end_date: initialData?.end_date ? new Date(initialData.end_date) : null,
      client_id: initialData?.client_id || '',
      project_manager_id: (!isSuperAdmin && !isOrgAdmin && currentUser?.id) ? currentUser.id : (initialData?.project_manager_id || '')
    },
  });

  // Debug logs
  useEffect(() => {
    if (organizationId) {
      console.log('ProjectForm debug:', {
        isSuperAdmin,
        isOrgAdmin,
        hasProjectManagers: projectManagers.length > 0,
        organizationId,
        currentUser: {
          id: currentUser?.id,
          role: currentUser?.role,
          organization_role: currentUser?.organization_role,
          organization_id: currentUser?.organization_id
        },
        formValues: form.getValues()
      });
    }
  }, [isSuperAdmin, isOrgAdmin, projectManagers, organizationId, currentUser, form]);

  // Fetch clients and project managers
  useEffect(() => {
    if (!organizationId) {
      console.error('Cannot fetch data: organizationId is not defined');
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching data for organization:', organizationId);
        
        // Fetch clients
        const clientsResponse = await apiGet(`/clients/`);
        // Ensure we have an array, even if the response is an object with a results property
        const clientsData = Array.isArray(clientsResponse) ? clientsResponse : (clientsResponse?.results || []);
        console.log('Fetched clients:', clientsData);
        setClients(clientsData);

        // If super admin or org admin, fetch project managers
        if (isSuperAdmin || isOrgAdmin) {
          console.log('Fetching project managers for org:', organizationId);
          const pmsResponse = await apiGet(`/org/organizations/${organizationId}/members/?role=project_manager`);
          // Debug logging
          console.log('Project Managers API Response:', pmsResponse);
          // Ensure we have an array, even if the response is an object with a results property
          const pmsData = Array.isArray(pmsResponse) ? pmsResponse : (pmsResponse?.results || []);
          console.log('Processed Project Managers Data:', pmsData);
          setProjectManagers(pmsData);
        }
      } catch (error) {
        console.error('Error fetching form data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load form data',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [organizationId, isSuperAdmin, isOrgAdmin, toast]);

  const startDate = form.watch('start_date');
  const endDate = form.watch('end_date');


  const onSubmit = async (data: ProjectFormValues) => {
    if (!organizationId) {
      toast({
        title: 'Error',
        description: 'Organization ID is required',
        variant: 'destructive',
      });
      return;
    }
    
    const url = initialData ? `/projects/${initialData.id}` : '/projects';
    const payload = {
      ...data,
      organization_id: organizationId,
      // If not super admin and not org admin, set current user as project manager
      project_manager_id: (!isSuperAdmin && !isOrgAdmin && currentUser?.id) ? currentUser.id : data.project_manager_id,
      start_date: data.start_date.toISOString().split('T')[0],
      end_date: data.end_date ? data.end_date.toISOString().split('T')[0] : null,
    };
    
    console.log('Submitting project with payload:', payload);
    
    try {
      setIsSubmitting(true);
      const response = initialData 
        ? await apiPut(url, payload)
        : await apiPost(url, payload);
      toast({
        title: 'Success',
        description: `Project ${initialData ? 'updated' : 'created'} successfully`,
      });
      
      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error('Error saving project:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save project. Please try again.';
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{initialData ? 'Edit' : 'New'} Project</h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <div className="relative">
              <Input
                id="name"
                placeholder="Enter project name"
                {...form.register('name')}
                className={form.formState.errors.name ? 'border-red-500' : ''}
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client_id">Client</Label>
            <Select
              onValueChange={(value) => form.setValue('client_id', value)}
              value={form.watch('client_id') || ''}
            >
              <SelectTrigger className={form.formState.errors.client_id ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.client_id && (
              <p className="mt-1 text-sm text-red-500">{form.formState.errors.client_id.message}</p>
            )}
          </div>

          {/* Project Manager (for super admins and org admins) */}
          {(isSuperAdmin || isOrgAdmin) && (
            <div className="space-y-2">
              <Label htmlFor="project_manager_id">
                Project Manager
                {projectManagers.length === 0 && (
                  <span className="ml-2 text-sm text-yellow-600">
                    (No project managers found in this organization)
                  </span>
                )}
              </Label>
              {projectManagers.length > 0 ? (
                <Select
                  onValueChange={(value) => form.setValue('project_manager_id', value)}
                  value={form.watch('project_manager_id') || ''}
                >
                  <SelectTrigger className={form.formState.errors.project_manager_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select a project manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectManagers.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.user?.name || pm.user?.email || pm.email || `User ${pm.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border border-dashed p-4 text-sm text-gray-500">
                  No project managers available in this organization. Please add project managers first.
                </div>
              )}
              {form.formState.errors.project_manager_id && (
                <p className="mt-1 text-sm text-red-500">
                  {form.formState.errors.project_manager_id.message}
                </p>
              )}
            </div>
          )}

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              onValueChange={(value) => form.setValue('status', value as any)}
              defaultValue={form.getValues('status')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && form.setValue('start_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>End Date (Optional)</Label>
              {endDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setValue('end_date', null)}
                  className="h-6 px-2 text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate || undefined}
                  onSelect={(date) => date && form.setValue('end_date', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              onValueChange={(value) => form.setValue('priority', value as any)}
              defaultValue={form.getValues('priority')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Enter project description"
            className="min-h-[120px]"
            {...form.register('description')}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel || (() => router.back())}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Creating...
              </>
            ) : (
              'Create Project'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
