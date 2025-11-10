from django.urls import path
from .views import generate_report

app_name = 'reports'

urlpatterns = [
    path('generate/', generate_report, name='generate-report'),
]
