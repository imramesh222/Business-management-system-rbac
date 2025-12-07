# 🚀 RBAC Project Management System

A full-stack project management platform built with **Django** (Backend) and **Next.js** (Frontend), featuring **Role-Based Access Control (RBAC)**, **real-time notifications** via **Redis, WebSockets**, **Django Channels**, and **scheduled background tasks** with **Celery** and **django-celery-beat**.

---

## 🧩 Tech Stack

- **Backend**: Django, Django REST Framework
- **Frontend**: Next.js (React + TailwindCSS)
- **Real-time**: WebSocket, Django Channels, Redis Pub/Sub
- **Async & Scheduled Tasks**: 
  - Celery 5.3.6 with Redis
  - django-celery-beat for database-backed periodic tasks
  - Task scheduling with Crontab and Interval schedules
- **Database**: PostgreSQL
- **Notifications**: WebSocket + Redis + Django Signals
- **Deployment**: Docker, Gunicorn, Nginx

---

## 🔐 Roles & Responsibilities

| Role              | Permissions & Capabilities |
|-------------------|----------------------------|
| **Superadmin**     | - Create/manage organizations <br> - Assign Admins <br> - System-wide control & logs |
| **Admin**          | - Manage users within their organization <br> - Create Salesperson, Project Manager, Developer, Support roles |
| **Salesperson**    | - Add clients <br> - Create projects <br> - Input project cost and discount |
| **Verifier**       | - Validate project payments <br> - Confirm or reject payment verification |
| **Project Manager**| - Oversee project development <br> - Assign tasks to developers <br> - Track progress |
| **Developer**      | - Work on assigned project tasks <br> - Submit progress & status |
| **Support**        | - Handle client issues post-deployment <br> - Log support tickets and bug reports |

---

## 🧠 Key Features

### ✅ Role-Based Access Control (RBAC)
- Roles stored using `models.TextChoices` and attached to users
- Permissions defined and enforced per role
- Superadmin has system-wide control; other roles are scoped to organizations

### ⚙️ Project Lifecycle

1. Superadmin creates an **Organization** and assigns an **Admin**.
2. Admin hires a **Salesperson**, who brings **Clients** and **Projects**.
3. Projects contain:
   - Cost
   - Discount
   - Timeline
   - Assigned PM & Developers
4. **Verifier** confirms payment before project starts.
5. **Project Manager** assigns tasks to **Developers**.
6. Developers update task progress.
7. After deployment, **Support** handles issues.

### 🔔 Real-Time Notifications

- Admins and relevant users receive **WebSocket notifications**:
  - When a new project is added
  - When payment is verified
  - When tasks are updated
- Notifications are handled using:
  - **Django Channels**
  - **Redis Pub/Sub**
  - **Custom WebSocket Consumers**

### ⏳ Task Management (Celery & Beat)

- **Scheduled Tasks**:
  - Daily digest emails at 8:00 AM
  - Weekly summary emails every Monday at 9:00 AM
  - Inactive user reminders at 10:00 AM daily

- **Background Processing**:
  - Email notifications (password reset, user creation, etc.)
  - Payment processing and verification
  - Report generation and delivery
  - Data exports and imports

- **Task Monitoring**:
  - Flower dashboard for task monitoring
  - Django admin for task management
  - Task retries and error handling

### 🧪 Signals

- **Django Signals** trigger notifications and logs when:
  - A new user is created
  - A project status changes
  - Payment is verified

---

## 🗂️ Project Structure

```
backend/
├── apps/
│   ├── users/                  # User management app
│   │   ├── tasks.py           # Celery tasks
│   │   ├── signals.py         # Django signals
│   │   └── ...
│   ├── organization/          # Organization management
│   │   └── tasks.py           # Organization-related tasks
│   └── ...
├── backend/
│   ├── celery.py             # Celery configuration
│   ├── settings.py           # Django settings
│   └── ...
└── requirements.txt          # Project dependencies
```

## 🚀 Setup Instructions

### Prerequisites
- Python 3.11+
- Redis
- PostgreSQL
- Node.js 16+ (for frontend)

