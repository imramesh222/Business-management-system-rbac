"""Celery configuration for the project."""
from __future__ import absolute_import, unicode_literals
import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Create the Celery app instance
app = Celery('backend')

# Configure Celery using settings from Django settings.py
app.config_from_object('django.conf:settings', namespace='CELERY')

# Configure the scheduler for periodic tasks
app.conf.beat_scheduler = 'django_celery_beat.schedulers:DatabaseScheduler'
app.conf.beat_sync_every = 1  # Sync schedule every second

# Auto-discover tasks from all installed apps
app.autodiscover_tasks(packages=[
    'apps.users',
    'apps.organization',
    'apps.clients',
    'apps.projects',
    'apps.payments',
    'apps.tasks',
    'apps.support',
    'apps.notifications',
    'apps.dashboard',
])

# Configure periodic tasks
from celery.schedules import crontab

app.conf.beat_schedule = {
    # Daily digest email at 8:00 AM every day
    'send-daily-digest': {
        'task': 'apps.users.tasks.send_daily_digest',
        'schedule': crontab(hour=8, minute=0),  # 8:00 AM daily
    },
    
    # Weekly summary every Monday at 9:00 AM
    'send-weekly-summary': {
        'task': 'apps.users.tasks.send_weekly_summary',
        'schedule': crontab(day_of_week=1, hour=9, minute=0),  # Monday 9:00 AM
    },
    
    # Check for inactive users every day at 10:00 AM
    'check-inactive-users': {
        'task': 'apps.users.tasks.check_inactive_users',
        'schedule': crontab(hour=10, minute=0),  # 10:00 AM daily
    },
    
    # Check for tasks with approaching deadlines every hour
    'check-task-deadlines': {
        'task': 'apps.tasks.tasks.check_task_deadlines',
        'schedule': 3600.0,  # Every hour
    },
    
    # Send daily task reminders at 9:00 AM every weekday
    'send-daily-task-reminders': {
        'task': 'apps.tasks.tasks.send_daily_task_reminders',
        'schedule': crontab(hour=9, minute=0, day_of_week='1-5'),  # Weekdays at 9:00 AM
    },
}

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')