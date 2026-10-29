# Security Architecture & OWASP Top 10 Mitigation

ApprovalTrack is designed to adhere to strict Indian Government and CERT-In security guidelines.

## 1. Authentication & Session Management
- **Password Hashing**: Bcrypt with minimum 12 salt rounds via `passlib`.
- **JWT Cryptography**: Signed with HMAC-SHA256 using strong, rotatable secrets. 
- **Short-Lived Tokens**: Access tokens expire in 30 minutes; Refresh tokens expire in 7 days and rotate upon usage.
- **Account Lockout**: Failed login attempts trigger automatic lockout after 5 consecutive failures.

## 2. Authorization & RBAC
- **Strict Role-Based Enforcement**: Enforced via FastAPI dependencies on all endpoints (`require_roles([Role.SUPER_ADMIN, ...])`).
- **Object-Level Authorization (IDOR Prevention)**: Queries for `College Admin` strictly filter by `institution_id`; `AICTE Officer` queries strictly filter by assigned region or portfolio.
- **Auditor Sandboxing**: `AUDITOR` accounts have strictly read-only capabilities across all entities.

## 3. Cryptographic Tamper-Evident Audit Logging
Every state-changing operation (transitions, approvals, rejections, user changes) computes:
$$\text{hash}_n = \text{SHA256}(\text{hash}_{n-1} + \text{actor} + \text{action} + \text{entity} + \text{payload} + \text{timestamp})$$
An automated background task and an on-demand `/api/v1/audit-logs/verify` endpoint traverse the chain to verify database integrity.

## 4. File Upload & Document Security
- **MIME Sniffing & Extension Whitelist**: Files are validated for magic byte signatures (`application/pdf`, `image/jpeg`, `image/png`). Executables (`.exe`, `.sh`, `.bat`, etc.) are unconditionally rejected.
- **Content-Addressable Hashing**: Uploads are stored with their SHA-256 digest as the filename, completely eliminating directory traversal (`../`) attacks.
- **Size Limits**: Enforced strictly at the web server and application layers (default max 15MB).

## 5. Defense in Depth
- **Input Sanitization**: Pydantic v2 strict schema validation on all incoming payloads.
- **SQL Injection Prevention**: 100% parameterized queries via SQLAlchemy 2.0 ORM.
- **CORS & Headers**: Strict CORS origin whitelisting, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`.

