# 🚀 ProjectK Setup Guide

## Critical Fixes Applied

### ✅ Fixed Issues:
1. **Added missing dependencies** to `requirements.txt`:
   - `channels==4.0.0` - WebSocket support
   - `channels-redis==4.1.0` - Redis backend for Channels
   - `daphne==4.0.0` - ASGI server
   - `django-filter==23.5` - Filtering support
   - `django-model-utils==4.3.1` - Model utilities

2. **Fixed `backend/settings.py`**:
   - Removed duplicate `import os`
   - Removed duplicate `FRONTEND_URL` configuration
   - Removed hardcoded email credentials (security fix)

3. **Fixed `backend/asgi.py`**:
   - Added HTTP protocol handler
   - Properly initialized Django ASGI app

4. **Created `backend/routing.py`**:
   - Main routing configuration for WebSocket support

---

## 📋 Prerequisites

Before running the project, ensure you have the following installed:

### Required Services:
1. **Python 3.11+**
2. **PostgreSQL** (for database)
3. **Redis** (for Celery and Channels)
4. **Node.js 16+** (for frontend)

---

## 🔧 Installation Steps

### 1. Backend Setup

#### Step 1: Navigate to backend directory
```bash
cd /Users/rameshrawat/projectK/backend
```

#### Step 2: Create and activate virtual environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Mac/Linux
```

#### Step 3: Install dependencies
```bash
pip install -r requirements.txt
```

#### Step 4: Setup PostgreSQL Database
```bash
# Start PostgreSQL (if not running)
brew services start postgresql

# Create database
psql postgres
CREATE DATABASE rbac_db;
CREATE USER postgres WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE rbac_db TO postgres;
\q
```

#### Step 5: Configure Environment Variables
```bash
# Copy example env file
cp .env.example .env

# Edit .env file with your credentials
nano .env
```

**Required .env variables:**
```env
# Database
DB_PASSWORD=your_actual_db_password

# Email (for development, use console backend)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Or leave empty to skip email functionality during development
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
```

#### Step 6: Run Migrations
```bash
python3 manage.py migrate
```

#### Step 7: Create Superuser
```bash
python3 manage.py createsuperuser
```

---

### 2. Start Required Services

You'll need **5 terminal windows** for the backend:

#### Terminal 1: Redis Server
```bash
redis-server
```

#### Terminal 2: Django Development Server
```bash
cd /Users/rameshrawat/projectK/backend
source venv/bin/activate
python3 manage.py runserver
```

#### Terminal 3: Celery Worker
```bash
cd /Users/rameshrawat/projectK/backend
source venv/bin/activate
celery -A backend worker --loglevel=info
```

#### Terminal 4: Celery Beat (Scheduler)
```bash
cd /Users/rameshrawat/projectK/backend
source venv/bin/activate
celery -A backend beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

#### Terminal 5: Flower (Optional - Task Monitoring)
```bash
cd /Users/rameshrawat/projectK/backend
source venv/bin/activate
celery -A backend flower --persistent --inspect_timeout=10000
```

---

### 3. Frontend Setup

#### Terminal 6: Frontend Development Server
```bash
cd /Users/rameshrawat/projectK/frontend1
pnpm install
pnpm dev
```

---

## 🧪 Verify Installation

### Check Backend
1. **Django Admin**: http://localhost:8000/admin/
2. **API Swagger**: http://localhost:8000/swagger/
3. **API ReDoc**: http://localhost:8000/redoc/

### Check Services
1. **Flower Dashboard**: http://localhost:5555/
2. **Frontend**: http://localhost:3000/

### Test API
```bash
# Test health endpoint
curl http://localhost:8000/api/health/

# Test authentication
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email","password":"your-password"}'
```

---

## 🐛 Troubleshooting

### Issue: "ModuleNotFoundError: No module named 'channels'"
**Solution**: Install dependencies
```bash
pip install -r requirements.txt
```

### Issue: "connection to server at localhost (::1), port 5432 failed"
**Solution**: Start PostgreSQL
```bash
brew services start postgresql
# Or check if it's running
brew services list
```

### Issue: "Error 111 connecting to localhost:6379. Connection refused"
**Solution**: Start Redis
```bash
redis-server
# Or in background
brew services start redis
```

### Issue: "FATAL: database 'rbac_db' does not exist"
**Solution**: Create database
```bash
psql postgres -c "CREATE DATABASE rbac_db;"
```

### Issue: Email not working
**Solution**: For development, use console backend in .env:
```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

---

## 📊 Database Schema

Run migrations to create all tables:
```bash
python3 manage.py migrate
```

**Apps with models:**
- `users` - User authentication and management
- `organization` - Organization and membership
- `clients` - Client management
- `projects` - Project management
- `tasks` - Task tracking
- `payments` - Payment processing
- `support` - Support tickets
- `notifications` - Real-time notifications
- `activity_logs` - Audit logs

---

## 🔐 Security Notes

1. **Never commit `.env` file** - Contains sensitive credentials
2. **Change SECRET_KEY** in production
3. **Use strong database passwords**
4. **Enable HTTPS** in production (set `SECURE_SSL_REDIRECT=True`)
5. **Use environment variables** for all sensitive data

---

## 📝 Next Steps After Setup

1. ✅ Verify all services are running
2. ✅ Create test organization via Superadmin
3. ✅ Test user registration and login
4. ⚠️ Implement missing frontend features:
   - Projects management UI
   - Task management UI
   - Client management UI
   - Support ticket system UI
   - WebSocket notifications

---

## 🆘 Need Help?

If you encounter issues:
1. Check all services are running (PostgreSQL, Redis, Django, Celery)
2. Verify `.env` file has correct credentials
3. Check logs in terminal windows
4. Run `python3 manage.py check` to verify Django configuration

---

## 📚 Useful Commands

```bash
# Backend
python3 manage.py makemigrations
python3 manage.py migrate
python3 manage.py createsuperuser
python3 manage.py shell
python3 manage.py test

# Check for issues
python3 manage.py check
python3 manage.py check --deploy

# Frontend
pnpm dev          # Start dev server
pnpm build        # Build for production
pnpm lint         # Run linter
```

---

**Last Updated**: October 31, 2025
**Status**: Critical fixes applied ✅
