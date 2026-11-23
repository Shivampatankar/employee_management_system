from datetime import datetime, timedelta
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.config import settings
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.core.email import generate_otp, send_otp_email
from app.models.models import Employee
from app.schemas.schemas import LoginRequest, RequestOTP, ResetPasswordWithOTP

router = APIRouter()

# Helper to create a 5-minute signed OTP token (no DB storage)
def create_otp_token(email: str, otp_code: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=5)
    payload = {
        "email": email,
        "otp": otp_code,
        "type": "otp_reset",
        "exp": expire
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@router.post("/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(
        or_(Employee.email == payload.identifier, Employee.mobile_number == payload.identifier)
    ).first()

    if not employee or not verify_password(payload.password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile/email or password"
        )

    if not employee.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Contact HR."
        )

    # Intercept first-time login
    if employee.is_first_login:
        otp_code = generate_otp()
        
        # Create a stateless 5-minute token
        reset_token = create_otp_token(employee.email, otp_code)

        # Send OTP directly to email via SMTP
        send_otp_email(employee.email, otp_code)

        return {
            "requires_password_reset": True,
            "email": employee.email,
            "reset_token": reset_token,
            "message": "First login detected. OTP has been sent to your email (valid for 5 minutes)."
        }

    token = create_access_token(data={"sub": str(employee.id), "role": employee.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": employee.role.value,
        "user_id": employee.id,
        "name": employee.name,
        "requires_password_reset": False
    }


@router.post("/resend-otp")
def resend_otp(payload: RequestOTP, db: Session = Depends(get_db)):
    employee = db.query(Employee).filter(Employee.email == payload.email).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    otp_code = generate_otp()
    reset_token = create_otp_token(employee.email, otp_code)
    send_otp_email(employee.email, otp_code)

    return {
        "message": "A fresh OTP has been sent to your email.",
        "reset_token": reset_token
    }


@router.post("/set-initial-password")
def set_initial_password(payload: ResetPasswordWithOTP, db: Session = Depends(get_db)):
    # Verify the stateless token signature & check 5-minute expiration
    try:
        token_payload = jwt.decode(
            payload.reset_token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired (exceeded 5 minutes). Please request a new one."
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid security token."
        )

    # Verify token payload matches user request
    if token_payload.get("email") != payload.email:
        raise HTTPException(status_code=400, detail="Token mismatch for this email address.")

    if token_payload.get("otp") != payload.otp.strip():
        raise HTTPException(status_code=400, detail="Invalid OTP code.")

    employee = db.query(Employee).filter(Employee.email == payload.email).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found.")

    if len(payload.new_password.strip()) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    # Update credentials in MySQL
    employee.password_hash = get_password_hash(payload.new_password.strip())
    employee.is_first_login = False
    db.commit()

    return {"message": "Password updated successfully. You can now login with your new password."}