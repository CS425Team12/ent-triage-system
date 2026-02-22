import uuid
import logging
from typing import Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Request
from sqlmodel import Session, func, select
from app.core.dependencies import get_db
from app.auth.dependencies import get_current_user
from app.models import (
    TriageCase,
    TriageCaseCreate,
    TriageCasePublic,
    TriageCasesPublic,
    TriageCaseUpdate,
    TriageCaseReview,
    Message,
    User,
    Patient,
)
from app.core.audit_middleware import get_audit_meta
from app.core.audit import AuditService


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/triage-cases", tags=["triage-cases"])

def build_case_public(case: TriageCase, db: Session) -> TriageCasePublic:
    patient = db.get(Patient, case.patientID)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    reviewed_by_email = None
    if case.reviewedBy:
        reviewer = db.get(User, case.reviewedBy)
        if reviewer:
            reviewed_by_email = reviewer.email
    
    override_summary_by_email = None
    if case.overrideSummaryBy:
        summary_override_user = db.get(User, case.overrideSummaryBy)
        if summary_override_user:
            override_summary_by_email = summary_override_user.email
    
    override_urgency_by_email = None
    if case.overrideUrgencyBy:
        urgency_override_user = db.get(User, case.overrideUrgencyBy)
        if urgency_override_user:
            override_urgency_by_email = urgency_override_user.email
            
    return TriageCasePublic(
        **case.model_dump(),
        firstName=patient.firstName,
        lastName=patient.lastName,
        DOB=patient.DOB,
        contactInfo=patient.contactInfo,
        insuranceInfo=patient.insuranceInfo,
        returningPatient=patient.returningPatient,
        languagePreference=patient.languagePreference,
        verified=patient.verified,
        reviewedByEmail=reviewed_by_email,
        overrideSummaryByEmail=override_summary_by_email,
        overrideUrgencyByEmail=override_urgency_by_email
    )

def update_patient_info(
    patient: Patient,
    patient_updates: dict,
    db: Session
) -> Patient:
    logger.info(f"Updating patient {patient.patientID} with: {patient_updates}")
    
    patient.sqlmodel_update(patient_updates)
    db.add(patient)
    
    return patient

@router.get("/", response_model=TriageCasesPublic)
def get_all_cases(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"GET /triage-cases/ - limit: {limit}, user: {current_user.email}")
    
    count_statement = select(func.count()).select_from(TriageCase)
    count = db.exec(count_statement).one()
    
    statement = select(TriageCase).limit(limit)
    cases = db.exec(statement).all()
    
    cases_public = [build_case_public(case, db) for case in cases]
    
    try:
        audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
        AuditService.create_log(
            db,
            action="LIST_CASES",
            status="SUCCESS",
            actor_id=current_user.userID,
            actor_type=current_user.role,
            resource_type="TRIAGE_CASE",
            resource_id=None,
            fields_modified=None,
            changeDetails={"limit": limit, "returned_count": len(cases_public)},
            ip=audit_meta.get("ip"),
        )
    except Exception:
        logger.exception("Failed to write audit log for listing triage cases")
    
    logger.info(f"GET /triage-cases/ - returned {count} cases")
    return TriageCasesPublic(cases=cases_public, count=count)

@router.get("/status/{status}", response_model=TriageCasesPublic)
def get_cases_by_status(
    status: str,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"GET /triage-cases/status/{status} - limit: {limit}, user: {current_user.email}")
    
    count_statement = (
        select(func.count())
        .select_from(TriageCase)
        .where(TriageCase.status == status)
    )
    count = db.exec(count_statement).one()
    
    statement = (
        select(TriageCase)
        .where(TriageCase.status == status)
        .limit(limit)
    )
    cases = db.exec(statement).all()
    
    cases_public = [build_case_public(case, db) for case in cases]
    
    # Log list access at collection level
    try:
        audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
        AuditService.create_log(
            db,
            action="LIST_CASES",
            status="SUCCESS",
            actor_id=current_user.userID,
            actor_type=current_user.role,
            resource_type="TRIAGE_CASE",
            resource_id=None,
            fields_modified=None,
            changeDetails={"status_filter": status, "limit": limit, "returned_count": len(cases_public)},
            ip=audit_meta.get("ip"),
        )
    except Exception:
        logger.exception("Failed to write audit log for listing cases by status")

    return TriageCasesPublic(cases=cases_public, count=count)

@router.get("/{id}", response_model=TriageCasePublic)
def get_specific_case(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"GET /triage-cases/{id} - user: {current_user.email}")
    
    case = db.get(TriageCase, id)
    if not case:
        logger.warning(f"GET /triage-cases/{id} - case not found")
        raise HTTPException(status_code=404, detail="Triage case not found")
    
    try:
        audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
        AuditService.create_log(
            db,
            action="VIEW_CASE",
            status="SUCCESS",
            actor_id=current_user.userID,
            actor_type=current_user.role,
            resource_type="TRIAGE_CASE",
            resource_id=case.caseID,
            fields_modified=None,
            ip=audit_meta.get("ip"),
        )
    except Exception:
        logger.exception("Failed to write audit log for viewing triage case")

    return build_case_public(case, db)

