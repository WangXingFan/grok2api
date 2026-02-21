"""
文件服务 API 路由
"""

import aiofiles.os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.core.logger import logger
from app.core.storage import DATA_DIR

router = APIRouter(tags=["Files"])

# 缓存根目录
BASE_DIR = DATA_DIR / "tmp"
IMAGE_DIR = BASE_DIR / "image"
VIDEO_DIR = BASE_DIR / "video"

# Force inline display instead of triggering browser download
_INLINE_HEADERS = {
    "Content-Disposition": "inline",
    "Cache-Control": "public, max-age=31536000, immutable",
}


def _resolve_media_path(base_dir: Path, filename: str) -> Path:
    """Resolve a safe media path under the target directory."""
    normalized = (filename or "").strip().replace("\\", "/")
    if not normalized:
        raise HTTPException(status_code=400, detail="Invalid filename")

    # Keep historical behavior: flatten nested segments from `{filename:path}`.
    normalized = normalized.replace("/", "-")

    # Block path tricks and drive-like payloads on Windows.
    if normalized in {".", ".."} or ".." in normalized or ":" in normalized:
        raise HTTPException(status_code=400, detail="Invalid filename")

    base_path = base_dir.resolve()
    candidate = (base_path / normalized).resolve()
    try:
        candidate.relative_to(base_path)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid filename")
    return candidate


@router.get("/image/{filename:path}")
async def get_image(filename: str):
    """
    获取图片文件
    """
    file_path = _resolve_media_path(IMAGE_DIR, filename)

    if await aiofiles.os.path.exists(file_path):
        if await aiofiles.os.path.isfile(file_path):
            content_type = "image/jpeg"
            if file_path.suffix.lower() == ".png":
                content_type = "image/png"
            elif file_path.suffix.lower() == ".webp":
                content_type = "image/webp"

            return FileResponse(
                file_path,
                media_type=content_type,
                headers=_INLINE_HEADERS,
            )

    logger.warning(f"Image not found: {filename}")
    raise HTTPException(status_code=404, detail="Image not found")


@router.get("/video/{filename:path}")
async def get_video(filename: str):
    """
    获取视频文件
    """
    file_path = _resolve_media_path(VIDEO_DIR, filename)

    if await aiofiles.os.path.exists(file_path):
        if await aiofiles.os.path.isfile(file_path):
            return FileResponse(
                file_path,
                media_type="video/mp4",
                headers=_INLINE_HEADERS,
            )

    logger.warning(f"Video not found: {filename}")
    raise HTTPException(status_code=404, detail="Video not found")
