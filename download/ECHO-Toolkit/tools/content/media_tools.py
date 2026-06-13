"""
ECHO Toolkit — Media Tools
Flask Blueprint with 9 fully functional media & image utilities.
Each tool exposes a web UI route (GET -> HTML) and an API route (POST -> JSON).
"""

import sys
import os
import io
import base64
import math
import hashlib

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from flask import Blueprint, render_template, request, jsonify, send_file
import qrcode
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance, ImageOps

from database import log_tool_usage

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------
media_tools_bp = Blueprint(
    "media_tools_bp",
    __name__,
    url_prefix="/tools/media",
    template_folder="../../templates",
)

# ---------------------------------------------------------------------------
# Color Math Helpers
# ---------------------------------------------------------------------------

def _hex_to_rgb(hex_str):
    """Convert hex color string to (R, G, B) tuple (0-255)."""
    hex_str = hex_str.strip().lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join(c * 2 for c in hex_str)
    if len(hex_str) != 6:
        raise ValueError(f"Invalid hex color: {hex_str}")
    return int(hex_str[0:2], 16), int(hex_str[2:4], 16), int(hex_str[4:6], 16)


def _rgb_to_hex(r, g, b):
    """Convert (R, G, B) to hex string."""
    return f"#{max(0,min(255,r)):02X}{max(0,min(255,g)):02X}{max(0,min(255,b)):02X}"


def _rgb_to_hsl(r, g, b):
    """Convert RGB (0-255) to HSL. Returns (H degrees, S 0-1, L 0-1)."""
    r_n, g_n, b_n = r / 255.0, g / 255.0, b / 255.0
    cmax = max(r_n, g_n, b_n)
    cmin = min(r_n, g_n, b_n)
    delta = cmax - cmin
    l = (cmax + cmin) / 2.0
    if delta == 0:
        h = 0.0
        s = 0.0
    else:
        s = delta / (2.0 - cmax - cmin) if (2.0 - cmax - cmin) != 0 else delta / (cmax + cmin)
        if cmax == r_n:
            h = ((g_n - b_n) / delta) % 6
        elif cmax == g_n:
            h = (b_n - r_n) / delta + 2
        else:
            h = (r_n - g_n) / delta + 4
        h *= 60
        if h < 0:
            h += 360
    return h, s, l


def _hsl_to_rgb(h, s, l):
    """Convert HSL to RGB (0-255). h in degrees, s and l in 0-1."""
    c = (1 - abs(2 * l - 1)) * s
    x = c * (1 - abs((h / 60) % 2 - 1))
    m = l - c / 2
    if h < 60:
        r1, g1, b1 = c, x, 0
    elif h < 120:
        r1, g1, b1 = x, c, 0
    elif h < 180:
        r1, g1, b1 = 0, c, x
    elif h < 240:
        r1, g1, b1 = 0, x, c
    elif h < 300:
        r1, g1, b1 = x, 0, c
    else:
        r1, g1, b1 = c, 0, x
    return (
        max(0, min(255, round((r1 + m) * 255))),
        max(0, min(255, round((g1 + m) * 255))),
        max(0, min(255, round((b1 + m) * 255))),
    )


def _color_info(hex_color):
    """Return full color info dict for a hex color."""
    r, g, b = _hex_to_rgb(hex_color)
    h, s, l = _rgb_to_hsl(r, g, b)
    return {
        "hex": _rgb_to_hex(r, g, b),
        "rgb": {"r": r, "g": g, "b": b},
        "hsl": {"h": round(h, 2), "s": round(s, 2), "l": round(l, 2)},
        "css_variable": f"--color: {_rgb_to_hex(r, g, b)};",
    }


# ---------------------------------------------------------------------------
# Image Helpers
# ---------------------------------------------------------------------------

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff', 'ico'}


def _validate_image_file(file_storage):
    """Validate that an uploaded file is an image. Returns the file or raises ValueError."""
    if not file_storage or not file_storage.filename:
        raise ValueError("No file provided.")
    ext = file_storage.filename.rsplit('.', 1)[-1].lower() if '.' in file_storage.filename else ''
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError(f"Unsupported image format: .{ext}. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}")
    return file_storage


def _load_image(file_storage):
    """Load a PIL Image from a file storage object."""
    _validate_image_file(file_storage)
    try:
        img_bytes = file_storage.read()
        img = Image.open(io.BytesIO(img_bytes))
        img.load()  # force load to catch truncation errors early
        return img
    except Exception as e:
        raise ValueError(f"Failed to load image: {str(e)}")


