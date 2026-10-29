# ApprovalTrack Deployment Guide

## 1. Quick Start with Docker Compose (Recommended)

To start the entire multi-container production stack with a single command:

```bash
docker compose up --build
```

This brings up:
1. `approvaltrack-db`: PostgreSQL 15 database on port `5432`
2. `approvaltrack-redis`: Redis message broker & cache on port `6379`
3. `approvaltrack-mailhog`: SMTP testing server on port `1025` / Web UI on `8025`
4. `approvaltrack-backend`: FastAPI backend on port `8000` (auto-runs migrations and seed)
5. `approvaltrack-worker`: Celery background task worker
6. `approvaltrack-beat`: Celery Beat scheduled job runner
7. `approvaltrack-frontend`: Nginx serving the React 18 production build on port `3000`

### Access Points:
- **Web UI**: [http://localhost:3000](http://localhost:3000)
- **Interactive API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **MailHog Email Inbox**: [http://localhost:8025](http://localhost:8025)

---

## 2. Non-Docker Local Run Instructions

If running directly on the host machine:

### Prerequisites:
- Python 3.11+
- Node.js 18+ & npm
- (Optional) PostgreSQL & Redis, or run with built-in SQLite async fallback!

### Step 1: Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Run database seed (creates sample institutions, users, rules, and applications):
python -m app.db.seed

# Start FastAPI server:
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 2: Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend will launch at `http://localhost:3000`.

---

## 3. Production Hardening Checklist
- Configure domain SSL certificates using Let's Encrypt / Certbot.
- Update `SECRET_KEY` in production `.env` to a 64-character random cryptographic secret.
- Connect Celery to a production Redis / RabbitMQ cluster.
- Configure corporate or government SMTP gateway in `.env`.

