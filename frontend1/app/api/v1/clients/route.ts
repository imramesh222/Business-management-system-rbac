// app/api/v1/clients/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Verify the user has an organization ID
    if (!session.user.organization_id) {
      return new NextResponse('User is not associated with an organization', { 
        status: 400 
      });
    }

    // Add organization_id to the request payload
    const payload = {
      ...body,
      organization_id: session.user.organization_id
    };

    const response = await fetch(`${apiUrl}/api/v1/clients/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.access_token || session.user.token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Backend error:', errorData);
      return new NextResponse(
        errorData.detail || 'Failed to create client', 
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in API route:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}