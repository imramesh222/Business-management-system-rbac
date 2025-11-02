export enum OrganizationRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  PROJECT_MANAGER = 'project_manager',
  DEVELOPER = 'developer',
  SUPPORT = 'support',
  VERIFIER = 'verifier',
  SALESPERSON = 'salesperson',
  CLIENT = 'client',
}

export interface OrganizationMember {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: OrganizationRole;
  joinedAt: string;
  lastActive: string;
  status: 'active' | 'inactive' | 'suspended';
}

export interface OrganizationProject {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  progress: number;
  startDate: string;
  dueDate: string;
  members: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  budget: number;
  spent: number;
}

export interface OrganizationActivity {
  id: string;
  type: 'member' | 'project' | 'billing' | 'meeting' | 'system';
  action: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  targetId?: string;
  targetType?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface OrganizationMetrics {
  totalOrganizations: number;
  totalMembers: number;
  activeMembers: number;
  totalProjects: number;
  activeProjects: number;
  pendingTasks: number;
  completedTasks: number;
  monthlyRevenue: number;
  totalRevenue: number;
  pendingInvoices: number;
  overdueInvoices: number;
  storageUsage: number;
  storageLimit: number;
  teamProductivity: number;
  memberGrowth: number;
  projectCompletionRate: number;
  memberActivity: Array<{
    date: string;
    active: number;
    new: number;
  }>;
  projectStatus: Array<{
    status: string;
    count: number;
    color: string;
  }>;
}

export enum OrganizationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TRIAL = 'trial',
  SUSPENDED = 'suspended',
}

export enum BillingPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export interface SubscriptionPlanDetails {
  id: number;
  name: string;
  description: string;
}

export interface SubscriptionDurationDetails {
  months: number;
  price: number;
  discount_percentage: number;
}

export interface OrganizationSubscriptionDetails {
  id: number;
  plan_details: {
    plan: SubscriptionPlanDetails;
    duration: SubscriptionDurationDetails;
  };
  start_date: string;
  end_date: string;
  is_active: boolean;
  auto_renew: boolean;
}

export interface OrganizationBase {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  members_count?: number;
  projects_count?: number;
}

// Define a simpler type for the data property to avoid circular references
type OrganizationData = Omit<Organization, 'data'>;

export interface Organization extends OrganizationBase {
  data?: OrganizationData; // Make data optional to avoid circular references
  description?: string;
  logo_url?: string;
  website?: string;
  contact_email?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  timezone?: string;
  settings?: Record<string, any>;
  status: OrganizationStatus;
  plan: BillingPlan;
  subscription?: OrganizationSubscriptionDetails;
  member_count: number;
  storage_used: number;
  storage_limit: number;
  last_active: string;
  owner: string;
}

export type OrganizationListItem = Organization;

export interface OrganizationDashboardData {
  metrics: OrganizationMetrics;
  recentActivities: OrganizationActivity[];
  projects: OrganizationProject[];
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    projectId: string;
    projectName: string;
    type: 'task' | 'milestone' | 'deliverable' | 'payment';
    status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  }>;
  teamMembers: Array<{
    id: string;
    name: string;
    email: string;
    role: OrganizationRole;
    avatar?: string;
    lastActive: string;
    status: 'online' | 'offline' | 'away';
    currentTask?: {
      id: string;
      title: string;
      projectId: string;
      projectName: string;
    };
  }>;
}
