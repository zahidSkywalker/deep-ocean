"""
ECHO Toolkit — General Utilities
Flask Blueprint with 10 fully functional general-purpose utility tools.
Each tool exposes a web UI route (GET -> HTML) and an API route (POST -> JSON).
"""

import sys
import os
import re
import math
import json
import time
import hashlib
import base64
import struct
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from flask import Blueprint, render_template, request, jsonify
from datetime import datetime, date, timedelta

from database import log_tool_usage

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------
general_utils_bp = Blueprint(
    "general_utils_bp",
    __name__,
    url_prefix="/tools/utils",
    template_folder="../../templates",
)


# =========================================================================
# 1. Text Encryptor / Decryptor
# =========================================================================

def _derive_key(password):
    """Derive a deterministic key from a password using SHA-256."""
    return hashlib.sha256(password.encode('utf-8')).digest()


def _xor_encrypt(plaintext_bytes, key):
    """XOR encrypt bytes with a repeating key."""
    key_len = len(key)
    return bytes(b ^ key[i % key_len] for i, b in enumerate(plaintext_bytes))


def _text_encrypt(text, password):
    """Encrypt text using XOR cipher with SHA-256 derived key, base64 encoded."""
    if not text or not password:
        raise ValueError("Text and password are required")
    key = _derive_key(password)
    text_bytes = text.encode('utf-8')
    encrypted = _xor_encrypt(text_bytes, key)
    # Prepend a random-ish marker and encode
    payload = struct.pack('>I', len(text_bytes)) + encrypted
    return base64.urlsafe_b64encode(payload).decode('ascii')


def _text_decrypt(ciphertext, password):
    """Decrypt base64 encoded XOR cipher text."""
    if not ciphertext or not password:
        raise ValueError("Ciphertext and password are required")
    try:
        payload = base64.urlsafe_b64decode(ciphertext.encode('ascii'))
    except Exception:
        raise ValueError("Invalid ciphertext: not valid base64")
    key = _derive_key(password)
    orig_len = struct.unpack('>I', payload[:4])[0]
    encrypted = payload[4:]
    if len(encrypted) != orig_len:
        # Allow slight mismatch from padding
        encrypted = encrypted[:orig_len]
    decrypted = _xor_encrypt(encrypted, key)
    try:
        return decrypted.decode('utf-8')
    except UnicodeDecodeError:
        raise ValueError("Decryption failed: wrong password or corrupted data")


@general_utils_bp.route("/text-crypto", methods=["GET"])
def text_crypto_page():
    """Render the Text Encryptor/Decryptor web UI."""
    return render_template("tools/text-crypto.html")


