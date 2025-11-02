import { apiGet, apiPost, apiPut, apiDelete } from './apiService';
import { API_URL } from '@/constant';

export interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  status_display: string;
  payment_method: 'credit_card' | 'debit_card' | 'bank_transfer' | 'paypal' | 'other';
  payment_method_display: string;
  transaction_id?: string;
  client: string;
  client_name: string;
  project?: string;
  project_title?: string;
  verified: boolean;
  verified_by?: string;
  verified_by_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  verified_at?: string;
  completed_at?: string;
}

export interface PaymentCreate {
  amount: number;
  currency: string;
  payment_method: string;
  transaction_id?: string;
  client: string;
  project?: string;
  notes?: string;
}

export interface PaymentVerify {
  verified: boolean;
  notes?: string;
}

export interface PaymentStats {
  total_payments: number;
  pending: number;
  completed: number;
  failed: number;
  verified: number;
  unverified: number;
  total_amount: number;
}

/**
 * Fetch all payments
 */
export async function fetchPayments(): Promise<Payment[]> {
  try {
    const response = await apiGet(`${API_URL}/payments/payments/`);
    return response.data || response;
  } catch (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }
}

/**
 * Fetch a single payment by ID
 */
export async function fetchPaymentById(id: string): Promise<Payment> {
  try {
    const response = await apiGet(`${API_URL}/payments/payments/${id}/`);
    return response.data || response;
  } catch (error) {
    console.error(`Error fetching payment ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new payment
 */
export async function createPayment(data: PaymentCreate): Promise<Payment> {
  try {
    const response = await apiPost(`${API_URL}/payments/payments/`, data);
    return response.data || response;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
}

/**
 * Update a payment
 */
export async function updatePayment(id: string, data: Partial<PaymentCreate>): Promise<Payment> {
  try {
    const response = await apiPut(`${API_URL}/payments/payments/${id}/`, data);
    return response.data || response;
  } catch (error) {
    console.error(`Error updating payment ${id}:`, error);
    throw error;
  }
}

/**
 * Delete a payment
 */
export async function deletePayment(id: string): Promise<void> {
  try {
    await apiDelete(`${API_URL}/payments/payments/${id}/`);
  } catch (error) {
    console.error(`Error deleting payment ${id}:`, error);
    throw error;
  }
}

/**
 * Verify or reject a payment
 */
export async function verifyPayment(id: string, data: PaymentVerify): Promise<Payment> {
  try {
    const response = await apiPost(`${API_URL}/payments/payments/${id}/verify/`, data);
    return response.data || response;
  } catch (error) {
    console.error(`Error verifying payment ${id}:`, error);
    throw error;
  }
}

/**
 * Fetch pending payments
 */
export async function fetchPendingPayments(): Promise<Payment[]> {
  try {
    const response = await apiGet(`${API_URL}/payments/payments/pending/`);
    return response.data || response;
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    throw error;
  }
}

/**
 * Fetch payment statistics
 */
export async function fetchPaymentStats(): Promise<PaymentStats> {
  try {
    const response = await apiGet(`${API_URL}/payments/payments/stats/`);
    return response.data || response;
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    throw error;
  }
}