@router.post("/", response_model=TriageCasePublic)
def create_new_case(
    new_case: TriageCaseCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"POST /triage-cases/ - user: {current_user.email}, body: {new_case.model_dump()}")
    
    case = TriageCase.model_validate(new_case)

    db.add(case)
    db.commit()
    db.refresh(case)
    
    # Log case creation
    try:
        from app.core.audit_middleware import get_audit_meta
        audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
        fields_created = list(new_case.model_dump().keys())
        AuditService.create_log(
            db,
            action="CREATE_CASE",
            status="SUCCESS",
            actor_id=current_user.userID,
            actor_type=current_user.role,
            resource_type="TRIAGE_CASE",
            resource_id=case.caseID,
            fields_modified=fields_created,
            ip=audit_meta.get("ip"),
        )
    except Exception:
        logger.exception("Failed to write audit log for case creation")
    
    return build_case_public(case, db)

@router.put("/{id}", response_model=TriageCasePublic)
def update_case(
    id: uuid.UUID,
    update: TriageCaseUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"PUT /triage-cases/{id} - user: {current_user.email}, body: {update.model_dump(exclude_unset=True)}")
    
    if update.status and update.status.lower() == "reviewed" or update.reviewReason:
        raise HTTPException(
            status_code=403, 
            detail="Triage case cannot be reviewed through generic update"
        )
    
    case = db.get(TriageCase, id)
    if not case:
        raise HTTPException(status_code=404, detail="Triage case not found")
    
    update_data = update.model_dump(exclude_unset=True)
    
    patient_field_names = set(Patient.model_fields.keys())
    patient_updates = {k: v for k, v in update_data.items() if k in patient_field_names}
    case_updates = {k: v for k, v in update_data.items() if k not in patient_field_names}
    
    if patient_updates:
        patient = db.get(Patient, case.patientID)
        if not patient:
            logger.warning(f"PUT /triage-cases/{id} - patient not found")
            raise HTTPException(status_code=404, detail="Patient not found")
        
        update_patient_info(patient, patient_updates, db)
        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            modified_fields = list(patient_updates.keys())
            AuditService.create_log(
                db,
                action="UPDATE_PATIENT",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="PATIENT",
                resource_id=patient.patientID,
                fields_modified=modified_fields,
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for patient info update")
    
    if case_updates:
        # track which user made overrides
        if 'overrideUrgency' in case_updates and case_updates['overrideUrgency']:
            case.overrideUrgencyBy = current_user.userID
        if 'overrideSummary' in case_updates and case_updates['overrideSummary']:
            case.overrideSummaryBy = current_user.userID
        
        case.sqlmodel_update(case_updates)
        db.add(case)
    
    db.commit()
    db.refresh(case)
    
    if case_updates:
        try:
            audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
            modified_fields = list(case_updates.keys())
            AuditService.create_log(
                db,
                action="UPDATE_CASE",
                status="SUCCESS",
                actor_id=current_user.userID,
                actor_type=current_user.role,
                resource_type="TRIAGE_CASE",
                resource_id=case.caseID,
                fields_modified=modified_fields,
                ip=audit_meta.get("ip"),
            )
        except Exception:
            logger.exception("Failed to write audit log for case update")
    
    return build_case_public(case, db)


@router.delete("/{id}")
def delete_case(
    id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
) -> Message:
    logger.info(f"DELETE /triage-cases/{id} - user: {current_user.email}")
    
    case = db.get(TriageCase, id)
    if not case:
        logger.warning(f"DELETE /triage-cases/{id} - case not found")
        raise HTTPException(status_code=404, detail="Triage case not found")
    
    db.delete(case)
    db.commit()
    
    # Log case deletion
    try:
        audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
        AuditService.create_log(
            db,
            action="DELETE_CASE",
            status="SUCCESS",
            actor_id=current_user.userID,
            actor_type=current_user.role,
            resource_type="TRIAGE_CASE",
            resource_id=id,
            fields_modified=None,
            ip=audit_meta.get("ip"),
        )
    except Exception:
        logger.exception("Failed to write audit log for case deletion")
    
    logger.info(f"DELETE /triage-cases/{id} - deleted successfully")
    return Message(message="Triage case deleted successfully")


@router.patch("/{id}/review", response_model=TriageCasePublic)
def review_case(
    id: uuid.UUID,
    update: TriageCaseReview,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    request: Request = None
) -> Any:
    logger.info(f"PATCH /triage-cases/{id}/review - user: {current_user.email}, body: {update.model_dump()}")
    
    if not update.reviewReason or not update.reviewReason.strip():
        raise HTTPException(status_code=400, detail="Review reason is required and cannot be empty")
    
    case = db.get(TriageCase, id)
    if not case:
        raise HTTPException(status_code=404, detail="Triage case not found")
    
    if case.status == "reviewed":
      raise HTTPException(status_code=400, detail="Case is already reviewed")
    
    case.status = "reviewed"
    case.reviewReason = update.reviewReason
    case.reviewedBy = current_user.userID
    case.reviewTimestamp = datetime.now()
    if update.scheduledDate:
        case.scheduledDate = update.scheduledDate

    db.add(case)
    db.commit()
    db.refresh(case)
    
    # Log case review
    try:
        audit_meta = get_audit_meta(request) if request is not None else {"ip": None}
        fields_modified = ["status", "reviewReason", "reviewedBy", "reviewTimestamp"]
        if update.scheduledDate:
            fields_modified.append("scheduledDate")
        AuditService.create_log(
            db,
            action="REVIEW_CASE",
            status="SUCCESS",
            actor_id=current_user.userID,
            actor_type=current_user.role,
            resource_type="TRIAGE_CASE",
            resource_id=case.caseID,
            fields_modified=fields_modified,
            ip=audit_meta.get("ip"),
        )
    except Exception:
        logger.exception("Failed to write audit log for case review")
    
    return build_case_public(case, db)