@general_utils_bp.route("/text-crypto/process", methods=["POST"])
def text_crypto_process():
    """API: encrypt or decrypt text using XOR + base64 cipher."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")
        password = data.get("password", "")
        operation = data.get("operation", "encrypt").strip().lower()

        if not text:
            return jsonify({"status": "error", "message": "No text provided."})
        if not password:
            return jsonify({"status": "error", "message": "No password provided."})

        if operation == "encrypt":
            result = _text_encrypt(text, password)
        elif operation == "decrypt":
            result = _text_decrypt(text, password)
        else:
            return jsonify({"status": "error", "message": f"Invalid operation: {operation}. Use 'encrypt' or 'decrypt'."})

        log_tool_usage("text-crypto", operation,
                       f"input_length={len(text)}, password_length={len(password)}",
                       f"output_length={len(result)}")

        return jsonify({
            "status": "success",
            "data": {
                "result": result,
                "operation": operation,
                "input_length": len(text),
                "output_length": len(result),
            },
        })
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 2. File Organizer (Simulator)
# =========================================================================

FILE_CATEGORIES = {
    "Images": {
        "extensions": {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".tiff",
                       ".tif", ".ico", ".raw", ".cr2", ".nef", ".psd", ".ai", ".eps"},
        "icon": "🖼️",
    },
    "Documents": {
        "extensions": {".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt", ".xls", ".xlsx",
                       ".ppt", ".pptx", ".csv", ".md", ".tex", ".epub", ".mobi"},
        "icon": "📄",
    },
    "Videos": {
        "extensions": {".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v",
                       ".mpg", ".mpeg", ".3gp", ".ogv"},
        "icon": "🎬",
    },
    "Audio": {
        "extensions": {".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a", ".opus",
                       ".mid", ".midi", ".aiff"},
        "icon": "🎵",
    },
    "Code": {
        "extensions": {".py", ".js", ".ts", ".html", ".css", ".java", ".c", ".cpp", ".h",
                       ".rb", ".go", ".rs", ".php", ".swift", ".kt", ".scala", ".sh",
                       ".sql", ".r", ".lua", ".dart", ".jsx", ".tsx", ".vue", ".json",
                       ".xml", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf"},
        "icon": "💻",
    },
    "Archives": {
        "extensions": {".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".iso",
                       ".dmg", ".cab", ".tgz"},
        "icon": "📦",
    },
}

# File sizes in KB for common types (used when no size is provided)
DEFAULT_FILE_SIZES = {
    ".jpg": 2500, ".jpeg": 2500, ".png": 1800, ".gif": 500, ".bmp": 5000,
    ".svg": 50, ".webp": 1200,
    ".pdf": 800, ".doc": 600, ".docx": 500, ".txt": 10, ".rtf": 200,
    ".odt": 400, ".xls": 700, ".xlsx": 600, ".ppt": 8000, ".pptx": 6000,
    ".csv": 100, ".md": 15,
    ".mp4": 50000, ".avi": 70000, ".mkv": 80000, ".mov": 60000, ".wmv": 55000,
    ".flv": 45000, ".webm": 40000,
    ".mp3": 4500, ".wav": 40000, ".flac": 30000, ".aac": 3500, ".ogg": 3800,
    ".wma": 4000, ".m4a": 3600,
    ".py": 15, ".js": 25, ".ts": 30, ".html": 40, ".css": 20, ".java": 35,
    ".c": 20, ".cpp": 25, ".go": 22, ".rs": 28, ".php": 18, ".json": 5,
    ".xml": 12, ".yaml": 8, ".yml": 8, ".sql": 30, ".sh": 5,
    ".zip": 15000, ".rar": 14000, ".7z": 13000, ".tar": 16000, ".gz": 8000,
}


def _organize_files(filenames):
    """Organize a list of filenames into categories by extension."""
    organized = {}
    unorganized = []
    total_files = len(filenames)
    total_size = 0
    stats = {}

    for fname in filenames:
        _, ext = os.path.splitext(fname.lower())
        categorized = False

        for category, info in FILE_CATEGORIES.items():
            if ext in info["extensions"]:
                if category not in organized:
                    organized[category] = {
                        "icon": info["icon"],
                        "files": [],
                        "extensions": set(),
                        "total_size": 0,
                    }
                organized[category]["files"].append(fname)
                organized[category]["extensions"].add(ext)
                # Estimate size
                est_size = DEFAULT_FILE_SIZES.get(ext, 100)  # default 100KB
                organized[category]["total_size"] += est_size
                total_size += est_size
                stats[ext] = stats.get(ext, 0) + 1
                categorized = True
                break

        if not categorized:
            if "Other" not in organized:
                organized["Other"] = {
                    "icon": "📁",
                    "files": [],
                    "extensions": set(),
                    "total_size": 0,
                }
            organized["Other"]["files"].append(fname)
            if ext:
                organized["Other"]["extensions"].add(ext)
                stats[ext] = stats.get(ext, 0) + 1
            else:
                stats["(no extension)"] = stats.get("(no extension)", 0) + 1
            est_size = DEFAULT_FILE_SIZES.get(ext, 100)
            organized["Other"]["total_size"] += est_size
            total_size += est_size

    # Convert sets to lists for JSON serialization
    for cat_data in organized.values():
        cat_data["extensions"] = sorted(cat_data["extensions"])
        cat_data["file_count"] = len(cat_data["files"])
        cat_data["total_size_formatted"] = _format_file_size(cat_data["total_size"])

    # Build sorted structure
    sorted_categories = []
    for cat_name in ["Images", "Documents", "Videos", "Audio", "Code", "Archives", "Other"]:
        if cat_name in organized:
            sorted_categories.append({
                "name": cat_name,
                **organized[cat_name],
            })

    return {
        "total_files": total_files,
        "total_size": total_size,
        "total_size_formatted": _format_file_size(total_size),
        "categories": sorted_categories,
        "extension_stats": dict(sorted(stats.items(), key=lambda x: x[1], reverse=True)),
    }


def _format_file_size(size_kb):
    """Format file size from KB to human-readable string."""
    if size_kb < 1:
        return f"{size_kb * 1024:.0f} B"
    elif size_kb < 1024:
        return f"{size_kb:.1f} KB"
    elif size_kb < 1024 * 1024:
        return f"{size_kb / 1024:.1f} MB"
    else:
        return f"{size_kb / (1024 * 1024):.2f} GB"


@general_utils_bp.route("/file-organizer", methods=["GET"])
def file_organizer_page():
    """Render the File Organizer web UI."""
    return render_template("tools/file-organizer.html")


@general_utils_bp.route("/file-organizer/analyze", methods=["POST"])
def file_organizer_analyze():
    """API: analyze and organize a list of filenames by type."""
    try:
        data = request.get_json(silent=True) or {}
        filenames = data.get("filenames", [])

        if not filenames:
            return jsonify({"status": "error", "message": "No filenames provided."})

        if not isinstance(filenames, list):
            return jsonify({"status": "error", "message": "filenames must be a list of strings."})

        result = _organize_files(filenames)

        log_tool_usage("file-organizer", "analyze",
                       f"files={len(filenames)}",
                       f"categories={len(result['categories'])}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 3. Batch File Renamer (Simulator)
# =========================================================================

def _apply_rename_pattern(filename, pattern):
    """Apply a rename pattern to a filename. Returns new name."""
    name, ext = os.path.splitext(filename)
    new_name = name

    prefix = pattern.get("prefix", "")
    suffix = pattern.get("suffix", "")
    replace_from = pattern.get("replace_from", "")
    replace_to = pattern.get("replace_to", "")
    numbering = pattern.get("numbering", False)
    start_number = pattern.get("start_number", 1)
    date_prefix = pattern.get("date_prefix", False)
    case = pattern.get("case", "none")
    remove_spaces = pattern.get("remove_spaces", False)

    # Date prefix
    if date_prefix:
        today = datetime.now().strftime("%Y%m%d")
        new_name = f"{today}_{new_name}"

    # Prefix
    if prefix:
        new_name = f"{prefix}{new_name}"

    # Suffix
    if suffix:
        new_name = f"{new_name}{suffix}"

    # Replace text
    if replace_from:
        new_name = new_name.replace(replace_from, replace_to)

    # Remove spaces
    if remove_spaces:
        new_name = new_name.replace(" ", "_").replace("  ", "_")

    # Case conversion
    if case == "lowercase":
        new_name = new_name.lower()
    elif case == "uppercase":
        new_name = new_name.upper()
    elif case == "titlecase":
        new_name = new_name.title()

    result = f"{new_name}{ext}"

    return result


@general_utils_bp.route("/batch-renamer", methods=["GET"])
def batch_renamer_page():
    """Render the Batch File Renamer web UI."""
    return render_template("tools/batch-renamer.html")


@general_utils_bp.route("/batch-renamer/preview", methods=["POST"])
def batch_renamer_preview():
    """API: preview batch file rename operations."""
    try:
        data = request.get_json(silent=True) or {}
        filenames = data.get("filenames", [])
        pattern = data.get("pattern", {})
        start_number = int(pattern.get("start_number", 1))

        if not filenames:
            return jsonify({"status": "error", "message": "No filenames provided."})

        if not isinstance(filenames, list):
            return jsonify({"status": "error", "message": "filenames must be a list of strings."})

        numbering = pattern.get("numbering", False)
        renames = []
        conflicts = []
        new_names_seen = {}

        for idx, fname in enumerate(filenames):
            num = start_number + idx
            current_pattern = dict(pattern)
            current_pattern["start_number"] = num

            new_name = _apply_rename_pattern(fname, current_pattern)

            # Check for conflicts
            if new_name in new_names_seen:
                conflicts.append({
                    "old_name": fname,
                    "new_name": new_name,
                    "conflicts_with": new_names_seen[new_name],
                })

            renames.append({
                "old_name": fname,
                "new_name": new_name,
                "changed": fname != new_name,
            })
            new_names_seen[new_name] = fname

        changed_count = sum(1 for r in renames if r["changed"])
        unchanged_count = sum(1 for r in renames if not r["changed"])

        log_tool_usage("batch-renamer", "preview",
                       f"files={len(filenames)}, pattern_keys={list(pattern.keys())}",
                       f"changed={changed_count}, conflicts={len(conflicts)}")

        return jsonify({
            "status": "success",
            "data": {
                "renames": renames,
                "total": len(renames),
                "changed": changed_count,
                "unchanged": unchanged_count,
                "conflicts": conflicts,
                "has_conflicts": len(conflicts) > 0,
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 4. Calculator / Expression Evaluator
# =========================================================================

# Calculation history stored in memory
_calculation_history = []
_MAX_HISTORY = 50

SAFE_MATH_FUNCTIONS = {
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "asin": math.asin,
    "acos": math.acos,
    "atan": math.atan,
    "log": math.log10,
    "ln": math.log,
    "log2": math.log2,
    "abs": abs,
    "ceil": math.ceil,
    "floor": math.floor,
    "round": round,
    "pow": pow,
    "factorial": math.factorial,
    "degrees": math.degrees,
    "radians": math.radians,
}

SAFE_CONSTANTS = {
    "pi": math.pi,
    "e": math.e,
    "tau": math.tau,
    "inf": math.inf,
}

ALLOWED_CHARS_RE = re.compile(r'^[\d\s\+\-\*\/\(\)\.\,\^a-zA-Z_]+$')


def _safe_evaluate(expression):
    """
    Safely evaluate a mathematical expression.
    Uses restricted character set + custom parser instead of raw eval().
    Supports: +, -, *, /, ** (or ^), (), sqrt, sin, cos, tan, log, ln,
              abs, ceil, floor, round, pi, e, factorial, degrees, radians, log2
    """
    expr = expression.strip()
    if not expr:
        raise ValueError("Empty expression")

    # Validate: only allow safe characters
    if not ALLOWED_CHARS_RE.match(expr):
        raise ValueError("Expression contains disallowed characters")

    # Replace ^ with ** for exponentiation
    expr = expr.replace('^', '**')

    # Check for dangerous patterns
    dangerous = ['__', 'import', 'exec', 'eval', 'open', 'getattr', 'setattr',
                 'delattr', 'hasattr', 'vars', 'dir', 'type', 'print', 'input',
                 'break', 'continue', 'return', 'yield', 'lambda', 'class',
                 'def', 'for', 'while', 'if', 'else', 'elif', 'try', 'except',
                 'raise', 'with', 'assert', 'global', 'nonlocal', 'pass',
                 'bytearray', 'bytes', 'compile', 'memoryview', 'property',
                 'super', 'staticmethod', 'classmethod', 'slice', 'object']
    for d in dangerous:
        if d in expr.lower():
            raise ValueError(f"Disallowed keyword: '{d}'")

    # Build a safe namespace
    safe_globals = {"__builtins__": {}}
    safe_locals = {}
    safe_locals.update(SAFE_CONSTANTS)
    safe_locals.update(SAFE_MATH_FUNCTIONS)

    # Handle implicit multiplication: 2pi -> 2*pi, 3sin -> 3*sin, 4( -> 4*(
    expr = re.sub(r'(\d)([a-zA-Z_])', r'\1*\2', expr)
    expr = re.sub(r'(\))(\d)', r'\1*\2', expr)
    expr = re.sub(r'(\d)(\()', r'\1*\2', expr)
    expr = re.sub(r'(\))(\()', r'\1*\2', expr)
    expr = re.sub(r'(\))([a-zA-Z_])', r'\1*\2', expr)

    try:
        result = eval(expr, safe_globals, safe_locals)  # nosec -- B303: safe eval with restricted globals
    except ZeroDivisionError:
        raise ValueError("Division by zero")
    except OverflowError:
        raise ValueError("Result is too large (overflow)")
    except SyntaxError:
        raise ValueError("Invalid expression syntax")
    except Exception as e:
        raise ValueError(f"Evaluation error: {str(e)}")

    if isinstance(result, complex):
        raise ValueError("Complex numbers are not supported")

    # Convert infinity to string
    if result == float('inf') or result == float('-inf'):
        return str(result).upper()

    return result


def _format_number(result):
    """Format a numeric result for display."""
    if isinstance(result, str):
        return result
    if isinstance(result, float):
        if result == int(result) and abs(result) < 1e15:
            return str(int(result))
        return f"{result:.10g}"
    return str(result)


@general_utils_bp.route("/calculator", methods=["GET"])
def calculator_page():
    """Render the Calculator web UI."""
    return render_template("tools/calculator.html")


@general_utils_bp.route("/calculator/evaluate", methods=["POST"])
def calculator_evaluate():
    """API: safely evaluate a mathematical expression."""
    try:
        data = request.get_json(silent=True) or {}
        expression = data.get("expression", "").strip()
        clear_history = data.get("clear_history", False)

        if not expression:
            return jsonify({"status": "error", "message": "No expression provided."})

        result = _safe_evaluate(expression)
        formatted = _format_number(result)

        # Manage history
        if clear_history:
            _calculation_history.clear()

        entry = {
            "expression": expression,
            "result": formatted,
            "timestamp": datetime.now().isoformat(),
        }
        _calculation_history.append(entry)
        if len(_calculation_history) > _MAX_HISTORY:
            _calculation_history.pop(0)

        log_tool_usage("calculator", "evaluate",
                       f"expression={expression[:50]}",
                       f"result={formatted}")

        return jsonify({
            "status": "success",
            "data": {
                "expression": expression,
                "result": formatted,
                "result_numeric": result if isinstance(result, (int, float)) else formatted,
                "history": list(_calculation_history),
            },
        })
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 5. Unit Converter
# =========================================================================

UNIT_CONVERSIONS = {
    "temperature": {
        "celsius": "special",
        "fahrenheit": "special",
        "kelvin": "special",
    },
    "length": {
        "mm": 0.001,
        "cm": 0.01,
        "m": 1.0,
        "km": 1000.0,
        "inch": 0.0254,
        "foot": 0.3048,
        "yard": 0.9144,
        "mile": 1609.344,
    },
    "weight": {
        "mg": 0.000001,
        "g": 0.001,
        "kg": 1.0,
        "pound": 0.453592,
        "ounce": 0.0283495,
        "ton": 1000.0,
    },
    "area": {
        "mm2": 0.000001,
        "cm2": 0.0001,
        "m2": 1.0,
        "km2": 1000000.0,
        "inch2": 0.00064516,
        "foot2": 0.092903,
        "acre": 4046.86,
        "hectare": 10000.0,
    },
    "volume": {
        "ml": 0.000001,
        "l": 0.001,
        "gallon": 0.00378541,
        "quart": 0.000946353,
        "pint": 0.000473176,
        "cup": 0.000236588,
        "m3": 1.0,
        "cm3": 0.000001,
    },
    "speed": {
        "m/s": 1.0,
        "km/h": 0.277778,
        "mph": 0.44704,
        "knots": 0.514444,
    },
    "data": {
        "bit": 1.0,
        "byte": 8.0,
        "KB": 8.0 * 1024,
        "MB": 8.0 * 1024 ** 2,
        "GB": 8.0 * 1024 ** 3,
        "TB": 8.0 * 1024 ** 4,
        "PB": 8.0 * 1024 ** 5,
    },
}

UNIT_DISPLAY_NAMES = {
    "temperature": {
        "celsius": "Celsius (°C)", "fahrenheit": "Fahrenheit (°F)", "kelvin": "Kelvin (K)",
    },
    "length": {
        "mm": "Millimeters", "cm": "Centimeters", "m": "Meters", "km": "Kilometers",
        "inch": "Inches", "foot": "Feet", "yard": "Yards", "mile": "Miles",
    },
    "weight": {
        "mg": "Milligrams", "g": "Grams", "kg": "Kilograms",
        "pound": "Pounds", "ounce": "Ounces", "ton": "Metric Tons",
    },
    "area": {
        "mm2": "mm²", "cm2": "cm²", "m2": "m²", "km2": "km²",
        "inch2": "in²", "foot2": "ft²", "acre": "Acres", "hectare": "Hectares",
    },
    "volume": {
        "ml": "Milliliters", "l": "Liters", "gallon": "Gallons (US)",
        "quart": "Quarts", "pint": "Pints", "cup": "Cups",
        "m3": "Cubic Meters", "cm3": "Cubic Centimeters",
    },
    "speed": {
        "m/s": "Meters per Second", "km/h": "Kilometers per Hour",
        "mph": "Miles per Hour", "knots": "Knots",
    },
    "data": {
        "bit": "Bits", "byte": "Bytes", "KB": "Kilobytes", "MB": "Megabytes",
        "GB": "Gigabytes", "TB": "Terabytes", "PB": "Petabytes",
    },
}


def _convert_temperature(value, from_unit, to_unit):
    """Convert temperature between Celsius, Fahrenheit, and Kelvin."""
    # First convert to Celsius
    if from_unit == "celsius":
        celsius = value
    elif from_unit == "fahrenheit":
        celsius = (value - 32) * 5.0 / 9.0
    elif from_unit == "kelvin":
        celsius = value - 273.15
    else:
        raise ValueError(f"Unknown temperature unit: {from_unit}")

    # Convert from Celsius to target
    if to_unit == "celsius":
        return celsius
    elif to_unit == "fahrenheit":
        return celsius * 9.0 / 5.0 + 32
    elif to_unit == "kelvin":
        return celsius + 273.15
    else:
        raise ValueError(f"Unknown temperature unit: {to_unit}")


def _get_temperature_formula(from_unit, to_unit):
    """Return the temperature conversion formula as a string."""
    formulas = {
        ("celsius", "fahrenheit"): "°F = (°C × 9/5) + 32",
        ("celsius", "kelvin"): "K = °C + 273.15",
        ("fahrenheit", "celsius"): "°C = (°F - 32) × 5/9",
        ("fahrenheit", "kelvin"): "K = (°F - 32) × 5/9 + 273.15",
        ("kelvin", "celsius"): "°C = K - 273.15",
        ("kelvin", "fahrenheit"): "°F = (K - 273.15) × 9/5 + 32",
        ("celsius", "celsius"): "°C = °C (no conversion)",
        ("fahrenheit", "fahrenheit"): "°F = °F (no conversion)",
        ("kelvin", "kelvin"): "K = K (no conversion)",
    }
    return formulas.get((from_unit, to_unit), "")


def _convert_unit(value, from_unit, to_unit, category):
    """Convert a value between two units within the same category."""
    # Special handling for temperature (non-linear conversions)
    if category == "temperature":
        return _convert_temperature(value, from_unit, to_unit)

    cat_conversions = UNIT_CONVERSIONS.get(category, {})
    if from_unit not in cat_conversions:
        raise ValueError(f"Unknown unit '{from_unit}' in category '{category}'")
    if to_unit not in cat_conversions:
        raise ValueError(f"Unknown unit '{to_unit}' in category '{category}'")

    # Convert: value in from_unit -> base unit -> to_unit
    base_value = value * cat_conversions[from_unit]
    result = base_value / cat_conversions[to_unit]
    return result


@general_utils_bp.route("/unit-converter", methods=["GET"])
def unit_converter_page():
    """Render the Unit Converter web UI."""
    return render_template("tools/unit-converter.html")


@general_utils_bp.route("/unit-converter/convert", methods=["POST"])
def unit_converter_convert():
    """API: convert a value between units."""
    try:
        data = request.get_json(silent=True) or {}
        value = data.get("value")
        from_unit = data.get("from_unit", "").strip()
        to_unit = data.get("to_unit", "").strip()
        category = data.get("category", "").strip().lower()

        if value is None:
            return jsonify({"status": "error", "message": "No value provided."})

        try:
            value = float(value)
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Value must be a number."})

        if category not in UNIT_CONVERSIONS:
            valid = ", ".join(UNIT_CONVERSIONS.keys())
            return jsonify({"status": "error", "message": f"Invalid category: {category}. Supported: {valid}"})

        if not from_unit or not to_unit:
            return jsonify({"status": "error", "message": "Both 'from_unit' and 'to_unit' are required."})

        result = _convert_unit(value, from_unit, to_unit, category)

        # Format result nicely
        if abs(result) < 0.001 or abs(result) > 1e12:
            formatted = f"{result:.6e}"
        elif abs(result) < 1:
            formatted = f"{result:.6f}"
        else:
            formatted = f"{result:.4f}"

        from_display = UNIT_DISPLAY_NAMES.get(category, {}).get(from_unit, from_unit)
        to_display = UNIT_DISPLAY_NAMES.get(category, {}).get(to_unit, to_unit)

        # Build formula string (skip for temperature since it's non-linear)
        available_units = list(UNIT_CONVERSIONS.get(category, {}).keys())
        if category == "temperature":
            formula = _get_temperature_formula(from_unit, to_unit)
        else:
            formula = f"1 {to_unit} = {UNIT_CONVERSIONS[category][to_unit] / UNIT_CONVERSIONS[category][from_unit]:.6g} {from_unit}"

        log_tool_usage("unit-converter", "convert",
                       f"{value} {from_unit} -> {to_unit}",
                       f"result={formatted}")

        return jsonify({
            "status": "success",
            "data": {
                "value": value,
                "from_unit": from_unit,
                "to_unit": to_unit,
                "from_display": from_display,
                "to_display": to_display,
                "category": category,
                "result": formatted,
                "result_numeric": result,
                "formula": formula,
                "available_units": available_units,
            },
        })
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 6. Age Calculator
# =========================================================================

MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

ZODIAC_SIGNS = [
    ("Capricorn", (1, 1), (1, 19)),
    ("Aquarius", (1, 20), (2, 18)),
    ("Pisces", (2, 19), (3, 20)),
    ("Aries", (3, 21), (4, 19)),
    ("Taurus", (4, 20), (5, 20)),
    ("Gemini", (5, 21), (6, 20)),
    ("Cancer", (6, 21), (7, 22)),
    ("Leo", (7, 23), (8, 22)),
    ("Virgo", (8, 23), (9, 22)),
    ("Libra", (9, 23), (10, 22)),
    ("Scorpio", (10, 23), (11, 21)),
    ("Sagittarius", (11, 22), (12, 21)),
    ("Capricorn", (12, 22), (12, 31)),
]


def _get_zodiac_sign(month, day):
    """Get the zodiac sign for a given month and day."""
    for sign, (start_month, start_day), (end_month, end_day) in ZODIAC_SIGNS:
        if (month == start_month and day >= start_day) or \
           (month == end_month and day <= end_day):
            return sign
    return "Capricorn"  # Default


def _calculate_age(birth_date_str, target_date_str=None):
    """Calculate detailed age information."""
    try:
        birth = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
    except ValueError:
        try:
            birth = datetime.strptime(birth_date_str, "%m/%d/%Y").date()
        except ValueError:
            raise ValueError("Invalid birth date format. Use YYYY-MM-DD or MM/DD/YYYY.")

    if target_date_str:
        try:
            target = datetime.strptime(target_date_str, "%Y-%m-%d").date()
        except ValueError:
            try:
                target = datetime.strptime(target_date_str, "%m/%d/%Y").date()
            except ValueError:
                raise ValueError("Invalid target date format. Use YYYY-MM-DD or MM/DD/YYYY.")
    else:
        target = date.today()

    if birth > target:
        raise ValueError("Birth date cannot be after the target date.")

    # Calculate years, months, days
    years = target.year - birth.year
    months = target.month - birth.month
    days = target.day - birth.day

    if days < 0:
        months -= 1
        # Get days in the previous month of the target
        prev_month = target.month - 1
        prev_year = target.year
        if prev_month == 0:
            prev_month = 12
            prev_year -= 1
        days_in_prev_month = (date(prev_year, prev_month + 1, 1) - timedelta(days=1)).day
        days += days_in_prev_month

    if months < 0:
        years -= 1
        months += 12

    # Total calculations
    total_days = (target - birth).days
    total_hours = total_days * 24
    total_minutes = total_hours * 60
    total_seconds = total_minutes * 60
    total_weeks = total_days // 7

    # Day of birth
    birth_weekday = birth.weekday()  # 0=Monday

    # Next birthday
    next_birthday_year = target.year
    if birth.month == 2 and birth.day == 29:
        # Handle leap year birthday
        while True:
            try:
                next_bday = date(next_birthday_year, birth.month, birth.day)
                break
            except ValueError:
                next_birthday_year += 1
    else:
        next_bday = date(next_birthday_year, birth.month, birth.day)

    if next_bday < target:
        next_birthday_year += 1
        if birth.month == 2 and birth.day == 29:
            while True:
                try:
                    next_bday = date(next_birthday_year, birth.month, birth.day)
                    break
                except ValueError:
                    next_birthday_year += 1
        else:
            next_bday = date(next_birthday_year, birth.month, birth.day)

    days_until_birthday = (next_bday - target).days
    next_age = next_birthday_year - birth.year

    # Zodiac sign
    zodiac = _get_zodiac_sign(birth.month, birth.day)

    # Life stats
    avg_heartbeats = total_days * 100000  # ~100,000 beats/day
    breaths = total_days * 23000  # ~23,000 breaths/day
    sleep_hours = total_hours / 3  # ~1/3 of life sleeping

    return {
        "birth_date": birth.isoformat(),
        "birth_date_formatted": f"{MONTH_NAMES[birth.month - 1]} {birth.day}, {birth.year}",
        "target_date": target.isoformat(),
        "age": {
            "years": years,
            "months": months,
            "days": days,
            "display": f"{years} years, {months} months, {days} days",
        },
        "total_days": total_days,
        "total_weeks": total_weeks,
        "total_hours": total_hours,
        "total_minutes": total_minutes,
        "total_seconds": total_seconds,
        "birth_weekday": DAY_NAMES[birth_weekday],
        "zodiac_sign": zodiac,
        "next_birthday": next_bday.isoformat(),
        "days_until_birthday": days_until_birthday,
        "next_age": next_age,
        "life_stats": {
            "heartbeats_approx": avg_heartbeats,
            "breaths_approx": breaths,
            "sleep_hours_approx": sleep_hours,
        },
    }


@general_utils_bp.route("/age-calculator", methods=["GET"])
def age_calculator_page():
    """Render the Age Calculator web UI."""
    return render_template("tools/age-calculator.html")


@general_utils_bp.route("/age-calculator/calculate", methods=["POST"])
def age_calculator_calculate():
    """API: calculate detailed age information."""
    try:
        data = request.get_json(silent=True) or {}
        birth_date = data.get("birth_date", "").strip()
        target_date = data.get("target_date", "").strip()

        if not birth_date:
            return jsonify({"status": "error", "message": "Birth date is required."})

        result = _calculate_age(birth_date, target_date or None)

        log_tool_usage("age-calculator", "calculate",
                       f"birth={birth_date}",
                       f"age={result['age']['display']}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 7. Pomodoro Timer (Server-Side)
# =========================================================================

# In-memory timer state
_pomodoro_state = {
    "is_running": False,
    "is_paused": False,
    "start_time": None,       # Unix timestamp when started (or resumed)
    "duration": 25 * 60,      # Default 25 minutes in seconds
    "paused_elapsed": 0,      # Elapsed seconds when paused
    "original_duration": 25 * 60,
}


@general_utils_bp.route("/pomodoro", methods=["GET"])
def pomodoro_page():
    """Render the Pomodoro Timer web UI."""
    return render_template("tools/pomodoro.html")


@general_utils_bp.route("/pomodoro/start", methods=["POST"])
def pomodoro_start():
    """API: start a pomodoro timer."""
    try:
        data = request.get_json(silent=True) or {}
        duration_minutes = data.get("duration", 25)

        duration_minutes = float(duration_minutes)
        if duration_minutes < 0.5:
            return jsonify({"status": "error", "message": "Duration must be at least 0.5 minutes."})
        if duration_minutes > 240:
            return jsonify({"status": "error", "message": "Duration cannot exceed 240 minutes."})

        duration_seconds = int(duration_minutes * 60)
        now = time.time()

        _pomodoro_state["is_running"] = True
        _pomodoro_state["is_paused"] = False
        _pomodoro_state["start_time"] = now
        _pomodoro_state["duration"] = duration_seconds
        _pomodoro_state["paused_elapsed"] = 0
        _pomodoro_state["original_duration"] = duration_seconds

        end_time_iso = datetime.fromtimestamp(now + duration_seconds).isoformat()

        log_tool_usage("pomodoro", "start", f"duration={duration_minutes}min")

        return jsonify({
            "status": "success",
            "data": {
                "is_running": True,
                "is_paused": False,
                "duration_minutes": duration_minutes,
                "duration_seconds": duration_seconds,
                "end_time": end_time_iso,
                "message": f"Timer started for {duration_minutes} minutes.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@general_utils_bp.route("/pomodoro/pause", methods=["POST"])
def pomodoro_pause():
    """API: pause the pomodoro timer."""
    try:
        if not _pomodoro_state["is_running"]:
            return jsonify({"status": "error", "message": "No active timer to pause."})
        if _pomodoro_state["is_paused"]:
            return jsonify({"status": "error", "message": "Timer is already paused."})

        now = time.time()
        elapsed = now - _pomodoro_state["start_time"] + _pomodoro_state["paused_elapsed"]
        _pomodoro_state["is_paused"] = True
        _pomodoro_state["paused_elapsed"] = elapsed

        remaining = max(0, _pomodoro_state["duration"] - elapsed)
        remaining_minutes = remaining // 60
        remaining_seconds = remaining % 60

        log_tool_usage("pomodoro", "pause",
                       f"remaining={remaining_minutes}:{remaining_seconds:02d}")

        return jsonify({
            "status": "success",
            "data": {
                "is_running": True,
                "is_paused": True,
                "remaining_seconds": remaining,
                "remaining_display": f"{remaining_minutes}:{remaining_seconds:02d}",
                "message": "Timer paused.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@general_utils_bp.route("/pomodoro/reset", methods=["POST"])
def pomodoro_reset():
    """API: reset the pomodoro timer."""
    try:
        _pomodoro_state["is_running"] = False
        _pomodoro_state["is_paused"] = False
        _pomodoro_state["start_time"] = None
        _pomodoro_state["duration"] = _pomodoro_state["original_duration"]
        _pomodoro_state["paused_elapsed"] = 0

        duration_minutes = _pomodoro_state["duration"] // 60

        log_tool_usage("pomodoro", "reset")

        return jsonify({
            "status": "success",
            "data": {
                "is_running": False,
                "is_paused": False,
                "duration_minutes": duration_minutes,
                "remaining_display": f"{duration_minutes}:00",
                "message": "Timer reset.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@general_utils_bp.route("/pomodoro/status", methods=["GET", "POST"])
def pomodoro_status():
    """API: check remaining time on the pomodoro timer."""
    try:
        if not _pomodoro_state["is_running"]:
            return jsonify({
                "status": "success",
                "data": {
                    "is_running": False,
                    "is_paused": False,
                    "remaining_seconds": 0,
                    "remaining_display": "0:00",
                    "progress": 0,
                    "message": "No active timer.",
                },
            })

        if _pomodoro_state["is_paused"]:
            elapsed = _pomodoro_state["paused_elapsed"]
        else:
            now = time.time()
            elapsed = now - _pomodoro_state["start_time"] + _pomodoro_state["paused_elapsed"]

        duration = _pomodoro_state["duration"]
        remaining = max(0, duration - elapsed)
        progress = min(100, (elapsed / duration) * 100) if duration > 0 else 100

        remaining_minutes = int(remaining) // 60
        remaining_seconds = int(remaining) % 60

        # Check if timer completed
        completed = remaining <= 0

        data = {
            "is_running": True,
            "is_paused": _pomodoro_state["is_paused"],
            "remaining_seconds": remaining,
            "remaining_display": f"{remaining_minutes}:{remaining_seconds:02d}",
            "progress": round(progress, 1),
            "elapsed_seconds": elapsed,
            "duration_seconds": duration,
            "completed": completed,
        }

        if completed:
            data["message"] = "Time is up! Take a break."
            # Auto-stop
            _pomodoro_state["is_running"] = False
            _pomodoro_state["is_paused"] = False
            log_tool_usage("pomodoro", "completed")
        else:
            data["message"] = "Timer running." if not _pomodoro_state["is_paused"] else "Timer paused."

        return jsonify({
            "status": "success",
            "data": data,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 8. Countdown Generator
# =========================================================================

def _generate_countdown(target_date_str, event_name, start_date_str=None):
    """Generate countdown information for a target date."""
    try:
        target = datetime.strptime(target_date_str, "%Y-%m-%d")
    except ValueError:
        try:
            target = datetime.strptime(target_date_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            raise ValueError("Invalid target date format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS.")

    now = datetime.now()

    if target <= now:
        # Event has passed
        diff = now - target
        return {
            "event_name": event_name,
            "target_date": target_date_str,
            "status": "completed",
            "elapsed": {
                "days": diff.days,
                "hours": diff.seconds // 3600,
                "minutes": (diff.seconds % 3600) // 60,
                "seconds": diff.seconds % 60,
                "total_seconds": int(diff.total_seconds()),
                "total_hours": diff.total_seconds() / 3600,
            },
            "remaining": None,
            "progress": 100.0,
            "message": f"'{event_name}' has already passed!",
        }

    diff = target - now
    total_seconds = diff.total_seconds()
    total_days = diff.days

    # Calculate remaining time
    remaining = {
        "days": diff.days,
        "hours": diff.seconds // 3600,
        "minutes": (diff.seconds % 3600) // 60,
        "seconds": diff.seconds % 60,
        "total_seconds": int(total_seconds),
        "total_hours": total_seconds / 3600,
        "total_weeks": total_days // 7,
        "total_months": total_days // 30,
        "total_years": total_days // 365,
    }

    # Progress calculation
    progress = None
    if start_date_str:
        try:
            start = datetime.strptime(start_date_str, "%Y-%m-%d")
        except ValueError:
            try:
                start = datetime.strptime(start_date_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                raise ValueError("Invalid start date format. Use YYYY-MM-DD or YYYY-MM-DD HH:MM:SS.")

        if start < target:
            total_span = (target - start).total_seconds()
            elapsed_span = (now - start).total_seconds()
            progress = min(100.0, (elapsed_span / total_span) * 100)

    # Visual display
    display_parts = []
    if total_days > 0:
        display_parts.append(f"{total_days} day{'s' if total_days != 1 else ''}")
    hours = remaining["hours"]
    if hours > 0 or total_days > 0:
        display_parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    minutes = remaining["minutes"]
    if minutes > 0 or len(display_parts) > 0:
        display_parts.append(f"{minutes} minute{'s' if minutes != 1 else ''}")
    display_parts.append(f"{remaining['seconds']} second{'s' if remaining['seconds'] != 1 else ''}")

    return {
        "event_name": event_name,
        "target_date": target_date_str,
        "status": "active",
        "remaining": remaining,
        "elapsed": None,
        "progress": progress,
        "display": " ".join(display_parts),
        "short_display": f"{total_days}d {remaining['hours']}h {remaining['minutes']}m {remaining['seconds']}s",
        "message": f"Counting down to '{event_name}'!",
    }


@general_utils_bp.route("/countdown", methods=["GET"])
def countdown_page():
    """Render the Countdown Generator web UI."""
    return render_template("tools/countdown.html")


@general_utils_bp.route("/countdown/create", methods=["POST"])
def countdown_create():
    """API: create a countdown to a target date."""
    try:
        data = request.get_json(silent=True) or {}
        target_date = data.get("target_date", "").strip()
        event_name = data.get("event_name", "My Event").strip()
        start_date = data.get("start_date", "").strip()

        if not target_date:
            return jsonify({"status": "error", "message": "Target date is required."})

        result = _generate_countdown(target_date, event_name, start_date or None)

        log_tool_usage("countdown", "create",
                       f"event={event_name[:50]}, target={target_date}",
                       f"status={result['status']}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 9. Text Statistics & Readability
# =========================================================================

def _count_syllables(word):
    """Estimate the number of syllables in a word."""
    word = word.lower().strip()
    word = re.sub(r'[^a-z]', '', word)
    if not word:
        return 0

    count = 0
    vowels = 'aeiouy'

    if word[0] in vowels:
        count += 1

    for idx in range(1, len(word)):
        if word[idx] in vowels and word[idx - 1] not in vowels:
            count += 1

    # Adjust for silent 'e'
    if word.endswith('e') and count > 1:
        count -= 1

    if count == 0:
        count = 1

    return count


def _count_polysyllables(word):
    """Check if a word has 3 or more syllables (polysyllabic)."""
    return _count_syllables(word) >= 3


def _flesch_kincaid_grade(text):
    """Calculate Flesch-Kincaid Grade Level."""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]
    words = re.findall(r'\b[a-zA-Z]+\b', text)

    if len(sentences) < 1 or len(words) < 1:
        return None

    total_syllables = sum(_count_syllables(w) for w in words)
    score = 0.39 * (len(words) / len(sentences)) + 11.8 * (total_syllables / len(words)) - 15.59
    return round(score, 2)


def _gunning_fog(text):
    """Calculate Gunning Fog Index."""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]
    words = re.findall(r'\b[a-zA-Z]+\b', text)

    if len(sentences) < 1 or len(words) < 1:
        return None

    polysyllable_count = sum(1 for w in words if _count_syllables(w) >= 3)
    score = 0.4 * (len(words) / len(sentences) + 100 * (polysyllable_count / len(words)))
    return round(score, 2)


def _smog_index(text):
    """Calculate SMOG (Simple Measure of Gobbledygook) Index."""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]
    words = re.findall(r'\b[a-zA-Z]+\b', text)

    if len(sentences) < 1 or len(words) < 1:
        return None

    polysyllable_count = sum(1 for w in words if _count_syllables(w) >= 3)

    # SMOG requires at least 30 sentences for accuracy
    if len(sentences) < 30:
        # Adjust: scale polysyllables as if we had 30 sentences
        adjusted_polysyllables = (polysyllable_count / len(sentences)) * 30
    else:
        adjusted_polysyllables = polysyllable_count

    score = 1.0430 * math.sqrt(adjusted_polysyllables) + 3.1291
    return round(score, 2)


def _coleman_liau(text):
    """Calculate Coleman-Liau Index."""
    words = re.findall(r'\b[a-zA-Z]+\b', text)
    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]

    if len(sentences) < 1 or len(words) < 1:
        return None

    total_letters = sum(len(w) for w in words)

    # L = average letters per 100 words
    L = (total_letters / len(words)) * 100
    # S = average sentences per 100 words
    S = (len(sentences) / len(words)) * 100

    score = 0.0588 * L - 0.296 * S - 15.8
    return round(score, 2)


def _automated_readability(text):
    """Calculate Automated Readability Index (ARI)."""
    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]
    words = re.findall(r'\b[a-zA-Z]+\b', text)

    if len(sentences) < 1 or len(words) < 1:
        return None

    total_characters = sum(len(w) for w in words)

    score = 4.71 * (total_characters / len(words)) + 0.5 * (len(words) / len(sentences)) - 21.43
    return round(score, 2)


def _grade_level_interpretation(score):
    """Interpret a grade level score into a reading level description."""
    if score is None:
        return "N/A (insufficient text)"
    if score <= 1:
        return "Kindergarten"
    elif score <= 2:
        return "1st-2nd Grade"
    elif score <= 3:
        return "3rd Grade"
    elif score <= 4:
        return "4th Grade"
    elif score <= 5:
        return "5th Grade"
    elif score <= 6:
        return "6th Grade"
    elif score <= 7:
        return "7th Grade"
    elif score <= 8:
        return "8th Grade"
    elif score <= 9:
        return "9th Grade (Freshman)"
    elif score <= 10:
        return "10th Grade (Sophomore)"
    elif score <= 12:
        return "11th-12th Grade (High School)"
    elif score <= 14:
        return "College Level"
    elif score <= 16:
        return "Graduate Level"
    else:
        return "Professional/Academic"


def _analyze_text_stats(text):
    """Perform comprehensive text analysis and readability scoring."""
    # Basic counts
    characters = len(text)
    characters_no_spaces = len(text.replace(' ', '').replace('\n', '').replace('\t', '').replace('\r', ''))

    words = re.findall(r'\b\S+\b', text)
    word_count = len(words)

    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]
    sentence_count = len(sentences)

    paragraphs = re.split(r'\n\s*\n', text.strip())
    paragraphs = [p for p in paragraphs if p.strip()]
    paragraph_count = len(paragraphs) if text.strip() else 0

    # Letter frequency
    letters = re.findall(r'[a-zA-Z]', text)
    letter_freq = Counter(c.lower() for c in letters)
    total_letters = len(letters)

    letter_frequency = [
        {"letter": letter, "count": count,
         "percentage": round((count / total_letters * 100), 2) if total_letters > 0 else 0}
        for letter, count in letter_freq.most_common(20)
    ]

    # Word frequency (excluding common stop words)
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
                  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
                  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall',
                  'to', 'of', 'in', 'for', 'on', 'at', 'by', 'from', 'with', 'about',
                  'into', 'through', 'during', 'before', 'after', 'above', 'below',
                  'between', 'under', 'over', 'it', 'its', 'this', 'that', 'these',
                  'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me', 'him', 'her',
                  'us', 'them', 'my', 'your', 'his', 'our', 'their', 'not', 'no',
                  'so', 'if', 'as', 'up', 'out', 'all', 'each', 'every', 'both',
                  'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too',
                  'very', 'just', 'also', 'then', 'only', 'now', 'here', 'there'}
    meaningful_words = [w.lower() for w in words if w.lower() not in stop_words and len(w) > 1]
    word_freq = Counter(meaningful_words)

    word_frequency = [
        {"word": word, "count": count,
         "percentage": round((count / word_count * 100), 2) if word_count > 0 else 0}
        for word, count in word_freq.most_common(20)
    ]

    # Sentence length distribution
    sentence_lengths = [len(re.findall(r'\b\S+\b', s)) for s in sentences]
    avg_sentence_length = sum(sentence_lengths) / len(sentence_lengths) if sentence_lengths else 0
    max_sentence_length = max(sentence_lengths) if sentence_lengths else 0
    min_sentence_length = min(sentence_lengths) if sentence_lengths else 0

    # Bucket sentence lengths
    length_buckets = {"short (1-10)": 0, "medium (11-20)": 0, "long (21-30)": 0, "very long (31+)": 0}
    for sl in sentence_lengths:
        if sl <= 10:
            length_buckets["short (1-10)"] += 1
        elif sl <= 20:
            length_buckets["medium (11-20)"] += 1
        elif sl <= 30:
            length_buckets["long (21-30)"] += 1
        else:
            length_buckets["very long (31+)"] += 1

    # Syllable stats
    word_syllables = [_count_syllables(w) for w in words]
    total_syllables = sum(word_syllables)
    avg_syllables_per_word = total_syllables / word_count if word_count > 0 else 0

    # Readability scores
    fk = _flesch_kincaid_grade(text)
    gf = _gunning_fog(text)
    smog = _smog_index(text)
    cl = _coleman_liau(text)
    ari = _automated_readability(text)

    readability = {
        "flesch_kincaid_grade": {
            "score": fk,
            "interpretation": _grade_level_interpretation(fk),
        },
        "gunning_fog": {
            "score": gf,
            "interpretation": _grade_level_interpretation(gf),
        },
        "smog_index": {
            "score": smog,
            "interpretation": _grade_level_interpretation(smog),
        },
        "coleman_liau": {
            "score": cl,
            "interpretation": _grade_level_interpretation(cl),
        },
        "automated_readability": {
            "score": ari,
            "interpretation": _grade_level_interpretation(ari),
        },
    }

    # Average readability grade
    scores = [s for s in [fk, gf, smog, cl, ari] if s is not None]
    avg_grade = round(sum(scores) / len(scores), 2) if scores else None

    return {
        "basic": {
            "characters": characters,
            "characters_no_spaces": characters_no_spaces,
            "words": word_count,
            "sentences": sentence_count,
            "paragraphs": paragraph_count,
            "total_syllables": total_syllables,
            "avg_word_length": round(sum(len(w) for w in words) / word_count, 2) if word_count > 0 else 0,
            "avg_sentence_length": round(avg_sentence_length, 2),
            "max_sentence_length": max_sentence_length,
            "min_sentence_length": min_sentence_length,
            "avg_syllables_per_word": round(avg_syllables_per_word, 2),
        },
        "letter_frequency": letter_frequency,
        "word_frequency": word_frequency,
        "sentence_distribution": length_buckets,
        "readability": readability,
        "average_grade_level": avg_grade,
        "average_grade_interpretation": _grade_level_interpretation(avg_grade),
        "reading_time_minutes": round(word_count / 200, 2) if word_count > 0 else 0,
        "speaking_time_minutes": round(word_count / 130, 2) if word_count > 0 else 0,
    }


@general_utils_bp.route("/text-stats", methods=["GET"])
def text_stats_page():
    """Render the Text Statistics & Readability web UI."""
    return render_template("tools/text-stats.html")


@general_utils_bp.route("/text-stats/analyze", methods=["POST"])
def text_stats_analyze():
    """API: analyze text statistics and readability scores."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")

        if not text.strip():
            return jsonify({"status": "error", "message": "No text provided."})

        result = _analyze_text_stats(text)

        log_tool_usage("text-stats", "analyze",
                       f"words={result['basic']['words']}, sentences={result['basic']['sentences']}",
                       f"avg_grade={result['average_grade_level']}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 10. Binary / Hex / Octal Converter
# =========================================================================

def _binary_to_decimal(binary_str):
    """Convert a binary string to decimal integer."""
    binary_str = binary_str.strip()
    # Validate
    if not re.match(r'^[01]+$', binary_str):
        raise ValueError("Invalid binary number. Only 0 and 1 allowed.")
    return int(binary_str, 2)


def _octal_to_decimal(octal_str):
    """Convert an octal string to decimal integer."""
    octal_str = octal_str.strip()
    if not re.match(r'^[0-7]+$', octal_str):
        raise ValueError("Invalid octal number. Only 0-7 allowed.")
    return int(octal_str, 8)


def _hex_to_decimal(hex_str):
    """Convert a hexadecimal string to decimal integer."""
    hex_str = hex_str.strip()
    if not re.match(r'^[0-9a-fA-F]+$', hex_str):
        raise ValueError("Invalid hexadecimal number.")
    return int(hex_str, 16)


def _decimal_to_binary(n):
    """Convert decimal integer to binary string."""
    if n < 0:
        return "-" + bin(n)[3:]
    return bin(n)[2:]


def _decimal_to_octal(n):
    """Convert decimal integer to octal string."""
    if n < 0:
        return "-" + oct(n)[3:]
    return oct(n)[2:]


def _decimal_to_hex(n):
    """Convert decimal integer to hexadecimal string."""
    if n < 0:
        return "-" + hex(n)[3:]
    return hex(n)[2:].upper()


def _ascii_to_binary(text):
    """Convert ASCII text to binary string."""
    result = []
    for char in text:
        result.append(format(ord(char), '08b'))
    return ' '.join(result)


def _binary_to_ascii(binary_str):
    """Convert binary string (space-separated bytes) to ASCII text."""
    try:
        bytes_list = binary_str.strip().split()
        result = []
        for b in bytes_list:
            n = int(b, 2)
            if n > 127:
                result.append('?')
            else:
                result.append(chr(n))
        return ''.join(result)
    except Exception:
        raise ValueError("Invalid binary string for ASCII conversion.")


def _ascii_to_hex(text):
    """Convert ASCII text to hex string."""
    result = []
    for char in text:
        result.append(format(ord(char), '02X'))
    return ' '.join(result)


def _hex_to_ascii(hex_str):
    """Convert hex string to ASCII text."""
    try:
        hex_str = hex_str.strip().replace(' ', '')
        result = []
        for i in range(0, len(hex_str), 2):
            byte = hex_str[i:i+2]
            n = int(byte, 16)
            result.append(chr(n) if n <= 127 else '?')
        return ''.join(result)
    except Exception:
        raise ValueError("Invalid hex string for ASCII conversion.")


def _ascii_to_octal(text):
    """Convert ASCII text to octal string."""
    result = []
    for char in text:
        result.append(format(ord(char), '03o'))
    return ' '.join(result)


def _octal_to_ascii(octal_str):
    """Convert octal string to ASCII text."""
    try:
        bytes_list = octal_str.strip().split()
        result = []
        for o in bytes_list:
            n = int(o, 8)
            result.append(chr(n) if n <= 127 else '?')
        return ''.join(result)
    except Exception:
        raise ValueError("Invalid octal string for ASCII conversion.")


def _convert_number(input_value, input_base):
    """Convert a number from one base to all other bases."""
    input_value = input_value.strip()
    result = {}

    if input_base == "binary":
        decimal_val = _binary_to_decimal(input_value)
        result["binary"] = input_value
        result["octal"] = _decimal_to_octal(decimal_val)
        result["decimal"] = str(decimal_val)
        result["hex"] = _decimal_to_hex(decimal_val)
        result["steps"] = [
            f"Binary {input_value}",
            f"→ Decimal: {input_value}₂ = {decimal_val}₁₀",
            f"→ Octal: {decimal_val}₁₀ = {_decimal_to_octal(decimal_val)}₈",
            f"→ Hex: {decimal_val}₁₀ = {_decimal_to_hex(decimal_val)}₁₆",
        ]

    elif input_base == "octal":
        decimal_val = _octal_to_decimal(input_value)
        result["binary"] = _decimal_to_binary(decimal_val)
        result["octal"] = input_value
        result["decimal"] = str(decimal_val)
        result["hex"] = _decimal_to_hex(decimal_val)
        result["steps"] = [
            f"Octal {input_value}",
            f"→ Decimal: {input_value}₈ = {decimal_val}₁₀",
            f"→ Binary: {decimal_val}₁₀ = {_decimal_to_binary(decimal_val)}₂",
            f"→ Hex: {decimal_val}₁₀ = {_decimal_to_hex(decimal_val)}₁₆",
        ]

    elif input_base == "decimal":
        try:
            decimal_val = int(input_value)
        except ValueError:
            raise ValueError("Invalid decimal number.")
        result["binary"] = _decimal_to_binary(decimal_val)
        result["octal"] = _decimal_to_octal(decimal_val)
        result["decimal"] = str(decimal_val)
        result["hex"] = _decimal_to_hex(decimal_val)
        result["steps"] = [
            f"Decimal {decimal_val}",
            f"→ Binary: {decimal_val}₁₀ = {_decimal_to_binary(decimal_val)}₂",
            f"→ Octal: {decimal_val}₁₀ = {_decimal_to_octal(decimal_val)}₈",
            f"→ Hex: {decimal_val}₁₀ = {_decimal_to_hex(decimal_val)}₁₆",
        ]

    elif input_base == "hex":
        decimal_val = _hex_to_decimal(input_value)
        result["binary"] = _decimal_to_binary(decimal_val)
        result["octal"] = _decimal_to_octal(decimal_val)
        result["decimal"] = str(decimal_val)
        result["hex"] = input_value.upper()
        result["steps"] = [
            f"Hex {input_value}",
            f"→ Decimal: {input_value}₁₆ = {decimal_val}₁₀",
            f"→ Binary: {decimal_val}₁₀ = {_decimal_to_binary(decimal_val)}₂",
            f"→ Octal: {decimal_val}₁₀ = {_decimal_to_octal(decimal_val)}₈",
        ]

    elif input_base == "ascii":
        # ASCII text conversion
        result["ascii"] = input_value
        result["binary"] = _ascii_to_binary(input_value)
        result["octal"] = _ascii_to_octal(input_value)
        result["decimal"] = str([ord(c) for c in input_value])
        result["hex"] = _ascii_to_hex(input_value)
        chars_info = [{"char": c, "code": ord(c), "hex": format(ord(c), '02X'),
                       "binary": format(ord(c), '08b'), "octal": format(ord(c), '03o')}
                      for c in input_value]
        result["steps"] = [
            f"ASCII: '{input_value}'",
            f"→ Each character converted to its ASCII code",
            f"→ Binary (8-bit): {_ascii_to_binary(input_value)}",
            f"→ Octal: {_ascii_to_octal(input_value)}",
            f"→ Hex: {_ascii_to_hex(input_value)}",
        ]
        result["characters"] = chars_info
    else:
        raise ValueError(f"Unsupported input base: {input_base}. Use binary, octal, decimal, hex, or ascii.")

    return result


@general_utils_bp.route("/number-converter", methods=["GET"])
def number_converter_page():
    """Render the Binary/Hex/Octal Converter web UI."""
    return render_template("tools/number-converter.html")


@general_utils_bp.route("/number-converter/convert", methods=["POST"])
def number_converter_convert():
    """API: convert a number between different bases."""
    try:
        data = request.get_json(silent=True) or {}
        input_value = str(data.get("value", "")).strip()
        input_base = data.get("base", "decimal").strip().lower()

        if not input_value:
            return jsonify({"status": "error", "message": "No value provided."})

        valid_bases = ["binary", "octal", "decimal", "hex", "ascii"]
        if input_base not in valid_bases:
            return jsonify({"status": "error", "message": f"Invalid base: {input_base}. Supported: {', '.join(valid_bases)}"})

        result = _convert_number(input_value, input_base)

        log_tool_usage("number-converter", "convert",
                       f"base={input_base}, value={input_value[:50]}",
                       f"decimal={result.get('decimal', 'N/A')}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
