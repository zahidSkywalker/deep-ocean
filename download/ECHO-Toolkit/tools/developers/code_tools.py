"""
ECHO Toolkit — Developer Code Tools
Flask Blueprint with 12 fully functional developer utilities.
Each tool exposes a web UI route (GET → HTML) and an API route (POST → JSON).
"""

from flask import Blueprint, render_template, request, jsonify
import json
import hashlib
import base64
import re
import time
import datetime
import html
import urllib.parse
import math
import random
import string
import struct
import html

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------
code_tools_bp = Blueprint(
    "code_tools_bp",
    __name__,
    url_prefix="/tools/developers",
    template_folder="../../templates",
)


# =========================================================================
# 1. JSON Formatter / Validator
# =========================================================================

@code_tools_bp.route("/json-formatter", methods=["GET"])
def json_formatter_page():
    """Render the JSON Formatter web UI."""
    return render_template("tools/json-formatter.html")


@code_tools_bp.route("/json-formatter/format", methods=["POST"])
def json_formatter_api():
    """API: format / minify / validate / tree-view JSON."""
    try:
        data = request.get_json(silent=True) or {}
        raw = data.get("input", "")
        action = data.get("action", "format")  # format | minify | tree | sort | validate
        indent = int(data.get("indent", 4))

        if not raw.strip():
            return jsonify({"status": "error", "message": "No input provided."})

        parsed = json.loads(raw)

        if action == "validate":
            return jsonify({
                "status": "success",
                "data": {"valid": True, "message": "Valid JSON."},
            })

        if action == "minify":
            return jsonify({
                "status": "success",
                "data": {"result": json.dumps(parsed, separators=(",", ":")),
                         "size_original": len(raw.encode("utf-8")),
                         "size_minified": len(json.dumps(parsed, separators=(",", ":")).encode("utf-8"))},
            })

        if action == "sort":
            sorted_obj = _sort_dict(parsed)
            return jsonify({
                "status": "success",
                "data": {"result": json.dumps(sorted_obj, indent=indent, ensure_ascii=False)},
            })

        if action == "tree":
            tree = _json_tree(parsed)
            return jsonify({
                "status": "success",
                "data": {"tree": tree},
            })

        # default: pretty print
        return jsonify({
            "status": "success",
            "data": {"result": json.dumps(parsed, indent=indent, ensure_ascii=False)},
        })

    except json.JSONDecodeError as e:
        return jsonify({
            "status": "error",
            "message": f"Invalid JSON: {e.msg} at line {e.lineno}, column {e.colno}",
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


def _sort_dict(obj):
    """Recursively sort dictionary keys."""
    if isinstance(obj, dict):
        return {k: _sort_dict(v) for k, v in sorted(obj.items())}
    if isinstance(obj, list):
        return [_sort_dict(item) for item in obj]
    return obj


def _json_tree(obj, depth=0):
    """Build a tree-view structure from parsed JSON."""
    if isinstance(obj, dict):
        return {"type": "object", "children": [
            {"key": k, "value": _json_tree(v, depth + 1), "count": len(obj)}
            for k, v in obj.items()
        ]}
    if isinstance(obj, list):
        return {"type": "array", "length": len(obj), "preview": _json_tree(obj[0], depth + 1) if obj else None}
    return {"type": type(obj).__name__, "value": obj}


# =========================================================================
# 2. Base64 Encoder / Decoder
# =========================================================================

@code_tools_bp.route("/base64", methods=["GET"])
def base64_page():
    return render_template("tools/base64.html")


@code_tools_bp.route("/base64/convert", methods=["POST"])
def base64_convert_api():
    """API: encode text to base64 or decode base64 to text."""
    try:
        data = request.get_json(silent=True) or {}
        raw = data.get("input", "")
        action = data.get("action", "auto")  # encode | decode | auto

        if not raw.strip():
            return jsonify({"status": "error", "message": "No input provided."})

        if action == "auto":
            action = _detect_base64(raw)

        if action == "decode":
            # Add padding if needed
            padded = raw.strip()
            missing_padding = len(padded) % 4
            if missing_padding:
                padded += "=" * (4 - missing_padding)
            decoded_bytes = base64.b64decode(padded, validate=True)
            # Try UTF-8, fallback to latin-1
            try:
                decoded_text = decoded_bytes.decode("utf-8")
            except UnicodeDecodeError:
                decoded_text = decoded_bytes.decode("latin-1")
            return jsonify({
                "status": "success",
                "data": {
                    "result": decoded_text,
                    "action": "decode",
                    "bytes_length": len(decoded_bytes),
                },
            })
        else:
            encoded = base64.b64encode(raw.encode("utf-8")).decode("ascii")
            return jsonify({
                "status": "success",
                "data": {
                    "result": encoded,
                    "action": "encode",
                    "bytes_length": len(raw.encode("utf-8")),
                },
            })
    except Exception as e:
        return jsonify({"status": "error", "message": f"Failed to {action}: {str(e)}"})


def _detect_base64(s):
    """Heuristic: if string looks like base64 return 'decode', else 'encode'."""
    s = s.strip()
    if re.match(r'^[A-Za-z0-9+/]+=*$', s) and len(s) % 4 in (0, 2, 3) and len(s) >= 4:
        return "decode"
    return "encode"


# =========================================================================
# 3. Regex Builder / Tester
# =========================================================================

# Common regex patterns library
COMMON_PATTERNS = [
    {"name": "Email", "pattern": r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', "description": "Match email addresses"},
    {"name": "URL", "pattern": r'https?://[^\s<>"\']+', "description": "Match HTTP/HTTPS URLs"},
    {"name": "IP Address (v4)", "pattern": r'\b(?:\d{1,3}\.){3}\d{1,3}\b', "description": "Match IPv4 addresses"},
    {"name": "Phone (US)", "pattern": r'\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', "description": "Match US phone numbers"},
    {"name": "Date (YYYY-MM-DD)", "pattern": r'\b\d{4}-\d{2}-\d{2}\b', "description": "Match dates in ISO format"},
    {"name": "Hex Color", "pattern": r'#(?:[0-9a-fA-F]{3}){1,2}\b', "description": "Match hex color codes"},
    {"name": "HTML Tag", "pattern": r'<[^>]+>', "description": "Match HTML tags"},
    {"name": "Number", "pattern": r'-?\d+\.?\d*', "description": "Match integers and decimals"},
    {"name": "Whitespace", "pattern": r'\s+', "description": "Match any whitespace"},
    {"name": "Username", "pattern": r'^[a-zA-Z0-9_-]{3,16}$', "description": "Match typical usernames (3-16 chars)"},
]


@code_tools_bp.route("/regex", methods=["GET"])
def regex_page():
    return render_template("tools/regex.html")


@code_tools_bp.route("/regex/test", methods=["POST"])
def regex_test_api():
    """API: test a regex against input text and return matches, groups, etc."""
    try:
        data = request.get_json(silent=True) or {}
        pattern_str = data.get("pattern", "")
        test_string = data.get("test_string", "")
        flags_list = data.get("flags", [])

        if not pattern_str:
            return jsonify({"status": "error", "message": "No regex pattern provided."})

        # Build flags
        compiled_flags = 0
        for f in flags_list:
            if f == "i":
                compiled_flags |= re.IGNORECASE
            elif f == "m":
                compiled_flags |= re.MULTILINE
            elif f == "s":
                compiled_flags |= re.DOTALL
            elif f == "x":
                compiled_flags |= re.VERBOSE

        pattern = re.compile(pattern_str, compiled_flags)

        matches = []
        for m in pattern.finditer(test_string):
            groups = []
            for i, g in enumerate(m.groups()):
                groups.append({"index": i + 1, "value": g, "span": list(m.span(i + 1)) if g else None})

            named_groups = {name: m.group(name) for name in m.groupdict() if m.group(name) is not None}

            matches.append({
                "match": m.group(),
                "start": m.start(),
                "end": m.end(),
                "span": list(m.span()),
                "groups": groups,
                "named_groups": named_groups,
            })

        # Highlighted HTML
        highlighted = _highlight_matches(test_string, pattern)

        return jsonify({
            "status": "success",
            "data": {
                "match_count": len(matches),
                "matches": matches,
                "highlighted": highlighted,
                "pattern_info": {
                    "pattern": pattern_str,
                    "flags": flags_list,
                    "groups_count": pattern.groups,
                    "group_names": list(pattern.groupindex.keys()),
                },
            },
        })
    except re.error as e:
        return jsonify({"status": "error", "message": f"Invalid regex: {str(e)}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@code_tools_bp.route("/regex/patterns", methods=["GET"])
def regex_patterns_api():
    """API: return the common patterns library."""
    return jsonify({"status": "success", "data": COMMON_PATTERNS})


def _highlight_matches(text, pattern):
    """Return HTML with matches wrapped in <mark> tags."""
    last_end = 0
    parts = []
    for m in pattern.finditer(text):
        parts.append(html.escape(text[last_end:m.start()]))
        parts.append(f'<mark>{html.escape(m.group())}</mark>')
        last_end = m.end()
    parts.append(html.escape(text[last_end:]))
    return "".join(parts)


# =========================================================================
# 4. Hash Generator
# =========================================================================

@code_tools_bp.route("/hash", methods=["GET"])
def hash_page():
    return render_template("tools/hash.html")


@code_tools_bp.route("/hash/generate", methods=["POST"])
def hash_generate_api():
    """API: generate MD5, SHA1, SHA256, SHA512 hashes of input text."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("input", "")
        algorithms = data.get("algorithms", ["md5", "sha1", "sha256", "sha512"])

        if not text:
            return jsonify({"status": "error", "message": "No input provided."})

        text_bytes = text.encode("utf-8")
        results = {}

        algo_map = {
            "md5": hashlib.md5,
            "sha1": hashlib.sha1,
            "sha256": hashlib.sha256,
            "sha512": hashlib.sha512,
        }

        for algo in algorithms:
            if algo in algo_map:
                h = algo_map[algo](text_bytes)
                results[algo] = {
                    "hash": h.hexdigest(),
                    "algorithm": algo.upper(),
                    "length": len(h.hexdigest()),
                }

        return jsonify({
            "status": "success",
            "data": results,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 5. JWT Decoder
# =========================================================================

@code_tools_bp.route("/jwt", methods=["GET"])
def jwt_page():
    return render_template("tools/jwt.html")


@code_tools_bp.route("/jwt/decode", methods=["POST"])
def jwt_decode_api():
    """API: decode a JWT token (header + payload only, no signature verification)."""
    try:
        data = request.get_json(silent=True) or {}
        token = data.get("token", "").strip()

        if not token:
            return jsonify({"status": "error", "message": "No JWT token provided."})

        parts = token.split(".")
        if len(parts) != 3:
            return jsonify({"status": "error", "message": "Invalid JWT format. Expected 3 parts separated by dots."})

        def _decode_part(part, label):
            # JWT uses base64url encoding
            padded = part + "=" * (4 - len(part) % 4)
            try:
                decoded = base64.urlsafe_b64decode(padded)
                return json.loads(decoded)
            except (json.JSONDecodeError, Exception) as e:
                return {"error": f"Failed to decode {label}: {str(e)}"}

        header = _decode_part(parts[0], "header")
        payload = _decode_part(parts[1], "payload")

        return jsonify({
            "status": "success",
            "data": {
                "header": header,
                "payload": payload,
                "signature": {
                    "algorithm": header.get("alg", "unknown"),
                    "value": parts[2][:32] + ("..." if len(parts[2]) > 32 else ""),
                    "note": "Signature is NOT verified. This tool only decodes the token.",
                },
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 6. Timestamp Converter
# =========================================================================

@code_tools_bp.route("/timestamp", methods=["GET"])
def timestamp_page():
    return render_template("tools/timestamp.html")


@code_tools_bp.route("/timestamp/convert", methods=["POST"])
def timestamp_convert_api():
    """API: convert between unix timestamps and human-readable dates."""
    try:
        data = request.get_json(silent=True) or {}
        value = data.get("input", "").strip()
        tz_offset = int(data.get("timezone_offset", 0))  # hours offset, 0 = UTC

        if not value:
            # Return current timestamp
            now = datetime.datetime.now(datetime.timezone.utc)
            return jsonify({
                "status": "success",
                "data": {
                    "current": True,
                    "unix_seconds": int(now.timestamp()),
                    "unix_millis": int(now.timestamp() * 1000),
                    "iso": now.isoformat(),
                    "rfc": now.strftime("%a, %d %b %Y %H:%M:%S +0000"),
                    "utc": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
                    "relative": _relative_time(now),
                },
            })

        # Try to parse as number (unix timestamp)
        try:
            num = float(value)
            # Detect milliseconds vs seconds: if > 1e12, it's milliseconds
            if num > 1e12:
                ts = num / 1000.0
                is_millis = True
            else:
                ts = num
                is_millis = False

            dt_utc = datetime.datetime.fromtimestamp(ts, tz=datetime.timezone.utc)
            dt_local = dt_utc + datetime.timedelta(hours=tz_offset)

            return jsonify({
                "status": "success",
                "data": {
                    "input_type": "unix_timestamp",
                    "is_milliseconds": is_millis,
                    "unix_seconds": int(ts),
                    "unix_millis": int(ts * 1000),
                    "iso": dt_local.isoformat(),
                    "rfc": dt_local.strftime("%a, %d %b %Y %H:%M:%S") + _format_tz_offset(tz_offset),
                    "utc": dt_utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
                    "local": dt_local.strftime("%Y-%m-%d %H:%M:%S"),
                    "relative": _relative_time(dt_utc),
                    "date_only": dt_local.strftime("%Y-%m-%d"),
                    "time_only": dt_local.strftime("%H:%M:%S"),
                    "day_of_week": dt_local.strftime("%A"),
                    "week_number": dt_local.isocalendar()[1],
                },
            })
        except (ValueError, OSError, OverflowError):
            pass

        # Try to parse as human-readable date string
        dt = _parse_datetime(value)
        if dt is None:
            return jsonify({"status": "error", "message": "Could not parse input. Provide a unix timestamp or date string."})

        dt_utc = dt.astimezone(datetime.timezone.utc) if dt.tzinfo else dt.replace(tzinfo=datetime.timezone.utc)
        dt_local = dt_utc + datetime.timedelta(hours=tz_offset)

        return jsonify({
            "status": "success",
            "data": {
                "input_type": "datetime_string",
                "unix_seconds": int(dt_utc.timestamp()),
                "unix_millis": int(dt_utc.timestamp() * 1000),
                "iso": dt_local.isoformat(),
                "rfc": dt_local.strftime("%a, %d %b %Y %H:%M:%S") + _format_tz_offset(tz_offset),
                "utc": dt_utc.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "local": dt_local.strftime("%Y-%m-%d %H:%M:%S"),
                "relative": _relative_time(dt_utc),
                "date_only": dt_local.strftime("%Y-%m-%d"),
                "time_only": dt_local.strftime("%H:%M:%S"),
                "day_of_week": dt_local.strftime("%A"),
                "week_number": dt_local.isocalendar()[1],
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


def _parse_datetime(s):
    """Try multiple date formats to parse a datetime string."""
    formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
        "%Y-%m-%d",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d %B %Y",
        "%d %b %Y",
    ]
    for fmt in formats:
        try:
            return datetime.datetime.strptime(s, fmt)
        except ValueError:
            continue
    # ISO format with Z
    try:
        return datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        pass
    return None


def _format_tz_offset(hours):
    """Format timezone offset like +0000 or -0500."""
    sign = "+" if hours >= 0 else "-"
    h = abs(int(hours))
    m = abs(int((hours - int(hours)) * 60))
    return f"{sign}{h:02d}{m:02d}"


def _relative_time(dt, reference=None):
    """Return a human-readable relative time string."""
    if reference is None:
        reference = datetime.datetime.now(datetime.timezone.utc)

    delta = dt - reference
    seconds = int(delta.total_seconds())

    if seconds < 0:
        direction = "ago"
        seconds = abs(seconds)
    else:
        direction = "from now"

    if seconds < 60:
        return f"{seconds} seconds {direction}"
    elif seconds < 3600:
        minutes = seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''} {direction}"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''} {direction}"
    elif seconds < 2592000:
        days = seconds // 86400
        return f"{days} day{'s' if days != 1 else ''} {direction}"
    elif seconds < 31536000:
        months = seconds // 2592000
        return f"{months} month{'s' if months != 1 else ''} {direction}"
    else:
        years = seconds // 31536000
        return f"{years} year{'s' if years != 1 else ''} {direction}"


# =========================================================================
# 7. URL Encoder / Decoder
# =========================================================================

@code_tools_bp.route("/url-encode", methods=["GET"])
def url_encode_page():
    return render_template("tools/url-encode.html")


@code_tools_bp.route("/url-encode/convert", methods=["POST"])
def url_encode_convert_api():
    """API: encode or decode a URL string."""
    try:
        data = request.get_json(silent=True) or {}
        raw = data.get("input", "")
        action = data.get("action", "auto")  # encode | decode | auto
        encode_component = data.get("encode_component", False)  # quote vs quote_plus

        if not raw.strip():
            return jsonify({"status": "error", "message": "No input provided."})

        if action == "auto":
            action = _detect_url_encoded(raw)

        if action == "decode":
            # Try full URL decoding, then fallback to component
            try:
                decoded = urllib.parse.unquote(raw)
            except Exception:
                decoded = urllib.parse.unquote_plus(raw)
            return jsonify({
                "status": "success",
                "data": {
                    "result": decoded,
                    "action": "decode",
                    "original_length": len(raw),
                    "decoded_length": len(decoded),
                },
            })
        else:
            if encode_component:
                encoded = urllib.parse.quote_plus(raw, safe="")
            else:
                encoded = urllib.parse.quote(raw, safe="")
            return jsonify({
                "status": "success",
                "data": {
                    "result": encoded,
                    "action": "encode",
                    "original_length": len(raw),
                    "encoded_length": len(encoded),
                },
            })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


def _detect_url_encoded(s):
    """Heuristic: if string contains %-encoded sequences, treat as encoded."""
    if "%" in s:
        return "decode"
    return "encode"


# =========================================================================
# 8. Unicode Lookup
# =========================================================================

@code_tools_bp.route("/unicode", methods=["GET"])
def unicode_page():
    return render_template("tools/unicode.html")


@code_tools_bp.route("/unicode/lookup", methods=["POST"])
def unicode_lookup_api():
    """API: lookup Unicode information for a character or code point."""
    try:
        data = request.get_json(silent=True) or {}
        value = data.get("input", "").strip()

        if not value:
            return jsonify({"status": "error", "message": "No input provided."})

        results = []

        # Parse input: could be a single char, "U+1F600", "1F600", or multiple chars
        # Try to parse as U+XXXX or plain hex
        if re.match(r'^(?:U\+|u\+|0x)?[0-9a-fA-F]{1,6}$', value):
            code_point = int(value.replace("U+", "").replace("u+", "").replace("0x", ""), 16)
            char = chr(code_point)
            results.append(_unicode_info(char, code_point))
        else:
            # Treat as literal characters
            for ch in value:
                results.append(_unicode_info(ch, ord(ch)))

        return jsonify({
            "status": "success",
            "data": results,
        })
    except (ValueError, OverflowError) as e:
        return jsonify({"status": "error", "message": f"Invalid code point: {str(e)}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


def _unicode_info(char, code_point):
    """Build a dict of Unicode info for a single character."""
    import unicodedata
    try:
        name = unicodedata.name(char, "UNKNOWN")
    except (ValueError, TypeError):
        name = "UNKNOWN"

    # UTF-8 bytes
    utf8_bytes = char.encode("utf-8")
    # UTF-16 bytes
    utf16_bytes = char.encode("utf-16-be")

    # Category
    try:
        category = unicodedata.category(char)
        category_name = {
            "Lu": "Uppercase Letter", "Ll": "Lowercase Letter", "Lt": "Titlecase Letter",
            "Lm": "Modifier Letter", "Lo": "Other Letter",
            "Mn": "Non-Spacing Mark", "Mc": "Spacing Combining Mark", "Me": "Enclosing Mark",
            "Nd": "Decimal Digit", "Nl": "Letter Number", "No": "Other Number",
            "Pc": "Connector Punctuation", "Pd": "Dash Punctuation", "Ps": "Open Punctuation",
            "Pe": "Close Punctuation", "Pi": "Initial Punctuation", "Pf": "Final Punctuation",
            "Po": "Other Punctuation",
            "Sm": "Math Symbol", "Sc": "Currency Symbol", "Sk": "Modifier Symbol", "So": "Other Symbol",
            "Zs": "Space Separator", "Zl": "Line Separator", "Zp": "Paragraph Separator",
            "Cc": "Control", "Cf": "Format", "Cs": "Surrogate", "Co": "Private Use", "Cn": "Unassigned",
        }.get(category, category)
    except (ValueError, TypeError):
        category = "Cn"
        category_name = "Unassigned"

    # Block
    try:
        block = _unicode_block(code_point)
    except Exception:
        block = "Unknown"

    return {
        "character": char,
        "code_point": code_point,
        "code_point_hex": f"U+{code_point:04X}",
        "code_point_decimal": code_point,
        "code_point_binary": f"{code_point:b}",
        "code_point_octal": f"{code_point:o}",
        "name": name,
        "category": category,
        "category_name": category_name,
        "block": block,
        "html_entity": f"&#{code_point};",
        "html_entity_hex": f"&#x{code_point:X};",
        "html_entity_named": _html_named_entity(char),
        "css_value": f"\\{code_point:X}",
        "css_escaped": f"\\{code_point:06X}" if code_point > 0xFFFF else f"\\{code_point:X}",
        "json_escape": f"\\u{code_point:04X}" if code_point <= 0xFFFF else json.dumps(char)[1:-1],
        "python_escape": repr(char),
        "java_escape": f"\\u{code_point:04X}" if code_point <= 0xFFFF else f"\\u{{{code_point:X}}}",
        "utf8_hex": " ".join(f"{b:02X}" for b in utf8_bytes),
        "utf8_bytes": list(utf8_bytes),
        "utf16_hex": " ".join(f"{b:02X}" for b in utf16_bytes),
        "utf16_bytes": list(utf16_bytes),
        "is_printable": char.isprintable(),
        "is_ascii": code_point < 128,
        "is_whitespace": char.isspace(),
        "is_digit": char.isdigit(),
        "is_letter": char.isalpha(),
    }


def _html_named_entity(char):
    """Return HTML named entity if one exists."""
    import html.entities
    for name, value in html.entities.html5.items():
        if not name.endswith(";"):
            continue
        # html5 dict may have multiple values separated by semicolons
        # We need to check the actual character
        try:
            actual_char = html.unescape(f"&{name}")
            if actual_char == char:
                return f"&{name}"
        except Exception:
            continue
    return None


def _unicode_block(cp):
    """Return the Unicode block name for a code point."""
    blocks = [
        (0x0000, 0x007F, "Basic Latin"),
        (0x0080, 0x00FF, "Latin-1 Supplement"),
        (0x0100, 0x017F, "Latin Extended-A"),
        (0x0180, 0x024F, "Latin Extended-B"),
        (0x0250, 0x02AF, "IPA Extensions"),
        (0x02B0, 0x02FF, "Spacing Modifier Letters"),
        (0x0300, 0x036F, "Combining Diacritical Marks"),
        (0x0370, 0x03FF, "Greek and Coptic"),
        (0x0400, 0x04FF, "Cyrillic"),
        (0x0500, 0x052F, "Cyrillic Supplement"),
        (0x0530, 0x058F, "Armenian"),
        (0x0590, 0x05FF, "Hebrew"),
        (0x0600, 0x06FF, "Arabic"),
        (0x0700, 0x074F, "Syriac"),
        (0x0780, 0x07BF, "Thaana"),
        (0x0900, 0x097F, "Devanagari"),
        (0x0980, 0x09FF, "Bengali"),
        (0x0A00, 0x0A7F, "Gurmukhi"),
        (0x0A80, 0x0AFF, "Gujarati"),
        (0x0B00, 0x0B7F, "Oriya"),
        (0x0B80, 0x0BFF, "Tamil"),
        (0x0C00, 0x0C7F, "Telugu"),
        (0x0C80, 0x0CFF, "Kannada"),
        (0x0D00, 0x0D7F, "Malayalam"),
        (0x0D80, 0x0DFF, "Sinhala"),
        (0x0E00, 0x0E7F, "Thai"),
        (0x0E80, 0x0EFF, "Lao"),
        (0x0F00, 0x0FFF, "Tibetan"),
        (0x1000, 0x109F, "Myanmar"),
        (0x10A0, 0x10FF, "Georgian"),
        (0x1100, 0x11FF, "Hangul Jamo"),
        (0x1200, 0x137F, "Ethiopic"),
        (0x13A0, 0x13FF, "Cherokee"),
        (0x1400, 0x167F, "Unified Canadian Aboriginal Syllabics"),
        (0x1680, 0x169F, "Ogham"),
        (0x16A0, 0x16FF, "Runic"),
        (0x1700, 0x17FF, "Tagalog"),
        (0x1800, 0x18AF, "Mongolian"),
        (0x1900, 0x194F, "Limbu"),
        (0x1950, 0x197F, "Tai Le"),
        (0x1E00, 0x1EFF, "Latin Extended Additional"),
        (0x2000, 0x206F, "General Punctuation"),
        (0x2070, 0x209F, "Superscripts and Subscripts"),
        (0x20A0, 0x20CF, "Currency Symbols"),
        (0x20D0, 0x20FF, "Combining Diacritical Marks for Symbols"),
        (0x2100, 0x214F, "Letterlike Symbols"),
        (0x2150, 0x218F, "Number Forms"),
        (0x2190, 0x21FF, "Arrows"),
        (0x2200, 0x22FF, "Mathematical Operators"),
        (0x2300, 0x23FF, "Miscellaneous Technical"),
        (0x2400, 0x243F, "Control Pictures"),
        (0x2440, 0x245F, "Optical Character Recognition"),
        (0x2460, 0x24FF, "Enclosed Alphanumerics"),
        (0x2500, 0x257F, "Box Drawing"),
        (0x2580, 0x259F, "Block Elements"),
        (0x25A0, 0x25FF, "Geometric Shapes"),
        (0x2600, 0x26FF, "Miscellaneous Symbols"),
        (0x2700, 0x27BF, "Dingbats"),
        (0x2800, 0x28FF, "Braille Patterns"),
        (0x3000, 0x303F, "CJK Symbols and Punctuation"),
        (0x3040, 0x309F, "Hiragana"),
        (0x30A0, 0x30FF, "Katakana"),
        (0x3100, 0x312F, "Bopomofo"),
        (0x3130, 0x318F, "Hangul Compatibility Jamo"),
        (0x3190, 0x319F, "Kanbun"),
        (0x31A0, 0x31BF, "Bopomofo Extended"),
        (0x3200, 0x32FF, "Enclosed CJK Letters and Months"),
        (0x3300, 0x33FF, "CJK Compatibility"),
        (0x3400, 0x4DBF, "CJK Unified Ideographs Extension A"),
        (0x4E00, 0x9FFF, "CJK Unified Ideographs"),
        (0xAC00, 0xD7AF, "Hangul Syllables"),
        (0xD800, 0xDFFF, "Surrogates"),
        (0xE000, 0xF8FF, "Private Use Area"),
        (0xF900, 0xFAFF, "CJK Compatibility Ideographs"),
        (0xFB00, 0xFB4F, "Alphabetic Presentation Forms"),
        (0xFE00, 0xFE0F, "Variation Selectors"),
        (0xFE20, 0xFE2F, "Combining Half Marks"),
        (0xFE30, 0xFE4F, "CJK Compatibility Forms"),
        (0xFE50, 0xFE6F, "Small Form Variants"),
        (0xFE70, 0xFEFF, "Arabic Presentation Forms-B"),
        (0xFF00, 0xFFEF, "Halfwidth and Fullwidth Forms"),
        (0x10000, 0x1007F, "Linear B Syllabary"),
        (0x10080, 0x100FF, "Linear B Ideograms"),
        (0x10100, 0x1013F, "Aegean Numbers"),
        (0x10300, 0x1032F, "Old Italic"),
        (0x10330, 0x1034F, "Gothic"),
        (0x10400, 0x1044F, "Deseret"),
        (0x1D000, 0x1D0FF, "Byzantine Musical Symbols"),
        (0x1D100, 0x1D1FF, "Musical Symbols"),
        (0x1D300, 0x1D35F, "Tai Xuan Jing Symbols"),
        (0x1F000, 0x1F02F, "Mahjong Tiles"),
        (0x1F030, 0x1F09F, "Domino Tiles"),
        (0x1F0A0, 0x1F0FF, "Playing Cards"),
        (0x1F100, 0x1F1FF, "Enclosed Alphanumeric Supplement"),
        (0x1F200, 0x1F2FF, "Enclosed Ideographic Supplement"),
        (0x1F300, 0x1F5FF, "Miscellaneous Symbols and Pictographs"),
        (0x1F600, 0x1F64F, "Emoticons"),
        (0x1F680, 0x1F6FF, "Transport and Map Symbols"),
        (0x1F700, 0x1F77F, "Alchemical Symbols"),
        (0x1F780, 0x1F7FF, "Geometric Shapes Extended"),
        (0x1F800, 0x1F8FF, "Supplemental Arrows-C"),
        (0x1F900, 0x1F9FF, "Supplemental Symbols and Pictographs"),
        (0x1FA00, 0x1FA6F, "Chess Symbols"),
        (0x1FA70, 0x1FAFF, "Symbols and Pictographs Extended-A"),
        (0x20000, 0x2A6DF, "CJK Unified Ideographs Extension B"),
        (0x2A700, 0x2B73F, "CJK Unified Ideographs Extension C"),
        (0x2B740, 0x2B81F, "CJK Unified Ideographs Extension D"),
        (0x2B820, 0x2CEAF, "CJK Unified Ideographs Extension E"),
        (0x2CEB0, 0x2EBEF, "CJK Unified Ideographs Extension F"),
        (0x2F800, 0x2FA1F, "CJK Compatibility Ideographs Supplement"),
        (0xE0000, 0xE007F, "Tags"),
        (0xE0100, 0xE01EF, "Variation Selectors Supplement"),
        (0xF0000, 0xFFFFD, "Supplementary Private Use Area-A"),
        (0x100000, 0x10FFFD, "Supplementary Private Use Area-B"),
    ]
    for start, end, name in blocks:
        if start <= cp <= end:
            return name
    return "Unknown"


# =========================================================================
# 9. Color Converter
# =========================================================================

@code_tools_bp.route("/color", methods=["GET"])
def color_page():
    return render_template("tools/color.html")


@code_tools_bp.route("/color/convert", methods=["POST"])
def color_convert_api():
    """API: convert color between HEX, RGB, HSL, HSV formats."""
    try:
        data = request.get_json(silent=True) or {}
        value = data.get("input", "").strip()
        input_format = data.get("format", "auto")  # auto | hex | rgb | hsl

        if not value:
            return jsonify({"status": "error", "message": "No input provided."})

        if input_format == "auto":
            input_format = _detect_color_format(value)

        if input_format == "hex":
            r, g, b = _hex_to_rgb(value)
            rgb = (r, g, b)
        elif input_format == "rgb":
            rgb = _parse_rgb(value)
        elif input_format == "hsl":
            rgb = _hsl_to_rgb(*_parse_hsl(value))
        else:
            return jsonify({"status": "error", "message": "Unrecognized color format."})

        r, g, b = rgb
        hex_val = _rgb_to_hex(r, g, b)
        hsl = _rgb_to_hsl(r, g, b)
        hsv = _rgb_to_hsv(r, g, b)

        # Luminance for contrast
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

        return jsonify({
            "status": "success",
            "data": {
                "hex": hex_val,
                "rgb": {"r": r, "g": g, "b": b, "string": f"rgb({r}, {g}, {b})"},
                "hsl": {"h": round(hsl[0], 2), "s": round(hsl[1], 2), "l": round(hsl[2], 2),
                        "string": f"hsl({round(hsl[0])}, {round(hsl[1])}%, {round(hsl[2])}%)"},
                "hsv": {"h": round(hsv[0], 2), "s": round(hsv[1], 2), "v": round(hsv[2], 2),
                        "string": f"hsv({round(hsv[0])}, {round(hsv[1])}%, {round(hsv[2])}%)"},
                "preview_hex": hex_val,
                "luminance": round(luminance, 4),
                "text_color": "#000000" if luminance > 0.5 else "#FFFFFF",
                "css_filter": f"brightness({round(luminance * 2, 2)})",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


def _detect_color_format(s):
    """Detect if a string is hex, rgb, or hsl."""
    s = s.strip().lower()
    if s.startswith("#") or re.match(r'^[0-9a-f]{3}([0-9a-f]{3})?$', s):
        return "hex"
    if s.startswith("rgb"):
        return "rgb"
    if s.startswith("hsl"):
        return "hsl"
    if re.match(r'^\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}$', s):
        return "rgb"
    return "hex"  # default


def _hex_to_rgb(hex_str):
    """Convert hex color to (R, G, B) tuple."""
    hex_str = hex_str.strip().lstrip("#")
    if len(hex_str) == 3:
        hex_str = "".join(c * 2 for c in hex_str)
    if len(hex_str) != 6:
        raise ValueError(f"Invalid hex color: {hex_str}")
    r = int(hex_str[0:2], 16)
    g = int(hex_str[2:4], 16)
    b = int(hex_str[4:6], 16)
    return r, g, b


def _rgb_to_hex(r, g, b):
    """Convert (R, G, B) to hex string."""
    return f"#{r:02X}{g:02X}{b:02X}"


def _parse_rgb(s):
    """Parse an RGB string like 'rgb(255, 128, 0)' or '255,128,0'."""
    nums = re.findall(r'\d+', s)
    if len(nums) < 3:
        raise ValueError("Could not parse RGB values.")
    r = max(0, min(255, int(nums[0])))
    g = max(0, min(255, int(nums[1])))
    b = max(0, min(255, int(nums[2])))
    return r, g, b


def _parse_hsl(s):
    """Parse an HSL string like 'hsl(120, 50%, 75%)' or '120, 50%, 75%'."""
    nums = re.findall(r'[\d.]+', s)
    if len(nums) < 3:
        raise ValueError("Could not parse HSL values.")
    h = float(nums[0]) % 360
    s_val = max(0.0, min(100.0, float(nums[1]))) / 100.0
    l_val = max(0.0, min(100.0, float(nums[2]))) / 100.0
    return h, s_val, l_val


def _rgb_to_hsl(r, g, b):
    """Convert RGB to HSL. Returns (H in degrees, S 0-1, L 0-1)."""
    r_norm = r / 255.0
    g_norm = g / 255.0
    b_norm = b / 255.0

    cmax = max(r_norm, g_norm, b_norm)
    cmin = min(r_norm, g_norm, b_norm)
    delta = cmax - cmin

    # Lightness
    l = (cmax + cmin) / 2.0

    if delta == 0:
        h = 0.0
        s = 0.0
    else:
        # Saturation
        s = delta / (2.0 - cmax - cmin) if (2.0 - cmax - cmin) != 0 else delta / (cmax + cmin)

        # Hue
        if cmax == r_norm:
            h = ((g_norm - b_norm) / delta) % 6
        elif cmax == g_norm:
            h = (b_norm - r_norm) / delta + 2
        else:
            h = (r_norm - g_norm) / delta + 4
        h *= 60
        if h < 0:
            h += 360

    return h, s, l


def _rgb_to_hsv(r, g, b):
    """Convert RGB to HSV. Returns (H in degrees, S 0-1, V 0-1)."""
    r_norm = r / 255.0
    g_norm = g / 255.0
    b_norm = b / 255.0

    cmax = max(r_norm, g_norm, b_norm)
    cmin = min(r_norm, g_norm, b_norm)
    delta = cmax - cmin

    v = cmax

    if delta == 0:
        h = 0.0
        s = 0.0
    else:
        s = delta / cmax if cmax != 0 else 0

        if cmax == r_norm:
            h = ((g_norm - b_norm) / delta) % 6
        elif cmax == g_norm:
            h = (b_norm - r_norm) / delta + 2
        else:
            h = (r_norm - g_norm) / delta + 4
        h *= 60
        if h < 0:
            h += 360

    return h, s, v


def _hsl_to_rgb(h, s, l):
    """Convert HSL to RGB. h in degrees, s and l in 0-1. Returns (R, G, B) 0-255."""
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

    r = round((r1 + m) * 255)
    g = round((g1 + m) * 255)
    b = round((b1 + m) * 255)
    return max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))


# =========================================================================
# 10. Lorem Ipsum Generator
# =========================================================================

# Predefined word list based on classic Lorem Ipsum
LOREM_WORDS = [
    "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
    "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
    "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
    "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
    "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
    "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
    "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
    "deserunt", "mollit", "anim", "id", "est", "laborum", "semper", "ligula",
    "viverra", "maecenas", "accumsan", "lacus", "vel", "facilisis", "volutpat",
    "donec", "vitae", "sapien", "pellentesque", "habitant", "morbi", "tristique",
    "senectus", "netus", "malesuada", "fames", "turpis", "egestas", "proin",
    "gravida", "hendrerit", "lectus", "arcu", "bibendum", "at", "varius", "diam",
    "sollicitudin", "tempus", "quam", "pellentesque", "nec", "nam", "aliquam",
    "ultrices", "sagittis", "orci", "porta", "nibh", "venenatis", "cras",
    "ornare", "purus", "semper", "aenean", "pharetra", "magnis", "dis", "parturient",
    "montes", "nascetur", "ridiculus", "mus", "justo", "laoreet", "sit", "amet",
    "curabitur", "felis", "sodales", "ligula", "eu", "metus", "convallis",
    "posuere", " mauris", "lacinia", "donec", "pulvinar", "elementum", "integer",
    "enim", "neque", "ornare", "imperdiet", "dignissim", "pretium", "nunc",
    "vulputate", "sapien", "et", "ligula", "ullamcorper", "metus", "euismod",
]

LOREM_OPENERS = [
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    "Sed ut perspiciatis unde omnis iste natus error sit voluptatem.",
    "At vero eos et accusamus et iusto odio dignissimos ducimus.",
    "Et harum quidem rerum facilis est et expedita distinctio.",
    "Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus.",
    "Itaque earum rerum hic tenetur a sapiente delectus.",
    "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.",
    "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.",
    "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.",
    "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.",
]


@code_tools_bp.route("/lorem", methods=["GET"])
def lorem_page():
    return render_template("tools/lorem.html")


@code_tools_bp.route("/lorem/generate", methods=["POST"])
def lorem_generate_api():
    """API: generate lorem ipsum text."""
    try:
        data = request.get_json(silent=True) or {}
        paragraph_count = max(1, min(100, int(data.get("paragraphs", 3))))
        words_per_paragraph = max(1, min(500, int(data.get("words", 50))))
        start_with_lorem = data.get("start_with_lorem", True)

        paragraphs = []

        for i in range(paragraph_count):
            if start_with_lorem and i == 0:
                # First paragraph: classic opener + fill to word count
                opener_words = LOREM_OPENERS[random.randint(0, len(LOREM_OPENERS) - 1)].split()
                remaining = words_per_paragraph - len(opener_words)
                if remaining > 0:
                    extra = _generate_sentence_list(remaining)
                    words = opener_words + extra
                else:
                    words = opener_words[:words_per_paragraph]
            else:
                words = _generate_sentence_list(words_per_paragraph)

            # Capitalize first letter, add period
            paragraph = " ".join(words)
            paragraph = paragraph[0].upper() + paragraph[1:] if paragraph else ""
            if not paragraph.endswith("."):
                paragraph += "."
            paragraphs.append(paragraph)

        result = "\n\n".join(paragraphs)
        word_count = len(result.split())
        char_count = len(result)

        return jsonify({
            "status": "success",
            "data": {
                "text": result,
                "paragraphs": paragraphs,
                "paragraph_count": len(paragraphs),
                "word_count": word_count,
                "character_count": char_count,
                "sentence_count": sum(p.count(".") for p in paragraphs),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


def _generate_sentence_list(word_count):
    """Generate a list of words forming natural-looking sentences."""
    words = []
    sentences_created = 0
    current_sentence_len = 0

    while len(words) < word_count:
        # Average sentence: 10-20 words
        if current_sentence_len == 0:
            target = random.randint(8, 18)
            current_sentence_len = 0

        word = random.choice(LOREM_WORDS)
        words.append(word)
        current_sentence_len += 1

        if current_sentence_len >= target and len(words) < word_count:
            # End sentence with period
            if words:
                words[-1] = words[-1]  # period added later
            current_sentence_len = 0
            sentences_created += 1

    return words


# =========================================================================
# 11. Markdown Preview
# =========================================================================

@code_tools_bp.route("/markdown", methods=["GET"])
def markdown_page():
    return render_template("tools/markdown.html")


@code_tools_bp.route("/markdown/preview", methods=["POST"])
def markdown_preview_api():
    """API: convert markdown to HTML."""
    try:
        data = request.get_json(silent=True) or {}
        markdown_text = data.get("input", "")

        html_output = _markdown_to_html(markdown_text)

        return jsonify({
            "status": "success",
            "data": {
                "html": html_output,
                "markdown": markdown_text,
                "character_count": len(markdown_text),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


def _markdown_to_html(text):
    """Convert basic Markdown to HTML. Supports:
    - Headers (# ## ### etc.)
    - Bold (**text** or __text__)
    - Italic (*text* or _text_)
    - Inline code (`code`)
    - Code blocks (```code```)
    - Links [text](url)
    - Images ![alt](url)
    - Unordered lists (- or * item)
    - Ordered lists (1. item)
    - Blockquotes (> text)
    - Horizontal rules (--- or ***)
    - Line breaks (double space or empty line)
    """
    lines = text.split("\n")
    html_parts = []
    in_code_block = False
    code_block_lang = ""
    code_block_lines = []
    in_ul = False
    in_ol = False
    in_blockquote = False

    def _close_open_tags():
        nonlocal in_ul, in_ol, in_blockquote
        result = ""
        if in_blockquote:
            result += "</blockquote>\n"
            in_blockquote = False
        if in_ol:
            result += "</ol>\n"
            in_ol = False
        if in_ul:
            result += "</ul>\n"
            in_ul = False
        return result

    i = 0
    while i < len(lines):
        line = lines[i]

        # Code block
        if line.strip().startswith("```"):
            if in_code_block:
                # End code block
                code_content = html.escape("\n".join(code_block_lines))
                html_parts.append(f"<pre><code class=\"language-{code_block_lang}\">{code_content}</code></pre>\n")
                in_code_block = False
                code_block_lines = []
                code_block_lang = ""
            else:
                # Start code block
                _close_open_tags()
                in_code_block = True
                code_block_lang = line.strip()[3:].strip()
            i += 1
            continue

        if in_code_block:
            code_block_lines.append(line)
            i += 1
            continue

        # Empty line
        if not line.strip():
            html_parts.append(_close_open_tags())
            html_parts.append("<br>\n")
            i += 1
            continue

        # Horizontal rule
        if re.match(r'^(\*{3,}|-{3,}|_{3,})\s*$', line.strip()):
            html_parts.append(_close_open_tags())
            html_parts.append("<hr>\n")
            i += 1
            continue

        # Headers
        header_match = re.match(r'^(#{1,6})\s+(.+)$', line)
        if header_match:
            html_parts.append(_close_open_tags())
            level = len(header_match.group(1))
            content = _inline_formatting(header_match.group(2).strip())
            html_parts.append(f"<h{level}>{content}</h{level}>\n")
            i += 1
            continue

        # Blockquote
        if line.strip().startswith(">"):
            if not in_blockquote:
                html_parts.append(_close_open_tags())
                html_parts.append("<blockquote>\n")
                in_blockquote = True
            content = line.strip().lstrip(">").strip()
            content = _inline_formatting(content)
            html_parts.append(f"<p>{content}</p>\n")
            i += 1
            continue

        # Unordered list
        ul_match = re.match(r'^\s*[-*+]\s+(.+)$', line)
        if ul_match:
            if not in_ul:
                html_parts.append(_close_open_tags())
                html_parts.append("<ul>\n")
                in_ul = True
            content = _inline_formatting(ul_match.group(1).strip())
            html_parts.append(f"<li>{content}</li>\n")
            i += 1
            continue

        # Ordered list
        ol_match = re.match(r'^\s*\d+\.\s+(.+)$', line)
        if ol_match:
            if not in_ol:
                html_parts.append(_close_open_tags())
                html_parts.append("<ol>\n")
                in_ol = True
            content = _inline_formatting(ol_match.group(1).strip())
            html_parts.append(f"<li>{content}</li>\n")
            i += 1
            continue

        # Regular paragraph
        html_parts.append(_close_open_tags())
        content = _inline_formatting(line.strip())
        html_parts.append(f"<p>{content}</p>\n")
        i += 1

    # Close remaining tags
    if in_code_block:
        code_content = html.escape("\n".join(code_block_lines))
        html_parts.append(f"<pre><code>{code_content}</code></pre>\n")
    html_parts.append(_close_open_tags())

    return "".join(html_parts)


def _inline_formatting(text):
    """Apply inline markdown formatting: bold, italic, code, links, images."""
    # Images first (before links)
    text = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1">', text)
    # Links
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    # Inline code
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    # Bold + Italic (***text*** or ___text___)
    text = re.sub(r'\*{3}(.+?)\*{3}', r'<strong><em>\1</em></strong>', text)
    text = re.sub(r'_{3}(.+?)_{3}', r'<strong><em>\1</em></strong>', text)
    # Bold (**text** or __text__)
    text = re.sub(r'\*{2}(.+?)\*{2}', r'<strong>\1</strong>', text)
    text = re.sub(r'__(.+?)__', r'<strong>\1</strong>', text)
    # Italic (*text* or _text_) — be careful not to match within words
    text = re.sub(r'(?<!\w)\*([^*\n]+?)\*(?!\w)', r'<em>\1</em>', text)
    text = re.sub(r'(?<!\w)_([^_\n]+?)_(?!\w)', r'<em>\1</em>', text)
    # Strikethrough (~~text~~)
    text = re.sub(r'~~(.+?)~~', r'<del>\1</del>', text)
    # Line breaks (two spaces at end of line)
    text = re.sub(r'  +\n', '<br>\n', text)
    return text


# =========================================================================
# 12. SQL Formatter
# =========================================================================

SQL_KEYWORDS = {
    "select", "from", "where", "and", "or", "not", "in", "like", "between",
    "is", "null", "as", "on", "join", "inner", "outer", "left", "right",
    "full", "cross", "natural", "using", "group", "by", "having", "order",
    "asc", "desc", "limit", "offset", "union", "all", "except", "intersect",
    "insert", "into", "values", "update", "set", "delete", "create", "table",
    "drop", "alter", "add", "column", "modify", "rename", "to", "column",
    "index", "unique", "primary", "key", "foreign", "references", "constraint",
    "default", "check", "view", "trigger", "procedure", "function", "begin",
    "end", "if", "else", "then", "case", "when", "then", "else", "end",
    "exists", "any", "some", "no", "action", "cascade", "restrict",
    "distinct", "top", "fetch", "next", "rows", "only", "with", "recursive",
    "over", "partition", "window", "rows", "range", "unbounded", "preceding",
    "following", "current", "row", "first", "last", "offset", "fetch",
    "truncate", "replace", "merge", "matched", "database", "schema",
    "grant", "revoke", "privilege", "public", "role", "transaction",
    "commit", "rollback", "savepoint", "release", "lock", "unlock",
    "share", "mode", "nowait", "wait", "force", "abort", "explain", "analyze",
    "materialized", "temp", "temporary", "if", "exists", "replace",
    "returning", "conflict", "do", "nothing", "update", "exclude",
    "constraint", "deferrable", "deferred", "immediate", "initially",
    "generated", "always", "identity", "serial", "bigserial", "smallserial",
    "boolean", "integer", "bigint", "smallint", "numeric", "decimal",
    "real", "double", "precision", "float", "character", "varying",
    "varchar", "char", "text", "date", "time", "timestamp", "interval",
    "boolean", "json", "jsonb", "uuid", "bytea", "array",
}


@code_tools_bp.route("/sql-formatter", methods=["GET"])
def sql_formatter_page():
    return render_template("tools/sql-formatter.html")


@code_tools_bp.route("/sql-formatter/format", methods=["POST"])
def sql_formatter_format_api():
    """API: format a raw SQL query with proper indentation and keyword capitalization."""
    try:
        data = request.get_json(silent=True) or {}
        sql = data.get("input", "")
        indent_size = int(data.get("indent", 2))
        uppercase = data.get("uppercase", True)

        if not sql.strip():
            return jsonify({"status": "error", "message": "No SQL input provided."})

        formatted = _format_sql(sql, indent_size, uppercase)

        return jsonify({
            "status": "success",
            "data": {
                "result": formatted,
                "original_length": len(sql),
                "formatted_length": len(formatted),
                "line_count": formatted.count("\n") + 1,
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


def _format_sql(sql, indent_size=2, uppercase=True):
    """Format SQL with proper indentation and keyword capitalization."""
    # Tokenize: preserve strings, identifiers in quotes, and comments
    tokens = _tokenize_sql(sql)

    # Build formatted SQL
    indent_level = 0
    indent_str = " " * indent_size
    result_parts = []
    prev_token = None
    newline_before = False
    newline_after = False
    space_before = False

    # Keywords that should start a new line and increase indent after
    NEWLINE_AFTER = {"select", "from", "where", "set", "having", "order by",
                     "group by", "limit", "offset", "union", "except", "intersect",
                     "insert into", "values", "update", "delete from",
                     "join", "inner join", "left join", "right join", "full join",
                     "cross join", "natural join", "left outer join", "right outer join",
                     "on", "and", "or"}

    INDENT_AFTER = {"select", "from", "where", "set", "having", "order by",
                    "group by", "join", "inner join", "left join", "right join",
                    "full join", "cross join", "natural join",
                    "left outer join", "right outer join"}

    # Keywords that should start on a new line (no indent change)
    NEWLINE_BEFORE_NO_INDENT = {"and", "or", "union", "except", "intersect", "on"}

    for idx, (token_type, token_val) in enumerate(tokens):
        lower_val = token_val.lower().strip()

        if uppercase and token_type == "keyword":
            display_val = token_val.upper()
        elif uppercase and token_type == "function":
            display_val = token_val.upper()
        else:
            display_val = token_val

        # Determine newline/indentation
        if lower_val in NEWLINE_AFTER or (lower_val in ("and", "or") and not newline_before):
            if lower_val not in NEWLINE_BEFORE_NO_INDENT or prev_token is None or prev_token[1].lower().strip() not in ("(", "where", "on", "and", "or"):
                newline_before = True

        if lower_val in NEWLINE_BEFORE_NO_INDENT:
            newline_before = True

        if newline_before:
            result_parts.append("\n" + indent_str * indent_level)
            newline_before = False

        result_parts.append(display_val)

        # Determine spacing after
        next_lower = ""
        if idx + 1 < len(tokens):
            next_lower = tokens[idx + 1][1].lower().strip()

        if lower_val in INDENT_AFTER and next_lower not in (";", ")"):
            indent_level += 1

        if lower_val in NEWLINE_BEFORE_NO_INDENT and next_lower not in ("", ")", ";"):
            # De-indent before these at same level
            pass

        # Check for decreasing indent
        if next_lower == ")" or lower_val == "from":
            indent_level = max(0, indent_level - 1)

        prev_token = (token_type, token_val)

    formatted = "".join(result_parts).strip()

    # Clean up excessive newlines
    while "\n\n\n" in formatted:
        formatted = formatted.replace("\n\n\n", "\n\n")

    # Ensure ends with semicolon if original did
    if sql.rstrip().endswith(";") and not formatted.rstrip().endswith(";"):
        formatted = formatted.rstrip() + ";"

    return formatted


def _tokenize_sql(sql):
    """Tokenize SQL into (type, value) pairs. Preserves strings and comments."""
    tokens = []
    i = 0
    n = len(sql)

    while i < n:
        ch = sql[i]

        # Whitespace
        if ch in " \t\r\n":
            j = i + 1
            while j < n and sql[j] in " \t\r\n":
                j += 1
            tokens.append(("whitespace", sql[i:j]))
            i = j
            continue

        # Line comment
        if ch == "-" and i + 1 < n and sql[i + 1] == "-":
            j = i + 2
            while j < n and sql[j] != "\n":
                j += 1
            tokens.append(("comment", sql[i:j]))
            i = j
            continue

        # Block comment
        if ch == "/" and i + 1 < n and sql[i + 1] == "*":
            j = i + 2
            while j + 1 < n and not (sql[j] == "*" and sql[j + 1] == "/"):
                j += 1
            j += 2
            tokens.append(("comment", sql[i:min(j, n)]))
            i = min(j, n)
            continue

        # String (single quote)
        if ch == "'":
            j = i + 1
            while j < n:
                if sql[j] == "'" and j + 1 < n and sql[j + 1] == "'":
                    j += 2  # escaped quote
                elif sql[j] == "'":
                    j += 1
                    break
                else:
                    j += 1
            tokens.append(("string", sql[i:min(j, n)]))
            i = min(j, n)
            continue

        # String (double quote - identifier)
        if ch == '"':
            j = i + 1
            while j < n and sql[j] != '"':
                j += 1
            j += 1
            tokens.append(("identifier", sql[i:min(j, n)]))
            i = min(j, n)
            continue

        # Backtick quote (MySQL identifier)
        if ch == "`":
            j = i + 1
            while j < n and sql[j] != "`":
                j += 1
            j += 1
            tokens.append(("identifier", sql[i:min(j, n)]))
            i = min(j, n)
            continue

        # Number
        if ch.isdigit() or (ch == "." and i + 1 < n and sql[i + 1].isdigit()):
            j = i + 1
            while j < n and (sql[j].isdigit() or sql[j] == "." or sql[j] in "eE+-"):
                j += 1
            tokens.append(("number", sql[i:j]))
            i = j
            continue

        # Punctuation / operators
        if ch in "().,;*=<>!&|+%/^~@:":
            # Multi-char operators
            if i + 1 < n:
                two_char = sql[i:i + 2]
                if two_char in ("<=", ">=", "!=", "<>", "::", "||", "&&", "~~", "!~~", "!~", "~*", "!~*", ">>", "<<", "->", "#>", "#>>", "?", "?|", "?&", "@@", "@>", "<@"):
                    tokens.append(("operator", two_char))
                    i += 2
                    continue
            tokens.append(("operator", ch))
            i += 1
            continue

        # Word (keyword, function, identifier)
        if ch.isalpha() or ch == "_":
            j = i + 1
            while j < n and (sql[j].isalnum() or sql[j] == "_"):
                j += 1
            word = sql[i:j]

            # Check if it's a function name (followed by parenthesis)
            k = j
            while k < n and sql[k] in " \t\r\n":
                k += 1
            if k < n and sql[k] == "(":
                token_type = "function"
            elif word.lower() in SQL_KEYWORDS:
                token_type = "keyword"
            else:
                token_type = "identifier"

            tokens.append((token_type, word))
            i = j
            continue

        # Unknown character
        tokens.append(("unknown", ch))
        i += 1

    return tokens
