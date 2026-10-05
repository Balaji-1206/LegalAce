import pytest
from app.modules.auth.service import (
    hash_password,
    verify_password,
    seed_demo_user,
    authenticate_user,
    register_user,
    reset_password,
)
from app.modules.auth.schemas import LoginRequest, RegisterRequest, ResetPasswordRequest


def test_hash_and_verify_password():
    password = "legalace123"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False


@pytest.mark.anyio
async def test_seed_demo_user():
    class MockCollection:
        def __init__(self):
            self.docs = []

        async def find_one(self, query):
            for doc in self.docs:
                if all(doc.get(k) == v for k, v in query.items()):
                    return doc
            return None

        async def insert_one(self, doc):
            self.docs.append(doc)
            return type("Result", (), {"inserted_id": "mock_id"})()

    class MockDB:
        def __init__(self):
            self.users = MockCollection()

        def __getitem__(self, item):
            if item == "users":
                return self.users
            raise KeyError(item)

    mock_db = MockDB()
    user = await seed_demo_user(mock_db)
    assert user["email"] == "demo@legalace.in"
    assert verify_password("legalace123", user["password_hash"]) is True

    # Calling again should not duplicate
    user_again = await seed_demo_user(mock_db)
    assert len(mock_db.users.docs) == 1
    assert user_again["email"] == "demo@legalace.in"


@pytest.mark.anyio
async def test_authenticate_user_success_and_failure():
    class MockCollection:
        def __init__(self):
            self.docs = [{
                "user_id": "user_demo_rahul",
                "name": "Adv. Rahul Sharma",
                "email": "demo@legalace.in",
                "password_hash": hash_password("legalace123"),
                "state": "Delhi (NCR)",
                "persona": "citizen",
            }]

        async def find_one(self, query):
            for doc in self.docs:
                if all(doc.get(k) == v for k, v in query.items()):
                    return doc
            return None

    class MockDB:
        def __init__(self):
            self.users = MockCollection()

        def __getitem__(self, item):
            if item == "users":
                return self.users
            raise KeyError(item)

    mock_db = MockDB()

    # Successful login
    auth_user = await authenticate_user(mock_db, LoginRequest(email="demo@legalace.in", password="legalace123"))
    assert auth_user is not None
    assert auth_user.email == "demo@legalace.in"
    assert auth_user.name == "Adv. Rahul Sharma"

    # Failed login with wrong password
    with pytest.raises(ValueError, match="Invalid email or password"):
        await authenticate_user(mock_db, LoginRequest(email="demo@legalace.in", password="badpassword"))

    # Failed login with unknown email
    with pytest.raises(ValueError, match="Invalid email or password"):
        await authenticate_user(mock_db, LoginRequest(email="unknown@legalace.in", password="legalace123"))


@pytest.mark.anyio
async def test_register_user_creates_account_and_prevents_duplicates():
    class MockCollection:
        def __init__(self):
            self.docs = []

        async def find_one(self, query):
            for doc in self.docs:
                if all(doc.get(k) == v for k, v in query.items()):
                    return doc
            return None

        async def insert_one(self, doc):
            self.docs.append(doc)
            return type("Result", (), {"inserted_id": "new_id"})()

    class MockDB:
        def __init__(self):
            self.users = MockCollection()

        def __getitem__(self, item):
            if item == "users":
                return self.users
            raise KeyError(item)

    mock_db = MockDB()

    # Register new user
    req = RegisterRequest(
        name="New Citizen",
        email="newuser@example.com",
        password="secretpassword",
        state="Maharashtra",
    )
    new_user = await register_user(mock_db, req)
    assert new_user.email == "newuser@example.com"
    assert new_user.name == "New Citizen"
    assert new_user.state == "Maharashtra"
    assert len(mock_db.users.docs) == 1

    # Duplicate registration should raise ValueError
    with pytest.raises(ValueError, match="already exists"):
        await register_user(mock_db, req)


@pytest.mark.anyio
async def test_reset_password_updates_credentials():
    docs = [{
        "user_id": "user_demo_rahul",
        "name": "Adv. Rahul Sharma",
        "email": "demo@legalace.in",
        "password_hash": hash_password("legalace123"),
        "state": "Delhi (NCR)",
        "persona": "citizen",
    }]

    class MockCollection:
        async def find_one(self, query):
            for doc in docs:
                if all(doc.get(k) == v for k, v in query.items()):
                    return doc
            return None

        async def update_one(self, query, update):
            for doc in docs:
                if all(doc.get(k) == v for k, v in query.items()):
                    if "$set" in update:
                        doc.update(update["$set"])
                    return type("Result", (), {"modified_count": 1})()
            return type("Result", (), {"modified_count": 0})()

    class MockDB:
        def __getitem__(self, item):
            if item == "users":
                return MockCollection()
            raise KeyError(item)

    mock_db = MockDB()

    # Reset password successfully
    reset_req = ResetPasswordRequest(
        email="demo@legalace.in",
        new_password="newsecretpass123",
    )
    result = await reset_password(mock_db, reset_req)
    assert result["status"] == "success"

    # New password now verifies
    auth_user = await authenticate_user(
        mock_db,
        LoginRequest(email="demo@legalace.in", password="newsecretpass123"),
    )
    assert auth_user.email == "demo@legalace.in"

    # Old password fails
    with pytest.raises(ValueError, match="Invalid email or password"):
        await authenticate_user(
            mock_db,
            LoginRequest(email="demo@legalace.in", password="legalace123"),
        )

    # Non-existent email fails
    with pytest.raises(ValueError, match="No account registered"):
        await reset_password(
            mock_db,
            ResetPasswordRequest(email="nonexistent@example.com", new_password="password123"),
        )
