import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_login_and_auth_flow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Invalid credentials
        bad_res = await ac.post("/api/v1/auth/login", json={
            "email": "admin@approvaltrack.test",
            "password": "WrongPassword123"
        })
        assert bad_res.status_code == 401

        # Valid login
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "admin@approvaltrack.test",
            "password": "ApprovalTrack@2026"
        })
        assert login_res.status_code == 200
        tokens = login_res.json()
        assert "access_token" in tokens
        assert tokens["user"]["role"] == "SUPER_ADMIN"

        # Access protected endpoint with JWT
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        me_res = await ac.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "admin@approvaltrack.test"

@pytest.mark.asyncio
async def test_dashboard_summary():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "senior@approvaltrack.test",
            "password": "ApprovalTrack@2026"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.get("/api/v1/dashboard/summary", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total_applications"] > 0
        assert "sla_compliance_rate" in data

@pytest.mark.asyncio
async def test_audit_integrity_verification():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        login_res = await ac.post("/api/v1/auth/login", json={
            "email": "auditor@approvaltrack.test",
            "password": "ApprovalTrack@2026"
        })
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = await ac.get("/api/v1/audit-logs/verify", headers=headers)
        assert res.status_code == 200
        assert res.json()["status"] == "VALID"
        assert res.json()["is_intact"] is True

