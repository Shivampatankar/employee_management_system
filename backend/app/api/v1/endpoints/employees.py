import os
import shutil
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from pydantic import BaseModel
from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.dependencies import get_current_user, RoleChecker
from app.models.models import Employee, RoleEnum, ManagerTeam
from app.schemas.schemas import EmployeeOut, PaginatedEmployees, EmployeeUpdate

router = APIRouter()


class TeamAssignRequest(BaseModel):
    manager_id: int
    employee_id: int


@router.post("/register", response_model=EmployeeOut)
def register_employee(
    name: str = Form(...),
    mobile_number: str = Form(...),
    email: str = Form(...),
    joining_date: str = Form(...),
    designation: str = Form(...),
    gender: str = Form(...),
    password: str = Form(...),
    role: RoleEnum = Form(RoleEnum.EMPLOYEE),
    department_id: Optional[int] = Form(None),
    address: Optional[str] = Form(None),
    manager_id: Optional[int] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker([RoleEnum.HR])),
):
    if db.query(Employee).filter(Employee.email == email).first():
        raise HTTPException(status_code=400, detail="Email is already registered")
    if db.query(Employee).filter(Employee.mobile_number == mobile_number).first():
        raise HTTPException(status_code=400, detail="Mobile number is already registered")

    photo_path = None
    if photo:
        if photo.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(status_code=400, detail="Invalid photo format. Accepted: JPG, PNG, WEBP")

        file_ext = photo.filename.split(".")[-1]
        unique_filename = f"avatar_{uuid.uuid4().hex}.{file_ext}"
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        photo_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

    emp = Employee(
        name=name,
        mobile_number=mobile_number,
        email=email,
        joining_date=joining_date,
        designation=designation,
        gender=gender,
        password_hash=get_password_hash(password),
        role=role,
        department_id=department_id,
        address=address,
        profile_photo=photo_path,
        is_active=True,
        is_first_login=True,
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)

    if manager_id:
        mgr = db.query(Employee).filter(Employee.id == manager_id, Employee.role == RoleEnum.MANAGER).first()
        if mgr:
            link = ManagerTeam(manager_id=mgr.id, employee_id=emp.id)
            db.add(link)
            db.commit()

    return emp


@router.patch("/{emp_id}/toggle-status", response_model=EmployeeOut)
def toggle_employee_status(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker([RoleEnum.HR])),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Guard 1: Prevent HR from deactivating their currently logged-in account
    if current_user.id == emp_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot deactivate your own active session account.",
        )

    # Guard 2: Prevent deactivation of the primary Root Admin account
    if emp.id == 1 or emp.email == "admin@ems.com":
        raise HTTPException(
            status_code=403,
            detail="Root Admin account is protected and cannot be deactivated.",
        )

    emp.is_active = not emp.is_active
    db.commit()
    db.refresh(emp)
    return emp

@router.post("/assign-team")
def assign_team_member(
    payload: TeamAssignRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker([RoleEnum.HR])),
):
    mgr = db.query(Employee).filter(Employee.id == payload.manager_id, Employee.role == RoleEnum.MANAGER).first()
    if not mgr:
        raise HTTPException(status_code=404, detail="Manager not found or role is not MANAGER")

    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    existing = (
        db.query(ManagerTeam)
        .filter(
            ManagerTeam.manager_id == payload.manager_id,
            ManagerTeam.employee_id == payload.employee_id,
        )
        .first()
    )

    if not existing:
        new_link = ManagerTeam(manager_id=payload.manager_id, employee_id=payload.employee_id)
        db.add(new_link)
        db.commit()

    return {"message": f"{emp.name} successfully assigned to Manager {mgr.name}"}


@router.get("/managers", response_model=list[EmployeeOut])
def get_all_managers(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker([RoleEnum.HR, RoleEnum.MANAGER])),
):
    return db.query(Employee).filter(Employee.role == RoleEnum.MANAGER, Employee.is_active == True).all()


@router.get("", response_model=PaginatedEmployees)
def get_employees(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    department_id: Optional[int] = None,
    designation: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    query = db.query(Employee)

    if current_user.role == RoleEnum.MANAGER:
        team_ids = [
            r[0]
            for r in db.query(ManagerTeam.employee_id)
            .filter(ManagerTeam.manager_id == current_user.id)
            .all()
        ]
        team_ids.append(current_user.id)
        query = query.filter(Employee.id.in_(team_ids))
    elif current_user.role == RoleEnum.EMPLOYEE:
        query = query.filter(Employee.id == current_user.id)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Employee.name.ilike(search_filter),
                Employee.email.ilike(search_filter),
                Employee.mobile_number.ilike(search_filter),
            )
        )
    if department_id is not None:
        query = query.filter(Employee.department_id == department_id)
    if designation:
        query = query.filter(Employee.designation.ilike(f"%{designation}%"))
    if is_active is not None:
        query = query.filter(Employee.is_active == is_active)

    total = query.count()
    employees = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"total": total, "page": page, "page_size": page_size, "data": employees}


@router.get("/me", response_model=EmployeeOut)
def get_my_profile(current_user: Employee = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=EmployeeOut)
def update_my_profile(
    name: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    if name is not None and name.strip():
        current_user.name = name.strip()
    if address is not None:
        current_user.address = address.strip()
    if gender is not None and gender.strip():
        current_user.gender = gender.strip()

    if photo:
        if photo.content_type not in ["image/jpeg", "image/png", "image/webp"]:
            raise HTTPException(status_code=400, detail="Invalid photo format. Accepted: JPG, PNG, WEBP")

        file_ext = photo.filename.split(".")[-1]
        unique_filename = f"avatar_{uuid.uuid4().hex}.{file_ext}"
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        photo_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)

        current_user.profile_photo = photo_path

    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(
    emp_id: int,
    payload: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker([RoleEnum.HR])),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = payload.dict(exclude_unset=True)
    for field, val in update_data.items():
        setattr(emp, field, val)

    db.commit()
    db.refresh(emp)
    return emp


@router.delete("/{emp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(RoleChecker([RoleEnum.HR])),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    db.query(ManagerTeam).filter(
        or_(ManagerTeam.manager_id == emp_id, ManagerTeam.employee_id == emp_id)
    ).delete()

    db.delete(emp)
    db.commit()
    return None