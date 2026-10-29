# Architectural & Design Decisions

This document records key technical decisions made during the design and engineering of ApprovalTrack.

| Decision ID | Context / Question | Decision Taken | Rationale / Trade-offs |
|---|---|---|---|
| **ADR-001** | Database Engine & Compatibility | PostgreSQL 15+ in Docker / production; SQLite via `aiosqlite` enabled for zero-config local development | Allows instant local run without external database daemons while preserving full async SQLAlchemy 2.0 compatibility in production. |
| **ADR-002** | Workflow Orchestration | Custom Event-Driven Workflow Engine + Database Table Definitions (`workflow_stages`, `workflow_transitions`) | Hardcoding transitions in FastAPI routes makes policy changes painful. A database-backed workflow engine allows SUPER_ADMIN to adjust SLA days, required documents, and auto-advance rules dynamically. |
| **ADR-003** | Rule Engine Architecture | Pure Python JSON-Logic AST Engine supporting `all`, `any`, `not`, comparison operators, and computed facts | Provides complete auditability, safe execution without `eval()`, and includes an `explain` trace detailing exact pass/fail reasons. |
| **ADR-004** | Document Integrity & Storage | Content-addressable SHA-256 storage with file type magic sniffing | Prevents path traversal vulnerabilities and duplicate uploads. SHA-256 checksums guarantee authenticity for high-stakes regulatory documents. |
| **ADR-005** | Audit Trail Tamper Evidence | Cryptographic Hash Chaining (`prev_hash` + current row content -> SHA-256) | Guarantees tamper-evidence. Any manual SQL manipulation of audit logs breaks the chain and is immediately flagged by the verification endpoint. |
| **ADR-006** | Machine Learning Architecture | Scikit-learn Random Forest Classifier with Rule-Based Fallback | Trains on institutional historical attributes, stage durations, and deficiency counts to produce risk probabilities. The fallback guarantees deterministic risk ratings even if the model artifact is absent. |
| **ADR-007** | Frontend Framework & State | React 18 + TypeScript + Vite + Zustand + TanStack Query | Combines rapid development speed, type-safety across API models, and optimistic UI updates for high responsiveness during regulatory scrutiny. |

