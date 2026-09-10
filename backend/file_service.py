import os
import uuid
from io import BytesIO
from PIL import Image
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def clean_and_save_image(file_bytes: bytes, filename: str) -> tuple[str, str, int]:
    """
    Strips EXIF, GPS, and camera metadata from image files using Pillow.
    Returns (saved_filename, relative_path, file_size).
    """
    ext = os.path.splitext(filename)[1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(UPLOAD_DIR, unique_name)

    if ext in {".jpg", ".jpeg", ".png", ".webp"}:
        try:
            image = Image.open(BytesIO(file_bytes))
            # Removing EXIF by creating a fresh image without metadata
            data = list(image.getdata())
            clean_image = Image.new(image.mode, image.size)
            clean_image.putdata(data)
            
            # Save clean image
            if ext in {".jpg", ".jpeg"}:
                clean_image.save(dest_path, "JPEG", quality=95)
            elif ext == ".png":
                clean_image.save(dest_path, "PNG")
            elif ext == ".webp":
                clean_image.save(dest_path, "WEBP")
            else:
                clean_image.save(dest_path)
                
            file_size = os.path.getsize(dest_path)
            return unique_name, dest_path, file_size
        except Exception:
            # Fallback to saving as-is if image processing fails
            with open(dest_path, "wb") as f:
                f.write(file_bytes)
            return unique_name, dest_path, len(file_bytes)
    else:
        # Non-image files or GIFs
        with open(dest_path, "wb") as f:
            f.write(file_bytes)
        return unique_name, dest_path, len(file_bytes)


async def process_attachment(file: UploadFile) -> tuple[str, str, int, str]:
    """
    Validate, strip metadata and save uploaded file.
    """
    filename = file.filename or "attachment"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Недопустимый формат файла {ext}. Разрешены: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Размер файла превышает лимит 10 МБ"
        )

    unique_name, dest_path, size = clean_and_save_image(content, filename)
    mime_type = file.content_type or "application/octet-stream"

    return filename, dest_path, size, mime_type
