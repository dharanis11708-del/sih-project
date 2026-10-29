# ApprovalTrack User Guide

## 1. Demo Credentials & Roles

| Role | Email | Password | Primary Purpose |
|---|---|---|---|
| **Super Admin** | `admin@approvaltrack.test` | `ApprovalTrack@2026` | Workflow definitions, SLA configs, user management, system audit |
| **AICTE Officer** | `officer@approvaltrack.test` | `ApprovalTrack@2026` | Scrutiny workbench, document verification, deficiency issuance |
| **Senior Officer** | `senior@approvaltrack.test` | `ApprovalTrack@2026` | Stage approvals, regional oversight, officer reassignments |
| **EVC Member** | `evc@approvaltrack.test` | `ApprovalTrack@2026` | Expert visits calendar, report submissions |
| **College Admin** | `college@approvaltrack.test` | `ApprovalTrack@2026` | Application drafting, document uploads, deficiency resolution |
| **Auditor** | `auditor@approvaltrack.test` | `ApprovalTrack@2026` | Read-only compliance analytics, cryptographic audit verification |

---

## 2. Navigating the Application

### 🏛️ For Institutions (College Admin)
1. **Dashboard**: View your submitted applications, live progress tracker, impending compliance deadlines, and expiring documents.
2. **New Application Wizard**: Click "+ New Application" on the top right.
   - Step 1: Select Application Type (e.g. Extension of Approval - EoA, Increase in Intake).
   - Step 2: Course & Intake details.
   - Step 3: Mandatory Document Uploads (Fire Safety NOC, Land Lease, Building Plan).
   - Step 4: Digital Declaration and Submission.
3. **Deficiency Resolution**: When an AICTE officer raises a deficiency, an alert appears. Navigate to the Deficiencies tab, enter your explanation, attach rectifying documentation, and submit.

### 🔍 For AICTE Scrutiny Officers
1. **Officer Workbench**: View "My Queue", sorted by urgency and SLA risk.
2. **Document Scrutiny**: Open an application -> click on the **Documents** tab. Click **"Verify"** to inspect the document alongside automated OCR-extracted dates and fields.
3. **Deficiencies**: Raise deficiencies for any incomplete or questionable uploads. The workflow automatically locks progression until the institution responds.
4. **Schedule EVC**: If on-site physical inspection is required, click "Schedule EVC", select suitable dates, and assign committee members.

### 📊 For Senior Officers & Leadership
1. **Pendency Dashboard**: View holistic regional pendency, officer workload distribution, and ageing buckets.
2. **Escalations**: Overdue tasks trigger auto-escalations directly to your desk for rapid intervention and reassignment.
3. **Stage Approval**: Review scrutiny findings and finalize approvals or conditional clearances.

