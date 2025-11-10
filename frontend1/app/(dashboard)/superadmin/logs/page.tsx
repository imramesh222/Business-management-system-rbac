
'use client';

import { AuditLogs } from '@/components/dashboard/AuditLogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LogsPage() {
  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <AuditLogs />
        </CardContent>
      </Card>
    </div>
  );
}
