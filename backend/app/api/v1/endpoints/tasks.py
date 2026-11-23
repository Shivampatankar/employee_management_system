from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import RoleChecker
from app.models.models import Employee, Task, ManagerTeam, RoleEnum, TaskStatusEnum
from app.schemas.schemas import TaskCreate, TaskStatusUpdate, TaskOut

router = APIRouter()


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=TaskOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def assign_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker([RoleEnum.MANAGER]))
):
    target_emp = db.query(Employee).filter(Employee.id == payload.assigned_to_id).first()
    if not target_emp:
        raise HTTPException(status_code=404, detail="Assigned employee not found")

    is_in_team = db.query(ManagerTeam).filter(
        ManagerTeam.manager_id == current_user.id,
        ManagerTeam.employee_id == payload.assigned_to_id
    ).first()
    if not is_in_team:
        raise HTTPException(
            status_code=403,
            detail="You can only assign tasks to employees reporting directly to your team."
        )

    new_task = Task(
        title=payload.title.strip(),
        description=payload.description.strip(),
        priority=payload.priority,
        due_date=payload.due_date,
        assigned_by_id=current_user.id,
        assigned_to_id=payload.assigned_to_id,
        status=TaskStatusEnum.PENDING
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return TaskOut(
        id=new_task.id,
        title=new_task.title,
        description=new_task.description,
        priority=new_task.priority,
        status="PENDING",
        due_date=new_task.due_date,
        completion_notes=new_task.completion_notes,
        manager_remarks=new_task.manager_remarks,
        assigned_by_id=new_task.assigned_by_id,
        assigned_to_id=new_task.assigned_to_id,
        assigner_name=current_user.name,
        assignee_name=target_emp.name,
        created_at=new_task.created_at,
        updated_at=new_task.updated_at
    )


@router.get("", response_model=List[TaskOut])
@router.get("/", response_model=List[TaskOut], include_in_schema=False)
def get_tasks(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker([RoleEnum.MANAGER, RoleEnum.EMPLOYEE]))
):
    query = db.query(Task)
    
    if current_user.role == RoleEnum.MANAGER:
        tasks = query.filter(
            (Task.assigned_by_id == current_user.id) | (Task.assigned_to_id == current_user.id)
        ).order_by(Task.created_at.desc()).all()
    else:
        tasks = query.filter(Task.assigned_to_id == current_user.id).order_by(Task.created_at.desc()).all()

    result = []
    for t in tasks:
        raw_status = str(t.status.value if hasattr(t.status, "value") else t.status).upper()
        result.append(TaskOut(
            id=t.id,
            title=t.title,
            description=t.description,
            priority=t.priority,
            status=raw_status,
            due_date=t.due_date,
            completion_notes=t.completion_notes,
            manager_remarks=t.manager_remarks,
            assigned_by_id=t.assigned_by_id,
            assigned_to_id=t.assigned_to_id,
            assigner_name=t.assigner.name if t.assigner else "Unknown",
            assignee_name=t.assignee.name if t.assignee else "Unknown",
            created_at=t.created_at,
            updated_at=t.updated_at
        ))
    return result


@router.patch("/{task_id}/status", response_model=TaskOut)
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker([RoleEnum.MANAGER, RoleEnum.EMPLOYEE]))
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    current_status = str(task.status.value if hasattr(task.status, "value") else task.status).upper()

    # RULE 1: Permanent lock - once APPROVED, nobody can touch it
    if current_status == "APPROVED":
        raise HTTPException(
            status_code=400,
            detail="This task has already been approved and is permanently locked."
        )

    raw_target = str(payload.status.value if hasattr(payload.status, "value") else payload.status).upper()

    is_manager = (current_user.role == RoleEnum.MANAGER)
    is_employee = (task.assigned_to_id == current_user.id)

    # MANAGER WORKFLOW
    if is_manager:
        # STRICT RULE: Manager cannot review/approve/reject unless employee has marked it as COMPLETED
        if current_status != "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail="You cannot review or approve this task yet. The employee has not submitted it as completed."
            )

        if raw_target == "APPROVED":
            task.status = TaskStatusEnum.APPROVED
        elif raw_target == "REJECTED":
            task.status = TaskStatusEnum.REJECTED
        elif raw_target == "IN_PROGRESS":
            task.status = TaskStatusEnum.IN_PROGRESS
        else:
            task.status = TaskStatusEnum.PENDING

        if payload.manager_remarks is not None:
            task.manager_remarks = payload.manager_remarks.strip()

    # EMPLOYEE WORKFLOW
    elif is_employee:
        if current_status == "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail="Task is currently frozen awaiting review from your manager."
            )

        if raw_target in ["APPROVED", "REJECTED"]:
            raise HTTPException(
                status_code=403,
                detail="Only managers can approve or reject tasks."
            )

        if raw_target == "COMPLETED":
            task.status = TaskStatusEnum.COMPLETED
        else:
            task.status = TaskStatusEnum.IN_PROGRESS

        if payload.completion_notes is not None:
            task.completion_notes = payload.completion_notes.strip()

    else:
        raise HTTPException(status_code=403, detail="You do not have permission to modify this task")

    db.commit()
    db.refresh(task)

    final_status = str(task.status.value if hasattr(task.status, "value") else task.status).upper()

    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        priority=task.priority,
        status=final_status,
        due_date=task.due_date,
        completion_notes=task.completion_notes,
        manager_remarks=task.manager_remarks,
        assigned_by_id=task.assigned_by_id,
        assigned_to_id=task.assigned_to_id,
        assigner_name=task.assigner.name if task.assigner else "Unknown",
        assignee_name=task.assignee.name if task.assignee else "Unknown",
        created_at=task.created_at,
        updated_at=task.updated_at
    )