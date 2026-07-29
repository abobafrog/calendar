import httpx
import pytest
from app.main import app


@pytest.mark.asyncio
async def test_health_endpoint() -> None:
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_private_endpoint_requires_authentication() -> None:
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "authentication_required"


@pytest.mark.asyncio
async def test_logout_always_clears_session_cookie() -> None:
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/auth/logout")
    assert response.status_code == 204
    assert "timetogether_session=" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]


@pytest.mark.asyncio
async def test_untrusted_write_origin_is_rejected() -> None:
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/logout",
            headers={"Origin": "https://attacker.example"},
        )
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "origin_denied"
