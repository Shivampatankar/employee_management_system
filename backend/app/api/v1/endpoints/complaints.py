from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.dependencies import get_current_user, RoleChecker
from app.models.models import (
    Employee,
    Complaint,
    ComplaintHistory,
    ManagerTeam,
    ComplaintStatusEnum,
    RoleEnum
)
from app.schemas.schemas import ComplaintCreate, ComplaintStatusUpdate, ComplaintOut

router = APIRouter()


@router.post("", response_model=ComplaintOut, status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    code = f"CMP-{uuid.uuid4().hex[:8].upper()}"

    complaint = Complaint(
        complaint_code=code,
        title=payload.title.strip(),
        description=payload.description.strip(),
        category=payload.category,
        priority=payload.priority,
        status=ComplaintStatusEnum.OPEN,
        created_by_id=current_user.id
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    # Initial history entry
    history = ComplaintHistory(
        complaint_id=complaint.id,
        action_by_id=current_user.id,
        previous_status=None,
        new_status="Open",
        remarks="Grievance ticket created."
    )
    db.add(history)
    db.commit()
    db.refresh(complaint)

    return complaint


@router.get("", response_model=List[ComplaintOut])
def get_complaints(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user)
):
    user_role = str(current_user.role.value if hasattr(current_user.role, "value") else current_user.role).upper()
    query = db.query(Complaint)

    if user_role == "HR":
        complaints = query.order_by(Complaint.created_at.desc()).all()

    elif user_role == "MANAGER":
        # 1. Fetch all employee IDs reporting to this manager from manager_team
        team_member_ids = [
            row.employee_id
            for row in db.query(ManagerTeam.employee_id).filter(ManagerTeam.manager_id == current_user.id).all()
        ]

        # 2. Filter complaints created by team members OR assigned directly to this manager
        if team_member_ids:
            complaints = query.filter(
                or_(
                    Complaint.created_by_id.in_(team_member_ids),
                    Complaint.assigned_to_id == current_user.id
                )
            ).order_by(Complaint.created_at.desc()).all()
        else:
            complaints = query.filter(
                Complaint.assigned_to_id == current_user.id
            ).order_by(Complaint.created_at.desc()).all()

    else:
        # Standard employee: only view complaints filed by self
        complaints = query.filter(
            Complaint.created_by_id == current_user.id
        ).order_by(Complaint.created_at.desc()).all()

    return complaints


@router.patch("/{complaint_id}/status", response_model=ComplaintOut)
def update_complaint_status(
    complaint_id: int,
    payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker([RoleEnum.HR, RoleEnum.MANAGER]))
):
    complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint ticket not found")

    user_role = str(current_user.role.value if hasattr(current_user.role, "value") else current_user.role).upper()

    # Manager ownership validation: Ensure the complaint belongs to their team report or is assigned to them
    if user_role == "MANAGER":
        team_member_ids = [
            row.employee_id
            for row in db.query(ManagerTeam.employee_id).filter(ManagerTeam.manager_id == current_user.id).all()
        ]
        if complaint.created_by_id not in team_member_ids and complaint.assigned_to_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to modify complaints outside your direct team reports."
            )

    curr_status_str = str(complaint.status.value if hasattr(complaint.status, "value") else complaint.status).upper()

    # Permanent lock on Resolved or Closed tickets
    if curr_status_str in ["RESOLVED", "CLOSED"]:
        raise HTTPException(
            status_code=400,
            detail="This complaint ticket has already been resolved/closed and is permanently locked."
        )

    prev_status_display = str(complaint.status.value if hasattr(complaint.status, "value") else complaint.status)

    complaint.status = payload.status
    if payload.remarks is not None:
        complaint.resolution_remarks = payload.remarks.strip()
    if payload.assigned_to_id is not None:
        complaint.assigned_to_id = payload.assigned_to_id

    # Create immutable history entry
    new_status_display = str(payload.status.value if hasattr(payload.status, "value") else payload.status)
    history_entry = ComplaintHistory(
        complaint_id=complaint.id,
        action_by_id=current_user.id,
        previous_status=prev_status_display,
        new_status=new_status_display,
        remarks=payload.remarks.strip() if payload.remarks else None
    )
    db.add(history_entry)

    db.commit()
    db.refresh(complaint)
    return complaint