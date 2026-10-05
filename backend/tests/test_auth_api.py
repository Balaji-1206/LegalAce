import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.modules.auth.service import hash_password

client = TestClient(app, raise_server_exceptions=False)


def test_login_api_endpoint_success():
    class MockCollection:
        async def find_one(self, query):
            if query.get("email") == "demo@legalace.in":
                return {
                    "user_id": "user_demo_rahul",
                    "name": "Adv. Rahul Sharma",
                    "email": "demo@legalace.in",
                    "password_hash": hash_password("legalace123"),
                    "state": "Delhi (NCR)",
                    "persona": "citizen",
                    "created_at": "2026-01-15T10:00:00.000Z",
                }
            return None

    class MockDB:
        def __getitem__(self, item):
            return MockCollection()

    with patch("app.modules.auth.api.get_database", return_value=MockDB()):
        resp = client.post(
            "/api/auth/login",
            json={"email": "demo@legalace.in", "password": "legalace123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["email"] == "demo@legalace.in"
        assert data["user"]["name"] == "Adv. Rahul Sharma"
        assert "token" in data
        assert data["message"] == "Login successful"


def test_login_api_endpoint_invalid_credentials():
    class MockCollection:
        async def find_one(self, query):
            return None

    class MockDB:
        def __getitem__(self, item):
            return MockCollection()

    with patch("app.modules.auth.api.get_database", return_value=MockDB()):
        resp = client.post(
            "/api/auth/login",
            json={"email": "demo@legalace.in", "password": "wrongpassword"},
        )
        assert resp.status_code == 401
        assert "Invalid email or password" in resp.json()["detail"]


def test_register_api_endpoint_success():
    saved_docs = []

    class MockCollection:
        async def find_one(self, query):
            for doc in saved_docs:
                if doc["email"] == query.get("email"):
                    return doc
            return None

        async def insert_one(self, doc):
            saved_docs.append(doc)
            return type("Result", (), {"inserted_id": "123"})()

    class MockDB:
        def __getitem__(self, item):
            return MockCollection()

    with patch("app.modules.auth.api.get_database", return_value=MockDB()):
        resp = client.post(
            "/api/auth/register",
            json={
                "name": "Priya Sharma",
                "email": "priya.sharma@example.com",
                "password": "strongpassword123",
                "state": "Tamil Nadu",
            },
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["user"]["email"] == "priya.sharma@example.com"
        assert data["user"]["name"] == "Priya Sharma"
        assert data["user"]["state"] == "Tamil Nadu"
        assert "token" in data


def test_reset_password_api_endpoint():
    user_doc = {
        "email": "demo@legalace.in",
        "password_hash": hash_password("legalace123"),
    }

    class MockCollection:
        async def find_one(self, query):
            if query.get("email") == user_doc["email"]:
                return user_doc
            return None

        async def update_one(self, query, update):
            if query.get("email") == user_doc["email"]:
                user_doc.update(update.get("$set", {}))
                return type("Result", (), {"modified_count": 1})()
            return type("Result", (), {"modified_count": 0})()

    class MockDB:
        def __getitem__(self, item):
            return MockCollection()

    with patch("app.modules.auth.api.get_database", return_value=MockDB()):
        # Successful reset
        resp = client.post(
            "/api/auth/reset-password",
            json={"email": "demo@legalace.in", "new_password": "supernewpass123"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "success"

        # Non-existent email
        resp_bad = client.post(
            "/api/auth/reset-password",
            json={"email": "ghost@legalace.in", "new_password": "supernewpass123"},
        )
        assert resp_bad.status_code == 400
        assert "No account registered" in resp_bad.json()["detail"]
