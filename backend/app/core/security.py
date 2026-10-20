from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import hashlib
import hmac
import base64
from app.core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    # Get the salt from the stored hash
    try:
        salt, stored_hash = hashed_password.split(':')
        # Hash the input password with the same salt
        test_hash = hash_password_with_salt(plain_password, salt)
        return hmac.compare_digest(test_hash, stored_hash)
    except Exception:
        return False

def hash_password_with_salt(password: str, salt: str) -> str:
    """Hash a password with a given salt"""
    combined = salt + password
    hash_obj = hashlib.sha256(combined.encode('utf-8'))
    return base64.b64encode(hash_obj.digest()).decode('utf-8')

def get_password_hash(password: str) -> str:
    """Generate a hashed password with a random salt"""
    import secrets
    # Generate a random salt
    salt = secrets.token_hex(16)
    # Hash the password with the salt
    hashed = hash_password_with_salt(password, salt)
    # Store salt and hash together
    return f"{salt}:{hashed}"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None