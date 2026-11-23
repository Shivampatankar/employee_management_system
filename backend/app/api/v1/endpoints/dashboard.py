from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.models import (
    Employee,
    Department,
    Complaint,
    ManagerTeam,
    RoleEnum,
    ComplaintStatusEnum,
)
from app.schemas.schemas import DashboardMetrics

router = APIRouter()


@router.get("/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    total_employees = db.query(Employee).count()
    active_employees = db.query(Employee).filter(Employee.is_active.is_(True)).count()
    total_departments = db.query(Department).count()

    # Active accounts breakdown
    active_hr_count = db.query(Employee).filter(
        Employee.is_active.is_(True),
        Employee.role.in_([RoleEnum.HR, "HR"])
    ).count()

    active_manager_count = db.query(Employee).filter(
        Employee.is_active.is_(True),
        Employee.role.in_([RoleEnum.MANAGER, "MANAGER"])
    ).count()

    active_staff_count = db.query(Employee).filter(
        Employee.is_active.is_(True),
        Employee.role.in_([RoleEnum.EMPLOYEE, "EMPLOYEE"])
    ).count()

    role_distribution = {
        "HR": active_hr_count,
        "Managers": active_manager_count,
        "Employees": active_staff_count
    }

    # SCOPED COMPLAINTS LOGIC
    user_role = str(current_user.role.value if hasattr(current_user.role, "value") else current_user.role).upper()

    if user_role == "HR":
        complaints_query = db.query(Complaint)
    elif user_role == "MANAGER":
        # Find all team members reporting to this manager
        team_member_ids = [
            row.employee_id
            for row in db.query(ManagerTeam.employee_id).filter(ManagerTeam.manager_id == current_user.id).all()
        ]

        # Scope: complaints filed by direct reports OR assigned to this manager
        complaints_query = db.query(Complaint).filter(
            or_(
                Complaint.assigned_to_id == current_user.id,
                Complaint.created_by_id.in_(team_member_ids)
            )
        )
    else:
        # Standard employee: only complaints created by self
        complaints_query = db.query(Complaint).filter(Complaint.created_by_id == current_user.id)

    total_complaints = complaints_query.count()

    # Robust matching for both Title-Case and Uppercase enum values
    pending_statuses = [
        ComplaintStatusEnum.OPEN, "Open", "OPEN",
        ComplaintStatusEnum.ASSIGNED, "Assigned", "ASSIGNED",
        ComplaintStatusEnum.IN_PROGRESS, "In Progress", "IN_PROGRESS"
    ]
    resolved_statuses = [
        ComplaintStatusEnum.RESOLVED, "Resolved", "RESOLVED",
        ComplaintStatusEnum.CLOSED, "Closed", "CLOSED"
    ]

    pending_complaints = complaints_query.filter(Complaint.status.in_(pending_statuses)).count()
    resolved_complaints = complaints_query.filter(Complaint.status.in_(resolved_statuses)).count()

    # Group by status breakdown scoped to the role
    status_query = (
        complaints_query.with_entities(Complaint.status, func.count(Complaint.id))
        .group_by(Complaint.status)
        .all()
    )

    status_counts = {}
    for st, count in status_query:
        key = str(st.value if hasattr(st, "value") else st)
        status_counts[key] = count

    return {
        "total_employees": total_employees,
        "active_employees": active_employees,
        "total_departments": total_departments,
        "total_complaints": total_complaints,
        "pending_complaints": pending_complaints,
        "resolved_complaints": resolved_complaints,
        "department_distribution": role_distribution,
        "complaints_by_status": status_counts
    }