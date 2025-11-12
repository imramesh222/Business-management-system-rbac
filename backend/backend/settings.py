import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Site settings
SITE_NAME = os.getenv('SITE_NAME', 'PROJECT-K')

BASE_DIR = Path(__file__).resolve().parent.parent

# Security
# ========
DEBUG = os.getenv('DEBUG', 'True') == 'True'
SECRET_KEY = os.getenv('SECRET_KEY', 'SuRkXMHtX1PchYGgci/jyFhYzlz0Fsx3UiV+oR1J387wXAcVsDZ+++nA')

# Hosts & Security
# ===============
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,192.168.101.4').split(',')

# SSL/HTTPS settings
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False') == 'True'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https') if os.getenv('USE_HTTPS') == 'True' else None
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False') == 'True'
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False') == 'True'

# CORS settings
# ============
CORS_ALLOW_ALL_ORIGINS = os.getenv('CORS_ALLOW_ALL_ORIGINS', 'True') == 'True'
CORS_ALLOW_CREDENTIALS = os.getenv('CORS_ALLOW_CREDENTIALS', 'True') == 'True'
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.101.4:3000'
]

# Application definition
# =====================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party apps
    'corsheaders',
    'rest_framework',
    'drf_yasg',
    'channels',
    'django_celery_beat',
    'django_celery_results',
    'rest_framework_simplejwt.token_blacklist',
    
    # Local apps
    'apps.reports',
    'apps.users',
    'apps.organization',
    'apps.clients',
    'apps.projects',
    'apps.payments',
    'apps.tasks',
    'apps.support',
    'apps.notifications',
    'apps.dashboard',
    'apps.activity_logs',
    'apps.messaging',
    'chat',
]

# Channels and ASGI configuration
ASGI_APPLICATION = 'backend.asgi.application'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}

# Celery Configuration
CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'
CELERY_RESULT_BACKEND = 'django-db'
CELERY_CACHE_BACKEND = 'django-cache'
CELERY_ACCEPT_CONTENT = ['application/json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Django REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',  # Should be as high as possible, especially before CommonMiddleware
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            BASE_DIR / 'templates',
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.request',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'
ASGI_APPLICATION = 'backend.routing.application'  # For Channels

# Database Configuration
# =====================
DATABASES = {
    'default': {
        'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.postgresql'),
        'NAME': os.getenv('DB_NAME', 'rbac_db'),
        'USER': os.getenv('DB_USER', 'postgres'),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
}

# Authentication backends
AUTHENTICATION_BACKENDS = [
    'apps.users.backends.CustomAuthBackend',
    'django.contrib.auth.backends.ModelBackend',  # Fallback to default backend
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Email Configuration
# =================
EMAIL_ENABLED = os.getenv('EMAIL_ENABLED', 'True') == 'True'
SEND_WELCOME_EMAIL = os.getenv('SEND_WELCOME_EMAIL', 'True') == 'True'
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend' if EMAIL_ENABLED else 'django.core.mail.backends.console.EmailBackend'
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@example.com')
REPLY_TO_EMAIL = os.getenv('REPLY_TO_EMAIL', DEFAULT_FROM_EMAIL)
SERVER_EMAIL = os.getenv('SERVER_EMAIL', DEFAULT_FROM_EMAIL)
EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', 10))

# Frontend URL for email templates
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# JWT Configuration
# =================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', '60'))
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME_DAYS', '7'))
    ),
    'ROTATE_REFRESH_TOKENS': os.getenv('JWT_ROTATE_REFRESH_TOKENS', 'False') == 'True',
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(
        minutes=int(os.getenv('JWT_SLIDING_TOKEN_LIFETIME_MINUTES', '5'))
    ),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(
        days=int(os.getenv('JWT_SLIDING_TOKEN_REFRESH_LIFETIME_DAYS', '1'))
    ),
    'TOKEN_OBTAIN_SERIALIZER': 'apps.users.serializers.CustomTokenObtainPairSerializer',
}

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# Channels
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.backend.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('127.0.0.1', 6379)],
        },
    },
}

# Celery
CELERY_BROKER_URL = 'redis://127.0.0.1:6379/0'
CELERY_RESULT_BACKEND = 'redis://127.0.0.1:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
AUTH_USER_MODEL = 'users.User'

