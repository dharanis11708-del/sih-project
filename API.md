# ApprovalTrack API Specification

All endpoints are versioned under `/api/v1`. Full interactive OpenAPI Swagger documentation is available at `http://localhost:8000/docs`.

---

## 1. Authentication & Users
- `POST /api/v1/auth/login` - Authenticate and obtain JWT access & refresh tokens
- `POST /api/v1/auth/refresh` - Refresh an expired access token
- `POST /api/v1/auth/logout` - Revoke current refresh token
- `GET  /api/v1/auth/me` - Get profile of authenticated user
- `POST /api/v1/auth/register-institution` - Self-registration for new institutions
- `GET  /api/v1/users` - List users with filtering by role and region (Admin)
- `POST /api/v1/users` - Create user account
- `PATCH /api/v1/users/{id}/status` - Activate or deactivate user

---

## 2. Institutions
- `GET  /api/v1/institutions` - Paginated institution directory
- `POST /api/v1/institutions` - Register new institution
- `GET  /api/v1/institutions/{id}` - Institution detailed profile
- `GET  /api/v1/institutions/{id}/360` - 360-degree regulatory dashboard
- `POST /api/v1/institutions/import` - Bulk CSV import

---

## 3. Applications & Workflow
- `GET  /api/v1/applications` - List applications with filters (stage, officer, risk, overdue)
- `POST /api/v1/applications` - Create a draft application
- `GET  /api/v1/applications/{id}` - Comprehensive application details
- `PATCH /api/v1/applications/{id}` - Update draft details
- `POST /api/v1/applications/{id}/submit` - Formally submit application (initiates workflow)
- `POST /api/v1/applications/{id}/transition` - Advance or modify stage
- `POST /api/v1/applications/{id}/reassign` - Reassign responsible officer
- `POST /api/v1/applications/{id}/escalate` - Manually trigger escalation
- `GET  /api/v1/applications/{id}/timeline` - Historical stage progression & SLA breaches
- `GET  /api/v1/applications/{id}/checklist` - Mandatory document status checklist
- `POST /api/v1/applications/{id}/remarks` - Threaded internal/external remarks

---

## 4. Deficiencies
- `POST /api/v1/applications/{id}/deficiencies` - Raise deficiency
- `POST /api/v1/deficiencies/{id}/respond` - College response with comments & files
- `POST /api/v1/deficiencies/{id}/resolve` - Officer marks deficiency resolved
- `POST /api/v1/deficiencies/{id}/reject` - Officer rejects explanation

---

## 5. Documents & OCR
- `POST /api/v1/documents/upload` - Secure multipart file upload
- `GET  /api/v1/documents/{id}` - Document metadata & extracted OCR fields
- `GET  /api/v1/documents/{id}/download` - Stream verified file contents
- `POST /api/v1/documents/{id}/verify` - Officer verification (human-in-the-loop)
- `POST /api/v1/documents/{id}/ocr/rerun` - Re-trigger OCR extraction pipeline
- `GET  /api/v1/documents/expiring` - Active documents expiring within T-90/60/30 days

---

## 6. Compliance Monitoring
- `GET  /api/v1/compliance/rules` - List compliance rules
- `POST /api/v1/compliance/rules` - Create or update rule
- `GET  /api/v1/compliance/items` - List institutional compliance obligations
- `POST /api/v1/compliance/evaluate` - Trigger rule engine compliance evaluation
- `POST /api/v1/compliance/items/{id}/evidence` - Submit evidence document
- `GET  /api/v1/compliance/score/{institution_id}` - Calculate institutional compliance grade (0-100)
- `GET  /api/v1/compliance/high-risk` - List non-compliant and high-risk institutions

---

## 7. Expert Visit Committee (EVC)
- `GET  /api/v1/evc/visits` - List scheduled and historical visits
- `POST /api/v1/evc/visits` - Schedule new EVC inspection
- `POST /api/v1/evc/visits/{id}/respond` - Member accept/decline with COI check
- `POST /api/v1/evc/visits/{id}/report` - Submit comprehensive inspection findings
- `GET  /api/v1/evc/calendar` - Calendar view of visits
- `GET  /api/v1/evc/checklists` - Standard inspection checklist templates

---

## 8. Dashboard & Analytics
- `GET  /api/v1/dashboard/summary` - Key performance metrics (Total, Overdue, Approved, SLA %)
- `GET  /api/v1/dashboard/funnel` - Funnel distribution across workflow stages
- `GET  /api/v1/dashboard/pendency` - Detailed pendency analysis by officer, region, and type
- `GET  /api/v1/dashboard/ageing` - Ageing bucket distribution (0-7, 8-15, 16-30, 30+ days)
- `GET  /api/v1/dashboard/officer-load` - Workload balance per scrutiny officer
- `GET  /api/v1/dashboard/trends` - Historical throughput and average processing days

---

## 9. Audit & Transparency
- `GET  /api/v1/audit-logs` - Filterable audit log stream
- `GET  /api/v1/audit-logs/verify` - Cryptographic verification of hash chain
- `POST /api/v1/public/track` - Public tracking portal for applicant institutions

