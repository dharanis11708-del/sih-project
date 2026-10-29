import os
import uuid
import asyncio
import random
from datetime import datetime, timedelta, timezone
import reportlab.lib.pagesizes as pagesizes
from reportlab.pdfgen import canvas
from sqlalchemy import select

from app.db.session import engine, AsyncSessionLocal, Base
from app.models.entities import (
    Region, User, Institution, AcademicYear, ApplicationType,
    WorkflowDefinition, WorkflowStage, Application, ApplicationStageHistory,
    DocumentType, Document, Deficiency, EVCVisit, EVCMember, EVCReport,
    ComplianceRule, ComplianceItem, Notification, AuditLog
)
from app.core.security import get_password_hash, compute_sha256, compute_audit_hash
from app.core.permissions import Role
from app.core.config import settings

DEMO_PASSWORD = get_password_hash("ApprovalTrack@2026")

REGIONS_DATA = [
    {"name": "Northern Regional Office", "code": "NRO", "headquarters": "Kanpur", "states": ["Uttar Pradesh", "Uttarakhand"]},
    {"name": "Southern Regional Office", "code": "SRO", "headquarters": "Chennai", "states": ["Tamil Nadu", "Puducherry"]},
    {"name": "Western Regional Office", "code": "WRO", "headquarters": "Mumbai", "states": ["Maharashtra", "Goa"]},
    {"name": "Eastern Regional Office", "code": "ERO", "headquarters": "Kolkata", "states": ["West Bengal", "Odisha", "Jharkhand", "Bihar"]},
    {"name": "South-Western Regional Office", "code": "SWRO", "headquarters": "Bengaluru", "states": ["Karnataka", "Kerala"]},
    {"name": "Central Regional Office", "code": "CRO", "headquarters": "Bhopal", "states": ["Madhya Pradesh", "Chhattisgarh", "Gujarat"]},
    {"name": "North-Western Regional Office", "code": "NWRO", "headquarters": "Chandigarh", "states": ["Punjab", "Haryana", "Himachal Pradesh", "Delhi", "Rajasthan"]},
    {"name": "South-Central Regional Office", "code": "SCRO", "headquarters": "Hyderabad", "states": ["Telangana", "Andhra Pradesh"]},
]

DOCUMENT_TYPES_DATA = [
    {"code": "LAND_LEASE", "name": "Registered Land Lease Deed", "has_expiry": True, "validity_years": 30, "mandatory": True},
    {"code": "FIRE_NOC", "name": "Fire Safety Certificate / NOC", "has_expiry": True, "validity_years": 1, "mandatory": True},
    {"code": "BUILDING_PLAN", "name": "Approved Building Plan & Occupancy Certificate", "has_expiry": False, "validity_years": 0, "mandatory": True},
    {"code": "AFFILIATION_LETTER", "name": "University Affiliation Letter", "has_expiry": True, "validity_years": 1, "mandatory": True},
    {"code": "FACULTY_LIST", "name": "Faculty Cadre & Salary Proof", "has_expiry": True, "validity_years": 1, "mandatory": True},
    {"code": "MANDATORY_DISCLOSURE", "name": "Annual Mandatory Disclosure", "has_expiry": True, "validity_years": 1, "mandatory": True},
]

COMPLIANCE_RULES_DATA = [
    {
        "code": "FIRE_NOC_VALIDITY",
        "title": "Valid Fire Safety NOC Required",
        "description": "Institutions must possess an unexpired Fire Safety NOC issued by the state competent authority.",
        "severity": "CRITICAL",
        "condition": {"all": [{"fact": "institution.established_year", "operator": "gt", "value": 1900}]}
    },
    {
        "code": "LAND_LEASE_30Y",
        "title": "Minimum 30-Year Registered Land Lease",
        "description": "Institutions operating on leased premises must show at least 30 years registered tenure.",
        "severity": "HIGH",
        "condition": {"all": [{"fact": "institution.type", "operator": "in", "value": ["ENGINEERING", "POLYTECHNIC", "MANAGEMENT"]}]}
    },
    {
        "code": "ANNUAL_DISCLOSURE",
        "title": "Mandatory Annual Disclosure Upload",
        "description": "Institution must publish updated regulatory disclosure on official web portal.",
        "severity": "MEDIUM",
        "condition": {"all": [{"fact": "has_mandatory_disclosure", "operator": "eq", "value": True}]}
    }
]

