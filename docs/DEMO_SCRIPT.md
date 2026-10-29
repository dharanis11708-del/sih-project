# Smart India Hackathon 2026 - 5-Minute Live Demo Walkthrough
**Problem Statement: SIH26262 | Team: Tech Spark**
**Project:** AICTE Approval Workflow Automation, Compliance Monitoring and Alert Management System (ApprovalTrack)

---

## Act 1: The AICTE Leadership & Pendency Cockpit (1.5 Minutes)
1. **Login as Senior Officer / Leadership**:
   - URL: `http://localhost:3000/login`
   - Credentials: `senior@approvaltrack.test` / `ApprovalTrack@2026`
2. **Key Highlights to Demonstrate**:
   - **Pendency Metrics**: Instant visibility into 300+ applications across regional offices.
   - **Responsible Officer Tracking**: Point out the table column showing the exact designated officer for each delayed file.
   - **Ageing Analysis**: Highlight the 0-7, 8-15, 16-30, and 30+ day delay buckets.
   - **ML Delay Risk Scoring**: Point out the AI risk badges (High, Medium, Low) and click one to show the delay factors (e.g., officer load, pending EVC).

---

## Act 2: Scrutiny Officer Workbench & OCR Verification (1.5 Minutes)
1. **Switch to Desk Scrutiny Officer**:
   - Credentials: `officer@approvaltrack.test` / `ApprovalTrack@2026`
2. **Open Application Scrutiny**:
   - Click on an application in "Document Scrutiny" stage.
   - Switch to the **Documents** tab.
   - Open a **Land Lease Deed** or **Fire NOC**: show the side-by-side view where Tesseract OCR automatically extracted the issue date, expiry date, and lease term.
   - Click **Verify** (demonstrating human-in-the-loop validation).
3. **Trigger Deficiency**:
   - Raise a deficiency for a missing NOC.
   - Show how the stage automatically locks and moves to the "Deficiency / Clarification" loop.

---

## Act 3: Institution (College) Experience & Public Tracker (1 Minute)
1. **Login as College Admin**:
   - Credentials: `college@approvaltrack.test` / `ApprovalTrack@2026`
2. **Showcase College Dashboard**:
   - Stepper timeline showing current approval stage.
   - Notice the live notification for the deficiency raised by the officer.
   - Respond to the deficiency with explanation text and an attachment.
3. **Public Status Tracking**:
   - Log out and click **"Track Application"** on the landing page.
   - Enter `APP-2026-000101` and college email to show transparent public tracking without needing a full system login.

---

## Act 4: Audit Trail & Tamper-Evident Security (1 Minute)
1. **Login as Auditor**:
   - Credentials: `auditor@approvaltrack.test` / `ApprovalTrack@2026`
2. **Audit Logs & Hash Verification**:
   - Navigate to **Audit Logs**.
   - Show that every action (logins, uploads, stage transitions) is immutably logged with actor, timestamp, IP, and cryptographic SHA-256 hash.
   - Click **"Verify Hash Integrity"**: the system verifies that the cryptographic chain is unbroken, proving zero tampering.

