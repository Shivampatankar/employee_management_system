from fastapi import APIRouter
from app.api.v1.endpoints import auth, employees, departments, complaints, dashboard, tasks

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(departments.router, prefix="/departments", tags=["departments"])
api_router.include_router(complaints.router, prefix="/complaints", tags=["complaints"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])