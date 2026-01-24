from typing import Dict
from fastapi import APIRouter
import resend
from app.core.config import settings

resend.api_key = str(settings.RESEND_API_KEY)
test_email_recipient = str(settings.TEST_EMAIL_RECIPIENT) # without our own domain, we can only send it to our registered email and from test email for now
test_email_sender = str(settings.TEST_EMAIL_SENDER) 

router = APIRouter(prefix="/mailer", tags=["mailer"])

def send_mail(from_email: str = test_email_sender, to_email: str = test_email_recipient, template_name: str = "", link: str = "") -> Dict:
    params: resend.Emails.SendParams = {
        "from": from_email,
        "to": [to_email],
        "template": {
        "id": template_name,
        "variables": {
          "link": link,
        },
      },
    }
    email: resend.Emails.SendResponse = resend.Emails.send(params)
    return email
  
@router.post("/send_forgot_password")
def send_forgot_pw() -> Dict:
    return send_mail(template_name="forgot-password")
  
@router.post("/send_create_password")
def send_forgot_pw() -> Dict:
    return send_mail(template_name="create-password")