### Backend Setup

```bash
# Clone the repository
git clone <repository-url>
cd projectk/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### Running the Application

You'll need multiple terminal windows for different services:

1. **Terminal 1 - Redis**
   ```bash
   redis-server
   ```

2. **Terminal 2 - Celery Worker**
   ```bash
   source venv/bin/activate
   celery -A backend worker --loglevel=info
   ```

3. **Terminal 3 - Celery Beat** (for scheduled tasks)
   ```bash
   source venv/bin/activate
   celery -A backend beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
   ```

4. **Terminal 4 - Django Development Server**
   ```bash
   source venv/bin/activate
   python manage.py runserver
   ```

5. **Terminal 5 - Flower** (optional, for monitoring)
   ```bash
   source venv/bin/activate
   celery -A backend flower --persistent --inspect_timeout=10000
   ```

## 🔍 Accessing Admin Interfaces

- **Django Admin**: http://localhost:8000/admin/
  - Manage users, groups, and permissions
  - Configure scheduled tasks
  - Monitor system status

- **Flower Dashboard**: http://localhost:5555/
  - Monitor Celery tasks
  - View task history and results
  - Manage workers


## 📈 ER Diagram (Mermaid)

```mermaid
classDiagram
    class User {
        +UUID id
        +string username
        +string email
        +string password
        +RoleChoices role
        +bool is_active
        +datetime created_at
    }

    class Organization {
        +UUID id
        +string name
        +User created_by (Superadmin)
        +datetime created_at
    }

    class Admin {
        +UUID id
        +FK user_id
        +FK organization_id
    }

    class Salesperson {
        +UUID id
        +FK user_id
        +FK organization_id
    }

    class Verifier {
        +UUID id
        +FK user_id
        +FK organization_id
    }

    class ProjectManager {
        +UUID id
        +FK user_id
        +FK organization_id
    }

    class Developer {
        +UUID id
        +FK user_id
        +FK organization_id
    }

    class Support {
        +UUID id
        +FK user_id
        +FK organization_id
    }

    class Client {
        +UUID id
        +string name
        +string contact
        +FK salesperson_id
    }

    class Project {
        +UUID id
        +string title
        +text description
        +float cost
        +float discount
        +FK client_id
        +FK created_by (Salesperson)
        +FK verifier_id
        +FK manager_id
        +bool is_verified
        +datetime created_at
    }

    class Payment {
        +UUID id
        +float amount
        +bool verified
        +FK project_id
        +datetime created_at
    }

    class Task {
        +UUID id
        +string title
        +string status
        +FK developer_id
        +FK project_id
    }

    class SupportTicket {
        +UUID id
        +string issue
        +FK support_id
        +FK project_id
        +datetime created_at
    }
```
## Relationships
```

    User <|-- Admin
    User <|-- Salesperson
    User <|-- Verifier
    User <|-- ProjectManager
    User <|-- Developer
    User <|-- Support
    Organization "1" --> "many" Admin
    Organization "1" --> "many" Salesperson
    Organization "1" --> "many" Verifier
    Organization "1" --> "many" Developer
    Organization "1" --> "many" ProjectManager
    Organization "1" --> "many" Support
    Salesperson "1" --> "many" Client
    Client "1" --> "many" Project
    Project "1" --> "1" Payment
    Project "1" --> "many" Task
    Project "1" --> "many" SupportTicket
```

📜 Sequence Diagrams
Superadmin Flow
mermaid
```
sequenceDiagram
    participant Superadmin
    participant System
    participant Organization
    participant Admin

    Superadmin->>System: Create Organization
    System->>Organization: Save new org
    Superadmin->>System: Assign Admin
    System->>Admin: Generate temp password
    System->>Redis: Publish Admin Assigned event
    Redis->>WebSocket: Notify Admin

```
Admin Flow
mermaid
```
sequenceDiagram
    participant Admin
    participant System
    participant Salesperson
    participant Verifier
    participant PM
    participant Dev
    participant Support
