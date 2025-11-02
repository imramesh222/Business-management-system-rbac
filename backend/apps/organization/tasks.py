import logging
import os
from celery import shared_task
from celery.utils.log import get_task_logger
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.core.cache import cache

# Set up logger
logger = get_task_logger(__name__)

def get_site_name():
    """Helper function to get site name with caching"""
    site_name = cache.get('site_name')
    if not site_name:
        # Reload environment variables
        from dotenv import load_dotenv
        load_dotenv()
        site_name = os.getenv('SITE_NAME', 'PROJECT-K')
        cache.set('site_name', site_name, 60)  # Cache for 1 minute
    return site_name

@shared_task
def send_admin_assignment_email(user_id, org_name):
    from apps.users.models import User
    try:
        user = User.objects.get(id=user_id)
        send_mail(
            subject='Admin Assignment Notification',
            message=f"You have been assigned as an admin to {org_name}. Please check your dashboard.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email]
        )
    except User.DoesNotExist:
        pass

@shared_task(name='apps.organization.tasks.send_organization_created_email', bind=True, max_retries=3, default_retry_delay=60)
def send_organization_created_email(self, org_id, context=None):
    """
    Send an email notification when a new organization is created.
    
    Args:
        org_id: The ID of the organization
        context: Additional context for the email template
    """
    from .models import Organization
    from django.conf import settings
    import smtplib
    
    # Use the module-level logger
    logger = logging.getLogger(__name__)
    
    try:
        # Debug SMTP settings
        logger.info("\n" + "="*50)
        logger.info("EMAIL TASK: Starting organization email task")
        logger.info(f"Organization ID: {org_id}")
        
        # Get organization
        organization = Organization.objects.get(id=org_id)
        logger.info(f"[EMAIL TASK] Found organization: {organization.name} (ID: {organization.id})")
        logger.info(f"[EMAIL TASK] Organization email: {getattr(organization, 'email', 'No email set')}")
        
        # Check if organization has an email
        if not organization.email:
            error_msg = f"Organization {organization.name} (ID: {organization.id}) has no email address configured"
            logger.error(error_msg)
            return False
        
        # Default context
        if context is None:
            context = {}
            
        # Get subscription details if exists
        subscription = getattr(organization, 'subscription', None)
        plan_name = 'Trial'  # Default plan name
        
        if subscription and hasattr(subscription, 'plan_duration') and hasattr(subscription.plan_duration, 'plan'):
            plan_name = subscription.plan_duration.plan.name
        
        # Update context with organization details
        context.update({
            'organization_name': organization.name,
            'organization_plan': plan_name,
            'organization_status': organization.get_status_display(),
            'max_users': organization.max_users,
            'max_storage': organization.max_storage,
            'site_name': get_site_name(),
            'dashboard_url': getattr(settings, 'FRONTEND_DASHBOARD_URL', 'https://yourapp.com/dashboard'),
            'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@example.com'),
        })
        
        logger.info(f"Email context prepared: {context}")
            
        # Render email content with improved subject
        subject = f"Welcome to {context['site_name']} - Your BMS Account is Ready"
        
        # Render HTML and text versions
        try:
            html_content = render_to_string('emails/organization_created.html', context)
            text_content = render_to_string('emails/organization_created.txt', context)
            logger.info("Email templates rendered successfully")
        except Exception as e:
            logger.error(f"Error rendering email templates: {str(e)}")
            # Fallback to simple text email if template rendering fails
            html_content = f"""
            <html><body>
                <h1>Welcome to {context['site_name']}!</h1>
                <p>Your organization {organization.name} has been successfully created.</p>
                <p>Please log in to your dashboard to get started.</p>
            </body></html>
            """
            text_content = f"""
            Welcome to {context['site_name']}!
            
            Your organization {organization.name} has been successfully created.
            Please log in to your dashboard to get started.
            """
        
        # Get email settings
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
        to_email = organization.email
        
        # Create email
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=[to_email],
            reply_to=[getattr(settings, 'SUPPORT_EMAIL', 'support@example.com')]
        )
        msg.attach_alternative(html_content, "text/html")
        
        # Test SMTP connection first
        try:
            with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=10) as server:
                server.ehlo()
                if settings.EMAIL_USE_TLS:
                    server.starttls()
                    logger.info("TLS connection established")
                if settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD:
                    server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
                    logger.info("SMTP Authentication successful")
                logger.info("SMTP Connection successful")
        except Exception as e:
            logger.error(f"SMTP Connection failed: {str(e)}")
            raise
        
        # Send email
        try:
            msg.send(fail_silently=False)
            logger.info(f"Successfully sent organization creation email to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {str(e)}")
            raise self.retry(exc=e)
        
    except Organization.DoesNotExist as e:
        error_msg = f"Organization with ID {org_id} does not exist: {str(e)}"
        logger.error(error_msg)
        raise self.retry(exc=e)
    except Exception as e:
        logger.error(f"Unexpected error in send_organization_created_email: {str(e)}", exc_info=True)
        raise self.retry(exc=e)
