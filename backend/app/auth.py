import hmac

from fastapi import Header, HTTPException

from app.config import get_password


def verify_password(x_password: str = Header()) -> str:
    """FastAPI dependency that verifies the X-Password header."""
    if not hmac.compare_digest(x_password, get_password()):
        raise HTTPException(status_code=401, detail="Invalid password")
    return x_password
