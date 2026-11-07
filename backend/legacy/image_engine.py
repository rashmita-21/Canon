import os
from PIL import Image, ImageOps

try:
    from rapidocr_onnxruntime import RapidOCR
    ocr_engine = RapidOCR()
    OCR_AVAILABLE = True
except Exception as e:
    print(f"Warning: RapidOCR failed to initialize: {e}")
    OCR_AVAILABLE = False

def process_image(image_path: str):
    """Validates, strips metadata, fixes EXIF rotation, converts format if needed, and runs RapidOCR."""
    if not os.path.exists(image_path):
        return {"error": "Image file not found", "extractedText": "", "ocr_available": OCR_AVAILABLE}

    clean_path = image_path + "_clean.png"
    try:
        with Image.open(image_path) as img:
            # Validate extension/format
            ext = img.format.lower() if img.format else ""
            if ext not in ["png", "jpeg", "jpg", "webp"]:
                # Try inspecting file extension if format is None
                if not any(image_path.lower().endswith(x) for x in ['.png', '.jpg', '.jpeg', '.webp']):
                    return {"error": "Invalid image format. Only PNG, JPG, and WebP are supported.", "extractedText": "", "ocr_available": OCR_AVAILABLE}

            # Fix EXIF orientation if present
            img = ImageOps.exif_transpose(img)

            # Convert RGBA / Palette images to RGB for clean saving
            if img.mode in ("RGBA", "P", "LA"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                if "A" in img.getbands():
                    background.paste(img, mask=img.split()[-1])
                else:
                    background.paste(img)
                img = background
            elif img.mode != "RGB":
                img = img.convert("RGB")

            # Save clean normalized copy (strips all EXIF/metadata)
            img.save(clean_path, "PNG")

        extracted_text = ""
        if OCR_AVAILABLE:
            try:
                result, _ = ocr_engine(clean_path)
                if result:
                    extracted_text = " ".join([line[1] for line in result])
            except Exception as ocr_err:
                print(f"OCR execution error: {ocr_err}")

        # Clean up temp clean file
        if os.path.exists(clean_path):
            os.remove(clean_path)

        return {
            "ocr_available": OCR_AVAILABLE,
            "extractedText": extracted_text.strip() if extracted_text else "Banner uploaded successfully. No text detected by OCR.",
        }
    except Exception as e:
        if os.path.exists(clean_path):
            try:
                os.remove(clean_path)
            except:
                pass
        return {"error": f"Image processing failed: {str(e)}", "extractedText": "", "ocr_available": OCR_AVAILABLE}