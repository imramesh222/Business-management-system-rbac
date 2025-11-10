from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser
from rest_framework.decorators import api_view, permission_classes
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from datetime import datetime
import json

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_report(request):
    try:
        # Handle both form data and JSON
        if request.content_type == 'application/json':
            data = request.data
        else:
            data = request.POST.dict()
            if not data:
                data = json.loads(request.body)

        report_type = data.get('reportType')
        format_type = data.get('format', 'pdf')
        start_date = data.get('startDate')
        end_date = data.get('endDate')

        if not report_type:
            return Response(
                {'error': 'Report type is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if format_type.lower() == 'pdf':
            return _generate_pdf(report_type, start_date, end_date)
        else:
            return Response(
                {'error': 'Unsupported format'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    except json.JSONDecodeError:
        return Response(
            {'error': 'Invalid JSON data'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def _generate_pdf(report_type, start_date, end_date):
    # Create a file-like buffer to receive PDF data
    buffer = io.BytesIO()

    # Create the PDF object, using the buffer as its "file."
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Draw things on the PDF
    p.drawString(100, 750, f"Report: {report_type}")
    p.drawString(100, 730, f"Date Range: {start_date} to {end_date}")
    p.drawString(100, 710, f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Close the PDF object cleanly, and we're done.
    p.showPage()
    p.save()

    # File response with the PDF
    buffer.seek(0)
    response = HttpResponse(buffer, content_type='application/pdf')
    filename = f"{report_type}_report_{datetime.now().strftime('%Y%m%d')}.pdf"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response
