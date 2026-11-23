import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base


class RoleEnum(str, enum.Enum):
    HR = "HR"
    MANAGER = "MANAGER"
    EMPLOYEE = "EMPLOYEE"


class ComplaintStatusEnum(str, enum.Enum):
    OPEN = "Open"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    CLOSED = "Closed"
    REJECTED = "Rejected"


class PriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TaskStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    employees = relationship("Employee", back_populates="department")


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    mobile_number = Column(String(20), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    joining_date = Column(Date, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    designation = Column(String(100), nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.EMPLOYEE, nullable=False)
    profile_photo = Column(String(255), nullable=True)
    gender = Column(String(20), nullable=False)
    address = Column(Text, nullable=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_first_login = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    department = relationship("Department", back_populates="employees")
    created_complaints = relationship("Complaint", foreign_keys="Complaint.created_by_id", back_populates="creator")
    assigned_complaints = relationship("Complaint", foreign_keys="Complaint.assigned_to_id", back_populates="assignee")


class ManagerTeam(Base):
    __tablename__ = "manager_team"

    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_code = Column(String(30), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    priority = Column(Enum(PriorityEnum), default=PriorityEnum.MEDIUM, nullable=False)
    status = Column(Enum(ComplaintStatusEnum), default=ComplaintStatusEnum.OPEN, nullable=False)
    attachment = Column(String(255), nullable=True)
    created_by_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("employees.id"), nullable=True)
    resolution_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    creator = relationship("Employee", foreign_keys=[created_by_id], back_populates="created_complaints")
    assignee = relationship("Employee", foreign_keys=[assigned_to_id], back_populates="assigned_complaints")
    history = relationship("ComplaintHistory", back_populates="complaint", cascade="all, delete-orphan")


class ComplaintHistory(Base):
    __tablename__ = "complaint_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False)
    action_by_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="history")
    actor = relationship("Employee")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(Enum(PriorityEnum), default=PriorityEnum.MEDIUM, nullable=False)
    status = Column(Enum(TaskStatusEnum), default=TaskStatusEnum.PENDING, nullable=False)
    due_date = Column(Date, nullable=True)
    completion_notes = Column(Text, nullable=True)
    manager_remarks = Column(Text, nullable=True)
    assigned_by_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assigner = relationship("Employee", foreign_keys=[assigned_by_id])
    assignee = relationship("Employee", foreign_keys=[assigned_to_id])