import logging
import re
import sys
from typing import Any, Dict

# Patterns for sensitive keys to redact from logs
SENSITIVE_PATTERNS = [
    re.compile(r'(password["\']?\s*[:=]\s*["\'])([^"\']+)'),
    re.compile(r'(secret["\']?\s*[:=]\s*["\'])([^"\']+)'),
    re.compile(r'(access_token["\']?\s*[:=]\s*["\'])([^"\']+)'),
    re.compile(r'(refresh_token["\']?\s*[:=]\s*["\'])([^"\']+)'),
    re.compile(r'(authorization["\']?\s*[:=]\s*["\'])([^"\']+)'),
    re.compile(r'(Bearer\s+)([A-Za-z0-9\-._~+/]+=*)'),
    re.compile(r'(api_key["\']?\s*[:=]\s*["\'])([^"\']+)'),
]

class RedactingFormatter(logging.Formatter):
    """Custom formatter that automatically redacts tokens, credentials, and secrets."""
    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        for pattern in SENSITIVE_PATTERNS:
            msg = pattern.sub(r'\1[REDACTED]', msg)
        return msg


def setup_logger(name: str = "studentos") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)
        formatter = RedactingFormatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger

logger = setup_logger()