```

```
    Admin->>System: Create Salesperson
    Admin->>System: Create Verifier
    Admin->>System: Create Project Manager
    Admin->>System: Create Developer
    Admin->>System: Create Support Staff
    System->>Redis: Publish Role Created event
    Redis->>WebSocket: Notify Users
    
```    
## Salesperson Flow

mermaid
```
sequenceDiagram
    participant Salesperson
    participant Client
    participant Project
    participant Verifier
    participant System

    Salesperson->>System: Add Client
    Salesperson->>System: Create Project with Cost & Discount
    System->>Verifier: Assign for verification
    System->>Redis: Publish ProjectCreated
    Redis->>WebSocket: Notify Verifier
```    
## Verifier Flow

mermaid
```
sequenceDiagram
    participant Verifier
    participant System
    participant Celery
    participant Redis

    Verifier->>System: Verify Project Payment
    System->>Django Signal: project_verified
    Django Signal->>Redis: Publish event
    Redis->>WebSocket: Notify Frontend
    Django Signal->>Celery: Send Email Task
```    
    
## Project Manager & Developer Flow

mermaid
```
sequenceDiagram
    participant PM
    participant Dev
    participant Project
    participant Task

    PM->>System: Create Task under Project
    PM->>System: Assign Task to Developer
    Dev->>System: Update Task Status
    System->>Redis: Publish Task Updated
    Redis->>WebSocket: Notify PM
```    
Support Flow
mermaid
```
sequenceDiagram
    participant Support
    participant System
    participant Ticket

    Support->>System: Create Ticket for Project
    System->>Project: Attach Ticket
    System->>Redis: Notify Admin/PM
    
```    
⚙️ Installation

# Backend
cd backend
python -m venv env
source env/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev

# Redis (Mac)
brew install redis
redis-server

# Celery
## 🔄 Task Scheduling with Celery Beat

### Managing Periodic Tasks

1. **Via Django Admin**:
   - Navigate to http://localhost:8000/admin/django_celery_beat/
   - Add/edit/delete periodic tasks
   - Configure schedules (crontab, intervals, solar)
   - Enable/disable tasks

2. **Example Task Definition**:
   ```python
   # apps/users/tasks.py
   from celery import shared_task
   from django.core.mail import send_mail

   @shared_task
   def send_daily_digest():
       # Task implementation
       pass
   ```

3. **Common Celery Commands**:
   ```bash
   # Start worker
   celery -A backend worker --loglevel=info

   # Start beat scheduler
   celery -A backend beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

   # Monitor tasks with Flower
   celery -A backend flower --persistent
   ```

## 🔗 API Documentation

- **Swagger UI**: http://localhost:8000/swagger/
- **ReDoc**: http://localhost:8000/redoc/

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

```
portfolio-tracker/
├── backend/
│   ├── apps/
│   │   ├── users/
│   │   ├── organization/
│   │   ├── projects/
│   │   └── notifications/
│   ├── celery.py
│   ├── routing.py
│   └── ...
├── frontend/
│   ├── pages/
│   ├── components/
│   ├── utils/websocket.ts
│   └── ...

```
## 📡 Real-Time Architecture
Channels + Redis: Used for real-time messaging.

WebSocket Layer: Subscribed to role-based events.

Redis Pub/Sub: Connects Django Signals → WebSocket consumers.

📬 Notification Flow
Admin assigns a user → Signal triggers.

Signal publishes to Redis.

WebSocket picks up event and pushes notification.

Email is sent asynchronously using Celery.

📤 Async Email Notifications
Celery handles background job for email.

Triggers include:

New Admin/Salesperson/Verifier assignments.

Project approval.

Task assignment.

Ticket escalation.

## ✅ Future Enhancements
JWT Authentication with refresh.

Role-Based Dashboards (Dynamic Sidebar).

SaaS Billing System.

Audit Logging & Admin Analytics.

## 👨‍💻 Author
Ramesh Rawat
Backend | Full Stack | System Design
Experienced in building scalable Django-based SaaS products with React frontend.

## 📄 License
MIT License

yaml

---

Let me know if you'd like this turned into a downloadable file or published in your GitHub repository with live Mermaid previews (using `markdown-mermaid` or GitHub Actions).




```


