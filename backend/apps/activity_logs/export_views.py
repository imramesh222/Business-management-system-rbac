import csv
import json
from datetime import datetime
from io import StringIO, BytesIO
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q

from .models import ActivityLog, ActivityType
from ..users.permissions import IsSuperAdmin

class ExportActivityLogsView(APIView):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def get(self, request, *args, **kwargs):
        """
        Export activity logs in the specified format (csv, pdf, or json).
        """
        format_type = request.query_params.get('format', 'csv').lower()
        
        # Get the base queryset
        queryset = ActivityLog.objects.all().select_related('user')
        
        # Apply filters
        user_id = request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
            
        activity_type = request.query_params.get('activity_type')
        if activity_type in dict(ActivityType.choices):
            queryset = queryset.filter(activity_type=activity_type)
            
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__username__icontains=search) |
                Q(user__email__icontains=search) |
                Q(details__icontains=search) |
                Q(object_type__icontains=search) |
                Q(ip_address__icontains=search)
            )
        
        # Order by most recent first
        queryset = queryset.order_by('-created_at')
        
        # Call the appropriate export method
        if format_type == 'csv':
            return self.export_to_csv(queryset)
        elif format_type == 'pdf':
            return self.export_to_pdf(queryset)
        elif format_type == 'json':
            return self.export_to_json(queryset)
        else:
            return Response(
                {'error': 'Unsupported format. Use csv, pdf, or json.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def export_to_csv(self, queryset):
        response = HttpResponse(content_type='text/csv')
        filename = f'activity_logs_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Timestamp', 'User', 'Activity Type', 'Object Type', 'Object ID', 
            'Details', 'IP Address', 'User Agent'
        ])
        
        for log in queryset:
            writer.writerow([
                log.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                log.user.email if log.user else 'System',
                log.get_activity_type_display(),
                log.object_type,
                log.object_id or '',
                log.details,
                log.ip_address or '',
                log.user_agent or ''
            ])
        
        return response
    
    def export_to_pdf(self, queryset):
        response = HttpResponse(content_type='application/pdf')
        filename = f'activity_logs_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        
        # Prepare data
        data = [['Timestamp', 'User', 'Activity', 'Object', 'Details']]
        
        for log in queryset:
            data.append([
                log.created_at.strftime('%Y-%m-%d %H:%M'),
                log.user.email if log.user else 'System',
                log.get_activity_type_display(),
                f"{log.object_type} ({log.object_id})" if log.object_id else log.object_type or '',
                log.details[:100] + '...' if len(log.details) > 100 else log.details
            ])
        
        # Create table
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        # Add table to elements and build PDF
        elements.append(table)
        doc.build(elements)
        
        # Get PDF content and write to response
        pdf = buffer.getvalue()
        buffer.close()
        response.write(pdf)
        
        return response
    
    def export_to_json(self, queryset):
        data = []
        for log in queryset:
            data.append({
                'timestamp': log.created_at.isoformat(),
                'user': log.user.email if log.user else 'System',
                'activity_type': log.get_activity_type_display(),
                'object_type': log.object_type,
                'object_id': log.object_id,
                'details': log.details,
                'ip_address': log.ip_address,
                'user_agent': log.user_agent
            })
        
        response = HttpResponse(json.dumps(data, indent=2), content_type='application/json')
        filename = f'activity_logs_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
