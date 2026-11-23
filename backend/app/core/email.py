import os
import random
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


def generate_otp() -> str:
    return f"{random.randint(100000, 999999)}"


def send_otp_email(to_email: str, otp_code: str):
    subject = "WorkForce EMS - Password Setup OTP"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-bottom: 10px;">WorkForce EMS</h2>
        <p style="color: #334155; font-size: 15px;">Hello,</p>
        <p style="color: #334155; font-size: 15px;">
            You are logging into your account for the first time. Use the following One-Time Password (OTP) to set your permanent password:
        </p>
        <div style="text-align: center; margin: 25px 0;">
            <span style="display: inline-block; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background-color: #f1f5f9; padding: 12px 24px; border-radius: 6px; border: 1px dashed #94a3b8;">
                {otp_code}
            </span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This verification code is valid for 5 minutes. Do not share it with anyone.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 20px;">
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Automated message from WorkForce Enterprise Management System.</p>
    </div>
    """

    if not SMTP_USER or not SMTP_PASSWORD:
        print("[SMTP ERROR] Missing SMTP_USER or SMTP_PASSWORD in backend/.env file.")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"WorkForce EMS <{SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_content, "html"))

        # Connect using TLS encryption
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15)
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, to_email, msg.as_string())
        server.quit()
        
        print(f"[SMTP SUCCESS] Verification email sent to {to_email}")
    except smtplib.SMTPAuthenticationError:
        print("[SMTP ERROR] Authentication failed. Ensure 2-Step Verification is active and use a generated 16-character Google App Password.")
    except Exception as e:
        print(f"[SMTP ERROR] Failed to send email: {e}")