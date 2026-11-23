from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

try:
    from pydantic import field_validator
    USE_PYDANTIC_V2 = True
except ImportError:
    from pydantic import validator as field_validator
    USE_PYDANTIC_V2 = False

from app.models.models import RoleEnum, ComplaintStatusEnum, PriorityEnum, TaskStatusEnum


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    name: str


class LoginRequest(BaseModel):
    identifier: str
    password: str


class RequestOTP(BaseModel):
    email: EmailStr


class ResetPasswordWithOTP(BaseModel):
    email: EmailStr
    otp: str
    new_password: str
    reset_token: str


class EmployeeBase(BaseModel):
    name: str
    mobile_number: str
    email: EmailStr
    joining_date: date
    department_id: Optional[int] = None
    designation: str
    gender: str
    address: Optional[str] = None
    role: RoleEnum = RoleEnum.EMPLOYEE


class EmployeeCreate(EmployeeBase):
    password: str


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    mobile_number: Optional[str] = None
    email: Optional[EmailStr] = None
    department_id: Optional[int] = None
    designation: Optional[str] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    role: Optional[RoleEnum] = None
    is_active: Optional[bool] = None


class EmployeeOut(EmployeeBase):
    id: int
    profile_photo: Optional[str] = None
    is_active: bool
    is_first_login: bool = False
    created_at: datetime

    if USE_PYDANTIC_V2:
        @field_validator("profile_photo", mode="before")
        @classmethod
        def format_photo_url_v2(cls, v):
            if not v:
                return None
            val_str = str(v)
            if val_str.startswith("http://") or val_str.startswith("https://"):
                return val_str
            clean_path = val_str.replace("\\", "/").lstrip("/")
            return f"http://localhost:8000/{clean_path}"
    else:
        @field_validator("profile_photo", pre=True, always=True)
        def format_photo_url_v1(cls, v):
            if not v:
                return None
            val_str = str(v)
            if val_str.startswith("http://") or val_str.startswith("https://"):
                return val_str
            clean_path = val_str.replace("\\", "/").lstrip("/")
            return f"http://localhost:8000/{clean_path}"

    class Config:
        from_attributes = True
        orm_mode = True


class PaginatedEmployees(BaseModel):
    total: int
    page: int
    page_size: int
    data: List[EmployeeOut]


class ComplaintCreate(BaseModel):
    title: str
    description: str
    category: str
    priority: PriorityEnum = PriorityEnum.MEDIUM

    if USE_PYDANTIC_V2:
        @field_validator("priority", mode="before")
        @classmethod
        def normalize_priority_v2(cls, v):
            return v.upper() if isinstance(v, str) else v
    else:
        @field_validator("priority", pre=True, always=True)
        def normalize_priority_v1(cls, v):
            return v.upper() if isinstance(v, str) else v


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatusEnum
    remarks: Optional[str] = None
    assigned_to_id: Optional[int] = None


class ComplaintHistoryOut(BaseModel):
    id: int
    action_by_id: int
    previous_status: Optional[str]
    new_status: str
    remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True


class ComplaintOut(BaseModel):
    id: int
    complaint_code: str
    title: str
    description: str
    category: str
    priority: PriorityEnum
    status: ComplaintStatusEnum
    attachment: Optional[str]
    created_by_id: int
    assigned_to_id: Optional[int]
    resolution_remarks: Optional[str]
    created_at: datetime
    updated_at: datetime
    history: List[ComplaintHistoryOut] = []

    class Config:
        from_attributes = True
        orm_mode = True


class TaskCreate(BaseModel):
    title: str
    description: str
    priority: PriorityEnum = PriorityEnum.MEDIUM
    due_date: Optional[date] = None
    assigned_to_id: int

    if USE_PYDANTIC_V2:
        @field_validator("priority", mode="before")
        @classmethod
        def normalize_task_priority_v2(cls, v):
            return v.upper() if isinstance(v, str) else v
    else:
        @field_validator("priority", pre=True, always=True)
        def normalize_task_priority_v1(cls, v):
            return v.upper() if isinstance(v, str) else v


class TaskStatusUpdate(BaseModel):
    status: TaskStatusEnum
    completion_notes: Optional[str] = None
    manager_remarks: Optional[str] = None

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v):
        if isinstance(v, str):
            clean = v.strip().upper().replace(" ", "_")
            return clean
        if hasattr(v, "value"):
            return v.value
        return v


class TaskOut(BaseModel):
    id: int
    title: str
    description: str
    priority: PriorityEnum
    status: str  # Note: str ensures standard JSON serialization without enum discrepancies
    due_date: Optional[date] = None
    completion_notes: Optional[str] = None
    manager_remarks: Optional[str] = None
    assigned_by_id: int
    assigned_to_id: int
    assigner_name: Optional[str] = None
    assignee_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("status", mode="before")
    @classmethod
    def serialize_status_as_str(cls, v):
        if hasattr(v, "value"):
            return str(v.value).upper()
        return str(v).upper()

    class Config:
        from_attributes = True
        orm_mode = True


class DashboardMetrics(BaseModel):
    total_employees: int
    active_employees: int
    total_departments: int
    total_complaints: int
    pending_complaints: int
    resolved_complaints: int
    department_distribution: dict
    complaints_by_status: dict