import os
import sys
from PIL import Image, ImageEnhance, ImageOps
import numpy as np
from rembg import remove, new_session

def process_employee_image(input_path, output_main_path, output_thumb_path, session, target_width=750, thumb_height=200):
    print(f"--> Processing: {input_path}")

    # 1. Load image and fix EXIF orientation if present
    img = Image.open(input_path)
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGBA")
    w, h = img.size
    print(f"    Original orientation/size: {w}x{h}")

    # Downscale if massive to speed up rembg inference without losing quality for 750px output
    max_side = max(w, h)
    if max_side > 1600:
        scale = 1600 / max_side
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        print(f"    Resized for cutout to: {new_w}x{new_h}")

    # 2. Remove background using shared session
    cutout = remove(img, session=session)

    # 3. Get alpha bounding box to crop tightly to the person
    alpha = cutout.split()[3]
    bbox = alpha.getbbox()
    if bbox:
        # Bounding box is (left, top, right, bottom)
        person_left, person_top, person_right, person_bottom = bbox
        person_w = person_right - person_left
        person_h = person_bottom - person_top

        # Portrait framing down to mid-torso/chest area with aspect ratio around 1.10 to 1.15
        headroom = int(person_w * 0.05)
        crop_top = max(0, person_top - headroom)

        # Target height based on width for classic bust/portrait ratio ~ 1.13
        target_crop_h = int(person_w * 1.13)
        crop_bottom = min(cutout.height, crop_top + target_crop_h)

        crop_left = max(0, person_left - int(person_w * 0.02))
        crop_right = min(cutout.width, person_right + int(person_w * 0.02))

        cutout = cutout.crop((crop_left, crop_top, crop_right, crop_bottom))

    # 4. Color Grading: convert to black & white matching other employee images
    r, g, b, a = cutout.split()
    rgb = Image.merge("RGB", (r, g, b))

    # Convert to grayscale
    gray = rgb.convert("L")

    # Gentle tone curve: avoid clipping highlights (no harsh autocontrast cutoff)
    # Enhance contrast slightly to deepen blacks while preserving skin tones
    enhancer_contrast = ImageEnhance.Contrast(gray)
    gray = enhancer_contrast.enhance(1.18)

    # Convert back to RGBA with cropped alpha mask
    gray_rgb = gray.convert("RGB")
    gr, gg, gb = gray_rgb.split()
    final_rgba = Image.merge("RGBA", (gr, gg, gb, a))

    # 5. Resize to main target width (approx 750px width, proportional height)
    curr_w, curr_h = final_rgba.size
    aspect = curr_h / curr_w
    main_w = target_width
    main_h = int(main_w * aspect)
    main_img = final_rgba.resize((main_w, main_h), Image.Resampling.LANCZOS)

    os.makedirs(os.path.dirname(output_main_path), exist_ok=True)
    main_img.save(output_main_path, "PNG", optimize=True)
    print(f"    Saved main image: {output_main_path} ({main_w}x{main_h})")

    # 6. Generate thumbnail (height 200px, proportional width)
    thumb_h = thumb_height
    thumb_w = int(thumb_h / aspect)
    thumb_img = final_rgba.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)

    os.makedirs(os.path.dirname(output_thumb_path), exist_ok=True)
    thumb_img.save(output_thumb_path, "PNG", optimize=True)
    print(f"    Saved thumb image: {output_thumb_path} ({thumb_w}x{thumb_h})")

def main():
    pending_dir = os.path.join("public", "assets", "employee", "pending")
    main_dir = os.path.join("public", "assets", "employee")
    thumb_dir = os.path.join("public", "assets", "employee", "thumb")

    files = [f for f in os.listdir(pending_dir) if f.lower().endswith(('.jfif', '.jpeg', '.jpg', '.png'))]
    print(f"Found {len(files)} pending files: {files}")

    print("Initializing rembg session...")
    session = new_session("u2net")

    for filename in sorted(files):
        base_name = os.path.splitext(filename)[0].lower()
        input_path = os.path.join(pending_dir, filename)
        output_main = os.path.join(main_dir, f"{base_name}.png")
        output_thumb = os.path.join(thumb_dir, f"{base_name}.png")

        process_employee_image(input_path, output_main, output_thumb, session=session)

    print("\nAll pending images processed successfully!")

if __name__ == "__main__":
    main()
