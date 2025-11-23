// app/(dashboard)/organization/page.tsx
import { redirect } from 'next/navigation';

// Redirect to the organization dashboard
export default function OrganizationPage() {
  redirect('/organization/dashboard');
}