def _image_to_bytes(img, fmt="PNG", quality=95):
    """Convert PIL Image to bytes in the given format."""
    buf = io.BytesIO()
    save_kwargs = {}
    if fmt.upper() in ("JPEG", "JPG"):
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")
        save_kwargs["quality"] = max(1, min(100, quality))
    elif fmt.upper() == "WEBP":
        save_kwargs["quality"] = max(1, min(100, quality))
    elif fmt.upper() == "GIF":
        save_kwargs["optimize"] = True
    img.save(buf, format=fmt.upper(), **save_kwargs)
    buf.seek(0)
    return buf.getvalue()


def _find_default_font(size=20):
    """Try to find a usable default font on the system."""
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _get_mime_type(fmt):
    """Return MIME type for a given image format."""
    mime_map = {
        "PNG": "image/png",
        "JPEG": "image/jpeg",
        "JPG": "image/jpeg",
        "WEBP": "image/webp",
        "BMP": "image/bmp",
        "GIF": "image/gif",
        "ICO": "image/x-icon",
    }
    return mime_map.get(fmt.upper(), "application/octet-stream")


# ===========================================================================
# 1. QR Code Generator
# ===========================================================================

ERROR_CORRECT_MAP = {
    "L": ERROR_CORRECT_L,
    "M": ERROR_CORRECT_M,
    "Q": ERROR_CORRECT_Q,
    "H": ERROR_CORRECT_H,
}


@media_tools_bp.route("/qr-generator", methods=["GET"])
def qr_generator_page():
    """Render the QR Code Generator web UI."""
    return render_template("tools/qr-generator.html")