COLLEGE_NAMES = [
    ("Delhi Institute of Technology & Management", "ENGINEERING", "Delhi", "North Delhi"),
    ("Madras College of Engineering & Research", "ENGINEERING", "Tamil Nadu", "Chennai"),
    ("Bengaluru Institute of Technology", "ENGINEERING", "Karnataka", "Bengaluru Urban"),
    ("Maharashtra Polytechnic & Vocational Institute", "POLYTECHNIC", "Maharashtra", "Pune"),
    ("Kolkata Institute of Pharmaceutical Sciences", "PHARMACY", "West Bengal", "Kolkata"),
    ("Gujarat School of Business & Management", "MANAGEMENT", "Gujarat", "Ahmedabad"),
    ("Hyderabad Academy of Architecture & Design", "ARCHITECTURE", "Telangana", "Hyderabad"),
    ("Kanpur Technological University College", "ENGINEERING", "Uttar Pradesh", "Kanpur"),
    ("Bhopal Polytechnic College", "POLYTECHNIC", "Madhya Pradesh", "Bhopal"),
    ("Chandigarh School of Engineering & Applied Sciences", "ENGINEERING", "Punjab", "Chandigarh"),
    ("Jaipur College of Pharmacy", "PHARMACY", "Rajasthan", "Jaipur"),
    ("Kochi Institute of Engineering & Marine Tech", "ENGINEERING", "Kerala", "Ernakulam"),
    ("Lucknow Institute of Management Studies", "MANAGEMENT", "Uttar Pradesh", "Lucknow"),
    ("Mumbai National College of Pharmacy", "PHARMACY", "Maharashtra", "Mumbai City"),
    ("Coimbatore Institute of Engineering", "ENGINEERING", "Tamil Nadu", "Coimbatore"),
    ("Patna Regional Institute of Technology", "ENGINEERING", "Bihar", "Patna"),
    ("Bhubaneswar School of Advanced Technology", "ENGINEERING", "Odisha", "Khordha"),
    ("Dehradun Institute of Technology & Sciences", "ENGINEERING", "Uttarakhand", "Dehradun"),
    ("Surat Polytechnic & Vocational Center", "POLYTECHNIC", "Gujarat", "Surat"),
    ("Nagpur College of Architecture", "ARCHITECTURE", "Maharashtra", "Nagpur"),
]

