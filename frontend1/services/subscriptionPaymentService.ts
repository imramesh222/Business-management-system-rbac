import { apiGet, apiPost } from './apiService';
import { API_URL } from '@/constant';

export interface SubscriptionPayment {
  id: string;
  amount: string;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  status_display: string;
  payment_method: 'credit_card' | 'debit_card' | 'bank_transfer' | 'paypal' | 'other';
  payment_method_display: string;
  transaction_id?: string;
  payment_type: 'subscription';
  organization: string;
  organization_name: string;
  subscription?: string;
  subscription_plan?: {
    plan_name: string;
    duration_months: number;
    price: string;
  };
  verified: boolean;
  verified_by?: string;
  notes?: string;
  created_at: string;
  verified_at?: string;
  completed_at?: string;
}

export interface SubscriptionPaymentCreate {
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id?: string;
  organization: string;
  subscription?: string;
  notes?: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  durations: PlanDuration[];
}

export interface PlanDuration {
  id: number;
  duration_months: number;
  price: string;
  discount_percentage: string;
  is_default: boolean;
}

/**
 * Fetch all subscription payments
 */
export async function fetchSubscriptionPayments(): Promise<SubscriptionPayment[]> {
  try {
    const response = await apiGet(`${API_URL}/payments/payments/subscriptions/`);
    return response.data || response;
  } catch (error) {
    console.error('Error fetching subscription payments:', error);
    throw error;
  }
}

/**
 * Create a subscription payment
 */
export async function createSubscriptionPayment(data: SubscriptionPaymentCreate): Promise<SubscriptionPayment> {
  try {
    const response = await apiPost(`${API_URL}/payments/payments/subscriptions/create/`, data);
    return response.data || response;
  } catch (error) {
    console.error('Error creating subscription payment:', error);
    throw error;
  }
}

/**
 * Fetch available subscription plans
 */
export async function fetchSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const response = await apiGet(`${API_URL}/org/subscription-plans/`);
    return response.data || response;
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    throw error;
  }
}

/**
 * Get current organization subscription
 */
export async function getCurrentSubscription(organizationId: string) {
  try {
    const response = await apiGet(`${API_URL}/org/organizations/${organizationId}/subscription/`);
    return response.data || response;
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    throw error;
  }
}