@media_tools_bp.route("/qr-generator/generate", methods=["POST"])
def qr_generator_api():
    """API: generate a QR code as base64 PNG."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "").strip()
        size = int(data.get("size", 300))
        fg_color = data.get("fg_color", "#000000").strip()
        bg_color = data.get("bg_color", "#FFFFFF").strip()
        ec_level = data.get("error_correction", "M").upper().strip()

        if not text:
            return jsonify({"status": "error", "message": "No text or URL provided."})

        if ec_level not in ERROR_CORRECT_MAP:
            return jsonify({
                "status": "error",
                "message": f"Invalid error correction level: '{ec_level}'. Use L, M, Q, or H.",
            })

        # Validate colors
        try:
            _hex_to_rgb(fg_color)
        except ValueError:
            return jsonify({"status": "error", "message": f"Invalid foreground color: '{fg_color}'. Use hex format like #FF0000."})

        try:
            _hex_to_rgb(bg_color)
        except ValueError:
            return jsonify({"status": "error", "message": f"Invalid background color: '{bg_color}'. Use hex format like #FFFFFF."})

        size = max(50, min(2000, size))

        qr = qrcode.QRCode(
            version=None,  # auto
            error_correction=ERROR_CORRECT_MAP[ec_level],
            box_size=max(1, size // 30),
            border=4,
        )
        qr.add_data(text)
        qr.make(fit=True)

        img = qr.make_image(fill_color=fg_color, back_color=bg_color)

        # Resize to exact requested size
        img = img.resize((size, size), Image.LANCZOS)

        # Convert to base64
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64_data = base64.b64encode(buf.getvalue()).decode("ascii")

        log_tool_usage("qr-generator", "generate", f"text={text[:80]}, size={size}")

        return jsonify({
            "status": "success",
            "data": {
                "image_base64": b64_data,
                "mime_type": "image/png",
                "data_url": f"data:image/png;base64,{b64_data}",
                "size": size,
                "text_length": len(text),
                "error_correction": ec_level,
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# ===========================================================================
# 2. Color Palette Generator
# ===========================================================================

PALETTE_TYPES = [
    "complementary", "analogous", "triadic", "split-complementary",
    "monochromatic", "tetradic",
]


def _generate_palette(hex_color, palette_type):
    """Generate a color palette from a base color using color theory."""
    r, g, b = _hex_to_rgb(hex_color)
    h, s, l = _rgb_to_hsl(r, g, b)

    colors = [_color_info(hex_color)]  # always include base color first

    if palette_type == "complementary":
        comp_h = (h + 180) % 360
        cr, cg, cb = _hsl_to_rgb(comp_h, s, l)
        colors.append(_color_info(_rgb_to_hex(cr, cg, cb)))

    elif palette_type == "analogous":
        for offset in [-30, 30, -60, 60]:
            new_h = (h + offset) % 360
            nr, ng, nb = _hsl_to_rgb(new_h, s, l)
            colors.append(_color_info(_rgb_to_hex(nr, ng, nb)))

    elif palette_type == "triadic":
        for offset in [120, 240]:
            new_h = (h + offset) % 360
            nr, ng, nb = _hsl_to_rgb(new_h, s, l)
            colors.append(_color_info(_rgb_to_hex(nr, ng, nb)))

    elif palette_type == "split-complementary":
        for offset in [150, 210]:
            new_h = (h + offset) % 360
            nr, ng, nb = _hsl_to_rgb(new_h, s, l)
            colors.append(_color_info(_rgb_to_hex(nr, ng, nb)))

    elif palette_type == "monochromatic":
        # Vary lightness while keeping hue and saturation
        lightness_values = [0.15, 0.30, 0.50, 0.70, 0.85]
        for lv in lightness_values:
            nr, ng, nb = _hsl_to_rgb(h, s, lv)
            c = _color_info(_rgb_to_hex(nr, ng, nb))
            if c["hex"].lower() != hex_color.lower():
                colors.append(c)

    elif palette_type == "tetradic":
        for offset in [90, 180, 270]:
            new_h = (h + offset) % 360
            nr, ng, nb = _hsl_to_rgb(new_h, s, l)
            colors.append(_color_info(_rgb_to_hex(nr, ng, nb)))

    return colors


@media_tools_bp.route("/color-palette", methods=["GET"])
def color_palette_page():
    """Render the Color Palette Generator web UI."""
    return render_template("tools/color-palette.html")


@media_tools_bp.route("/color-palette/generate", methods=["POST"])
def color_palette_generate_api():
    """API: generate a color palette from a base color."""
    try:
        data = request.get_json(silent=True) or {}
        base_color = data.get("base_color", "#3B82F6").strip()
        palette_type = data.get("palette_type", "complementary").strip().lower()

        if palette_type not in PALETTE_TYPES:
            return jsonify({
                "status": "error",
                "message": f"Unknown palette type: '{palette_type}'. Supported: {', '.join(PALETTE_TYPES)}",
            })

        try:
            _hex_to_rgb(base_color)
        except ValueError:
            return jsonify({"status": "error", "message": f"Invalid hex color: '{base_color}'. Use format like #3B82F6."})

        colors = _generate_palette(base_color, palette_type)

        log_tool_usage("color-palette", "generate", f"base={base_color}, type={palette_type}")

        return jsonify({
            "status": "success",
            "data": {
                "base_color": base_color,
                "palette_type": palette_type,
                "colors": colors,
                "count": len(colors),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# ===========================================================================
# 3. Image Format Converter
# ===========================================================================

OUTPUT_FORMATS = ["PNG", "JPEG", "WebP", "BMP", "GIF"]


@media_tools_bp.route("/image-converter", methods=["GET"])
def image_converter_page():
    """Render the Image Format Converter web UI."""
    return render_template("tools/image-converter.html")


@media_tools_bp.route("/image-converter", methods=["POST"])
def image_converter_api():
    """API: convert image to a different format."""
    try:
        if "file" not in request.files:
            return jsonify({"status": "error", "message": "No file uploaded. Provide a 'file' field."})

        file = request.files["file"]
        output_format = request.form.get("format", "PNG").strip().upper()
        quality = int(request.form.get("quality", 95))
        resize_percent = int(request.form.get("resize_percent", 100))

        if output_format not in OUTPUT_FORMATS:
            return jsonify({
                "status": "error",
                "message": f"Unsupported format: '{output_format}'. Supported: {', '.join(OUTPUT_FORMATS)}",
            })

        quality = max(1, min(100, quality))
        resize_percent = max(1, min(500, resize_percent))

        img = _load_image(file)

        # Resize if requested
        if resize_percent != 100:
            new_w = max(1, int(img.width * resize_percent / 100))
            new_h = max(1, int(img.height * resize_percent / 100))
            img = img.resize((new_w, new_h), Image.LANCZOS)

        img_bytes = _image_to_bytes(img, fmt=output_format, quality=quality)
        mime = _get_mime_type(output_format)

        log_tool_usage(
            "image-converter", "convert",
            f"format={output_format}, quality={quality}, resize={resize_percent}%",
        )

        buf = io.BytesIO(img_bytes)
        return send_file(
            buf,
            mimetype=mime,
            as_attachment=True,
            download_name=f"converted.{output_format.lower()}",
        )
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# ===========================================================================
# 4. Image Resizer / Cropper
# ===========================================================================

@media_tools_bp.route("/image-resizer", methods=["GET"])
def image_resizer_page():
    """Render the Image Resizer / Cropper web UI."""
    return render_template("tools/image-resizer.html")


@media_tools_bp.route("/image-resizer", methods=["POST"])
def image_resizer_api():
    """API: resize an image."""
    try:
        if "file" not in request.files:
            return jsonify({"status": "error", "message": "No file uploaded. Provide a 'file' field."})

        file = request.files["file"]
        width = request.form.get("width", "").strip()
        height = request.form.get("height", "").strip()
        scale_percent = request.form.get("scale_percent", "").strip()
        maintain_aspect = request.form.get("maintain_aspect", "true").lower() == "true"
        output_format = request.form.get("format", "PNG").strip().upper()
        quality = int(request.form.get("quality", 95))

        img = _load_image(file)
        orig_w, orig_h = img.size
        new_w, new_h = orig_w, orig_h

        # Determine new dimensions
        has_width = width.isdigit() and int(width) > 0
        has_height = height.isdigit() and int(height) > 0
        has_scale = scale_percent.isdigit() and int(scale_percent) > 0

        if has_scale:
            pct = max(1, min(5000, int(scale_percent)))
            new_w = max(1, int(orig_w * pct / 100))
            new_h = max(1, int(orig_h * pct / 100))
        elif has_width and has_height:
            new_w = max(1, int(width))
            new_h = max(1, int(height))
        elif has_width:
            new_w = max(1, int(width))
            if maintain_aspect:
                ratio = new_w / orig_w
                new_h = max(1, int(orig_h * ratio))
            else:
                new_h = orig_h
        elif has_height:
            new_h = max(1, int(height))
            if maintain_aspect:
                ratio = new_h / orig_h
                new_w = max(1, int(orig_w * ratio))
            else:
                new_w = orig_w
        else:
            return jsonify({
                "status": "error",
                "message": "Provide width, height, or scale_percent to resize.",
            })

        img = img.resize((new_w, new_h), Image.LANCZOS)
        img_bytes = _image_to_bytes(img, fmt=output_format, quality=quality)
        mime = _get_mime_type(output_format)

        log_tool_usage(
            "image-resizer", "resize",
            f"orig={orig_w}x{orig_h}, new={new_w}x{new_h}",
        )

        buf = io.BytesIO(img_bytes)
        return send_file(
            buf,
            mimetype=mime,
            as_attachment=True,
            download_name=f"resized.{output_format.lower()}",
        )
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# ===========================================================================
# 5. Meme Generator
# ===========================================================================

@media_tools_bp.route("/meme-generator", methods=["GET"])
def meme_generator_page():
    """Render the Meme Generator web UI."""
    return render_template("tools/meme-generator.html")


@media_tools_bp.route("/meme-generator", methods=["POST"])
def meme_generator_api():
    """API: generate a meme image with top/bottom text."""
    try:
        if "file" not in request.files:
            return jsonify({"status": "error", "message": "No file uploaded. Provide a 'file' field."})

        file = request.files["file"]
        top_text = request.form.get("top_text", "").upper().strip()
        bottom_text = request.form.get("bottom_text", "").upper().strip()
        font_size = int(request.form.get("font_size", 0))
        font_color = request.form.get("font_color", "#FFFFFF").strip()
        output_format = request.form.get("format", "PNG").strip().upper()

        # Validate font color
        try:
            _hex_to_rgb(font_color)
        except ValueError:
            return jsonify({"status": "error", "message": f"Invalid font color: '{font_color}'."})

        img = _load_image(file)

        # Auto-size font if not specified
        if font_size <= 0:
            font_size = max(16, min(72, img.width // 12))

        font = _find_default_font(font_size)

        # Ensure image has alpha channel for compositing
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        draw = ImageDraw.Draw(img)

        def _draw_meme_text(text, y_position, is_top=True):
            """Draw meme-style text with black stroke and colored fill."""
            if not text:
                return

            stroke_width = max(2, font_size // 12)

            # Calculate text bounding box
            bbox = draw.textbbox((0, 0), text, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]

            # Scale font down if text is too wide
            current_font = font
            current_font_size = font_size
            while text_w > img.width - 20 and current_font_size > 8:
                current_font_size -= 2
                current_font = _find_default_font(current_font_size)
                bbox = draw.textbbox((0, 0), text, font=current_font)
                text_w = bbox[2] - bbox[0]
                text_h = bbox[3] - bbox[1]

            if is_top:
                x = (img.width - text_w) // 2
                y = 10
            else:
                x = (img.width - text_w) // 2
                y = img.height - text_h - 10

            # Draw stroke (black outline)
            stroke_color = "#000000"
            for dx in range(-stroke_width, stroke_width + 1):
                for dy in range(-stroke_width, stroke_width + 1):
                    if dx * dx + dy * dy <= stroke_width * stroke_width:
                        draw.text((x + dx, y + dy), text, fill=stroke_color, font=current_font)

            # Draw main text
            draw.text((x, y), text, fill=font_color, font=current_font)

        _draw_meme_text(top_text, 10, is_top=True)
        _draw_meme_text(bottom_text, img.height, is_top=False)

        img_bytes = _image_to_bytes(img, fmt=output_format, quality=95)
        mime = _get_mime_type(output_format)

        log_tool_usage("meme-generator", "generate", f"top={top_text[:30]}, bottom={bottom_text[:30]}")

        buf = io.BytesIO(img_bytes)
        return send_file(
            buf,
            mimetype=mime,
            as_attachment=True,
            download_name=f"meme.{output_format.lower()}",
        )
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# ===========================================================================
# 6. Watermark Tool
# ===========================================================================

WATERMARK_POSITIONS = ["center", "corner", "tiled"]


@media_tools_bp.route("/watermark-tool", methods=["GET"])
def watermark_tool_page():
    """Render the Watermark Tool web UI."""
    return render_template("tools/watermark-tool.html")


@media_tools_bp.route("/watermark-tool", methods=["POST"])
def watermark_tool_api():
    """API: apply a text watermark to an image."""
    try:
        if "file" not in request.files:
            return jsonify({"status": "error", "message": "No file uploaded. Provide a 'file' field."})

        file = request.files["file"]
        watermark_text = request.form.get("watermark_text", "").strip()
        position = request.form.get("position", "center").strip().lower()
        opacity = float(request.form.get("opacity", 0.5))
        font_size = int(request.form.get("font_size", 0))
        output_format = request.form.get("format", "PNG").strip().upper()

        if not watermark_text:
            return jsonify({"status": "error", "message": "No watermark text provided."})

        if position not in WATERMARK_POSITIONS:
            return jsonify({
                "status": "error",
                "message": f"Invalid position: '{position}'. Supported: {', '.join(WATERMARK_POSITIONS)}",
            })

        opacity = max(0.0, min(1.0, opacity))

        img = _load_image(file)

        # Auto-size font if not specified
        if font_size <= 0:
            font_size = max(12, min(64, img.width // 15))

        font = _find_default_font(font_size)

        # Work in RGBA for alpha compositing
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        # Create watermark layer
        watermark_layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(watermark_layer)

        # Watermark text color with opacity
        alpha_val = int(opacity * 255)

        if position == "center":
            bbox = draw.textbbox((0, 0), watermark_text, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            x = (img.width - text_w) // 2
            y = (img.height - text_h) // 2
            draw.text((x, y), watermark_text, fill=(255, 255, 255, alpha_val), font=font)

        elif position == "corner":
            # Bottom-right corner with padding
            bbox = draw.textbbox((0, 0), watermark_text, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            padding = max(10, font_size // 2)
            x = img.width - text_w - padding
            y = img.height - text_h - padding
            draw.text((x, y), watermark_text, fill=(255, 255, 255, alpha_val), font=font)

        elif position == "tiled":
            # Tile the watermark across the entire image with 45-degree spacing
            bbox = draw.textbbox((0, 0), watermark_text, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]

            # Create a single watermark tile
            tile_w = text_w + max(40, font_size * 2)
            tile_h = text_h + max(60, font_size * 3)
            tile = Image.new("RGBA", (tile_w, tile_h), (0, 0, 0, 0))
            tile_draw = ImageDraw.Draw(tile)
            tile_draw.text((0, 0), watermark_text, fill=(255, 255, 255, alpha_val), font=font)

            # Rotate tile -30 degrees for diagonal tiling
            tile = tile.rotate(-30, expand=True, resample=Image.BICUBIC)

            # Paste tile across the image
            paste_x = -tile.width
            paste_y = -tile.height
            while paste_y < img.height:
                while paste_x < img.width:
                    watermark_layer.paste(tile, (paste_x, paste_y), tile)
                    paste_x += tile.width
                paste_x = -tile.width
                paste_y += tile.height

        # Composite watermark onto image
        img = Image.alpha_composite(img, watermark_layer)

        img_bytes = _image_to_bytes(img, fmt=output_format, quality=95)
        mime = _get_mime_type(output_format)

        log_tool_usage(
            "watermark-tool", "apply",
            f"text={watermark_text[:30]}, position={position}, opacity={opacity}",
        )

        buf = io.BytesIO(img_bytes)
        return send_file(
            buf,
            mimetype=mime,
            as_attachment=True,
            download_name=f"watermarked.{output_format.lower()}",
        )
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# ===========================================================================
# 7. Favicon Generator
# ===========================================================================

@media_tools_bp.route("/favicon-generator", methods=["GET"])
def favicon_generator_page():
    """Render the Favicon Generator web UI."""
    return render_template("tools/favicon-generator.html")


@media_tools_bp.route("/favicon-generator", methods=["POST"])
def favicon_generator_api():
    """API: generate a favicon.ico from an uploaded image or text."""
    try:
        has_file = "file" in request.files and request.files["file"].filename
        text_input = request.form.get("text", "").strip()
        bg_color = request.form.get("background_color", "#3B82F6").strip()
        text_color = request.form.get("text_color", "#FFFFFF").strip()

        # Validate colors
        try:
            _hex_to_rgb(bg_color)
        except ValueError:
            return jsonify({"status": "error", "message": f"Invalid background color: '{bg_color}'."})

        try:
            _hex_to_rgb(text_color)
        except ValueError:
            return jsonify({"status": "error", "message": f"Invalid text color: '{text_color}'."})

        if has_file:
            # Generate from uploaded image
            file = request.files["file"]
            img = _load_image(file)
            if img.mode != "RGBA":
                img = img.convert("RGBA")
        elif text_input:
            # Generate from text
            bg_rgb = _hex_to_rgb(bg_color)
            # Create a 64x64 base image (will be downscaled)
            base_size = 64
            img = Image.new("RGBA", (base_size, base_size), bg_rgb + (255,))
            draw = ImageDraw.Draw(img)

            # Auto-fit text size
            font_size = base_size - 8
            font = _find_default_font(font_size)
            bbox = draw.textbbox((0, 0), text_input[0:3], font=font)  # max 3 chars
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]

            # Shrink if text doesn't fit
            while (text_w > base_size - 8 or text_h > base_size - 8) and font_size > 4:
                font_size -= 2
                font = _find_default_font(font_size)
                bbox = draw.textbbox((0, 0), text_input[0:3], font=font)
                text_w = bbox[2] - bbox[0]
                text_h = bbox[3] - bbox[1]

            x = (base_size - text_w) // 2
            y = (base_size - text_h) // 2
            draw.text((x, y), text_input[:3], fill=text_color, font=font)
        else:
            return jsonify({"status": "error", "message": "Provide either a file upload or text input."})

        # Generate multi-size ICO: 16x16, 32x32, 48x48
        sizes = [(16, 16), (32, 32), (48, 48)]
        ico_images = []
        for s in sizes:
            resized = img.resize(s, Image.LANCZOS)
            ico_images.append(resized)

        # Save as ICO
        buf = io.BytesIO()
        # PIL saves the first image as the base; additional images for other sizes
        ico_images[0].save(
            buf,
            format="ICO",
            sizes=[(im.width, im.height) for im in ico_images],
            append_images=ico_images[1:],
        )
        buf.seek(0)

        log_tool_usage("favicon-generator", "generate", f"source={'file' if has_file else 'text'}")

        return send_file(
            buf,
            mimetype="image/x-icon",
            as_attachment=True,
            download_name="favicon.ico",
        )
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# ===========================================================================
# 8. Image Info / Screenshot Info Tool
# ===========================================================================

@media_tools_bp.route("/image-info", methods=["GET"])
def image_info_page():
    """Render the Image Info web UI."""
    return render_template("tools/image-info.html")


@media_tools_bp.route("/image-info", methods=["POST"])
def image_info_api():
    """API: extract metadata and info from an uploaded image."""
    try:
        if "file" not in request.files:
            return jsonify({"status": "error", "message": "No file uploaded. Provide a 'file' field."})

        file = request.files["file"]

        # Read file bytes first (for size)
        file_bytes = file.read()
        file_size = len(file_bytes)

        # Re-open as PIL image
        img = Image.open(io.BytesIO(file_bytes))

        width, height = img.size
        img_format = img.format or "Unknown"
        img_mode = img.mode

        # DPI
        dpi = img.info.get("dpi")
        dpi_info = None
        if dpi:
            dpi_info = {"x": dpi[0], "y": dpi[1]}

        # Aspect ratio
        from math import gcd
        divisor = gcd(width, height)
        ar_num = width // divisor
        ar_den = height // divisor
        # Simplify to common aspect ratios
        aspect_ratio_str = f"{ar_num}:{ar_den}"
        decimal_ar = round(width / height, 3) if height > 0 else 0

        # Common aspect ratio names
        common_ars = {
            "1.000": "1:1 (Square)",
            "1.333": "4:3",
            "1.500": "3:2",
            "1.600": "16:10",
            "1.778": "16:9",
            "2.333": "21:9",
            "0.750": "3:4 (Portrait)",
            "0.667": "2:3 (Portrait)",
            "0.563": "9:16 (Portrait)",
        }
        ar_label = common_ars.get(f"{decimal_ar:.3f}", aspect_ratio_str)

        # Color space / mode description
        mode_descriptions = {
            "1": "1-bit pixels, black and white",
            "L": "8-bit pixels, grayscale",
            "P": "8-bit pixels, mapped to palette",
            "RGB": "3x8-bit pixels, true color",
            "RGBA": "4x8-bit pixels, true color with transparency",
            "CMYK": "4x8-bit pixels, color separation",
            "YCbCr": "3x8-bit pixels, video format",
            "LAB": "3x8-bit pixels, L*a*b color space",
            "HSV": "3x8-bit pixels, Hue, Saturation, Value",
            "I": "32-bit signed integer pixels",
            "F": "32-bit floating point pixels",
            "LA": "8-bit grayscale + alpha",
            "PA": "8-bit palette + alpha",
            "RGBa": "Premultiplied RGB + alpha",
        }
        mode_description = mode_descriptions.get(img_mode, f"{img_mode} mode")

        # Pixel count and megapixels
        total_pixels = width * height
        megapixels = round(total_pixels / 1_000_000, 2)

        # EXIF data
        exif_data = {}
        try:
            from PIL.ExifTags import TAGS
            exif_raw = img.getexif()
            if exif_raw:
                for tag_id, value in exif_raw.items():
                    tag_name = TAGS.get(tag_id, tag_id)
                    if isinstance(value, bytes):
                        try:
                            value = value.decode("utf-8", errors="replace")
                        except Exception:
                            value = f"<{len(value)} bytes>"
                    # Handle rational numbers
                    elif hasattr(value, 'numerator') and hasattr(value, 'denominator'):
                        value = float(value)
                    try:
                        exif_data[str(tag_name)] = value
                    except (TypeError, ValueError):
                        exif_data[str(tag_name)] = str(value)
        except (AttributeError, ImportError, Exception):
            exif_data = {"note": "Could not read EXIF data"}

        # File info
        file_name = file.filename or "unknown"
        file_ext = file_name.rsplit('.', 1)[-1].lower() if '.' in file_name else "unknown"

        # Color depth
        band_count = len(img.getbands()) if hasattr(img, 'getbands') else 0
        bits_per_band = 8  # most common
        total_bit_depth = band_count * bits_per_band

        # Dominant colors (simple sampling)
        try:
            small = img.copy()
            small.thumbnail((64, 64), Image.LANCZOS)
            if small.mode != "RGB":
                small = small.convert("RGB")
            pixels = list(small.getdata())
            # Count color frequencies
            color_counts = {}
            for px in pixels:
                key = px
                color_counts[key] = color_counts.get(key, 0) + 1
            # Top 5
            sorted_colors = sorted(color_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            dominant_colors = [
                _rgb_to_hex(r, g, b) for (r, g, b), _ in sorted_colors
            ]
        except Exception:
            dominant_colors = []

        log_tool_usage("image-info", "analyze", f"file={file_name}, {width}x{height}")

        return jsonify({
            "status": "success",
            "data": {
                "file": {
                    "name": file_name,
                    "extension": file_ext,
                    "size_bytes": file_size,
                    "size_human": _format_bytes(file_size),
                },
                "dimensions": {
                    "width": width,
                    "height": height,
                    "total_pixels": total_pixels,
                    "megapixels": megapixels,
                },
                "format": img_format,
                "mode": img_mode,
                "mode_description": mode_description,
                "color_depth_bits": total_bit_depth,
                "bands": band_count,
                "dpi": dpi_info,
                "aspect_ratio": {
                    "string": ar_label,
                    "decimal": decimal_ar,
                    "numerator": ar_num,
                    "denominator": ar_den,
                },
                "color_space": mode_description,
                "dominant_colors": dominant_colors,
                "exif": exif_data,
            },
        })
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


def _format_bytes(num_bytes):
    """Format bytes as a human-readable string."""
    if num_bytes < 1024:
        return f"{num_bytes} B"
    elif num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.2f} KB"
    elif num_bytes < 1024 * 1024 * 1024:
        return f"{num_bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{num_bytes / (1024 * 1024 * 1024):.2f} GB"


# ===========================================================================
# 9. GIF Text Animator
# ===========================================================================

ANIMATION_TYPES = ["none", "blink", "slide", "rainbow"]


def _hex_to_rgb_for_text(hex_str):
    """Convert hex color to RGB tuple for PIL."""
    r, g, b = _hex_to_rgb(hex_str)
    return (r, g, b)


@media_tools_bp.route("/gif-text", methods=["GET"])
def gif_text_page():
    """Render the GIF Text Animator web UI."""
    return render_template("tools/gif-text.html")


@media_tools_bp.route("/gif-text", methods=["POST"])
def gif_text_api():
    """API: generate an animated GIF with text."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "").strip()
        font_size = int(data.get("font_size", 32))
        text_color = data.get("text_color", "#FFFFFF").strip()
        bg_color = data.get("bg_color", "#000000").strip()
        animation_type = data.get("animation_type", "none").strip().lower()
        width = int(data.get("width", 400))
        height = int(data.get("height", 100))
        duration = int(data.get("duration", 200))  # ms per frame

        if not text:
            return jsonify({"status": "error", "message": "No text provided."})

        if animation_type not in ANIMATION_TYPES:
            return jsonify({
                "status": "error",
                "message": f"Unknown animation type: '{animation_type}'. Supported: {', '.join(ANIMATION_TYPES)}",
            })

        # Validate colors
        try:
            fg_rgb = _hex_to_rgb(text_color)
        except ValueError:
            return jsonify({"status": "error", "message": f"Invalid text color: '{text_color}'."})

        try:
            bg_rgb = _hex_to_rgb(bg_color)
        except ValueError:
            return jsonify({"status": "error", "message": f"Invalid background color: '{bg_color}'."})

        font_size = max(8, min(200, font_size))
        width = max(50, min(2000, width))
        height = max(30, min(1000, height))
        duration = max(20, min(5000, duration))

        font = _find_default_font(font_size)

        frames = []

        if animation_type == "none":
            # Single static frame repeated a few times
            for _ in range(3):
                img = Image.new("RGB", (width, height), bg_rgb)
                draw = ImageDraw.Draw(img)
                bbox = draw.textbbox((0, 0), text, font=font)
                text_w = bbox[2] - bbox[0]
                text_h = bbox[3] - bbox[1]
                x = (width - text_w) // 2
                y = (height - text_h) // 2
                draw.text((x, y), text, fill=fg_rgb, font=font)
                frames.append(img)

        elif animation_type == "blink":
            # Blink: text visible on odd frames, hidden on even
            for i in range(8):
                img = Image.new("RGB", (width, height), bg_rgb)
                draw = ImageDraw.Draw(img)
                if i % 2 == 0:  # show text
                    bbox = draw.textbbox((0, 0), text, font=font)
                    text_w = bbox[2] - bbox[0]
                    text_h = bbox[3] - bbox[1]
                    x = (width - text_w) // 2
                    y = (height - text_h) // 2
                    draw.text((x, y), text, fill=fg_rgb, font=font)
                frames.append(img)

        elif animation_type == "slide":
            # Slide text from right to left
            total_frames = 30
            # Measure text width
            temp_img = Image.new("RGB", (1, 1), bg_rgb)
            temp_draw = ImageDraw.Draw(temp_img)
            bbox = temp_draw.textbbox((0, 0), text, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            text_y = (height - text_h) // 2

            # Slide: start from right edge, move left past left edge
            start_x = width
            end_x = -text_w - 10
            step = (end_x - start_x) / max(1, total_frames - 1)

            for i in range(total_frames):
                img = Image.new("RGB", (width, height), bg_rgb)
                draw = ImageDraw.Draw(img)
                x = start_x + int(i * step)
                draw.text((x, text_y), text, fill=fg_rgb, font=font)
                frames.append(img)

        elif animation_type == "rainbow":
            # Rainbow: cycle hue of text color
            total_frames = 30
            # Convert text color to HSL to keep S and L constant
            h_base, s_base, l_base = _rgb_to_hsl(*fg_rgb)

            for i in range(total_frames):
                # Cycle hue
                hue = (h_base + (i * 360 / total_frames)) % 360
                r, g, b = _hsl_to_rgb(hue, max(0.5, s_base), max(0.3, min(0.8, l_base)))

                img = Image.new("RGB", (width, height), bg_rgb)
                draw = ImageDraw.Draw(img)
                bbox = draw.textbbox((0, 0), text, font=font)
                text_w = bbox[2] - bbox[0]
                text_h = bbox[3] - bbox[1]
                x = (width - text_w) // 2
                y = (height - text_h) // 2
                draw.text((x, y), text, fill=(r, g, b), font=font)
                frames.append(img)

        if not frames:
            return jsonify({"status": "error", "message": "Failed to generate animation frames."})

        # Save as GIF
        buf = io.BytesIO()
        frames[0].save(
            buf,
            format="GIF",
            save_all=True,
            append_images=frames[1:],
            duration=duration,
            loop=0,
            optimize=True,
        )
        buf.seek(0)

        log_tool_usage(
            "gif-text", "animate",
            f"text={text[:30]}, animation={animation_type}, frames={len(frames)}",
        )

        return send_file(
            buf,
            mimetype="image/gif",
            as_attachment=True,
            download_name="animated.gif",
        )
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
