"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include, re_path
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenVerifyView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from apps.users.serializers import CustomTokenObtainPairSerializer

# Custom TokenVerifyView with Swagger documentation
class TokenVerifyViewWithSchema(TokenVerifyView):
    @swagger_auto_schema(
        operation_description="Verify a token",
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            required=['token'],
            properties={
                'token': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description='The token to verify',
                ),
            },
        ),
        responses={
            status.HTTP_200_OK: openapi.Response(
                description='Token is valid',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'detail': openapi.Schema(
                            type=openapi.TYPE_STRING,
                            example='Token is valid',
                        ),
                    },
                ),
            ),
            status.HTTP_401_UNAUTHORIZED: openapi.Response(
                description='Token is invalid or expired',
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'detail': openapi.Schema(
                            type=openapi.TYPE_STRING,
                            example='Token is invalid or expired',
                        ),
                        'code': openapi.Schema(
                            type=openapi.TYPE_STRING,
                            example='token_not_valid',
                        ),
                    },
                ),
            ),
        },
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

# CORS middleware view
@require_http_methods(["OPTIONS"])
def cors_options_view(request, *args, **kwargs):    
    response = JsonResponse({}, status=200)
    response['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
    response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken, Authorization, X-Requested-With'
    response['Access-Control-Allow-Credentials'] = 'true'
    response['Access-Control-Max-Age'] = '86400'
    return response

# CSRF Token View
@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({'detail': 'CSRF cookie set'})

# Swagger API Info
swagger_info = openapi.Info(
    title="SAMPLE PROJECT API",
    default_version='v1',
    description="""
    # API Documentation for Sample Project
    
    This API provides endpoints for managing users, organizations, clients, projects, tasks, and more.
    
    ## Authentication
    
    This API uses JWT (JSON Web Tokens) for authentication. To authenticate your requests, include the following header:
    
    ```
    Authorization: Bearer <your_access_token>
    ```
    
    ### Obtaining Tokens
    
    1. **Login** - POST `/api/v1/token/` with `username` and `password` to get access and refresh tokens
    2. **Refresh Token** - POST `/api/v1/token/refresh/` with `refresh` token to get a new access token
    3. **Verify Token** - POST `/api/v1/token/verify/` to verify a token
    """,
    terms_of_service="https://www.google.com/policies/terms/",
    contact=openapi.Contact(email="contact@example.com"),
    license=openapi.License(name="BSD License"),
)

schema_view = get_schema_view(
   swagger_info,
   public=True,
   permission_classes=(permissions.AllowAny,),
)

# Add CSRF-exempt Swagger URLs
urlpatterns = [
    path('admin/', admin.site.urls),
    path('swagger<format>/', schema_view.without_ui(cache_timeout=0), name='schema-json'),
    path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    path('redoc/', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),
    
    # CORS and CSRF endpoints
    path('api/v1/csrf/', get_csrf_token, name='get-csrf'),
    
    # JWT Authentication
    path('api/v1/token/', TokenObtainPairView.as_view(
        serializer_class=CustomTokenObtainPairSerializer
    ), name='token_obtain_pair'),
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/v1/token/verify/', TokenVerifyViewWithSchema.as_view(), name='token_verify'),
    
    # All other API endpoints - user registration is handled in apps/users/urls.py
    path('api/v1/users/', include('apps.users.urls')),  # Includes user registration at /api/v1/users/register/
    path('api/v1/org/', include('apps.organization.urls')),  # Organization endpoints
    path('api/v1/clients/', include('apps.clients.urls')),
    path('api/v1/projects/', include('apps.projects.urls')),
    path('api/v1/tasks/', include('apps.tasks.urls')),
    path('api/v1/support/', include('apps.support.urls')),
    path('api/v1/notifications/', include('apps.notifications.urls')),
    path('api/v1/payments/', include('apps.payments.urls')),  # Payment endpoints
    path('api/v1/dashboard/', include('apps.dashboard.urls')),  # Dashboard endpoints
    
    # Catch-all OPTIONS handler - must come after all other API routes
    re_path(r'^api/v1/.*$', cors_options_view),  # Catch-all for OPTIONS
]

if settings.DEBUG:
    urlpatterns += [
        path('swagger/', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    ]