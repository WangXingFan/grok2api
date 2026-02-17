"""
API auth helpers.
"""

import os
from typing import Optional

from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_config, is_public_mode

DEFAULT_API_KEY = ""
DEFAULT_APP_KEY = ""
LEGACY_DEFAULT_APP_KEY = "grok2api"
INSECURE_DEFAULT_OVERRIDE = {"1", "true", "yes", "on"}

security = HTTPBearer(
    auto_error=False,
    scheme_name="API Key",
    description="Enter your API Key in the format: Bearer <key>",
)


def _allow_insecure_default_app_key() -> bool:
    value = os.getenv("ALLOW_INSECURE_DEFAULT_APP_KEY", "")
    return value.strip().lower() in INSECURE_DEFAULT_OVERRIDE


def get_admin_api_key() -> str:
    """Return effective API key for protected API routes."""
    api_key = (get_config("app.api_key", DEFAULT_API_KEY) or "").strip()
    if api_key:
        return api_key

    if is_public_mode():
        return ""

    app_key = (get_config("app.app_key", DEFAULT_APP_KEY) or "").strip()
    if app_key == LEGACY_DEFAULT_APP_KEY and not _allow_insecure_default_app_key():
        return ""
    return app_key


async def verify_api_key(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Optional[str]:
    """Validate Bearer token for API access."""
    api_key = get_admin_api_key()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Authentication key is not configured. Set app.api_key "
                "or a non-default app.app_key."
            ),
        )

    if not auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if auth.credentials != api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return auth.credentials


async def verify_api_key_if_private(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Optional[str]:
    """Bypass auth in public mode, enforce auth in private mode."""
    if is_public_mode():
        return None
    return await verify_api_key(auth)


async def verify_playground_access(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Optional[str]:
    """Playground access follows site mode auth behavior."""
    if is_public_mode():
        return None
    return await verify_api_key(auth)


async def verify_app_key(
    auth: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Optional[str]:
    """Validate admin login app key."""
    app_key = (get_config("app.app_key", DEFAULT_APP_KEY) or "").strip()

    if not app_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="App key is not configured",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if app_key == LEGACY_DEFAULT_APP_KEY and not _allow_insecure_default_app_key():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Default app_key is disabled for security. "
                "Please set app.app_key to a custom value."
            ),
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if auth.credentials != app_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return auth.credentials
