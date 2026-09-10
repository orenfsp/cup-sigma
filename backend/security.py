import os
import re
import hmac
import hashlib
import secrets
import json
import base64
import time
from datetime import datetime, timedelta
from typing import Optional, Tuple
from fastapi import HTTPException, status, Header, Request

# Unambiguous alphabet: 31 characters (no 0, O, 1, I, l)
TRACK_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
TRACK_REGEX = re.compile(r"^ОТК-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$")

SECRET_KEY = os.getenv("JWT_SECRET", secrets.token_hex(32))
TOKEN_EXPIRE_HOURS = 24

# Rate limiter in-memory storage: ip -> list of timestamps
_rate_limits: dict[str, list[float]] = {}
RATE_LIMIT_WINDOW = 60  # seconds
MAX_REQUESTS_PER_WINDOW = 5


def generate_track_number() -> str:
    """Generate cryptographically secure track number: ОТК-XXXX-XXXX"""
    part1 = "".join(secrets.choice(TRACK_ALPHABET) for _ in range(4))
    part2 = "".join(secrets.choice(TRACK_ALPHABET) for _ in range(4))
    return f"ОТК-{part1}-{part2}"


def validate_track_format(track_number: str) -> bool:
    """Validate format of track number."""
    if not track_number:
        return False
    # Support both Russian ОТК and English OTK in input for convenience, standardizing to Russian
    normalized = track_number.strip().upper().replace("OTK", "ОТК")
    return bool(TRACK_REGEX.match(normalized))


def normalize_track_number(track_number: str) -> str:
    """Normalize input track number."""
    return track_number.strip().upper().replace("OTK", "ОТК")


def check_rate_limit(client_ip: str) -> Tuple[bool, int]:
    """
    Check if client IP has exceeded the allowed rate of track number queries.
    Returns (is_allowed, retry_after_seconds).
    """
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW

    timestamps = _rate_limits.get(client_ip, [])
    # Filter only timestamps within the window
    recent = [ts for ts in timestamps if ts > cutoff]

    if len(recent) >= MAX_REQUESTS_PER_WINDOW:
        retry_after = int(RATE_LIMIT_WINDOW - (now - recent[0])) + 1
        _rate_limits[client_ip] = recent
        return False, max(1, retry_after)

    recent.append(now)
    _rate_limits[client_ip] = recent
    return True, 0


# Password hashing using PBKDF2-HMAC-SHA256
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"{salt}${key.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, key_hex = password_hash.split("$")
        check_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
        return hmac.compare_digest(check_key.hex(), key_hex)
    except Exception:
        return False


# Lightweight signed JWT-like tokens using HMAC-SHA256
def create_access_token(user_id: int, username: str, role: str, specialization: Optional[str] = None) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "spec": specialization or "",
        "exp": int(time.time() + TOKEN_EXPIRE_HOURS * 3600)
    }
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip('=')
    
    signature = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    
    return f"{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Optional[dict]:
    try:
        parts = token.split('.')
        if len(parts) != 2:
            return None
        payload_b64, sig_b64 = parts
        
        # Verify signature
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(expected_sig).decode('utf-8').rstrip('=')
        
        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            return None
        
        # Add back padding
        pad = len(payload_b64) % 4
        if pad:
            payload_b64 += '=' * (4 - pad)
            
        payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8'))
        
        if payload.get("exp", 0) < time.time():
            return None  # Expired
            
        return payload
    except Exception:
        return None
