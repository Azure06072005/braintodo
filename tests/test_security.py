from braintodo.auth.security import (
    create_access_token, decode_access_token, hash_password, verify_password,
)
import uuid


def test_hash_and_verify_password() -> None:
    hashed = hash_password("secret123")
    assert verify_password("secret123", hashed)
    assert not verify_password("wrong", hashed)


def test_create_and_decode_token_roundtrip() -> None:
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    assert decode_access_token(token) == user_id


def test_decode_invalid_token_returns_none() -> None:
    assert decode_access_token("not-a-real-token") is None