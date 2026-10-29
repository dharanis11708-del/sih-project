import os
import aiosmtplib
from email.message import EmailMessage
from jinja2 import Environment, FileSystemLoader
from app.core.config import settings
from app.core.logging import logger

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")
os.makedirs(TEMPLATES_DIR, exist_ok=True)
jinja_env = Environment(loader=FileSystemLoader(TEMPLATES_DIR))

class EmailService:
    @classmethod
    async def send_email(cls, to_email: str, subject: str, template_name: str, context: dict) -> bool:
        """Renders Jinja2 HTML email and transmits via SMTP / MailHog."""
        try:
            template = jinja_env.get_template(template_name)
            html_content = template.render(**context)

            message = EmailMessage()
            message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            message["To"] = to_email
            message["Subject"] = subject
            message.set_content(html_content, subtype="html")

            # In dev, connect to MailHog or configured SMTP
            await aiosmtplib.send(
                message,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER or None,
                password=settings.SMTP_PASSWORD or None,
                use_tls=False
            )
            logger.info(f"Email sent successfully to {to_email} with subject: '{subject}'")
            return True
        except Exception as e:
            logger.warning(f"Could not send email to {to_email} (MailHog/SMTP may be offline): {str(e)}")
            return False

