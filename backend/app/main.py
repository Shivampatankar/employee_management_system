import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models.models import Department, Employee, RoleEnum
from app.core.security import get_password_hash
from app.api.v1.endpoints import auth, employees, complaints, dashboard
from app.api.v1.endpoints import tasks

# Ensure static directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Generate database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url="/api/v1/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Cross-Origin Request Handling
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Expose local file uploads for avatar and attachment serving
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Modular Routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(employees.router, prefix="/api/v1/employees", tags=["Employees"])
app.include_router(complaints.router, prefix="/api/v1/complaints", tags=["Complaints"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])



app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["tasks"])

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

@app.get("/health", tags=["System"])
def check_health(db: Session = Depends(SessionLocal)):
    try:
        # Run a simple test query against MySQL
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "backend": "online",
            "database": "connected (MySQL)"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "backend": "online",
            "database": f"connection failed: {str(e)}"
        }

@app.on_event("startup")
def seed_initial_records():
    db = SessionLocal()
    try:
        # Default Departments
        if not db.query(Department).first():
            depts = [Department(name="Engineering"), Department(name="Human Resources"), Department(name="Operations")]
            db.add_all(depts)
            db.commit()

        # Seed Root HR Superuser
        hr = db.query(Employee).filter(Employee.email == "admin@ems.com").first()
        if not hr:
            admin_user = Employee(
                name="System Administrator",
                mobile_number="9999999999",
                email="admin@ems.com",
                joining_date="2024-01-01",
                designation="HR Director",
                gender="Other",
                password_hash=get_password_hash("Admin@123"),
                role=RoleEnum.HR,
                is_active=True
            )
            db.add(admin_user)
            db.commit()
    finally:
        db.close()