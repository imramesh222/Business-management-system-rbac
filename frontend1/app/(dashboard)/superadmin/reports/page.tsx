'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, BarChart3, Users, CreditCard, Activity, Loader2 } from 'lucide-react';
import { generateReport } from '@/services/reportService';
import { toast } from '@/components/ui/use-toast';

export default function ReportsPage() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [customReportLoading, setCustomReportLoading] = useState(false);
  const [reportParams, setReportParams] = useState<{
    type: string;
    dateRange: string;
    format: 'pdf' | 'csv' | 'xlsx';
  }>({
    type: 'user-activity',
    dateRange: '7',
    format: 'pdf',
  });

  const reports = [
    { 
      id: 'user-activity' as const,
      title: 'User Activity Report',
      description: 'Detailed logs of user activities across the platform',
      icon: <Users className="h-5 w-5 text-blue-600" />,
      lastGenerated: '2 hours ago',
    },
    { 
      id: 'billing' as const,
      title: 'Billing Report',
      description: 'Revenue, subscriptions, and payment history',
      icon: <CreditCard className="h-5 w-5 text-green-600" />,
      lastGenerated: '1 day ago',
    },
    { 
      id: 'system-performance' as const,
      title: 'System Performance',
      description: 'Server metrics and system health',
      icon: <Activity className="h-5 w-5 text-purple-600" />,
      lastGenerated: '4 hours ago',
    },
  ];

  const handleDownload = async (reportId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, [reportId]: true }));
      
      console.log('Downloading report:', reportId);
      
      const params = {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 7 days
        endDate: new Date().toISOString(),
      };
      
      console.log('Sending download request with params:', params);
      
      await generateReport(reportId as any, 'pdf', params);
      
      toast({
        title: 'Success',
        description: 'Your report is being generated and will download shortly.',
      });
    } catch (error) {
      console.error('Error downloading report:', error);
      
      let errorMessage = 'Failed to download report. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const handleCustomReport = async () => {
    try {
      setCustomReportLoading(true);
      
      // Log the report generation attempt
      console.log('Generating report with params:', {
        type: reportParams.type,
        format: reportParams.format,
        dateRange: reportParams.dateRange
      });

      const params = {
        startDate: new Date(Date.now() - parseInt(reportParams.dateRange) * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      };
      
      console.log('Sending request with:', {
        reportType: reportParams.type,
        format: reportParams.format,
        ...params
      });
      
      await generateReport(reportParams.type as any, reportParams.format as any, params);
      
      toast({
        title: 'Success',
        description: 'Your report is being generated and will download shortly.',
      });
    } catch (error) {
      console.error('Error generating custom report:', error);
      
      let errorMessage = 'Failed to generate report. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setCustomReportLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="mt-2 text-gray-600">Generate and view system reports</p>
        </div>
        <Button 
          variant="outline"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  {report.icon}
                </div>
                <div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                  <CardDescription>{report.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Last generated: {report.lastGenerated}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDownload(report.id)}
                  disabled={loadingStates[report.id]}
                >
                  {loadingStates[report.id] ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custom Report Generator</CardTitle>
          <CardDescription>Create a custom report with specific parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={reportParams.type}
                  onChange={(e) => setReportParams(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="user-activity">User Activity</option>
                  <option value="billing">Billing</option>
                  <option value="system-performance">System Performance</option>
                  <option value="audit-logs">Audit Logs</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={reportParams.dateRange}
                  onChange={(e) => setReportParams(prev => ({ ...prev, dateRange: e.target.value }))}
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <select 
                  className="w-full p-2 border rounded-md"
                  value={reportParams.format}
                  onChange={(e) => setReportParams(prev => ({ 
                    ...prev, 
                    format: e.target.value as 'pdf' | 'csv' | 'xlsx' 
                  }))}
                >
                  <option value="pdf">PDF</option>
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleCustomReport}
                disabled={customReportLoading}
              >
                {customReportLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