# Email Configuration
# =================
# Force SMTP email backend
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
print(f"\033[92m\nUsing SMTP email backend - emails will be sent via {os.getenv('EMAIL_HOST', 'smtp.gmail.com')}\033[0m")

# SMTP Settings
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
EMAIL_USE_SSL = False
EMAIL_TIMEOUT = 30

# Email Sender Settings
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)
REPLY_TO_EMAIL = os.getenv('REPLY_TO_EMAIL', EMAIL_HOST_USER)
SERVER_EMAIL = os.getenv('SERVER_EMAIL', EMAIL_HOST_USER)

# Email Notification Settings
SEND_WELCOME_EMAIL = True
SUPPRESS_WELCOME_EMAIL = False

# Frontend URL for email links
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

# Timeout in seconds for blocking operations like the connection attempt
EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', '10'))


# CORS and CSRF Configuration
# ============================

# CORS Settings
# -------------
CORS_ALLOW_CREDENTIALS = os.getenv('CORS_ALLOW_CREDENTIALS', 'True') == 'True'
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_EXPOSE_HEADERS = os.getenv('CORS_EXPOSE_HEADERS', 'Content-Type,X-CSRFToken').split(',')
CORS_PREFLIGHT_MAX_AGE = int(os.getenv('CORS_PREFLIGHT_MAX_AGE', '86400'))  # 24 hours

# CSRF Protection has been disabled

# Session Settings
# ----------------
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'  # 'Lax' is sufficient for most cases
SESSION_COOKIE_SECURE = False    # Set to True in production with HTTPS

# Security Settings
# ----------------
# Security settings that are different in development vs production
SECURE_SETTINGS = {
    'SECURE_SSL_REDIRECT': os.getenv('SECURE_SSL_REDIRECT', str(not DEBUG)) == 'True',
    'SESSION_COOKIE_SECURE': os.getenv('SESSION_COOKIE_SECURE', str(not DEBUG)) == 'True',
    'CSRF_COOKIE_SECURE': os.getenv('CSRF_COOKIE_SECURE', str(not DEBUG)) == 'True',
    'SECURE_BROWSER_XSS_FILTER': os.getenv('SECURE_BROWSER_XSS_FILTER', 'True') == 'True',
    'SECURE_CONTENT_TYPE_NOSNIFF': os.getenv('SECURE_CONTENT_TYPE_NOSNIFF', 'True') == 'True',
    'X_FRAME_OPTIONS': os.getenv('X_FRAME_OPTIONS', 'DENY'),
    'SECURE_HSTS_SECONDS': int(os.getenv('SECURE_HSTS_SECONDS', '0' if DEBUG else '31536000')),
    'SECURE_HSTS_INCLUDE_SUBDOMAINS': os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', str(not DEBUG)) == 'True',
    'SECURE_HSTS_PRELOAD': os.getenv('SECURE_HSTS_PRELOAD', str(not DEBUG)) == 'True',
}

# Apply security settings
for setting, value in SECURE_SETTINGS.items():
    globals()[setting] = value

# Proxy/SSL Settings
# ------------------
# Configure this if you're behind a proxy/load balancer
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https' if not DEBUG else 'http')

# Channel Layers Configuration (Redis)
# Keep only one CHANNEL_LAYERS configuration
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}

# For Swagger UI
SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'JWT': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'description': 'Enter your JWT token in the format: Bearer <token>'
        }
    },
    'USE_SESSION_AUTH': False,
    'JSON_EDITOR': True,
    'DEFAULT_MODEL_RENDERING': 'example',
    'DEFAULT_MODEL_DEPTH': -1,
    'DEFAULT_AUTO_SCHEMA_CLASS': 'drf_yasg.inspectors.SwaggerAutoSchema',
    'DEFAULT_FILTER_INSPECTORS': [
        'drf_yasg.inspectors.CoreAPICompatInspector',
    ],
    'DEFAULT_PAGINATOR_INSPECTORS': [
        'drf_yasg.inspectors.DjangoRestResponsePagination',
        'drf_yasg.inspectors.CoreAPICompatInspector',
    ],
    'DEFAULT_INFO': 'backend.urls.swagger_info',
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

# Disable CSRF for API views
CSRF_COOKIE_HTTPONLY = False  # Allow JavaScript to read the CSRF token
CSRF_USE_SESSIONS = False