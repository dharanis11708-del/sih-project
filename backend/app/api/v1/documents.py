import os
import shutil
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.entities import Document, DocumentType, Institution, Application, DocumentVersion, AuditLog
from app.schemas.schemas import DocumentResponse, DocumentVerifyRequest
from app.core.config import settings
from app.core.security import compute_sha256, decode_token, compute_audit_hash
from app.core.permissions import require_roles, Role, oauth2_scheme
from app.ocr.ocr_service import OCRService

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    application_id: Optional[str] = None,
    institution_id: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_role = token_data.get("role")
    user_inst_id = token_data.get("institution_id")

    query = select(Document)
    conditions = []

    if user_role == Role.COLLEGE_ADMIN.value and user_inst_id:
        conditions.append(Document.institution_id == user_inst_id)
    elif institution_id:
        conditions.append(Document.institution_id == institution_id)

    if application_id:
        conditions.append(Document.application_id == application_id)
    if status:
        conditions.append(Document.status == status)

    if conditions:
        query = query.where(and_(*conditions))

    res = await db.execute(query.order_by(Document.created_at.desc()))
    docs = res.scalars().all()

    out = []
    for d in docs:
        resp = DocumentResponse.from_orm(d)
        resp.document_type_name = d.document_type.name if d.document_type else d.original_name
        out.append(resp)
    return out

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    type_code: str = Form(...),
    institution_id: Optional[str] = Form(None),
    application_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    token_data = decode_token(token)
    user_id = token_data.get("sub")
    user_role = token_data.get("role")
    user_inst_id = token_data.get("institution_id")

    inst_id = user_inst_id if user_role == Role.COLLEGE_ADMIN.value else (institution_id or user_inst_id)
    if not inst_id:
        raise HTTPException(status_code=400, detail="Institution ID required")

    # Fetch document type
    type_res = await db.execute(select(DocumentType).where(DocumentType.code == type_code))
    doc_type = type_res.scalars().first()
    if not doc_type:
        raise HTTPException(status_code=400, detail=f"Invalid document type code: {type_code}")

    # Validate extension & MIME
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '{ext}'. Allowed: {settings.ALLOWED_EXTENSIONS}"
        )

    content = await file.read()
    file_size = len(content)
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB} MB"
        )

    # Compute SHA-256 digest
    sha256_hash = compute_sha256(content)
    stored_filename = f"{sha256_hash}{ext}"
    stored_path = os.path.join(settings.STORAGE_DIR, stored_filename)

    with open(stored_path, "wb") as f:
        f.write(content)

    # Run OCR Pipeline immediately
    ocr_text, confidence = OCRService.extract_text_from_file(stored_path)
    extracted = OCRService.parse_fields(ocr_text)

    # Parse dates if extracted
    issue_date = None
    expiry_date = None
    if extracted.get("issue_date"):
        try:
            issue_date = datetime.fromisoformat(extracted["issue_date"])
        except Exception:
            pass
    if extracted.get("expiry_date"):
        try:
            expiry_date = datetime.fromisoformat(extracted["expiry_date"])
        except Exception:
            pass

    # Check if document already exists for this application and type (version bump)
    existing_res = await db.execute(
        select(Document).where(
            and_(
                Document.institution_id == inst_id,
                Document.type_id == doc_type.id,
                Document.application_id == application_id
            )
        )
    )
    existing_doc = existing_res.scalars().first()

    if existing_doc:
        # Create history version
        v = DocumentVersion(
            document_id=existing_doc.id,
            version=existing_doc.version,
            file_path=existing_doc.file_path,
            sha256=existing_doc.sha256
        )
        db.add(v)

        existing_doc.version += 1
        existing_doc.file_path = stored_path
        existing_doc.original_name = file.filename
        existing_doc.file_size = file_size
        existing_doc.sha256 = sha256_hash
        existing_doc.status = "OCR_DONE"
        existing_doc.ocr_text = ocr_text
        existing_doc.ocr_confidence = confidence
        existing_doc.extracted_fields = extracted
        if issue_date:
            existing_doc.issue_date = issue_date
        if expiry_date:
            existing_doc.expiry_date = expiry_date
        target_doc = existing_doc
    else:
        new_doc = Document(
            application_id=application_id,
            institution_id=inst_id,
            type_id=doc_type.id,
            file_path=stored_path,
            original_name=file.filename,
            mime_type=file.content_type or "application/pdf",
            file_size=file_size,
            sha256=sha256_hash,
            uploaded_by_id=user_id,
            status="OCR_DONE",
            issue_date=issue_date,
            expiry_date=expiry_date,
            ocr_text=ocr_text,
            ocr_confidence=confidence,
            extracted_fields=extracted
        )
        db.add(new_doc)
        target_doc = new_doc

    await db.commit()
    await db.refresh(target_doc)

    resp = DocumentResponse.from_orm(target_doc)
    resp.document_type_name = doc_type.name
    return resp

@router.get("/expiring", response_model=List[DocumentResponse])
async def list_expiring_documents(
    days: int = 90,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    now = datetime.now(timezone.utc)
    res = await db.execute(
        select(Document).where(Document.expiry_date.isnot(None)).order_by(Document.expiry_date.asc())
    )
    docs = res.scalars().all()

    out = []
    for d in docs:
        diff_days = (d.expiry_date - now).total_seconds() / 86400
        if diff_days <= days:
            resp = DocumentResponse.from_orm(d)
            resp.document_type_name = d.document_type.name if d.document_type else d.original_name
            out.append(resp)
    return out

@router.get("/{document_id}")
async def get_document_detail(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    res = await db.execute(select(Document).where(Document.id == document_id))
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    resp = DocumentResponse.from_orm(doc)
    resp.document_type_name = doc.document_type.name if doc.document_type else doc.original_name
    return {
        **resp.dict(),
        "ocr_text": doc.ocr_text,
        "versions_count": len(doc.versions)
    }

@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    res = await db.execute(select(Document).where(Document.id == document_id))
    doc = res.scalars().first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File content not found on server")

    return FileResponse(
        path=doc.file_path,
        filename=doc.original_name,
        media_type=doc.mime_type
    )

@router.post("/{document_id}/verify")
async def verify_document(
    document_id: str,
    payload: DocumentVerifyRequest,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.SENIOR_OFFICER, Role.AICTE_OFFICER]))
):
    token_data = decode_token(token)
    user_id = token_data.get("sub")

    res = await db.execute(select(Document).where(Document.id == document_id))
    doc = res.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.status = payload.status # VERIFIED or REJECTED
    doc.verified_by_id = user_id
    doc.verified_at = datetime.now(timezone.utc)
    doc.verification_remarks = payload.remarks

    if payload.issue_date:
        doc.issue_date = payload.issue_date
    if payload.expiry_date:
        doc.expiry_date = payload.expiry_date

    await db.commit()
    return {"message": f"Document marked as {doc.status}", "status": doc.status}

@router.post("/{document_id}/ocr/rerun")
async def rerun_ocr(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme),
    _ = Depends(require_roles([Role.SUPER_ADMIN, Role.AICTE_OFFICER]))
):
    res = await db.execute(select(Document).where(Document.id == document_id))
    doc = res.scalars().first()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document file not found")

    text, confidence = OCRService.extract_text_from_file(doc.file_path)
    extracted = OCRService.parse_fields(text)

    doc.ocr_text = text
    doc.ocr_confidence = confidence
    doc.extracted_fields = extracted
    doc.status = "OCR_DONE"
    await db.commit()

    return {"message": "OCR pipeline re-executed successfully", "extracted_fields": extracted, "confidence": confidence}

