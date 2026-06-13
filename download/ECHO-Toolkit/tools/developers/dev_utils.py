"""
ECHO Toolkit — Developer Utilities
Flask Blueprint with 10 fully functional developer utility tools.
Each tool exposes a web UI route (GET → HTML) and an API route (POST/GET → JSON).
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from flask import Blueprint, render_template, request, jsonify, send_file
import secrets
import string
import re
import hashlib
import difflib
import time
import json
import zipfile
import io
import math
import unicodedata
from datetime import datetime, timedelta
from database import save_snippet, get_all_snippets, delete_snippet
from database import save_env_config, get_env_configs, delete_env_config
from database import save_secret, get_all_secrets
from database import log_tool_usage

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------
dev_utils_bp = Blueprint(
    "dev_utils_bp",
    __name__,
    template_folder="../../templates",
)


# =========================================================================
# 1. Dependency Checker
# =========================================================================

# Small built-in CVE database for common packages
BUILTIN_CVE_DB = {
    "pip": [
        {"package": "log4j", "vulnerable": "<2.17.0", "cve": "CVE-2021-44228", "severity": "CRITICAL",
         "description": "Log4Shell - Remote Code Execution via JNDI lookups"},
        {"package": "log4j", "vulnerable": ">=2.0-beta9,<2.17.0", "cve": "CVE-2021-45046", "severity": "CRITICAL",
         "description": "Log4j allows denial of service via recursive lookup"},
        {"package": "django", "vulnerable": "<2.2.26", "cve": "CVE-2021-45943", "severity": "HIGH",
         "description": "Directory traversal vulnerability in Django"},
        {"package": "django", "vulnerable": "<4.0.10", "cve": "CVE-2022-28347", "severity": "HIGH",
         "description": "Potential DoS via large username inputs"},
        {"package": "django", "vulnerable": "<3.2.13", "cve": "CVE-2022-28346", "severity": "HIGH",
         "description": "User with password in HTML form field"},
        {"package": "flask", "vulnerable": "<2.0.2", "cve": "CVE-2022-25364", "severity": "MEDIUM",
         "description": "Open redirect vulnerability in url_for"},
        {"package": "flask", "vulnerable": "<2.2.5", "cve": "CVE-2023-30861", "severity": "MEDIUM",
         "description": "Unexpected evaluation of data as code"},
        {"package": "requests", "vulnerable": "<2.28.0", "cve": "CVE-2022-25363", "severity": "MEDIUM",
         "description": "Unintended leak of Proxy-Authorization header"},
        {"package": "pillow", "vulnerable": "<9.1.0", "cve": "CVE-2022-23673", "severity": "HIGH",
         "description": "Denial of service via GIF parsing"},
        {"package": "pillow", "vulnerable": "<8.1.0", "cve": "CVE-2021-25287", "severity": "CRITICAL",
         "description": "Buffer overflow in PDF parsing"},
        {"package": "pillow", "vulnerable": "<8.1.0", "cve": "CVE-2021-25288", "severity": "CRITICAL",
         "description": "Buffer overflow in SGI RLE decoding"},
        {"package": "numpy", "vulnerable": "<1.22.0", "cve": "CVE-2021-33430", "severity": "HIGH",
         "description": "Buffer overflow in array_from_pyobj function"},
        {"package": "numpy", "vulnerable": "<1.21.0", "cve": "CVE-2021-34141", "severity": "MEDIUM",
         "description": "Buffer overflow in numpy.sort"},
        {"package": "sqlalchemy", "vulnerable": "<1.4.41", "cve": "CVE-2022-29162", "severity": "HIGH",
         "description": "SQL Injection via order_by accepting text values"},
        {"package": "celery", "vulnerable": "<5.2.3", "cve": "CVE-2021-28687", "severity": "HIGH",
         "description": "Improper neutralization of escape sequences in log"},
        {"package": "pyyaml", "vulnerable": "<6.0", "cve": "CVE-2020-14343", "severity": "HIGH",
         "description": "Arbitrary code execution via yaml.load"},
        {"package": "cryptography", "vulnerable": "<3.3.2", "cve": "CVE-2020-36242", "severity": "CRITICAL",
         "description": "Buffer overflow in certain decryption routines"},
        {"package": "lxml", "vulnerable": "<4.6.5", "cve": "CVE-2021-28957", "severity": "MEDIUM",
         "description": "XML External Entity (XXE) processing"},
        {"package": "urllib3", "vulnerable": "<1.26.5", "cve": "CVE-2021-33503", "severity": "HIGH",
         "description": "ReDoS vulnerability via cookie headers"},
    ],
    "npm": [
        {"package": "lodash", "vulnerable": "<4.17.21", "cve": "CVE-2021-23337", "severity": "HIGH",
         "description": "Command injection via template function"},
        {"package": "lodash", "vulnerable": "<4.17.12", "cve": "CVE-2020-8203", "severity": "HIGH",
         "description": "Prototype pollution in zipObjectDeep"},
        {"package": "express", "vulnerable": "<4.17.3", "cve": "CVE-2020-8897", "severity": "MEDIUM",
         "description": "Open redirect via improper URL validation"},
        {"package": "express", "vulnerable": "<4.18.0", "cve": "CVE-2022-24999", "severity": "MEDIUM",
         "description": "Open redirect vulnerability"},
        {"package": "axios", "vulnerable": "<0.21.2", "cve": "CVE-2021-3749", "severity": "MEDIUM",
         "description": "Server-Side Request Forgery via URL parsing"},
        {"package": "axios", "vulnerable": "<1.2.0", "cve": "CVE-2022-42252", "severity": "LOW",
         "description": "CSRF via cookie exposure"},
        {"package": "jsonwebtoken", "vulnerable": "<8.5.1", "cve": "CVE-2022-23529", "severity": "HIGH",
         "description": "Insecure implementation of key retrieval function"},
        {"package": "debug", "vulnerable": "<4.3.2", "cve": "CVE-2021-3807", "severity": "MEDIUM",
         "description": "Regular Expression DoS via regex in debug"},
        {"package": "minimist", "vulnerable": "<1.2.6", "cve": "CVE-2022-30967", "severity": "MEDIUM",
         "description": "Prototype pollution in minimist"},
        {"package": "node-forge", "vulnerable": "<1.3.0", "cve": "CVE-2022-24356", "severity": "CRITICAL",
         "description": "Prototype pollution via forge data structures"},
        {"package": "highlight.js", "vulnerable": "<10.4.1", "cve": "CVE-2022-28807", "severity": "MEDIUM",
         "description": "ReDoS vulnerability in HTML parsing"},
        {"package": "semver", "vulnerable": "<7.3.5", "cve": "CVE-2022-25883", "severity": "HIGH",
         "description": "ReDoS via new range regex"},
        {"package": "engine.io", "vulnerable": "<6.2.1", "cve": "CVE-2022-24785", "severity": "MEDIUM",
         "description": "Insecure default of CORS origin"},
        {"package": "mongoose", "vulnerable": "<6.3.4", "cve": "CVE-2022-2564", "severity": "MEDIUM",
         "description": "Prototype pollution via mongoose SchemaType"},
    ],
}

# Latest known versions for outdated detection (as of 2024)
LATEST_VERSIONS = {
    "pip": {
        "django": "5.0.1", "flask": "3.0.0", "requests": "2.31.0", "pillow": "10.2.0",
        "numpy": "1.26.3", "sqlalchemy": "2.0.25", "celery": "5.3.6", "pyyaml": "6.0.1",
        "cryptography": "42.0.0", "lxml": "5.1.0", "urllib3": "2.0.7", "click": "8.1.7",
        "jinja2": "3.1.3", "itsdangerous": "2.1.2", "werkzeug": "3.0.1", "markupsafe": "2.1.5",
        "gunicorn": "21.2.0", "uvicorn": "0.27.0", "fastapi": "0.109.0", "pydantic": "2.5.3",
        "httpx": "0.26.0", "aiohttp": "3.9.1", "redis": "5.0.1", "boto3": "1.34.25",
        "scipy": "1.12.0", "pandas": "2.1.5", "matplotlib": "3.8.2", "scikit-learn": "1.3.2",
    },
    "npm": {
        "express": "4.18.2", "lodash": "4.17.21", "axios": "1.6.5", "react": "18.2.0",
        "react-dom": "18.2.0", "next": "14.1.0", "vue": "3.4.5", "typescript": "5.3.3",
        "webpack": "5.90.0", "vite": "5.0.12", "eslint": "8.56.0", "nodemon": "3.0.2",
        "mongoose": "8.1.0", "socket.io": "4.7.4", "body-parser": "1.20.2",
        "cors": "2.8.5", "dotenv": "16.4.1", "morgan": "1.10.0", "debug": "4.3.4",
        "moment": "2.30.1", "underscore": "1.13.6", "bluebird": "3.7.2",
        "chalk": "5.3.0", "commander": "12.0.0", "inquirer": "9.2.12",
        "ora": "7.0.1", "uuid": "9.0.0", "jsonwebtoken": "9.0.2", "joi": "17.11.0",
    },
}


def _parse_version(version_str):
    """Parse a version string into a tuple of integers for comparison."""
    clean = re.sub(r'[^\d.]', '', version_str.strip())
    parts = []
    for part in clean.split('.'):
        try:
            parts.append(int(part))
        except ValueError:
            parts.append(0)
    while len(parts) < 3:
        parts.append(0)
    return tuple(parts[:3])


def _version_gte(current, minimum):
    """Check if current version >= minimum version."""
    return _parse_version(current) >= _parse_version(minimum)


def _version_lt(current, maximum):
    """Check if current version < maximum version."""
    return _parse_version(current) < _parse_version(maximum)


def _parse_requirements(text):
    """Parse requirements.txt content into a list of {name, version, operator} dicts."""
    packages = []
    for line in text.strip().splitlines():
        line = line.strip()
        if not line or line.startswith('#') or line.startswith('-'):
            continue
        # Handle various formats: pkg==1.0, pkg>=1.0, pkg<=1.0, pkg>1.0, pkg<1.0, pkg~=1.0
        match = re.match(r'^([a-zA-Z0-9_\-\.]+)\s*(===|==|~=|>=|<=|!=|>|<)\s*(.+)$', line)
        if match:
            name = match.group(1).lower()
            operator = match.group(2)
            version = match.group(3).strip().split(';')[0].strip().split('#')[0].strip()
            packages.append({"name": name, "version": version, "operator": operator})
        else:
            # Package without version specifier
            name = re.match(r'^([a-zA-Z0-9_\-\.]+)', line)
            if name:
                packages.append({"name": name.group(1).lower(), "version": None, "operator": None})
    return packages


def _parse_package_json(text):
    """Parse package.json content and return a list of {name, version} dicts."""
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return []
    packages = []
    for dep_type in ["dependencies", "devDependencies"]:
        deps = data.get(dep_type, {})
        for name, version in deps.items():
            clean_version = version.lstrip('^~>=<=')
            packages.append({
                "name": name.lower(),
                "version": clean_version if clean_version else None,
                "operator": "any" if not version.startswith('^') and not version.startswith('~') else version[0],
                "dep_type": dep_type,
            })
    return packages


def _check_vulnerabilities(packages, ecosystem):
    """Check packages against the built-in CVE database."""
    cve_list = BUILTIN_CVE_DB.get(ecosystem, [])
    vulnerabilities = []
    for pkg in packages:
        name = pkg["name"]
        version = pkg.get("version")
        if not version:
            continue
        for cve in cve_list:
            if cve["package"].lower() == name.lower():
                # Check if the version falls in the vulnerable range
                vuln_range = cve["vulnerable"]
                if vuln_range.startswith("<"):
                    max_ver = vuln_range[1:]
                    if _version_lt(version, max_ver):
                        vulnerabilities.append({
                            "package": name,
                            "installed_version": version,
                            "vulnerable_range": vuln_range,
                            "cve": cve["cve"],
                            "severity": cve["severity"],
                            "description": cve["description"],
                        })
                elif ">=" in vuln_range and "<" in vuln_range:
                    parts = vuln_range.split(",")
                    min_ver = parts[0].replace(">=", "").strip()
                    max_ver = parts[1].replace("<", "").strip()
                    if _version_gte(version, min_ver) and _version_lt(version, max_ver):
                        vulnerabilities.append({
                            "package": name,
                            "installed_version": version,
                            "vulnerable_range": vuln_range,
                            "cve": cve["cve"],
                            "severity": cve["severity"],
                            "description": cve["description"],
                        })
    return vulnerabilities


def _check_outdated(packages, ecosystem):
    """Check which packages are outdated compared to known latest versions."""
    latest_db = LATEST_VERSIONS.get(ecosystem, {})
    outdated = []
    for pkg in packages:
        name = pkg["name"]
        version = pkg.get("version")
        if not version or name not in latest_db:
            continue
        latest = latest_db[name]
        if _version_lt(version, latest):
            outdated.append({
                "package": name,
                "installed_version": version,
                "latest_version": latest,
            })
    return outdated


@dev_utils_bp.route("/dependency-check", methods=["GET"])
def dependency_check_page():
    """Render the Dependency Checker web UI."""
    return render_template("tools/dependency-check.html")


@dev_utils_bp.route("/dependency-check/analyze", methods=["POST"])
def dependency_check_analyze():
    """API: analyze requirements.txt or package.json content for vulnerabilities and outdated packages."""
    try:
        data = request.get_json(silent=True) or {}
        content = data.get("content", "").strip()
        ecosystem = data.get("ecosystem", "auto")  # auto | pip | npm

        if not content:
            return jsonify({"status": "error", "message": "No content provided."})

        # Auto-detect ecosystem
        if ecosystem == "auto":
            if '"dependencies"' in content or '"devDependencies"' in content:
                ecosystem = "npm"
            else:
                ecosystem = "pip"

        # Parse packages
        if ecosystem == "npm":
            packages = _parse_package_json(content)
            if not packages:
                return jsonify({"status": "error", "message": "Could not parse package.json. Ensure valid JSON with dependencies."})
        else:
            packages = _parse_requirements(content)
            if not packages:
                return jsonify({"status": "error", "message": "Could not parse requirements.txt. Use format: package==version"})

        # Check for vulnerabilities
        vulnerabilities = _check_vulnerabilities(packages, ecosystem)

        # Check for outdated packages
        outdated = _check_outdated(packages, ecosystem)

        # Severity counts
        severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
        for vuln in vulnerabilities:
            sev = vuln.get("severity", "MEDIUM")
            if sev in severity_counts:
                severity_counts[sev] += 1

        log_tool_usage("dependency-checker", "analyze",
                       f"ecosystem={ecosystem}, packages={len(packages)}",
                       f"vulnerabilities={len(vulnerabilities)}, outdated={len(outdated)}")

        return jsonify({
            "status": "success",
            "data": {
                "ecosystem": ecosystem,
                "total_packages": len(packages),
                "packages": packages,
                "vulnerabilities": vulnerabilities,
                "vulnerability_summary": {
                    "total": len(vulnerabilities),
                    "by_severity": severity_counts,
                },
                "outdated_packages": outdated,
                "outdated_count": len(outdated),
                "security_score": max(0, 100 - (severity_counts["CRITICAL"] * 25 + severity_counts["HIGH"] * 10 +
                                                 severity_counts["MEDIUM"] * 3 + severity_counts["LOW"] * 1)),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 2. Password Generator
# =========================================================================

SYMBOL_CHARS = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`"


@dev_utils_bp.route("/password-gen", methods=["GET"])
def password_gen_page():
    """Render the Password Generator web UI."""
    return render_template("tools/password-gen.html")


@dev_utils_bp.route("/password-gen/generate", methods=["POST"])
def password_gen_generate():
    """API: generate a cryptographically secure password with entropy and strength rating."""
    try:
        data = request.get_json(silent=True) or {}
        length = int(data.get("length", 16))
        use_uppercase = data.get("uppercase", True)
        use_lowercase = data.get("lowercase", True)
        use_numbers = data.get("numbers", True)
        use_symbols = data.get("symbols", True)
        exclude_chars = data.get("exclude_chars", "")
        count = min(int(data.get("count", 1)), 20)  # Generate up to 20 at once

        # Validate length
        if length < 4:
            return jsonify({"status": "error", "message": "Password length must be at least 4."})
        if length > 128:
            length = 128

        # Build character pool
        char_pool = ""
        pool_info = {}
        if use_uppercase:
            upper_chars = string.ascii_uppercase
            char_pool += upper_chars
            pool_info["uppercase"] = len(upper_chars)
        if use_lowercase:
            lower_chars = string.ascii_lowercase
            char_pool += lower_chars
            pool_info["lowercase"] = len(lower_chars)
        if use_numbers:
            digit_chars = string.digits
            char_pool += digit_chars
            pool_info["numbers"] = len(digit_chars)
        if use_symbols:
            char_pool += SYMBOL_CHARS
            pool_info["symbols"] = len(SYMBOL_CHARS)

        if not char_pool:
            return jsonify({"status": "error", "message": "At least one character type must be selected."})

        # Remove excluded characters
        if exclude_chars:
            char_pool = "".join(c for c in char_pool if c not in exclude_chars)

        if len(char_pool) < 4:
            return jsonify({"status": "error", "message": "Character pool too small after exclusions."})

        pool_size = len(char_pool)

        # Calculate entropy (bits)
        entropy_bits = math.log2(pool_size) * length

        # Strength rating
        if entropy_bits < 28:
            strength = "Very Weak"
            strength_color = "#e74c3c"
        elif entropy_bits < 36:
            strength = "Weak"
            strength_color = "#e67e22"
        elif entropy_bits < 60:
            strength = "Fair"
            strength_color = "#f39c12"
        elif entropy_bits < 80:
            strength = "Strong"
            strength_color = "#27ae60"
        elif entropy_bits < 128:
            strength = "Very Strong"
            strength_color = "#2ecc71"
        else:
            strength = "Excellent"
            strength_color = "#00d26a"

        # Crack time estimation (assuming 10 billion guesses/sec)
        guesses_per_sec = 10_000_000_000
        total_combinations = pool_size ** length
        avg_time_seconds = total_combinations / (2 * guesses_per_sec)
        crack_time = _format_time(avg_time_seconds)

        # Generate passwords
        passwords = []
        for _ in range(count):
            password = "".join(secrets.choice(char_pool) for _ in range(length))
            passwords.append(password)

        log_tool_usage("password-generator", "generate",
                       f"length={length}, pool_size={pool_size}",
                       f"entropy={entropy_bits:.1f}bits, strength={strength}")

        return jsonify({
            "status": "success",
            "data": {
                "passwords": passwords,
                "length": length,
                "pool_size": pool_size,
                "pool_breakdown": pool_info,
                "entropy": round(entropy_bits, 2),
                "strength": strength,
                "strength_color": strength_color,
                "crack_time_estimate": crack_time,
                "total_combinations": str(total_combinations),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


def _format_time(seconds):
    """Format a number of seconds into a human-readable time string."""
    if seconds < 1:
        return "instant"
    elif seconds < 60:
        return f"{round(seconds)} seconds"
    elif seconds < 3600:
        return f"{round(seconds / 60)} minutes"
    elif seconds < 86400:
        return f"{round(seconds / 3600)} hours"
    elif seconds < 31536000:
        return f"{round(seconds / 86400)} days"
    elif seconds < 31536000 * 100:
        return f"{round(seconds / 31536000)} years"
    elif seconds < 31536000 * 1e6:
        return f"{round(seconds / 31536000):,} years"
    elif seconds < 31536000 * 1e9:
        return f"{round(seconds / (31536000 * 1e6)):.1f} million years"
    else:
        return f"{round(seconds / (31536000 * 1e9)):.1f} billion years"


# =========================================================================
# 3. Slug Generator
# =========================================================================

# Common transliteration map for non-Latin characters
TRANSLITERATION_MAP = {
    '\u00e0': 'a', '\u00e1': 'a', '\u00e2': 'a', '\u00e3': 'a', '\u00e4': 'a', '\u00e5': 'a',
    '\u00e6': 'ae', '\u00e7': 'c', '\u00e8': 'e', '\u00e9': 'e', '\u00ea': 'e', '\u00eb': 'e',
    '\u00ec': 'i', '\u00ed': 'i', '\u00ee': 'i', '\u00ef': 'i',
    '\u00f0': 'd', '\u00f1': 'n', '\u00f2': 'o', '\u00f3': 'o', '\u00f4': 'o', '\u00f5': 'o',
    '\u00f6': 'o', '\u00f8': 'o',
    '\u00f9': 'u', '\u00fa': 'u', '\u00fb': 'u', '\u00fc': 'u', '\u00fd': 'y', '\u00fe': 'th',
    '\u00ff': 'y',
    '\u00c0': 'A', '\u00c1': 'A', '\u00c2': 'A', '\u00c3': 'A', '\u00c4': 'A', '\u00c5': 'A',
    '\u00c6': 'AE', '\u00c7': 'C', '\u00c8': 'E', '\u00c9': 'E', '\u00ca': 'E', '\u00cb': 'E',
    '\u00cc': 'I', '\u00cd': 'I', '\u00ce': 'I', '\u00cf': 'I',
    '\u00d0': 'D', '\u00d1': 'N', '\u00d2': 'O', '\u00d3': 'O', '\u00d4': 'O', '\u00d5': 'O',
    '\u00d6': 'O', '\u00d8': 'O',
    '\u00d9': 'U', '\u00da': 'U', '\u00db': 'U', '\u00dc': 'U', '\u00dd': 'Y', '\u00de': 'TH',
    '\u00df': 'ss',
    '\u00df': 'ss',  # German sharp s
    # Greek
    '\u03b1': 'a', '\u03b2': 'b', '\u03b3': 'g', '\u03b4': 'd', '\u03b5': 'e', '\u03b6': 'z',
    '\u03b7': 'h', '\u03b8': 'th', '\u03b9': 'i', '\u03ba': 'k', '\u03bb': 'l', '\u03bc': 'm',
    '\u03bd': 'n', '\u03be': 'x', '\u03bf': 'o', '\u03c0': 'p', '\u03c1': 'r', '\u03c2': 's',
    '\u03c3': 's', '\u03c4': 't', '\u03c5': 'y', '\u03c6': 'f', '\u03c7': 'ch', '\u03c8': 'ps',
    '\u03c9': 'o',
    # Cyrillic
    '\u0430': 'a', '\u0431': 'b', '\u0432': 'v', '\u0433': 'g', '\u0434': 'd', '\u0435': 'e',
    '\u0436': 'zh', '\u0437': 'z', '\u0438': 'i', '\u0439': 'y', '\u043a': 'k', '\u043b': 'l',
    '\u043c': 'm', '\u043d': 'n', '\u043e': 'o', '\u043f': 'p', '\u0440': 'r', '\u0441': 's',
    '\u0442': 't', '\u0443': 'u', '\u0444': 'f', '\u0445': 'kh', '\u0446': 'ts', '\u0447': 'ch',
    '\u0448': 'sh', '\u0449': 'shch', '\u044a': '', '\u044b': 'y', '\u044c': '', '\u044d': 'e',
    '\u044e': 'yu', '\u044f': 'ya',
}


def _transliterate(text):
    """Transliterate non-Latin characters to ASCII equivalents."""
    result = []
    for char in text:
        if char in TRANSLITERATION_MAP:
            result.append(TRANSLITERATION_MAP[char])
        elif ord(char) > 127:
            # Use unicodedata normalization as fallback
            normalized = unicodedata.normalize('NFKD', char)
            ascii_chars = [c for c in normalized if ord(c) < 128]
            if ascii_chars:
                result.append(''.join(ascii_chars))
            else:
                result.append('')
        else:
            result.append(char)
    return ''.join(result)


def _generate_slug(text, separator='-', lowercase=True, max_length=None, transliterate=False):
    """Generate a URL-friendly slug from text."""
    if transliterate:
        text = _transliterate(text)

    if lowercase:
        text = text.lower()

    # Replace non-alphanumeric characters with separator
    slug = re.sub(r'[^\w\s-]', ' ', text)
    # Replace whitespace and underscores/hyphens with separator
    slug = re.sub(r'[\s_]+', separator, slug)
    # Remove duplicate separators
    slug = re.sub(rf'{re.escape(separator)}+', separator, slug)
    # Strip separator from ends
    slug = slug.strip(separator)

    if max_length and len(slug) > max_length:
        slug = slug[:max_length]
        # Don't cut in the middle of a word if possible
        if separator in slug:
            slug = slug[:slug.rindex(separator)]

    return slug


@dev_utils_bp.route("/slug", methods=["GET"])
def slug_page():
    """Render the Slug Generator web UI."""
    return render_template("tools/slug.html")


@dev_utils_bp.route("/slug/generate", methods=["POST"])
def slug_generate():
    """API: generate URL-friendly slugs from text."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "").strip()
        separator = data.get("separator", "-")
        lowercase = data.get("lowercase", True)
        max_length = data.get("max_length", None)
        transliterate = data.get("transliterate", False)
        count = min(int(data.get("count", 1)), 20)

        if not text:
            return jsonify({"status": "error", "message": "No text provided."})

        if max_length is not None:
            max_length = int(max_length)
            if max_length < 1:
                max_length = None

        results = []
        for _ in range(count):
            slug = _generate_slug(
                text,
                separator=separator,
                lowercase=lowercase,
                max_length=max_length,
                transliterate=transliterate,
            )
            results.append(slug)

        log_tool_usage("slug-generator", "generate",
                       f"input_length={len(text)}, separator={separator}",
                       f"output={results[0] if results else ''}")

        return jsonify({
            "status": "success",
            "data": {
                "slugs": results,
                "input_text": text,
                "options": {
                    "separator": separator,
                    "lowercase": lowercase,
                    "max_length": max_length,
                    "transliterate": transliterate,
                },
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 4. Cron Expression Builder
# =========================================================================

CRON_FIELDS = ["minute", "hour", "day_of_month", "month", "day_of_week"]
CRON_DESCRIPTIONS = {
    "minute": "minute of the hour",
    "hour": "hour of the day",
    "day_of_month": "day of the month",
    "month": "month of the year",
    "day_of_week": "day of the week",
}

ORDINAL = {1: "st", 2: "nd", 3: "rd"}
MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"]
DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _ordinal_suffix(n):
    """Return ordinal suffix for a number (1st, 2nd, 3rd, 4th, ...)."""
    if 11 <= (n % 100) <= 13:
        return "th"
    return ORDINAL.get(n % 10, "th")


def _describe_cron_part(field_name, value):
    """Generate human-readable description for a single cron field."""
    if value == '*':
        return f"every {CRON_DESCRIPTIONS[field_name]}"
    elif value.startswith('*/'):
        step = value[2:]
        return f"every {step} {CRON_DESCRIPTIONS[field_name]}s"
    elif ',' in value:
        parts = [int(p) for p in value.split(',') if p.strip().isdigit()]
        if field_name == "month":
            named_parts = [MONTH_NAMES[p] for p in parts if 1 <= p <= 12]
            return f"at {', '.join(named_parts)}"
        elif field_name == "day_of_week":
            named_parts = [DAY_NAMES[p if p <= 6 else 0] for p in parts if 0 <= p <= 7]
            return f"on {', '.join(named_parts)}"
        else:
            formatted = [f"{p}{_ordinal_suffix(p)}" for p in parts]
            return f"at {', '.join(formatted)}"
    elif '-' in value and '/' not in value:
        parts = value.split('-')
        start, end = int(parts[0]), int(parts[1])
        if field_name == "month":
            return f"from {MONTH_NAMES[start]} to {MONTH_NAMES[end]}"
        elif field_name == "day_of_week":
            return f"from {DAY_NAMES[start if start <= 6 else 0]} to {DAY_NAMES[end if end <= 6 else 0]}"
        else:
            return f"from the {start}{_ordinal_suffix(start)} to the {end}{_ordinal_suffix(end)}"
    elif '-' in value and '/' in value:
        range_part, step = value.split('/')
        start, end = range_part.split('-')
        return f"every {step} {CRON_DESCRIPTIONS[field_name]}s from {start} to {end}"
    else:
        if value.isdigit():
            n = int(value)
            if field_name == "month":
                return MONTH_NAMES[n]
            elif field_name == "day_of_week":
                return DAY_NAMES[n if n <= 6 else 0]
            else:
                return f"the {n}{_ordinal_suffix(n)} {CRON_DESCRIPTIONS[field_name]}"
        return value


def _parse_cron_expression(expr):
    """Parse a 5-field cron expression and return a structured dict."""
    parts = expr.strip().split()
    if len(parts) != 5:
        raise ValueError(f"Expected 5 fields, got {len(parts)}: '{expr}'")

    return dict(zip(CRON_FIELDS, parts))


def _describe_cron(expr):
    """Generate a full human-readable description of a cron expression."""
    parsed = _parse_cron_expression(expr)
    parts = []

    minute = parsed["minute"]
    hour = parsed["hour"]
    dom = parsed["day_of_month"]
    month = parsed["month"]
    dow = parsed["day_of_week"]

    # Build natural language description
    time_desc = _describe_cron_part("minute", minute)
    hour_desc = _describe_cron_part("hour", hour)

    if minute == '*' and hour == '*':
        parts.append("Every minute")
    elif minute == '0' and hour == '*':
        parts.append("Every hour, on the hour")
    elif minute.isdigit() and hour.isdigit():
        m = int(minute)
        h = int(hour)
        period = "AM" if h < 12 else "PM"
        display_h = h if h == 0 or h == 12 else h % 12
        parts.append(f"At {display_h}:{m:02d} {period}")
    else:
        parts.append(f"At {hour_desc}, {time_desc}")

    if dom != '*':
        parts.append(_describe_cron_part("day_of_month", dom))
    if dow != '*':
        parts.append(_describe_cron_part("day_of_week", dow))
    if month != '*':
        parts.append(_describe_cron_part("month", month))

    return " ".join(parts)


def _expand_cron_field(field_value, min_val, max_val):
    """Expand a cron field value into a list of valid integers."""
    values = set()
    for part in field_value.split(','):
        if '/' in part:
            range_part, step = part.split('/')
            step = int(step)
            if range_part == '*':
                start, end = min_val, max_val
            elif '-' in range_part:
                start, end = [int(x) for x in range_part.split('-')]
            else:
                start = int(range_part)
                end = max_val
            for v in range(start, end + 1, step):
                if min_val <= v <= max_val:
                    values.add(v)
        elif '-' in part:
            start, end = [int(x) for x in part.split('-')]
            for v in range(start, end + 1):
                if min_val <= v <= max_val:
                    values.add(v)
        elif part == '*':
            values.update(range(min_val, max_val + 1))
        elif part.isdigit():
            v = int(part)
            if min_val <= v <= max_val:
                values.add(v)
    return sorted(values)


def _get_next_cron_runs(expr, count=10):
    """Calculate the next N run times for a cron expression from now."""
    parsed = _parse_cron_expression(expr)

    minutes = _expand_cron_field(parsed["minute"], 0, 59)
    hours = _expand_cron_field(parsed["hour"], 0, 23)
    days_of_month = _expand_cron_field(parsed["day_of_month"], 1, 31)
    months = _expand_cron_field(parsed["month"], 1, 12)
    days_of_week = _expand_cron_field(parsed["day_of_week"], 0, 6)

    runs = []
    now = datetime.now()
    # Start from the next minute
    current = now.replace(second=0, microsecond=0) + timedelta(minutes=1)

    # Limit iterations to prevent infinite loops
    max_iterations = 525600  # ~1 year of minutes
    iterations = 0

    while len(runs) < count and iterations < max_iterations:
        iterations += 1
        match = (
            current.minute in minutes and
            current.hour in hours and
            current.month in months and
            current.day in days_of_month and
            (not days_of_week or current.weekday() + 1 if all(d > 0 for d in days_of_week)
             else current.isoweekday() % 7 in [d % 7 for d in days_of_week])
        )
        # Simplified weekday matching: Python weekday() returns 0=Mon..6=Sun
        # Cron: 0=Sun, 1=Mon..6=Sat
        match = (
            current.minute in minutes and
            current.hour in hours and
            current.month in months and
            current.day in days_of_month and
            (current.isoweekday() % 7 in days_of_week)
        )
        if match:
            runs.append(current.isoformat())
        current += timedelta(minutes=1)

    return runs


@dev_utils_bp.route("/cron-builder", methods=["GET"])
def cron_builder_page():
    """Render the Cron Expression Builder web UI."""
    return render_template("tools/cron-builder.html")


@dev_utils_bp.route("/cron-builder/parse", methods=["POST"])
def cron_builder_parse():
    """API: parse a cron expression and return description + next run times."""
    try:
        data = request.get_json(silent=True) or {}
        expression = data.get("expression", "").strip()
        count = min(int(data.get("count", 10)), 50)

        if not expression:
            return jsonify({"status": "error", "message": "No cron expression provided."})

        # Parse and validate
        try:
            parsed = _parse_cron_expression(expression)
        except ValueError as e:
            return jsonify({"status": "error", "message": str(e)})

        # Generate description
        description = _describe_cron(expression)

        # Generate next run times
        next_runs = _get_next_cron_runs(expression, count)

        # Field-by-field details
        field_details = []
        field_ranges = [(0, 59), (0, 23), (1, 31), (1, 12), (0, 6)]
        for i, field_name in enumerate(CRON_FIELDS):
            min_val, max_val = field_ranges[i]
            expanded = _expand_cron_field(parsed[field_name], min_val, max_val)
            field_details.append({
                "field": field_name,
                "raw": parsed[field_name],
                "expanded": expanded,
                "description": _describe_cron_part(field_name, parsed[field_name]),
            })

        log_tool_usage("cron-builder", "parse",
                       f"expression={expression}",
                       f"next_runs={len(next_runs)}")

        return jsonify({
            "status": "success",
            "data": {
                "expression": expression,
                "description": description,
                "parsed": parsed,
                "field_details": field_details,
                "next_runs": next_runs,
                "next_runs_count": len(next_runs),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 5. Project Scaffolder
# =========================================================================

PROJECT_TEMPLATES = {
    "flask": {
        "README.md": """# {name}

A Flask web application.

## Setup

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -r requirements.txt
```

## Run

```bash
python app.py
```

The application will be available at http://localhost:5000

## Project Structure

```
{name}/
\u251c\u2500\u2500 app.py
\u251c\u2500\u2500 requirements.txt
\u251c\u2500\u2500 config.py
\u251c\u2500\u2500 routes/
\u2502   \u251c\u2500\u2500 __init__.py
\u2502   \u2514\u2500\u2500 index.py
\u251c\u2500\u2500 templates/
\u2502   \u2514\u2500\u2500 base.html
\u251c\u2500\u2500 static/
\u2502   \u251c\u2500\u2500 css/
\u2502   \u2514\u2500\u2500 js/
\u2514\u2500\u2500 tests/
    \u2514\u2500\u2500 test_app.py
```

## License

MIT
""",
        "app.py": '''"""Main application entry point for {name}."""
from flask import Flask
from config import Config


def create_app(config_class=Config):
    """Application factory pattern."""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Register blueprints
    from routes.index import index_bp
    app.register_blueprint(index_bp)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)
''',
        "config.py": '''"""Configuration settings for {name}."""
import os


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = False
    TESTING = False
    DATABASE_URI = os.environ.get("DATABASE_URI", "sqlite:///app.db")


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    DATABASE_URI = "sqlite:///dev.db"


class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    DATABASE_URI = "sqlite:///test.db"


class ProductionConfig(Config):
    """Production configuration."""
    SECRET_KEY = os.environ.get("SECRET_KEY")


config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}
''',
        "requirements.txt": """Flask==3.0.0
python-dotenv==1.0.0
gunicorn==21.2.0
pytest==7.4.3
""",
        "routes/__init__.py": """""",
        "routes/index.py": '''"""Index routes for {name}."""
from flask import Blueprint, render_template, jsonify

index_bp = Blueprint("index", __name__)


@index_bp.route("/")
def home():
    """Render the home page."""
    return render_template("base.html", title="Home")


@index_bp.route("/api/health")
def health_check():
    """API health check endpoint."""
    return jsonify({"status": "ok", "service": "{name}"})
''',
        "templates/base.html": """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}{% endblock %} | {{ name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        h1 { color: #333; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <div class="container">
        {% block content %}{% endblock %}
    </div>
</body>
</html>
""",
        "static/css/style.css": """/* Main styles */
:root {
    --primary: #2c3e50;
    --secondary: #3498db;
}
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    line-height: 1.6;
    color: #333;
}
""",
        "static/js/main.js": """// Main application JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('{name} loaded successfully');
});
""",
        "tests/__init__.py": """""",
        "tests/test_app.py": '''"""Tests for {name}."""
import pytest
from app import create_app


@pytest.fixture
def app():
    """Create application for testing."""
    app = create_app()
    app.config["TESTING"] = True
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


def test_health_check(client):
    """Test the health check endpoint."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "ok"
''',
        ".gitignore": """venv/
__pycache__/
*.pyc
*.pyo
.env
*.db
.pytest_cache/
dist/
build/
*.egg-info/
""",
        ".env.example": """SECRET_KEY=your-secret-key-here
DATABASE_URI=sqlite:///dev.db
FLASK_ENV=development
FLASK_DEBUG=1
""",
    },
    "express": {
        "README.md": """# {name}

An Express.js web application.

## Setup

```bash
npm install
```

## Run

```bash
npm start        # Production
npm run dev      # Development with nodemon
```

The application will be available at http://localhost:3000

## Project Structure

```
{name}/
\u251c\u2500\u2500 src/
\u2502   \u251c\u2500\u2500 index.js
\u2502   \u251c\u2500\u2500 routes/
\u2502   \u2502   \u2514\u2500\u2500 index.js
\u2502   \u251c\u2500\u2500 middleware/
\u2502   \u2502   \u2514\u2500\u2500 errorHandler.js
\u2502   \u2514\u2500\u2500 utils/
\u251c\u2500\u2500 package.json
\u251c\u2500\u2500 .env.example
\u2514\u2500\u2500 .gitignore
```

## License

MIT
""",
        "src/index.js": '''/**
 * Main application entry point for {name}.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const indexRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', indexRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: '{name}', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`{name} running on http://localhost:${PORT}`);
});

module.exports = app;
''',
        "src/routes/index.js": '''/**
 * Index routes for {name}.
 */
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Welcome to {name} API', version: '1.0.0' });
});

module.exports = router;
''',
        "src/middleware/errorHandler.js": '''/**
 * Global error handler middleware.
 */
module.exports = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    console.error(`[${new Date().toISOString()}] ERROR: ${message}`);

    res.status(statusCode).json({
        error: {
            status: statusCode,
            message: message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
};
''',
        "package.json": """{{
  "name": "{name}",
  "version": "1.0.0",
  "description": "An Express.js web application",
  "main": "src/index.js",
  "scripts": {{
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest --coverage"
  }},
  "dependencies": {{
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0"
  }},
  "devDependencies": {{
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.3"
  }}
}}
""",
        ".env.example": """PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
""",
        ".gitignore": """node_modules/
.env
dist/
coverage/
*.log
""",
    },
    "nextjs": {
        "README.md": """# {name}

A Next.js application.

## Setup

```bash
npm install
```

## Run

```bash
npm run dev       # Development
npm run build     # Production build
npm run start     # Production server
```

The application will be available at http://localhost:3000

## Project Structure

```
{name}/
\u251c\u2500\u2500 src/
\u2502   \u251c\u2500\u2500 app/
\u2502   \u2502   \u251c\u2500\u2500 layout.tsx
\u2502   \u2502   \u251c\u2500\u2500 page.tsx
\u2502   \u2502   \u2514\u2500\u2500 globals.css
\u2502   \u2514\u2500\u2500 lib/
\u2502       \u2514\u2500\u2500 utils.ts
\u251c\u2500\u2500 public/
\u251c\u2500\u2500 package.json
\u251c\u2500\u2500 next.config.js
\u251c\u2500\u2500 tsconfig.json
\u2514\u2500\u2500 .env.example
```

## License

MIT
""",
        "src/app/layout.tsx": """import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {{
  title: '{name}',
  description: 'A Next.js application',
}};

export default function RootLayout({{
  children,
}}: {{
  children: React.ReactNode;
}}) {{
  return (
    <html lang="en">
      <body>{{children}}</body>
    </html>
  );
}}
""",
        "src/app/page.tsx": """export default function Home() {{
  return (
    <main style={{{{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}}}>
      <h1>Welcome to {name}</h1>
      <p>Get started by editing <code>src/app/page.tsx</code></p>
    </main>
  );
}}
""",
        "src/app/globals.css": """:root {
  --foreground: #171717;
  --background: #ffffff;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: system-ui, -apple-system, sans-serif;
}
""",
        "src/lib/utils.ts": """/**
 * Utility functions for {name}.
 */

export function cn(...classes: (string | undefined | false)[]): string {{
  return classes.filter(Boolean).join(' ');
}}

export function formatDate(date: Date): string {{
  return new Intl.DateTimeFormat('en-US', {{
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }}).format(date);
}}
""",
        "package.json": """{{
  "name": "{name}",
  "version": "1.0.0",
  "private": true,
  "scripts": {{
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }},
  "dependencies": {{
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }},
  "devDependencies": {{
    "typescript": "^5.3.3",
    "@types/node": "^20.11.5",
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18"
  }}
}}
""",
        "next.config.js": """/** @type {{import('next').NextConfig}} */
const nextConfig = {{
  reactStrictMode: true,
}};

module.exports = nextConfig;
""",
        "tsconfig.json": """{{
  "compilerOptions": {{
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{{
      "name": "next"
    }}],
    "paths": {{
      "@/*": ["./src/*"]
    }}
  }},
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}}
""",
        ".env.example": """NEXT_PUBLIC_API_URL=http://localhost:3000/api
DATABASE_URL=postgresql://localhost:5432/mydb
""",
        ".gitignore": """node_modules/
.next/
out/
.env
.env.local
*.tsbuildinfo
""",
    },
    "python-lib": {
        "README.md": """# {name}

A Python library.

## Setup

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate
pip install -e .
```

## Run Tests

```bash
pytest
```

## Project Structure

```
{name}/
\u251c\u2500\u2500 src/
\u2502   \u2514\u2500\u2500 {module_name}/
\u2502       \u251c\u2500\u2500 __init__.py
\u2502       \u2514\u2500\u2500 core.py
\u251c\u2500\u2500 tests/
\u2502   \u251c\u2500\u2500 __init__.py
\u2502   \u2514\u2500\u2500 test_core.py
\u251c\u2500\u2500 pyproject.toml
\u2514\u2500\u2500 .gitignore
```

## Usage

```python
from {module_name} import hello

result = hello("World")
print(result)  # Hello, World!
```

## License

MIT
""",
        "pyproject.toml": """[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "{name}"
version = "0.1.0"
description = "A Python library"
readme = "README.md"
license = {{text = "MIT"}}
requires-python = ">=3.8"
authors = [
    {{name = "Developer", email = "dev@example.com"}},
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-cov>=4.0",
    "black>=23.0",
    "ruff>=0.1.0",
]

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --cov={module_name}"

[tool.black]
line-length = 88

[tool.ruff]
line-length = 88
""",
        "src/__init__.py": """""",
        "tests/__init__.py": """""",
        ".gitignore": """venv/
__pycache__/
*.pyc
*.pyo
dist/
build/
*.egg-info/
.coverage
htmlcov/
.pytest_cache/
""",
    },
}


def _module_name(project_name):
    """Convert a project name to a valid Python module name."""
    name = re.sub(r'[^a-zA-Z0-9]', '_', project_name).lower()
    if name and name[0].isdigit():
        name = '_' + name
    return name


def _generate_project_files(project_type, project_name):
    """Generate all project files for the given project type."""
    template = PROJECT_TEMPLATES.get(project_type)
    if not template:
        return None

    module_name = _module_name(project_name)
    files = {}

    for file_path, content in template.items():
        processed_content = content.replace("{name}", project_name).replace("{module_name}", module_name)
        files[file_path] = processed_content

    # Add module-specific files for python-lib
    if project_type == "python-lib":
        files[f"src/{module_name}/__init__.py"] = f'''"""{project_name} - A Python library."""
from .core import hello

__version__ = "0.1.0"
__all__ = ["hello"]
'''
        files[f"src/{module_name}/core.py"] = f'''"""Core functionality for {project_name}."""


def hello(name: str) -> str:
    """Return a greeting.

    Args:
        name: The name to greet.

    Returns:
        A greeting string.
    """
    return f"Hello, {{name}}!"


def add(a: float, b: float) -> float:
    """Add two numbers together.

    Args:
        a: First number.
        b: Second number.

    Returns:
        The sum of a and b.
    """
    return a + b
'''
        files["tests/test_core.py"] = f'''"""Tests for {project_name} core module."""
import pytest
from {module_name} import hello, add


class TestHello:
    """Tests for the hello function."""

    def test_hello_world(self):
        assert hello("World") == "Hello, World!"

    def test_hello_empty(self):
        assert hello("") == "Hello, !"

    def test_hello_number(self):
        assert hello("42") == "Hello, 42!"


class TestAdd:
    """Tests for the add function."""

    def test_add_positive(self):
        assert add(1, 2) == 3

    def test_add_negative(self):
        assert add(-1, 1) == 0

    def test_add_float(self):
        assert add(1.5, 2.5) == 4.0

    def test_add_zero(self):
        assert add(0, 0) == 0
'''

    return files


@dev_utils_bp.route("/scaffolder", methods=["GET"])
def scaffolder_page():
    """Render the Project Scaffolder web UI."""
    return render_template("tools/scaffolder.html")


@dev_utils_bp.route("/scaffolder/generate", methods=["POST"])
def scaffolder_generate():
    """API: generate a project scaffold and return as a zip file."""
    try:
        data = request.get_json(silent=True) or {}
        project_type = data.get("project_type", "flask")
        project_name = data.get("project_name", "my-project").strip()

        if not project_name:
            return jsonify({"status": "error", "message": "Project name is required."})

        # Validate project name
        clean_name = re.sub(r'[^\w\-.]', '-', project_name)
        clean_name = re.sub(r'-+', '-', clean_name).strip('-')

        if not clean_name:
            return jsonify({"status": "error", "message": "Invalid project name."})

        if project_type not in PROJECT_TEMPLATES:
            return jsonify({"status": "error", "message": f"Unsupported project type: {project_type}. Choose from: {', '.join(PROJECT_TEMPLATES.keys())}"})

        # Generate files
        files = _generate_project_files(project_type, clean_name)
        if not files:
            return jsonify({"status": "error", "message": "Failed to generate project files."})

        # Create zip in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file_path, content in files.items():
                zip_file.writestr(f"{clean_name}/{file_path}", content)

        zip_buffer.seek(0)

        log_tool_usage("project-scaffolder", "generate",
                       f"type={project_type}, name={clean_name}",
                       f"files={len(files)}")

        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f"{clean_name}.zip",
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 6. Webhook Tester
# =========================================================================

# In-memory webhook storage
_webhook_logs = {}  # token -> list of webhook entries
_webhook_tokens = {}  # token -> creation time


def _generate_webhook_token():
    """Generate a unique webhook token."""
    token = secrets.token_urlsafe(24)
    while token in _webhook_logs:
        token = secrets.token_urlsafe(24)
    return token


@dev_utils_bp.route("/webhook-tester", methods=["GET"])
def webhook_tester_page():
    """Render the Webhook Tester web UI."""
    return render_template("tools/webhook-tester.html")


@dev_utils_bp.route("/webhook-tester/receive", methods=["POST", "PUT", "PATCH", "DELETE", "GET", "HEAD", "OPTIONS"])
def webhook_tester_receive():
    """API: receive incoming webhook data. The token is part of the URL path."""
    try:
        # Get the token from a custom header or query param
        token = request.args.get("token", "") or request.headers.get("X-Webhook-Token", "")

        if not token or token not in _webhook_tokens:
            return jsonify({"status": "error", "message": "Invalid or missing webhook token."}), 404

        # Capture request data
        entry = {
            "id": len(_webhook_logs.get(token, [])) + 1,
            "method": request.method,
            "url": request.url,
            "path": request.path,
            "headers": dict(request.headers),
            "query_params": dict(request.args),
            "body": request.get_data(as_text=True),
            "content_type": request.content_type,
            "timestamp": datetime.now().isoformat(),
            "remote_addr": request.remote_addr,
            "user_agent": request.user_agent.string if request.user_agent else "",
        }

        # Try to parse body as JSON
        try:
            entry["body_json"] = json.loads(entry["body"])
        except (json.JSONDecodeError, ValueError):
            entry["body_json"] = None

        if token not in _webhook_logs:
            _webhook_logs[token] = []
        _webhook_logs[token].append(entry)

        log_tool_usage("webhook-tester", "receive",
                       f"token={token[:8]}..., method={request.method}",
                       f"entry_id={entry['id']}")

        return jsonify({"status": "success", "message": "Webhook received.", "entry_id": entry["id"]})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/webhook-tester/create", methods=["POST"])
def webhook_tester_create():
    """API: create a new webhook endpoint and return the unique URL."""
    try:
        token = _generate_webhook_token()
        _webhook_logs[token] = []
        _webhook_tokens[token] = datetime.now().isoformat()

        webhook_url = f"/tools/dev/webhook-tester/receive?token={token}"

        log_tool_usage("webhook-tester", "create",
                       f"token={token[:8]}...",
                       f"url={webhook_url}")

        return jsonify({
            "status": "success",
            "data": {
                "token": token,
                "url": webhook_url,
                "message": f"Send POST/GET/PUT/DELETE requests to {webhook_url}",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/webhook-tester/logs", methods=["GET"])
def webhook_tester_logs():
    """API: return all logged webhooks for a given token."""
    try:
        token = request.args.get("token", "")

        if not token or token not in _webhook_tokens:
            return jsonify({"status": "error", "message": "Invalid or missing webhook token."})

        logs = _webhook_logs.get(token, [])

        return jsonify({
            "status": "success",
            "data": {
                "token": token,
                "total_requests": len(logs),
                "logs": logs,
                "created_at": _webhook_tokens.get(token, ""),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/webhook-tester/clear", methods=["POST"])
def webhook_tester_clear():
    """API: clear all logged webhooks for a given token."""
    try:
        data = request.get_json(silent=True) or {}
        token = data.get("token", "")

        if not token or token not in _webhook_tokens:
            return jsonify({"status": "error", "message": "Invalid or missing webhook token."})

        _webhook_logs[token] = []

        return jsonify({
            "status": "success",
            "data": {
                "token": token,
                "message": "Webhook logs cleared.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 7. Diff Tool
# =========================================================================

@dev_utils_bp.route("/diff", methods=["GET"])
def diff_page():
    """Render the Diff Tool web UI."""
    return render_template("tools/diff.html")


@dev_utils_bp.route("/diff/compare", methods=["POST"])
def diff_compare():
    """API: compare two text strings and return a diff."""
    try:
        data = request.get_json(silent=True) or {}
        text1 = data.get("text1", "")
        text2 = data.get("text2", "")
        context_lines = min(int(data.get("context_lines", 3)), 20)
        mode = data.get("mode", "unified")  # unified | side_by_side | html

        if text1 is None:
            text1 = ""
        if text2 is None:
            text2 = ""

        lines1 = text1.splitlines(keepends=True)
        lines2 = text2.splitlines(keepends=True)

        # Count stats
        differ = difflib.SequenceMatcher(None, lines1, lines2)
        additions = sum(1 for op, _, _, _, _ in differ.get_opcodes() if op == 'insert')
        deletions = sum(1 for op, _, _, _, _ in differ.get_opcodes() if op == 'delete')
        modifications = sum(1 for op, _, _, _, _ in differ.get_opcodes() if op == 'replace')

        result = {
            "mode": mode,
            "stats": {
                "total_lines_original": len(lines1),
                "total_lines_modified": len(lines2),
                "additions": additions,
                "deletions": deletions,
                "modifications": modifications,
                "similarity": round(differ.ratio() * 100, 2),
            },
        }

        if mode == "html":
            # Use difflib.HtmlDiff
            html_differ = difflib.HtmlDiff(tabsize=4, wrapcolumn=80)
            html_diff = html_differ.make_table(
                lines1, lines2,
                fromdesc="Original", todesc="Modified",
                context=True, numlines=context_lines,
            )
            result["html_table"] = html_diff
            result["html_diff"] = html_differ.make_file(
                lines1, lines2,
                fromdesc="Original", todesc="Modified",
                context=True, numlines=context_lines,
            )
        elif mode == "side_by_side":
            # Generate side-by-side data
            left_lines = []
            right_lines = []
            opcodes = list(differ.get_opcodes())

            for tag, i1, i2, j1, j2 in opcodes:
                if tag == 'equal':
                    for k in range(i2 - i1):
                        left_lines.append({
                            "line": i1 + k + 1,
                            "type": "equal",
                            "content": lines1[i1 + k].rstrip('\r\n'),
                        })
                        right_lines.append({
                            "line": j1 + k + 1,
                            "type": "equal",
                            "content": lines2[j1 + k].rstrip('\r\n'),
                        })
                elif tag == 'replace':
                    # Align replacements side by side
                    max_len = max(i2 - i1, j2 - j1)
                    for k in range(max_len):
                        if k < i2 - i1:
                            left_lines.append({
                                "line": i1 + k + 1,
                                "type": "delete",
                                "content": lines1[i1 + k].rstrip('\r\n'),
                            })
                        else:
                            left_lines.append({"line": "", "type": "empty", "content": ""})
                        if k < j2 - j1:
                            right_lines.append({
                                "line": j1 + k + 1,
                                "type": "insert",
                                "content": lines2[j1 + k].rstrip('\r\n'),
                            })
                        else:
                            right_lines.append({"line": "", "type": "empty", "content": ""})
                elif tag == 'delete':
                    for k in range(i2 - i1):
                        left_lines.append({
                            "line": i1 + k + 1,
                            "type": "delete",
                            "content": lines1[i1 + k].rstrip('\r\n'),
                        })
                        right_lines.append({"line": "", "type": "empty", "content": ""})
                elif tag == 'insert':
                    for k in range(j2 - j1):
                        left_lines.append({"line": "", "type": "empty", "content": ""})
                        right_lines.append({
                            "line": j1 + k + 1,
                            "type": "insert",
                            "content": lines2[j1 + k].rstrip('\r\n'),
                        })

            result["left"] = left_lines
            result["right"] = right_lines
        else:
            # Unified diff (default)
            diff_lines = list(difflib.unified_diff(
                lines1, lines2,
                fromfile="Original", tofile="Modified",
                n=context_lines,
                lineterm="",
            ))

            # Parse unified diff into structured data
            structured_diff = []
            for line in diff_lines:
                if line.startswith('@@'):
                    structured_diff.append({"type": "header", "content": line})
                elif line.startswith('+'):
                    structured_diff.append({"type": "addition", "content": line[1:]})
                elif line.startswith('-'):
                    structured_diff.append({"type": "deletion", "content": line[1:]})
                else:
                    structured_diff.append({"type": "context", "content": line[1:] if line.startswith(' ') else line})

            result["unified_diff"] = "\n".join(diff_lines)
            result["structured_diff"] = structured_diff

        log_tool_usage("diff-tool", "compare",
                       f"mode={mode}, lines1={len(lines1)}, lines2={len(lines2)}",
                       f"similarity={result['stats']['similarity']}%")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 8. Snippet Manager
# =========================================================================

@dev_utils_bp.route("/snippets", methods=["GET"])
def snippets_list():
    """API: list all code snippets, with optional language filter."""
    try:
        language = request.args.get("language", None)
        snippets = get_all_snippets(language=language if language else None)

        return jsonify({
            "status": "success",
            "data": {
                "snippets": snippets,
                "total": len(snippets),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/snippets", methods=["POST"])
def snippets_create():
    """API: create a new code snippet."""
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title", "").strip()
        language = data.get("language", "python").strip()
        code = data.get("code", "")
        description = data.get("description", "").strip()
        tags = data.get("tags", "").strip()

        if not title:
            return jsonify({"status": "error", "message": "Snippet title is required."})
        if not code:
            return jsonify({"status": "error", "message": "Snippet code is required."})

        snippet_id = save_snippet(
            title=title,
            language=language,
            code=code,
            description=description,
            tags=tags,
        )

        log_tool_usage("snippet-manager", "create",
                       f"title={title}, language={language}",
                       f"id={snippet_id}")

        return jsonify({
            "status": "success",
            "data": {
                "id": snippet_id,
                "message": "Snippet saved successfully.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/snippets/search", methods=["POST"])
def snippets_search():
    """API: search snippets by title, tag, or language."""
    try:
        data = request.get_json(silent=True) or {}
        query = data.get("query", "").strip().lower()
        language = data.get("language", "").strip().lower()
        tag = data.get("tag", "").strip().lower()

        if not query and not language and not tag:
            return jsonify({"status": "error", "message": "Provide at least one search criterion: query, language, or tag."})

        all_snippets = get_all_snippets()

        filtered = []
        for snippet in all_snippets:
            match = True
            if query:
                title_match = query in snippet.get("title", "").lower()
                desc_match = query in snippet.get("description", "").lower()
                code_match = query in snippet.get("code", "").lower()
                if not (title_match or desc_match or code_match):
                    match = False
            if language:
                if language not in snippet.get("language", "").lower():
                    match = False
            if tag:
                tags_str = snippet.get("tags", "").lower()
                if not tags_str or tag not in [t.strip() for t in tags_str.split(',')]:
                    match = False
            if match:
                filtered.append(snippet)

        return jsonify({
            "status": "success",
            "data": {
                "snippets": filtered,
                "total": len(filtered),
                "query": {"query": query, "language": language, "tag": tag},
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/snippets/<int:snippet_id>", methods=["DELETE"])
def snippets_delete(snippet_id):
    """API: delete a code snippet by ID."""
    try:
        if not snippet_id or snippet_id < 1:
            return jsonify({"status": "error", "message": "Valid snippet ID is required."})

        delete_snippet(snippet_id)

        log_tool_usage("snippet-manager", "delete",
                       f"id={snippet_id}",
                       "deleted")

        return jsonify({
            "status": "success",
            "data": {
                "id": snippet_id,
                "message": "Snippet deleted successfully.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 9. Env Manager
# =========================================================================

@dev_utils_bp.route("/env-manager", methods=["GET"])
def env_manager_list():
    """API: list all environment configs, with optional project filter."""
    try:
        project_name = request.args.get("project", None)
        configs = get_env_configs(project_name=project_name if project_name else None)

        # Get distinct project names for filtering
        all_configs = get_env_configs()
        project_names = sorted(set(c.get("project_name", "") for c in all_configs if c.get("project_name")))

        return jsonify({
            "status": "success",
            "data": {
                "configs": configs,
                "total": len(configs),
                "project_names": project_names,
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/env-manager", methods=["POST"])
def env_manager_save():
    """API: save an environment configuration."""
    try:
        data = request.get_json(silent=True) or {}
        project_name = data.get("project_name", "").strip()
        key_name = data.get("key_name", "").strip()
        key_value = data.get("key_value", "")
        environment = data.get("environment", "development").strip()

        if not project_name:
            return jsonify({"status": "error", "message": "Project name is required."})
        if not key_name:
            return jsonify({"status": "error", "message": "Key name is required."})

        save_env_config(
            project_name=project_name,
            key_name=key_name,
            key_value=key_value,
            environment=environment,
        )

        log_tool_usage("env-manager", "save",
                       f"project={project_name}, key={key_name}, env={environment}",
                       "saved")

        return jsonify({
            "status": "success",
            "data": {
                "message": "Environment config saved successfully.",
                "project_name": project_name,
                "key_name": key_name,
                "environment": environment,
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/env-manager/<int:config_id>", methods=["DELETE"])
def env_manager_delete(config_id):
    """API: delete an environment config by ID."""
    try:
        if not config_id or config_id < 1:
            return jsonify({"status": "error", "message": "Valid config ID is required."})

        delete_env_config(config_id)

        log_tool_usage("env-manager", "delete",
                       f"id={config_id}",
                       "deleted")

        return jsonify({
            "status": "success",
            "data": {
                "id": config_id,
                "message": "Environment config deleted successfully.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/env-manager/export", methods=["GET"])
def env_manager_export():
    """API: export environment configs for a project as .env file content."""
    try:
        project_name = request.args.get("project", "").strip()

        if not project_name:
            return jsonify({"status": "error", "message": "Project name is required for export."})

        configs = get_env_configs(project_name=project_name)

        if not configs:
            return jsonify({"status": "error", "message": f"No configs found for project: {project_name}"})

        # Build .env file content
        env_lines = []
        # Group by environment
        environments = sorted(set(c.get("environment", "development") for c in configs))

        for env in environments:
            env_configs = [c for c in configs if c.get("environment") == env]
            if len(environments) > 1:
                if env != "development":
                    env_lines.append(f"# --- {env.upper()} ---")
                else:
                    env_lines.append("# --- DEFAULT / DEVELOPMENT ---")
            for config in env_configs:
                key = config.get("key_name", "")
                value = config.get("key_value", "")
                # Wrap values with special characters in quotes
                if any(c in str(value) for c in [' ', '#', '"', "'", '\n', '\t']):
                    value = f'"{value}"'
                env_lines.append(f"{key}={value}")

        env_content = "\n".join(env_lines) + "\n"

        log_tool_usage("env-manager", "export",
                       f"project={project_name}",
                       f"entries={len(configs)}")

        return jsonify({
            "status": "success",
            "data": {
                "project_name": project_name,
                "environments": environments,
                "content": env_content,
                "total_entries": len(configs),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 10. Secret Manager
# =========================================================================

@dev_utils_bp.route("/secret-manager", methods=["GET"])
def secret_manager_list():
    """API: list all secrets (passwords hidden)."""
    try:
        secrets_list = get_all_secrets()

        # Mask passwords
        for secret in secrets_list:
            if secret.get("password_encrypted"):
                secret["password_masked"] = "••••••••"
                secret.pop("password_encrypted", None)
            else:
                secret["password_masked"] = None

        return jsonify({
            "status": "success",
            "data": {
                "secrets": secrets_list,
                "total": len(secrets_list),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/secret-manager", methods=["POST"])
def secret_manager_save():
    """API: save a new secret (password will be hashed)."""
    try:
        data = request.get_json(silent=True) or {}
        service = data.get("service", "").strip()
        username = data.get("username", "").strip()
        password = data.get("password", "")
        url = data.get("url", "").strip()
        notes = data.get("notes", "").strip()
        category = data.get("category", "general").strip()

        if not service:
            return jsonify({"status": "error", "message": "Service name is required."})

        save_secret(
            service=service,
            username=username,
            password=password,
            url=url,
            notes=notes,
            category=category,
        )

        log_tool_usage("secret-manager", "save",
                       f"service={service}, category={category}",
                       "saved")

        return jsonify({
            "status": "success",
            "data": {
                "message": "Secret saved successfully.",
                "service": service,
                "category": category,
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/secret-manager/<int:secret_id>", methods=["DELETE"])
def secret_manager_delete(secret_id):
    """API: delete a secret by ID."""
    try:
        if not secret_id or secret_id < 1:
            return jsonify({"status": "error", "message": "Valid secret ID is required."})

        # Use raw SQL delete since database.py doesn't have delete_secret
        import sqlite3
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'toolkit.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM secrets WHERE id = ?', (secret_id,))
        affected = cursor.rowcount
        conn.commit()
        conn.close()

        if affected == 0:
            return jsonify({"status": "error", "message": f"Secret with ID {secret_id} not found."})

        log_tool_usage("secret-manager", "delete",
                       f"id={secret_id}",
                       "deleted")

        return jsonify({
            "status": "success",
            "data": {
                "id": secret_id,
                "message": "Secret deleted successfully.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@dev_utils_bp.route("/secret-manager/categories", methods=["GET"])
def secret_manager_categories():
    """API: get unique categories for secrets."""
    try:
        secrets_list = get_all_secrets()
        categories = sorted(set(s.get("category", "general") for s in secrets_list if s.get("category")))

        return jsonify({
            "status": "success",
            "data": {
                "categories": categories,
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