def generate_sample_pdf(file_path: str, title: str, dates_text: str):
    """Generates synthetic PDF with embedded text for OCR verification testing."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    c = canvas.Canvas(file_path, pagesize=pagesizes.A4)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "GOVERNMENT OF INDIA - REGULATORY COMPLIANCE")
    c.setFont("Helvetica-Bold", 14)
    c.drawString(100, 720, title)
    c.setFont("Helvetica", 11)
    c.drawString(100, 680, f"Document Reference No: NOC/2026/AICTE-{random.randint(10000, 99999)}")
    c.drawString(100, 650, "This is to certify that the institutional premises comply with all safety norms.")
    c.drawString(100, 620, f"Period of validity and lease term: 30 years lease granted.")
    c.drawString(100, 590, dates_text)
    c.drawString(100, 550, "Authorized Signatory: Directorate of Fire & Rescue Services")
    c.save()

async def seed_database():
    print("Beginning ApprovalTrack Database Seeding...")

    # 1. Initialize Tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        existing_users = await db.execute(select(User))
        if existing_users.scalars().first():
            print("Database already contains data. Skipping re-seed.")
            return

        # 2. Seed Regions
        regions = []
        for r_data in REGIONS_DATA:
            reg = Region(
                name=r_data["name"],
                code=r_data["code"],
                headquarters=r_data["headquarters"],
                states_covered=r_data["states"]
            )
            db.add(reg)
            regions.append(reg)
        await db.flush()
        print(f"Seeded {len(regions)} AICTE Regional Offices.")

        # 3. Seed Document Types
        doc_types = []
        for dt_data in DOCUMENT_TYPES_DATA:
            dt = DocumentType(
                code=dt_data["code"],
                name=dt_data["name"],
                has_expiry=dt_data["has_expiry"],
                default_validity_years=dt_data["validity_years"],
                is_mandatory=dt_data["mandatory"]
            )
            db.add(dt)
            doc_types.append(dt)
        await db.flush()

        # 4. Seed Academic Years & Application Types
        ay = AcademicYear(year="2026-2027", is_active=True)
        db.add(ay)
        await db.flush()

        app_types = [
            ApplicationType(code="EOA", name="Extension of Approval (EoA)", sla_total_days=30),
            ApplicationType(code="NEW_INSTITUTION", name="Approval for New Institution", sla_total_days=60),
            ApplicationType(code="INCREASE_INTAKE", name="Increase in Intake / Additional Course", sla_total_days=30),
            ApplicationType(code="NEW_COURSE", name="Introduction of New Course / Division", sla_total_days=30),
            ApplicationType(code="CLOSURE", name="Closure of Institution / Course", sla_total_days=45),
        ]
        for at in app_types:
            db.add(at)
        await db.flush()

        # 5. Seed Workflow Definition & Stages
        wf = WorkflowDefinition(application_type_id=app_types[0].id, version=1, is_active=True)
        db.add(wf)
        await db.flush()

        stages_data = [
            {"code": "SUBMITTED", "name": "Submitted", "order": 1, "sla": 2, "role": Role.AICTE_OFFICER.value, "req_docs": ["LAND_LEASE", "FIRE_NOC"]},
            {"code": "SCRUTINY", "name": "Document Scrutiny", "order": 2, "sla": 5, "role": Role.AICTE_OFFICER.value, "req_docs": ["BUILDING_PLAN", "AFFILIATION_LETTER"]},
            {"code": "DEFICIENCY", "name": "Deficiency Loop", "order": 3, "sla": 5, "role": Role.COLLEGE_ADMIN.value, "req_docs": []},
            {"code": "EVC", "name": "Expert Visit Committee (EVC)", "order": 4, "sla": 10, "role": Role.EVC_MEMBER.value, "req_docs": []},
            {"code": "EVC_COMPLETED", "name": "EVC Report Review", "order": 5, "sla": 3, "role": Role.AICTE_OFFICER.value, "req_docs": []},
            {"code": "SENIOR_REVIEW", "name": "Senior Officer Review", "order": 6, "sla": 3, "role": Role.SENIOR_OFFICER.value, "req_docs": []},
            {"code": "APPROVED", "name": "Final Approval Granted", "order": 7, "sla": 2, "role": Role.SUPER_ADMIN.value, "req_docs": [], "terminal": True},
            {"code": "REJECTED", "name": "Application Rejected", "order": 8, "sla": 2, "role": Role.SUPER_ADMIN.value, "req_docs": [], "terminal": True},
        ]
        stages = []
        for s in stages_data:
            stage = WorkflowStage(
                workflow_id=wf.id,
                name=s["name"],
                code=s["code"],
                stage_order=s["order"],
                sla_days=s["sla"],
                responsible_role=s["role"],
                required_documents=s["req_docs"],
                is_terminal=s.get("terminal", False)
            )
            db.add(stage)
            stages.append(stage)
        await db.flush()

        # 6. Seed Compliance Rules
        for cr in COMPLIANCE_RULES_DATA:
            db.add(ComplianceRule(
                code=cr["code"],
                title=cr["title"],
                description=cr["description"],
                severity=cr["severity"],
                condition_json=cr["condition"],
                is_active=True
            ))
        await db.flush()

        # 7. Seed Official Demo Users
        admin_user = User(
            name="AICTE Super Administrator",
            email="admin@approvaltrack.test",
            password_hash=DEMO_PASSWORD,
            role=Role.SUPER_ADMIN.value,
            region_id=regions[0].id,
            is_active=True
        )
        officer_user = User(
            name="Dr. R. Ramanathan (Scrutiny Officer)",
            email="officer@approvaltrack.test",
            password_hash=DEMO_PASSWORD,
            role=Role.AICTE_OFFICER.value,
            region_id=regions[1].id, # SRO
            is_active=True
        )
        senior_user = User(
            name="Dr. Sunita Sharma (Regional Director)",
            email="senior@approvaltrack.test",
            password_hash=DEMO_PASSWORD,
            role=Role.SENIOR_OFFICER.value,
            region_id=regions[1].id,
            is_active=True
        )
        evc_user = User(
            name="Prof. Amitav Roy (EVC Expert)",
            email="evc@approvaltrack.test",
            password_hash=DEMO_PASSWORD,
            role=Role.EVC_MEMBER.value,
            region_id=regions[3].id, # ERO
            is_active=True
        )
        auditor_user = User(
            name="Justice V. K. Jain (Audit & Vigilance)",
            email="auditor@approvaltrack.test",
            password_hash=DEMO_PASSWORD,
            role=Role.AUDITOR.value,
            region_id=regions[0].id,
            is_active=True
        )
        db.add_all([admin_user, officer_user, senior_user, evc_user, auditor_user])

        # Additional regional scrutiny officers for workload balancing
        officers_pool = [officer_user]
        for i in range(1, 8):
            off = User(
                name=f"Officer {regions[i].code} Desk {i}",
                email=f"officer_{regions[i].code.lower()}@approvaltrack.test",
                password_hash=DEMO_PASSWORD,
                role=Role.AICTE_OFFICER.value,
                region_id=regions[i].id,
                is_active=True
            )
            db.add(off)
            officers_pool.append(off)
        await db.flush()

        # 8. Seed 60+ Realistic Institutions
        institutions = []
        college_users = []

        for idx, (name, itype, state, district) in enumerate(COLLEGE_NAMES):
            # assign matching region
            matching_reg = next((r for r in regions if state in (r.states_covered or [])), regions[0])
            inst = Institution(
                aicte_id=f"1-{10940000 + idx}",
                name=name,
                type=itype,
                address=f"Plot No. {random.randint(10, 500)}, Institutional Area, {district}",
                state=state,
                district=district,
                pin_code=f"{random.randint(110000, 699999)}",
                region_id=matching_reg.id,
                university_affiliation=f"State Technical University of {state}",
                trust_society_name=f"{name.split()[0]} Educational Trust",
                contact_email=f"admin_{idx}@approvaltrack.test" if idx > 0 else "college@approvaltrack.test",
                contact_phone=f"+91 98{random.randint(10000000, 99999999)}",
                established_year=random.randint(1995, 2021),
                status="ACTIVE",
                compliance_score=round(random.uniform(70.0, 98.0), 1)
            )
            db.add(inst)
            institutions.append(inst)
            await db.flush()

            # Create College Admin User
            col_email = "college@approvaltrack.test" if idx == 0 else f"college_{idx}@approvaltrack.test"
            c_user = User(
                name=f"Principal / Admin ({name[:25]}...)",
                email=col_email,
                password_hash=DEMO_PASSWORD,
                role=Role.COLLEGE_ADMIN.value,
                region_id=matching_reg.id,
                institution_id=inst.id,
                is_active=True
            )
            db.add(c_user)
            college_users.append(c_user)

        # Expand up to 60 institutions by duplicating with variation
        for k in range(len(COLLEGE_NAMES), 65):
            base = COLLEGE_NAMES[k % len(COLLEGE_NAMES)]
            inst = Institution(
                aicte_id=f"1-{10940000 + k}",
                name=f"{base[0]} Campus {k}",
                type=base[1],
                address=f"Phase {k}, Knowledge Park",
                state=base[2],
                district=base[3],
                region_id=regions[k % len(regions)].id,
                contact_email=f"inst_{k}@approvaltrack.test",
                established_year=random.randint(2000, 2022),
                status="ACTIVE",
                compliance_score=round(random.uniform(65.0, 99.0), 1)
            )
            db.add(inst)
            institutions.append(inst)

        await db.flush()
        print(f"Seeded {len(institutions)} Technical Institutions.")

        # 9. Generate Sample Demo PDF in uploads/
        sample_pdf_path = os.path.join(settings.STORAGE_DIR, "sample_fire_noc.pdf")
        issue_d = (datetime.now(timezone.utc) - timedelta(days=60)).strftime("%d-%m-%Y")
        expiry_d = (datetime.now(timezone.utc) + timedelta(days=45)).strftime("%d-%m-%Y")
        generate_sample_pdf(
            sample_pdf_path,
            "FIRE SAFETY COMPLIANCE NO-OBJECTION CERTIFICATE",
            f"Date of Issue: {issue_d} | Valid until Expiry Date: {expiry_d}"
        )
        sample_sha256 = compute_sha256(open(sample_pdf_path, "rb").read())

        # 10. Seed 300+ Applications Across Stages & Risk Labels
        applications = []
        now = datetime.now(timezone.utc)

        for app_idx in range(1, 310):
            app_id = str(uuid.uuid4())
            inst = institutions[app_idx % len(institutions)]
            assigned_off = officers_pool[app_idx % len(officers_pool)]

            # Stage distribution
            stage_idx = app_idx % len(stages)
            cur_stage = stages[stage_idx]

            days_ago = random.randint(3, 40)
            submitted_date = now - timedelta(days=days_ago)

            is_overdue = days_ago > cur_stage.sla_days and cur_stage.code not in ["APPROVED", "REJECTED"]
            risk_score = round(random.uniform(0.1, 0.95), 2)
            risk_label = "HIGH" if (risk_score >= 0.7 or is_overdue) else ("MEDIUM" if risk_score >= 0.4 else "LOW")

            app = Application(
                id=app_id,
                application_no=f"APP-2026-{app_idx:06d}",
                institution_id=inst.id,
                type_id=app_types[app_idx % len(app_types)].id,
                academic_year_id=ay.id,
                current_stage_id=cur_stage.id,
                status=cur_stage.code,
                priority="URGENT" if is_overdue else ("HIGH" if risk_label == "HIGH" else "NORMAL"),
                assigned_officer_id=assigned_off.id,
                details={
                    "intake_capacity": random.choice([300, 480, 600, 720]),
                    "courses": ["Computer Science", "Artificial Intelligence", "Mechanical Engineering"],
                    "built_up_area_sqm": random.randint(12000, 45000)
                },
                submitted_at=submitted_date,
                due_at=submitted_date + timedelta(days=cur_stage.sla_days),
                risk_score=risk_score,
                risk_label=risk_label,
                risk_factors=[
                    "High stage ageing" if is_overdue else "Normal processing",
                    "Document scrutiny pending" if cur_stage.code == "SCRUTINY" else "Prerequisites checked"
                ],
                is_overdue=is_overdue
            )
            db.add(app)
            applications.append(app)

            # Stage History
            hist = ApplicationStageHistory(
                application_id=app_id,
                stage_id=cur_stage.id,
                actor_id=assigned_off.id,
                entered_at=submitted_date,
                sla_due_at=submitted_date + timedelta(days=cur_stage.sla_days),
                is_breached=is_overdue,
                outcome="ADVANCED"
            )
            db.add(hist)

            # Add documents for first 50 applications
            if app_idx <= 50:
                doc = Document(
                    application_id=app_id,
                    institution_id=inst.id,
                    type_id=doc_types[1].id, # FIRE_NOC
                    file_path=sample_pdf_path,
                    original_name="Fire_Safety_NOC_2026.pdf",
                    mime_type="application/pdf",
                    file_size=24580,
                    sha256=sample_sha256,
                    uploaded_by_id=college_users[0].id,
                    status="VERIFIED" if app_idx % 2 == 0 else "OCR_DONE",
                    issue_date=now - timedelta(days=60),
                    expiry_date=now + timedelta(days=random.choice([-10, 25, 45, 180, 300])),
                    ocr_text=f"GOVERNMENT FIRE SAFETY NOC. Valid until {expiry_d}. 30 years lease.",
                    ocr_confidence=0.88,
                    extracted_fields={
                        "issue_date": issue_d,
                        "expiry_date": expiry_d,
                        "lease_years": 30,
                        "reference_number": f"NOC-{random.randint(1000, 9999)}"
                    }
                )
                db.add(doc)

            # Add Deficiencies for deficiency stage
            if cur_stage.code == "DEFICIENCY" or app_idx % 15 == 0:
                defic = Deficiency(
                    application_id=app_id,
                    raised_by_id=assigned_off.id,
                    category="Land Lease & Building Safety",
                    description="Fire safety certificate expires within 30 days. Renewed certificate from Chief Fire Officer required.",
                    status="OPEN" if is_overdue else "RESOLVED",
                    due_at=now + timedelta(days=5)
                )
                db.add(defic)

        await db.flush()
        print(f"Seeded {len(applications)} Applications across stages.")

        # 11. Seed EVC Inspection Visits
        for evc_i in range(1, 20):
            evc_app = applications[evc_i * 8]
            evc_app.status = "EVC"
            visit = EVCVisit(
                application_id=evc_app.id,
                scheduled_date=now + timedelta(days=random.randint(2, 14)),
                start_time="09:30",
                end_time="17:00",
                status="SCHEDULED",
                coordinator_id=officer_user.id,
                report_due_at=now + timedelta(days=17)
            )
            db.add(visit)
            await db.flush()

            db.add(EVCMember(
                visit_id=visit.id,
                user_id=evc_user.id,
                role="CHAIRPERSON",
                response="ACCEPTED"
            ))

        # 12. Seed Cryptographic Audit Logs (Tamper-Evident Hash Chain)
        prev_hash = "GENESIS"
        for log_i in range(1, 25):
            now_iso = (now - timedelta(hours=25 - log_i)).isoformat()
            cur_hash = compute_audit_hash(
                prev_hash=prev_hash,
                actor_id=admin_user.id,
                action="SYSTEM_INITIALIZATION" if log_i == 1 else "STAGE_TRANSITION",
                entity_type="SYSTEM" if log_i == 1 else "APPLICATION",
                entity_id=applications[log_i].id if log_i > 1 else "SYS",
                before={},
                after={"status": "INITIALIZED"},
                timestamp_str=now_iso
            )
            log = AuditLog(
                actor_id=admin_user.id,
                actor_role="SUPER_ADMIN",
                action="SYSTEM_INITIALIZATION" if log_i == 1 else "STAGE_TRANSITION",
                entity_type="SYSTEM" if log_i == 1 else "APPLICATION",
                entity_id=applications[log_i].id if log_i > 1 else "SYS",
                prev_hash=prev_hash,
                hash=cur_hash,
                created_at=now - timedelta(hours=25 - log_i)
            )
            db.add(log)
            prev_hash = cur_hash

        await db.commit()
        print("ApprovalTrack Database Seeding Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
