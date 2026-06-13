"""
ECHO Toolkit — AI Tools
Flask Blueprint with 10 fully functional offline AI/NLP utilities.
Each tool exposes a web UI route (GET -> HTML) and an API route (POST -> JSON).
"""

import sys, os, re, math, json, hashlib, time, random
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from flask import Blueprint, render_template, request, jsonify
from collections import Counter
from database import log_tool_usage

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------
ai_tools_bp = Blueprint(
    "ai_tools_bp",
    __name__,
    url_prefix="/tools/ai",
    template_folder="../../templates",
)


# =========================================================================
# Shared NLP Resources
# =========================================================================

STOP_WORDS = {
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
    'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
    'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'having', 'do', 'does', 'did', 'doing', 'would', 'could', 'may',
    'might', 'shall', 'must', 'it', 'its', 'he', 'she', 'they', 'them',
    'we', 'you', 'i', 'me', 'my', 'your', 'his', 'her', 'our', 'their',
    'this', 'that', 'these', 'those', 'what', 'which', 'who', 'whom',
    'as', 'also', 'well', 'because', 'since', 'while', 'although', 'though',
    'even', 'still', 'already', 'yet', 'however', 'therefore', 'thus',
}


# =========================================================================
# 1. AI Summarizer (Offline — Extractive)
# =========================================================================

def _split_sentences(text):
    """Split text into sentences, preserving order."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if len(s.strip()) > 10]


def _score_sentences(sentences):
    """Score sentences by word frequency, position, and length."""
    all_words = re.findall(r'\b[a-zA-Z]+\b', ' '.join(sentences).lower())
    word_freq = Counter(all_words)
    max_freq = max(word_freq.values()) if word_freq else 1

    # Normalize frequencies
    norm_freq = {w: f / max_freq for w, f in word_freq.items()}

    scored = []
    total = len(sentences)
    for idx, sent in enumerate(sentences):
        words = re.findall(r'\b[a-zA-Z]+\b', sent.lower())
        if not words:
            continue

        # Frequency score
        freq_score = sum(norm_freq.get(w, 0) for w in words) / len(words)

        # Position score (first and last sentences matter)
        if total <= 3:
            pos_score = 1.0
        elif idx == 0:
            pos_score = 0.85
        elif idx == total - 1:
            pos_score = 0.7
        else:
            pos_score = 0.3

        # Length score (prefer medium-length sentences)
        word_count = len(words)
        if 10 <= word_count <= 30:
            len_score = 1.0
        elif 5 <= word_count < 10:
            len_score = 0.7
        elif 30 < word_count <= 50:
            len_score = 0.6
        else:
            len_score = 0.4

        # Keyword density: does sentence contain frequent words?
        top_words = set(w for w, _ in word_freq.most_common(10))
        keyword_hits = sum(1 for w in words if w in top_words)
        keyword_score = keyword_hits / max(len(top_words), 1)

        final_score = (0.4 * freq_score) + (0.25 * pos_score) + (0.15 * len_score) + (0.2 * keyword_score)
        scored.append((idx, sent, final_score))

    return scored


def _extractive_summarize(text, length="medium"):
    """Perform extractive summarization."""
    sentences = _split_sentences(text)
    if not sentences:
        return "Text is too short to summarize."

    if len(sentences) <= 2:
        return text.strip()

    # Determine number of sentences to select
    ratios = {"short": 0.15, "medium": 0.35, "detailed": 0.6}
    ratio = ratios.get(length, 0.35)
    num_select = max(1, int(len(sentences) * ratio))
    if num_select >= len(sentences):
        return text.strip()

    scored = _score_sentences(sentences)
    # Sort by score descending, take top N, then re-sort by original position
    top = sorted(scored, key=lambda x: x[2], reverse=True)[:num_select]
    top_sorted = sorted(top, key=lambda x: x[0])

    summary = ' '.join(item[1] for item in top_sorted)

    # Clean up
    summary = re.sub(r'\s+', ' ', summary).strip()
    if summary and summary[-1] not in '.!?':
        summary += '.'

    return summary


@ai_tools_bp.route("/ai-summarizer", methods=["GET"])
def ai_summarizer_page():
    return render_template("tools/ai-summarizer.html")


@ai_tools_bp.route("/ai-summarizer/summarize", methods=["POST"])
def ai_summarizer_api():
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")
        length = data.get("length", "medium").strip().lower()

        if not text.strip():
            return jsonify({"status": "error", "message": "No text provided."})

        valid_lengths = ["short", "medium", "detailed"]
        if length not in valid_lengths:
            return jsonify({"status": "error", "message": f"Invalid length: {length}. Choose from: {', '.join(valid_lengths)}"})

        summary = _extractive_summarize(text, length)
        original_words = len(re.findall(r'\b\w+\b', text))
        summary_words = len(re.findall(r'\b\w+\b', summary))
        reduction = round((1 - summary_words / max(original_words, 1)) * 100, 1)

        log_tool_usage("ai-summarizer", "summarize", f"length={length}, input_words={original_words}", f"output_words={summary_words}")

        return jsonify({
            "status": "success",
            "data": {
                "summary": summary,
                "original_word_count": original_words,
                "summary_word_count": summary_words,
                "reduction_percent": reduction,
                "length_setting": length,
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 2. AI Code Explainer (Offline — Rule-based)
# =========================================================================

CODE_PATTERNS = {
    "loops": {
        "python": [
            (r'\bfor\s+\w+\s+in\s+', "Iterates over elements in a collection"),
            (r'\bwhile\s+', "Executes a block while a condition is true"),
            (r'\bfor\s+\w+\s+,\s*\w+\s+in\s+', "Iterates over key-value pairs (dictionary)"),
        ],
        "javascript": [
            (r'\bfor\s*\(', "Standard for loop"),
            (r'\bfor\s*\.\.\.', "Iterates over iterable objects"),
            (r'\bwhile\s*\(', "Executes while condition is true"),
            (r'\.forEach\(', "Calls a function for each array element"),
            (r'\.map\(', "Creates a new array by transforming each element"),
            (r'\.filter\(', "Creates a new array with elements that pass a test"),
            (r'\.reduce\(', "Reduces array to a single value"),
        ],
        "java": [
            (r'\bfor\s*\(', "Standard for loop"),
            (r'\bfor\s*\(\w+\s+:\s*', "Enhanced for-each loop"),
            (r'\bwhile\s*\(', "While loop"),
        ],
        "default": [
            (r'\bfor\s*\(', "For loop"),
            (r'\bwhile\s*\(', "While loop"),
        ],
    },
    "functions": {
        "python": [(r'\bdef\s+(\w+)\s*\(', "Defines a function")],
        "javascript": [(r'(?:function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))', "Defines a function")],
        "java": [(r'(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(', "Defines a method")],
        "default": [(r'\bfunction\s+(\w+)\s*\(', "Defines a function")],
    },
    "classes": {
        "python": [(r'\bclass\s+(\w+)', "Defines a class")],
        "javascript": [(r'\bclass\s+(\w+)', "Defines a class")],
        "java": [(r'\bclass\s+(\w+)', "Defines a class")],
        "default": [(r'\bclass\s+(\w+)', "Defines a class")],
    },
    "imports": {
        "python": [(r'\bimport\s+(\w+)', "Imports a module"), (r'\bfrom\s+([\w.]+)\s+import', "Imports specific items from a module")],
        "javascript": [(r'\bimport\s+.*\bfrom\s+[\'"]([\w./@-]+)', "Imports from a module"), (r'\brequire\s*\(\s*[\'"]([\w./-]+)', "Requires a CommonJS module")],
        "java": [(r'\bimport\s+([\w.]+)', "Imports a package/class")],
        "default": [(r'\bimport\b', "Import statement")],
    },
    "conditionals": {
        "default": [
            (r'\bif\s*\(', "If conditional"),
            (r'\belse\s*if\b', "Else-if conditional"),
            (r'\belse\s*[:{]', "Else block"),
            (r'\bswitch\s*\(', "Switch statement"),
            (r'\b(?:try|catch|finally)\b', "Exception/error handling"),
        ],
    },
    "api_calls": {
        "default": [
            (r'\.fetch\(', "Makes an HTTP request"),
            (r'\.get\s*\(', "HTTP GET request"),
            (r'\.post\s*\(', "HTTP POST request"),
            (r'axios\.\w+\(', "Axios HTTP request"),
            (r'requests\.\w+\(', "Python requests HTTP call"),
            (r'urllib', "URL/HTTP library call"),
        ],
    },
    "data_structures": {
        "default": [
            (r'\b(?:list|dict|set|tuple)\s*\(', "Creates a Python data structure"),
            (r'\[\]', "Array/list literal"),
            (r'\{\}', "Dictionary/object literal"),
            (r'\bnew\s+(?:Map|Set|List|ArrayList|HashMap|HashSet)', "Creates a data structure"),
        ],
    },
    "decorators_annotations": {
        "python": [(r'@(\w+)', "Decorator that modifies a function/class")],
        "java": [(r'@(\w+)', "Annotation that adds metadata")],
        "default": [(r'@(\w+)', "Decorator/annotation")],
    },
}


def _detect_language(code):
    """Detect programming language from code content."""
    if re.search(r'\bdef\s+\w+\s*\(.*\)\s*:', code) or re.search(r'import\s+\w+', code):
        return "python"
    if re.search(r'\b(?:const|let|var)\s+', code) or re.search(r'===|!==', code):
        return "javascript"
    if re.search(r'\bpublic\s+(?:static\s+)?(?:void|class|int|String|boolean)\b', code):
        return "java"
    if re.search(r'<\?php', code):
        return "php"
    if re.search(r'fn\s+\w+', code) or re.search(r'let\s+mut\s+', code):
        return "rust"
    if re.search(r'\bpackage\s+\w+', code) or re.search(r'func\s+\w+', code):
        return "go"
    return "default"


def _explain_code(code, language=None):
    """Generate a rule-based explanation of code."""
    if not language or language == "auto":
        language = _detect_language(code)

    lines = code.split('\n')
    non_blank_lines = [l for l in lines if l.strip()]
    total_lines = len(lines)
    code_lines = len(non_blank_lines)

    findings = {
        "language_detected": language,
        "total_lines": total_lines,
        "code_lines": code_lines,
        "patterns": [],
        "structure": [],
        "high_level_description": [],
        "variables": [],
        "comments": [],
    }

    # Count comments
    comment_count = 0
    for line in lines:
        stripped = line.strip()
        if language in ("python", "default") and stripped.startswith('#'):
            findings["comments"].append(stripped.lstrip('# ').strip())
            comment_count += 1
        elif language in ("javascript", "java") and (stripped.startswith('//') or stripped.startswith('/*')):
            findings["comments"].append(stripped.lstrip('/ ').strip())
            comment_count += 1
    findings["comment_count"] = comment_count

    # Detect variables
    var_patterns = {
        "python": r'(\w+)\s*=\s*',
        "javascript": r'(?:const|let|var)\s+(\w+)\s*=\s*',
        "java": r'(?:int|String|double|float|boolean|long|byte|char|var)\s+(\w+)\s*=\s*',
        "default": r'(\w+)\s*=\s*',
    }
    for m in re.finditer(var_patterns.get(language, var_patterns["default"]), code):
        findings["variables"].append(m.group(1))

    # Find unique variables
    findings["variables"] = list(dict.fromkeys(findings["variables"]))[:20]

    # Detect patterns
    for category, lang_patterns in CODE_PATTERNS.items():
        patterns = lang_patterns.get(language, lang_patterns.get("default", []))
        for pattern, description in patterns:
            matches = list(re.finditer(pattern, code))
            if matches:
                findings["patterns"].append({
                    "category": category,
                    "description": description,
                    "count": len(matches),
                    "examples": [m.group(0).strip()[:80] for m in matches[:3]],
                })

    # Build high-level description
    description_parts = []

    # Check if it's a class definition
    if any(p["category"] == "classes" for p in findings["patterns"]):
        description_parts.append("This code defines one or more classes")

    # Check for functions/methods
    func_count = sum(p["count"] for p in findings["patterns"] if p["category"] == "functions")
    if func_count > 0:
        if func_count == 1:
            description_parts.append("contains a single function/method")
        else:
            description_parts.append(f"contains {func_count} functions/methods")

    # Check for loops
    loop_count = sum(p["count"] for p in findings["patterns"] if p["category"] == "loops")
    if loop_count > 0:
        description_parts.append(f"uses {loop_count} loop(s)")

    # Check for conditionals
    cond_count = sum(p["count"] for p in findings["patterns"] if p["category"] == "conditionals")
    if cond_count > 0:
        description_parts.append(f"includes {cond_count} conditional branch(es)")

    # Check for imports
    import_count = sum(p["count"] for p in findings["patterns"] if p["category"] == "imports")
    if import_count > 0:
        description_parts.append(f"imports {import_count} module(s)/package(s)")

    # Check for API calls
    api_count = sum(p["count"] for p in findings["patterns"] if p["category"] == "api_calls")
    if api_count > 0:
        description_parts.append(f"makes {api_count} API/network call(s)")

    if not description_parts:
        description_parts.append("performs a set of operations")

    findings["high_level_description"] = "This code " + ", ".join(description_parts) + "."

    # Structure assessment
    if code_lines <= 10:
        findings["structure"].append("Simple, short script")
    elif code_lines <= 30:
        findings["structure"].append("Small function/utility")
    elif code_lines <= 100:
        findings["structure"].append("Medium-sized module")
    else:
        findings["structure"].append("Large program/module")

    if comment_count > code_lines * 0.15:
        findings["structure"].append("Well-commented code")
    elif comment_count == 0:
        findings["structure"].append("No comments found — consider adding documentation")

    return findings


@ai_tools_bp.route("/code-explainer", methods=["GET"])
def code_explainer_page():
    return render_template("tools/code-explainer.html")


@ai_tools_bp.route("/code-explainer/explain", methods=["POST"])
def code_explainer_api():
    try:
        data = request.get_json(silent=True) or {}
        code = data.get("code", "")
        language = data.get("language", "auto").strip().lower()

        if not code.strip():
            return jsonify({"status": "error", "message": "No code provided."})

        result = _explain_code(code, language)

        log_tool_usage("code-explainer", "explain", f"language={result['language_detected']}, lines={result['total_lines']}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 3. AI Text Generator (Offline — Template-based)
# =========================================================================

TEXT_TEMPLATES = {
    "email": {
        "templates": [
            {
                "name": "Professional Inquiry",
                "pattern": r"(?:inquir|ask|question|wonder|want to know)",
                "template": (
                    "Subject: {topic}\n\n"
                    "Dear {recipient},\n\n"
                    "I hope this message finds you well. I am writing to inquire about {topic}. "
                    "I would greatly appreciate any information or guidance you could provide regarding this matter.\n\n"
                    "Specifically, I am interested in learning more about {topic}. "
                    "If you have any relevant resources or would be available for a brief discussion, please let me know.\n\n"
                    "Thank you for your time and consideration. I look forward to hearing from you.\n\n"
                    "Best regards,\n{sender}"
                ),
            },
            {
                "name": "Follow-up",
                "pattern": r"(?:follow.?up|check|remind|update|status)",
                "template": (
                    "Subject: Following Up — {topic}\n\n"
                    "Dear {recipient},\n\n"
                    "I hope you're doing well. I wanted to follow up regarding {topic} that we discussed previously. "
                    "Have there been any updates or developments since our last conversation?\n\n"
                    "I am eager to move forward and would be happy to provide any additional information you might need. "
                    "Please don't hesitate to reach out if there's anything I can do to help facilitate progress.\n\n"
                    "Thank you for your attention to this matter.\n\n"
                    "Warm regards,\n{sender}"
                ),
            },
            {
                "name": "General Email",
                "pattern": None,
                "template": (
                    "Subject: {topic}\n\n"
                    "Dear {recipient},\n\n"
                    "I hope this email finds you well. I am reaching out regarding {topic}. "
                    "I believe this is an important matter that warrants your attention.\n\n"
                    "I would appreciate the opportunity to discuss this further at your convenience. "
                    "Please feel free to respond at your earliest convenience.\n\n"
                    "Best regards,\n{sender}"
                ),
            },
        ],
    },
    "blog_intro": {
        "templates": [
            {
                "name": "Problem-Solution Hook",
                "pattern": r"(?:problem|challenge|issue|struggle|difficult|hard|trouble)",
                "template": (
                    "Have you ever struggled with {topic}? You're not alone. "
                    "Thousands of people face this challenge every day, and the good news is — there's a better way.\n\n"
                    "In this article, we'll dive deep into {topic} and explore practical solutions "
                    "that you can start implementing right away. Whether you're a beginner or an experienced professional, "
                    "you'll find actionable insights that can make a real difference.\n\n"
                    "Let's get started."
                ),
            },
            {
                "name": "Statistics Hook",
                "pattern": r"(?:stat|data|number|percent|survey|research|study|report)",
                "template": (
                    "The numbers don't lie — and when it comes to {topic}, the data tells a compelling story. "
                    "Recent studies show that this area is rapidly evolving, and those who stay ahead of the curve "
                    "will have a significant advantage.\n\n"
                    "In this comprehensive guide, we'll break down everything you need to know about {topic}. "
                    "From fundamental concepts to advanced strategies, we've got you covered.\n\n"
                    "Here's what you need to know."
                ),
            },
            {
                "name": "General Blog Intro",
                "pattern": None,
                "template": (
                    "{topic} is a topic that continues to gain attention, and for good reason. "
                    "As the landscape evolves, understanding the key aspects becomes increasingly important "
                    "for anyone looking to stay informed and competitive.\n\n"
                    "In this article, we'll explore the essential elements of {topic} "
                    "and provide you with a clear, actionable framework to help you navigate this space effectively. "
                    "Let's dive in."
                ),
            },
        ],
    },
    "product_description": {
        "templates": [
            {
                "name": "Benefit-Focused",
                "pattern": r"(?:benefit|help|improve|save|better|enhance|boost)",
                "template": (
                    "Introducing {topic} — the solution you've been waiting for.\n\n"
                    "Designed with you in mind, {topic} delivers exceptional results by combining "
                    "cutting-edge technology with user-friendly design. Whether you're looking to "
                    "streamline your workflow or achieve better outcomes, this is the tool that makes it possible.\n\n"
                    "Key Features:\n"
                    "• Intuitive interface that's easy to learn\n"
                    "• Powerful performance that scales with your needs\n"
                    "• Reliable support whenever you need it\n\n"
                    "Experience the difference today."
                ),
            },
            {
                "name": "General Product Description",
                "pattern": None,
                "template": (
                    "Discover {topic} — a premium offering designed to meet your needs.\n\n"
                    "With its innovative approach and attention to detail, {topic} stands out "
                    "in a crowded marketplace. Built for performance and crafted for quality, "
                    "it delivers consistent results you can count on.\n\n"
                    "Key Highlights:\n"
                    "• Professional-grade quality\n"
                    "• Easy to use and integrate\n"
                    "• Backed by excellent support\n\n"
                    "Don't miss out — upgrade your experience today."
                ),
            },
        ],
    },
    "cover_letter": {
        "templates": [
            {
                "name": "General Cover Letter",
                "pattern": None,
                "template": (
                    "Dear Hiring Manager,\n\n"
                    "I am excited to apply for the position related to {topic} at your esteemed organization. "
                    "With my background and passion for this field, I am confident that I would make a valuable "
                    "contribution to your team.\n\n"
                    "Throughout my career, I have developed strong skills in {topic} and a proven track record "
                    "of delivering results. I thrive in collaborative environments and am always eager to take on "
                    "new challenges that push me to grow.\n\n"
                    "I would welcome the opportunity to discuss how my experience and enthusiasm align with your "
                    "team's goals. Thank you for considering my application. I look forward to the possibility "
                    "of contributing to your organization.\n\n"
                    "Sincerely,\n{sender}"
                ),
            },
        ],
    },
    "social_bio": {
        "templates": [
            {
                "name": "Professional Bio",
                "pattern": r"(?:professional|career|work|job|business|company|entrepreneur)",
                "template": (
                    "{sender} | {topic}\n\n"
                    "Passionate about {topic} and dedicated to making an impact. "
                    "Sharing insights, experiences, and ideas. Let's connect and grow together."
                ),
            },
            {
                "name": "Creative Bio",
                "pattern": r"(?:creative|art|design|music|write|content|creator)",
                "template": (
                    "✨ {sender} — {topic}\n\n"
                    "Creating, inspiring, and exploring {topic}. "
                    "Every day is a new canvas. Follow along for the journey."
                ),
            },
            {
                "name": "General Social Bio",
                "pattern": None,
                "template": (
                    "👋 Hi, I'm {sender}! {topic}\n\n"
                    "Passionate, curious, and always learning. "
                    "Follow for updates, insights, and good conversations."
                ),
            },
        ],
    },
    "error_message": {
        "templates": [
            {
                "name": "User-Friendly Error",
                "pattern": r"(?:user|friendly|simple|clear|customer)",
                "template": (
                    "Oops! Something went wrong.\n\n"
                    "We encountered an issue while processing {topic}. This isn't your fault — "
                    "our team has been notified and is working on a fix.\n\n"
                    "What you can do:\n"
                    "• Try refreshing the page\n"
                    "• Check back in a few minutes\n"
                    "• If the problem persists, contact our support team\n\n"
                    "We're sorry for the inconvenience!"
                ),
            },
            {
                "name": "Technical Error",
                "pattern": r"(?:technical|debug|dev|developer|server|system)",
                "template": (
                    "Error: {topic}\n\n"
                    "An unexpected error occurred. Details:\n"
                    "• Error Type: Processing Exception\n"
                    "• Component: {topic}\n"
                    "• Timestamp: {timestamp}\n\n"
                    "Please check the logs for more information or contact the development team."
                ),
            },
            {
                "name": "General Error Message",
                "pattern": None,
                "template": (
                    "Something went wrong.\n\n"
                    "We were unable to process {topic} at this time. "
                    "Please try again later or contact support if the issue continues.\n\n"
                    "Error reference: {ref}"
                ),
            },
        ],
    },
    "technical_doc": {
        "templates": [
            {
                "name": "API Documentation",
                "pattern": r"(?:api|endpoint|rest|http|request|response)",
                "template": (
                    "# {topic}\n\n"
                    "## Overview\n\n"
                    "This document provides technical documentation for {topic}. "
                    "It covers the core functionality, usage patterns, and important considerations "
                    "for implementation.\n\n"
                    "## Getting Started\n\n"
                    "To begin working with {topic}, ensure you have the necessary prerequisites installed. "
                    "Follow the installation guide and configure your environment accordingly.\n\n"
                    "## Key Concepts\n\n"
                    "- **Core Module**: The main component handling primary operations\n"
                    "- **Configuration**: Settings and parameters for customization\n"
                    "- **Error Handling**: Standard error codes and resolution strategies\n\n"
                    "## Usage Examples\n\n"
                    "Refer to the examples below for common use cases and integration patterns.\n\n"
                    "## Notes\n\n"
                    "Last updated: {date}"
                ),
            },
            {
                "name": "General Technical Doc",
                "pattern": None,
                "template": (
                    "# {topic}\n\n"
                    "## Overview\n\n"
                    "This document describes {topic}, including its architecture, components, "
                    "and usage guidelines. It is intended for developers and technical stakeholders.\n\n"
                    "## Architecture\n\n"
                    "The system follows a modular design with clearly separated concerns. "
                    "Each component is responsible for a specific aspect of the overall functionality.\n\n"
                    "## Components\n\n"
                    "1. **Core Engine**: Handles primary processing logic\n"
                    "2. **Interface Layer**: Manages input/output operations\n"
                    "3. **Configuration Manager**: Stores and retrieves settings\n\n"
                    "## Best Practices\n\n"
                    "- Follow the established coding conventions\n"
                    "- Write comprehensive tests for new features\n"
                    "- Document all public APIs and interfaces\n\n"
                    "Last updated: {date}"
                ),
            },
        ],
    },
}


def _generate_text(prompt, text_type, sender_name="User"):
    """Generate text using template-based approach."""
    if text_type not in TEXT_TEMPLATES:
        raise ValueError(f"Unsupported text type: {text_type}. Supported: {', '.join(TEXT_TEMPLATES.keys())}")

    templates = TEXT_TEMPLATES[text_type]["templates"]

    # Try to find a matching template based on prompt content
    selected = templates[-1]  # default to last (general) template
    for tpl in templates:
        if tpl["pattern"] and re.search(tpl["pattern"], prompt, re.IGNORECASE):
            selected = tpl
            break

    template = selected["template"]
    topic = prompt.strip()

    # Extract sender name from prompt if mentioned
    name_match = re.search(r'(?:my name is|i am|i\'m)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', prompt, re.IGNORECASE)
    if name_match:
        sender_name = name_match.group(1)

    # Extract recipient
    recipient_match = re.search(r'(?:dear|to|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', prompt, re.IGNORECASE)
    recipient = recipient_match.group(1) if recipient_match else "Team"

    from datetime import datetime
    date_str = datetime.now().strftime("%B %d, %Y")
    ref = hashlib.md5(prompt.encode()).hexdigest()[:8].upper()

    try:
        result = template.format(
            topic=topic,
            sender=sender_name,
            recipient=recipient,
            timestamp=datetime.now().isoformat(),
            date=date_str,
            ref=ref,
        )
    except KeyError:
        result = template.format(
            topic=topic,
            sender=sender_name,
            recipient=recipient,
            timestamp="",
            date="",
            ref="",
        )

    return {
        "generated_text": result,
        "template_used": selected["name"],
        "type": text_type,
    }


@ai_tools_bp.route("/text-generator", methods=["GET"])
def text_generator_page():
    return render_template("tools/text-generator.html")


@ai_tools_bp.route("/text-generator/generate", methods=["POST"])
def text_generator_api():
    try:
        data = request.get_json(silent=True) or {}
        prompt = data.get("prompt", "")
        text_type = data.get("type", "email").strip().lower()
        sender_name = data.get("sender_name", "User").strip()

        if not prompt.strip():
            return jsonify({"status": "error", "message": "No prompt/context provided."})

        valid_types = list(TEXT_TEMPLATES.keys())
        if text_type not in valid_types:
            return jsonify({"status": "error", "message": f"Invalid type: {text_type}. Supported: {', '.join(valid_types)}"})

        result = _generate_text(prompt, text_type, sender_name)

        log_tool_usage("text-generator", "generate", f"type={text_type}, prompt_len={len(prompt)}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except ValueError as e:
        return jsonify({"status": "error", "message": str(e)})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 4. Sentiment Analyzer (Offline — Word-list approach)
# =========================================================================

POSITIVE_WORDS = {
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love',
    'happy', 'joy', 'beautiful', 'best', 'perfect', 'brilliant', 'outstanding', 'superb',
    'magnificent', 'pleased', 'delighted', 'glad', 'cheerful', 'satisfied', 'enjoy',
    'enjoyed', 'enjoying', 'like', 'liked', 'likes', 'nice', 'fine', 'pleasant',
    'comfortable', 'impressive', 'remarkable', 'incredible', 'marvelous', 'splendid',
    'terrific', 'fabulous', 'extraordinary', 'positive', 'success', 'successful',
    'recommend', 'recommended', 'helpful', 'valuable', 'worth', 'worthy', 'superior',
    'exceptional', 'quality', 'reliable', 'efficient', 'effective', 'powerful',
    'innovative', 'exciting', 'fascinating', 'inspiring', 'motivating', 'encouraging',
    'warm', 'friendly', 'kind', 'generous', 'caring', 'thoughtful', 'polite',
    'grateful', 'thankful', 'blessed', 'fortunate', 'lucky', 'proud', 'confident',
    'optimistic', 'hopeful', 'enthusiastic', 'passionate', 'energetic', 'vibrant',
    'elegant', 'gorgeous', 'stunning', 'charming', 'attractive', 'appealing',
    'smooth', 'easy', 'simple', 'convenient', 'fast', 'quick', 'rapid',
    'strong', 'solid', 'stable', 'secure', 'safe', 'protected',
    'fresh', 'clean', 'clear', 'bright', 'smart', 'clever', 'wise',
    'accomplished', 'achieve', 'advance', 'benefit', 'celebrate', 'triumph',
    'win', 'winning', 'progress', 'improve', 'improved', 'growth', 'thriving',
    'paradise', 'bliss', 'peaceful', 'serene', 'calm', 'relax', 'refreshing',
    'fun', 'entertaining', 'engaging', 'interesting', 'informative', 'educational',
}

NEGATIVE_WORDS = {
    'bad', 'terrible', 'horrible', 'awful', 'worst', 'poor', 'hate', 'dislike',
    'ugly', 'disgusting', 'nasty', 'dreadful', 'miserable', 'painful', 'suffering',
    'sad', 'unhappy', 'angry', 'furious', 'annoyed', 'frustrated', 'disappointed',
    'boring', 'dull', 'tedious', 'tiresome', 'exhausting', 'stressed', 'anxious',
    'worried', 'afraid', 'scared', 'fearful', 'terrified', 'nervous', 'uneasy',
    'fail', 'failed', 'failure', 'mistake', 'error', 'wrong', 'broken', 'damaged',
    'defective', 'flawed', 'weak', 'slow', 'difficult', 'hard', 'complicated',
    'confusing', 'unclear', 'messy', 'chaotic', 'disorganized', 'waste', 'wasted',
    'useless', 'worthless', 'pointless', 'meaningless', 'ridiculous', 'absurd',
    'stupid', 'foolish', 'idiotic', 'ignorant', 'arrogant', 'rude', 'mean',
    'cruel', 'harsh', 'violent', 'aggressive', 'hostile', 'toxic', 'negative',
    'problem', 'issue', 'trouble', 'concern', 'risk', 'danger', 'threat', 'crisis',
    'loss', 'damage', 'harm', 'hurt', 'injury', 'pain', 'death', 'destroy',
    'ruined', 'corrupt', 'fraud', 'scam', 'lie', 'fake', 'false', 'cheat',
    'betray', 'abandon', 'neglect', 'ignore', 'reject', 'deny', 'refuse',
    'complaint', 'criticism', 'blame', 'guilt', 'shame', 'embarrass', 'humiliate',
    'regret', 'sorry', 'unfortunately', 'disaster', 'catastrophe', 'nightmare',
    'horror', 'tragedy', 'pathetic', 'lousy', 'inferior', 'mediocre', 'subpar',
    'expensive', 'overpriced', 'cheap', 'low-quality', 'deficiency', 'lack',
    'unreliable', 'unstable', 'inconsistent', 'unpredictable', 'buggy', 'crash',
}

INTENSIFIERS = {
    'very': 1.5, 'extremely': 2.0, 'incredibly': 2.0, 'absolutely': 2.0,
    'really': 1.4, 'truly': 1.5, 'highly': 1.6, 'so': 1.3, 'particularly': 1.5,
    'especially': 1.5, 'exceptionally': 1.8, 'remarkably': 1.7, 'quite': 1.2,
    'rather': 1.1, 'somewhat': 0.8, 'slightly': 0.6, 'barely': 0.4,
    'terribly': 1.6, 'awfully': 1.5, 'super': 1.5, 'totally': 1.8,
    'utterly': 1.9, 'completely': 1.8, 'thoroughly': 1.6, 'deeply': 1.5,
}

NEGATORS = {'not', "n't", 'no', 'never', 'neither', 'nobody', 'nothing', 'nowhere', 'nor', 'cannot', "don't", "doesn't", "didn't", "won't", "wouldn't", "couldn't", "shouldn't", "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't", "hadn't"}

EMOTION_LEXICON = {
    "joy": {"happy", "joy", "joyful", "cheerful", "delighted", "glad", "pleased", "excited",
            "thrilled", "elated", "ecstatic", "blissful", "content", "satisfied", "grateful",
            "thankful", "blessed", "fun", "enjoy", "love", "loved", "loving", "wonderful",
            "great", "fantastic", "awesome", "celebrate", "laugh", "smile", "play"},
    "anger": {"angry", "furious", "rage", "outraged", "mad", "irritated", "annoyed",
              "frustrated", "hostile", "aggressive", "hate", "hatred", "resent",
              "bitter", "enraged", "infuriated", "livid", "disgusted"},
    "sadness": {"sad", "unhappy", "depressed", "miserable", "gloomy", "heartbroken",
                "sorrowful", "melancholy", "grief", "lonely", "hopeless", "despair",
                "crying", "tears", "loss", "miss", "missing", "regret", "mourn"},
    "surprise": {"surprise", "surprised", "shocked", "amazed", "astonished", "stunned",
                 "unexpected", "unbelievable", "incredible", "remarkable", "wow", "omg"},
    "fear": {"fear", "afraid", "scared", "terrified", "frightened", "anxious", "worried",
             "nervous", "panic", "horror", "dread", "phobia", "threatened", "uneasy",
             "alarmed", "paranoid", "spooked"},
    "disgust": {"disgust", "disgusting", "gross", "revolting", "repulsive", "nauseating",
                "vile", "foul", "nasty", "repugnant", "sickening", "loathsome"},
}


def _analyze_sentiment(text):
    """Analyze sentiment using word-list approach with intensifiers and negators."""
    words = re.findall(r"\b[a-zA-Z']+\b", text.lower())
    total_words = len(words)

    if total_words == 0:
        return {
            "sentiment": "neutral", "score": 0.0, "confidence": 0.0,
            "positive_count": 0, "negative_count": 0, "neutral_count": 0,
            "emotions": {}, "details": [],
        }

    positive_score = 0.0
    negative_score = 0.0
    details = []
    seen_details = set()

    # Track emotions
    emotion_counts = {e: 0 for e in EMOTION_LEXICON}

    for i, word in enumerate(words):
        # Check intensifiers before the word
        intensifier = 1.0
        prev_words = words[max(0, i - 2):i]
        negated = False
        for pw in prev_words:
            if pw in INTENSIFIERS:
                intensifier = INTENSIFIERS[pw]
            if pw in NEGATORS:
                negated = True

        # Score positive words
        if word in POSITIVE_WORDS:
            score = 1.0 * intensifier
            if negated:
                negative_score += score
                label = f"NOT {word} (negated positive)"
            else:
                positive_score += score
                label = word
            if label not in seen_details:
                details.append({"word": word, "type": "positive", "negated": negated, "intensified": intensifier > 1.0})
                seen_details.add(label)

        # Score negative words
        if word in NEGATIVE_WORDS:
            score = 1.0 * intensifier
            if negated:
                positive_score += score * 0.5  # Negated negative is partially positive
                label = f"NOT {word} (negated negative)"
            else:
                negative_score += score
                label = word
            if label not in seen_details:
                details.append({"word": word, "type": "negative", "negated": negated, "intensified": intensifier > 1.0})
                seen_details.add(label)

        # Detect emotions
        for emotion, lexicon in EMOTION_LEXICON.items():
            if word in lexicon:
                emotion_counts[emotion] += 1

    total_score = positive_score - negative_score
    max_possible = max(positive_score + negative_score, 1)

    # Normalize to -1 to 1 scale
    normalized = total_score / max_possible if max_possible > 0 else 0

    # Determine sentiment label
    if normalized > 0.15:
        sentiment = "positive"
    elif normalized < -0.15:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    # Confidence: how much of the text is sentiment-bearing
    sentiment_words = len(seen_details)
    confidence = min(1.0, sentiment_words / max(total_words * 0.1, 1))
    confidence = round(confidence * 100) / 100

    # Emotion breakdown
    emotions = {}
    total_emotion_hits = sum(emotion_counts.values())
    for emotion, count in emotion_counts.items():
        if count > 0:
            pct = round((count / max(total_words, 1)) * 100, 1)
            emotions[emotion] = {
                "count": count,
                "percentage": pct,
                "level": "high" if pct > 5 else "moderate" if pct > 2 else "low",
            }

    return {
        "sentiment": sentiment,
        "score": round(normalized, 4),
        "confidence": confidence,
        "positive_score": round(positive_score, 2),
        "negative_score": round(negative_score, 2),
        "positive_count": sum(1 for d in details if d["type"] == "positive" and not d["negated"]),
        "negative_count": sum(1 for d in details if d["type"] == "negative" and not d["negated"]),
        "negated_count": sum(1 for d in details if d["negated"]),
        "emotions": emotions,
        "details": details[:30],
        "word_count": total_words,
    }


@ai_tools_bp.route("/sentiment-analyzer", methods=["GET"])
def sentiment_analyzer_page():
    return render_template("tools/sentiment-analyzer.html")


@ai_tools_bp.route("/sentiment-analyzer/analyze", methods=["POST"])
def sentiment_analyzer_api():
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")

        if not text.strip():
            return jsonify({"status": "error", "message": "No text provided."})

        result = _analyze_sentiment(text)

        log_tool_usage("sentiment-analyzer", "analyze", f"sentiment={result['sentiment']}, words={result['word_count']}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 5. Text Similarity Checker
# =========================================================================

def _get_word_vector(text):
    """Create a word frequency vector from text."""
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    return Counter(words)


def _cosine_similarity(vec1, vec2):
    """Calculate cosine similarity between two word frequency vectors."""
    # Get all unique words
    all_words = set(vec1.keys()) | set(vec2.keys())

    # Calculate dot product and magnitudes
    dot_product = sum(vec1.get(w, 0) * vec2.get(w, 0) for w in all_words)
    mag1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
    mag2 = math.sqrt(sum(v ** 2 for v in vec2.values()))

    if mag1 == 0 or mag2 == 0:
        return 0.0

    return dot_product / (mag1 * mag2)


def _jaccard_similarity(text1, text2):
    """Calculate Jaccard similarity between two texts (word sets)."""
    words1 = set(re.findall(r'\b[a-zA-Z]+\b', text1.lower()))
    words2 = set(re.findall(r'\b[a-zA-Z]+\b', text2.lower()))

    intersection = words1 & words2
    union = words1 | words2

    if not union:
        return 0.0

    return len(intersection) / len(union)


def _compare_texts(text1, text2):
    """Compare two texts and return similarity metrics."""
    vec1 = _get_word_vector(text1)
    vec2 = _get_word_vector(text2)

    set1 = set(vec1.keys())
    set2 = set(vec2.keys())

    common_words = sorted(set1 & set2)
    unique_to_text1 = sorted(set1 - set2)
    unique_to_text2 = sorted(set2 - set1)

    jaccard = _jaccard_similarity(text1, text2)
    cosine = _cosine_similarity(vec1, vec2)

    # Overall similarity as average of Jaccard and cosine, scaled to 0-100
    overall = round(((jaccard + cosine) / 2) * 100, 1)

    # Find matching phrases (3-word sequences)
    def get_ngrams(text, n=3):
        words = re.findall(r'\b\w+\b', text.lower())
        return set(tuple(words[i:i+n]) for i in range(len(words) - n + 1))

    ngrams1 = get_ngrams(text1)
    ngrams2 = get_ngrams(text2)
    matching_phrases = ngrams1 & ngrams2
    phrase_matches = [' '.join(p) for p in sorted(matching_phrases)]

    return {
        "overall_similarity": overall,
        "jaccard_similarity": round(jaccard * 100, 1),
        "cosine_similarity": round(cosine * 100, 1),
        "common_words": common_words[:50],
        "common_word_count": len(common_words),
        "unique_to_text1": unique_to_text1[:30],
        "unique_to_text1_count": len(unique_to_text1),
        "unique_to_text2": unique_to_text2[:30],
        "unique_to_text2_count": len(unique_to_text2),
        "matching_phrases": phrase_matches[:20],
        "matching_phrase_count": len(phrase_matches),
        "text1_word_count": sum(vec1.values()),
        "text2_word_count": sum(vec2.values()),
    }


@ai_tools_bp.route("/text-similarity", methods=["GET"])
def text_similarity_page():
    return render_template("tools/text-similarity.html")


@ai_tools_bp.route("/text-similarity/compare", methods=["POST"])
def text_similarity_compare_api():
    try:
        data = request.get_json(silent=True) or {}
        text1 = data.get("text1", "")
        text2 = data.get("text2", "")

        if not text1.strip() or not text2.strip():
            return jsonify({"status": "error", "message": "Both texts are required."})

        result = _compare_texts(text1, text2)

        log_tool_usage("text-similarity", "compare", f"similarity={result['overall_similarity']}%")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 6. Keyword Extractor (Offline — TF-IDF-like)
# =========================================================================

def _extract_keywords(text, top_n=20):
    """Extract keywords using TF-IDF-like scoring with phrase detection."""
    # Tokenize
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    total_words = len(words)

    if total_words == 0:
        return []

    # Calculate word frequency (TF)
    word_freq = Counter(words)

    # Remove stop words
    filtered_freq = {w: f for w, f in word_freq.items() if w not in STOP_WORDS and len(w) > 2}

    # Approximate IDF: penalize very common words
    # Words appearing in many contexts get lower IDF (we use word length and frequency as proxy)
    avg_freq = sum(word_freq.values()) / len(word_freq) if word_freq else 1
    idf_weights = {}
    for word, freq in filtered_freq.items():
        # Inverse document frequency approximation:
        # rarer words get higher IDF; very common words get lower IDF
        doc_freq_proxy = freq / total_words
        idf = math.log(1 + total_words / max(freq, 1))
        idf_weights[word] = idf

    # Score words: TF * IDF
    word_scores = {}
    for word, freq in filtered_freq.items():
        tf = freq / total_words
        idf = idf_weights.get(word, 1.0)
        word_scores[word] = round(tf * idf, 6)

    # Bigrams
    bigrams = Counter(tuple(words[i:i+2]) for i in range(len(words) - 1))
    bigram_scores = {}
    for bg, freq in bigrams.items():
        if any(w in STOP_WORDS for w in bg):
            continue
        if len(bg) == 2 and bg[0] == bg[1]:
            continue
        tf = freq / max(len(words) - 1, 1)
        idf = math.log(1 + total_words / max(freq, 1))
        bigram_scores[' '.join(bg)] = round(tf * idf * 1.5, 6)  # Boost bigrams

    # Trigrams
    trigrams = Counter(tuple(words[i:i+3]) for i in range(len(words) - 2))
    trigram_scores = {}
    for tg, freq in trigrams.items():
        if any(w in STOP_WORDS for w in tg):
            continue
        tf = freq / max(len(words) - 2, 1)
        idf = math.log(1 + total_words / max(freq, 1))
        trigram_scores[' '.join(tg)] = round(tf * idf * 2.0, 6)  # Boost trigrams more

    # Combine all scores
    all_keywords = {}

    for word, score in word_scores.items():
        all_keywords[word] = {"keyword": word, "score": score, "type": "unigram", "frequency": filtered_freq.get(word, 0)}

    for phrase, score in bigram_scores.items():
        # Don't add bigram if both words already scored high individually and bigram is low
        all_keywords[phrase] = {"keyword": phrase, "score": score, "type": "bigram", "frequency": bigrams.get(tuple(phrase.split()), 0)}

    for phrase, score in trigram_scores.items():
        all_keywords[phrase] = {"keyword": phrase, "score": score, "type": "trigram", "frequency": trigrams.get(tuple(phrase.split()), 0)}

    # Sort by score and return top N
    sorted_keywords = sorted(all_keywords.values(), key=lambda x: x["score"], reverse=True)

    return sorted_keywords[:top_n]


@ai_tools_bp.route("/keyword-extractor", methods=["GET"])
def keyword_extractor_page():
    return render_template("tools/keyword-extractor.html")


@ai_tools_bp.route("/keyword-extractor/extract", methods=["POST"])
def keyword_extractor_api():
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")
        top_n = data.get("top_n", 20)

        if not text.strip():
            return jsonify({"status": "error", "message": "No text provided."})

        top_n = int(top_n)
        if top_n < 1 or top_n > 100:
            top_n = 20

        keywords = _extract_keywords(text, top_n)

        log_tool_usage("keyword-extractor", "extract", f"keywords_found={len(keywords)}, input_words={len(re.findall(r'\b\w+\b', text))}")

        return jsonify({
            "status": "success",
            "data": {
                "keywords": keywords,
                "total_keywords": len(keywords),
                "input_word_count": len(re.findall(r'\b\w+\b', text)),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 7. Grammar Checker (Basic — Rule-based)
# =========================================================================

COMMON_MISSPELLINGS = {
    "teh": "the", "adn": "and", "taht": "that", "htis": "this", "wiht": "with",
    "fro": "for", "ot": "to", " teh ": " the ", "abuot": "about", "acn": "can",
    "ahve": "have", "ahs": "has", "alos": "also", "amke": "make", "anbd": "and",
    "beleive": "believe", "calender": "calendar", "definately": "definitely",
    "goverment": "government", "happend": "happened", "heigth": "height",
    "humourous": "humorous", "independant": "independent", "knowlege": "knowledge",
    "liek": "like", "libary": "library", "maintenence": "maintenance", "neccesary": "necessary",
    "occurr": "occur", "paralel": "parallel", "privlige": "privilege",
    "recieve": "receive", "seperate": "separate", "suprise": "surprise",
    "tommorow": "tomorrow", "untill": "until", "wierd": "weird",
    "accross": "across", "agressive": "aggressive", "arguement": "argument",
    "begining": "beginning", "belevie": "believe", "cameraman": "cameraman",
    "catagory": "category", "collegue": "colleague", "commited": "committed",
    "concious": "conscious", "curiousity": "curiosity", "disapear": "disappear",
    "dissapear": "disappear", "enviroment": "environment", "excellant": "excellent",
    "expirience": "experience", "facinate": "fascinate", "gaurd": "guard",
    "grammer": "grammar", "grevious": "grievous", "harrass": "harass",
    "humerous": "humorous", "immediatly": "immediately", "incase": "in case",
    "intelligance": "intelligence", "interupt": "interrupt", "judgement": "judgment",
    "kernal": "kernel", "manuever": "maneuver", "medival": "medieval",
    "memento": "memento", "millenium": "millennium", "minature": "miniature",
    "mischievious": "mischievous", "mispell": "misspell", "natrual": "natural",
    "neccessary": "necessary", "noticable": "noticeable", "ocasion": "occasion",
    "offically": "officially", "opeing": "opening", "parliment": "parliament",
    "percieve": "perceive", "politican": "politician", "possable": "possible",
    "practicly": "practically", "prefered": "preferred", "previouly": "previously",
    "priviledge": "privilege", "procede": "proceed", "progam": "program",
    "pronounciation": "pronunciation", "publically": "publicly",
    "questionaire": "questionnaire", "realy": "really", "reccomend": "recommend",
    "refered": "referred", "religous": "religious", "rember": "remember",
    "restraunt": "restaurant", "rythm": "rhythm", "saftey": "safety",
    "scheduele": "schedule", "scisors": "scissors", "seige": "siege",
    "sence": "sense", "sentance": "sentence", "sieze": "seize",
    "similiar": "similar", "speach": "speech", "strenght": "strength",
    "succesful": "successful", "sucess": "success", "suficient": "sufficient",
    "supercede": "supersede", "temparature": "temperature", "tendancey": "tendency",
    "therfore": "therefore", "threshhold": "threshold", "tomarrow": "tomorrow",
    "tounge": "tongue", "truely": "truly", "tyrany": "tyranny",
    "underate": "underrate", "unfortunatly": "unfortunately", "untill": "until",
    "usible": "usable", "utilies": "utilities", "vaccum": "vacuum",
    "vegatable": "vegetable", "visious": "vicious", "warrent": "warrant",
    "wensday": "Wednesday", "whereever": "wherever", "wich": "which",
    "writting": "writing", "yello": "yellow", "acheive": "achieve",
}

HOMOPHONE_RULES = [
    (r'\btheir\b(?!\s+(?:own|house|home|car|way|name|life|business|family))', "their", "their (possessive) — did you mean 'there' (location) or 'they're' (they are)?"),
    (r'\byou\'re\b', "you're", "you're (you are) — check if you meant 'your' (possessive)"),
    (r'\byour\b(?=\s+(?:a|an|the|very|really|so|not|going|doing|being|looking))', "your", "your (possessive) — check if you meant 'you're' (you are)"),
    (r'\bits\b(?=\s+(?:a|an|the|very|not|going|been|important|true|false|about))', "its", "its (possessive) — check if you meant 'it's' (it is)"),
    (r'\bit\'s\b(?=\s+(?:own|name|way|best|worst|first|last))', "it's", "it's (it is) — check if you meant 'its' (possessive)"),
    (r'\baffect\b(?=\s+(?:the|a|an|my|his|her|our|their)\b)', "affect", "affect (verb) — check if you meant 'effect' (noun)"),
    (r'\beffect\b(?=\s+(?:of|on|the|is|was|are|were)\s+\w+\s+(?!\w+ed\b))', "effect", "effect (noun) — check if you meant 'affect' (verb)"),
    (r'\bthen\b(?=\s+\w+\s+(?:went|came|left|arrived|started|finished|decided|chose))', "then", "then (time) — check if you meant 'than' (comparison)"),
    (r'\bthan\b(?=\s+(?:before|after|ever|never|more|less|better|worse|earlier|later))', "than", "than (comparison) — check if you meant 'then' (time)"),
    (r'\bwho\'s\b(?=\s+\s*(?:going|coming|doing|been|being|looking|watching))', "who's", "who's (who is) — check if you meant 'whose' (possessive)"),
    (r'\bwhose\b(?=\s+(?:going|coming|doing|been|being|looking|watching))', "whose", "whose (possessive) — check if you meant 'who's' (who is)"),
    (r'\btoo\b(?=\s+(?:much|many|little|few|big|small|long|short|hot|cold|fast|slow|hard|easy|early|late|far|near|high|low|old|new|good|bad))', "too", "too (excess) — check if you meant 'to' (direction)"),
    (r'\blose\b', "lose", "lose (verb: misplace) — check if you meant 'loose' (adjective: not tight)"),
    (r'\bloose\b(?=\s+(?:weight|money|game|match|battle))', "loose", "loose (adjective: not tight) — check if you meant 'lose' (verb: misplace)"),
    (r'\bselect\b(?=\s+(?:from|of|between|among))', "select", "select (verb) — check if you meant 'choose' or context is correct"),
]


def _check_grammar(text):
    """Run basic grammar checks on text."""
    issues = []
    text_lines = text.split('\n')

    # 1. Double spaces
    double_space_matches = list(re.finditer(r'  +', text))
    for m in double_space_matches[:10]:
        line_num = text[:m.start()].count('\n') + 1
        issues.append({
            "type": "whitespace",
            "rule": "double_space",
            "message": "Multiple consecutive spaces detected",
            "suggestion": "Replace with a single space",
            "position": {"line": line_num, "col": m.start() - text.rfind('\n', 0, m.start())},
            "severity": "minor",
        })

    # 2. Capitalization at start of sentences
    sentences = re.split(r'([.!?]\s+)', text)
    reconstructed = ""
    for i, part in enumerate(sentences):
        reconstructed += part
        if i % 2 == 0 and i + 1 < len(sentences):  # after a sentence ending
            next_part = sentences[i + 1] + sentences[i + 2] if i + 2 < len(sentences) else sentences[i + 1]
            if next_part and next_part[0].strip() and next_part[0].islower():
                issues.append({
                    "type": "capitalization",
                    "rule": "sentence_start_capitalization",
                    "message": f"Sentence does not start with a capital letter: '{next_part[:30]}...'",
                    "suggestion": f"Capitalize: {next_part[0].upper()}{next_part[1:]}",
                    "severity": "minor",
                })

    # 3. Homophone errors
    for pattern, word, suggestion in HOMOPHONE_RULES:
        for m in re.finditer(pattern, text):
            line_num = text[:m.start()].count('\n') + 1
            issues.append({
                "type": "homophone",
                "rule": f"possible_{word}_confusion",
                "message": f"Possible homophone error: '{word}'",
                "suggestion": suggestion,
                "position": {"line": line_num},
                "severity": "warning",
            })

    # 4. Common misspellings
    lower_text = text.lower()
    for misspelling, correction in COMMON_MISSPELLINGS.items():
        idx = lower_text.find(misspelling)
        if idx != -1:
            line_num = text[:idx].count('\n') + 1
            issues.append({
                "type": "spelling",
                "rule": "common_misspelling",
                "message": f"Possible misspelling: '{misspelling}'",
                "suggestion": f"Did you mean '{correction}'?",
                "position": {"line": line_num},
                "severity": "minor",
            })

    # 5. Punctuation: missing period at end
    for i, line in enumerate(text_lines):
        stripped = line.strip()
        if stripped and len(stripped) > 20 and stripped[-1] not in '.!?':
            issues.append({
                "type": "punctuation",
                "rule": "missing_end_punctuation",
                "message": f"Line {i+1} may be missing end punctuation",
                "suggestion": "Add a period, question mark, or exclamation mark at the end",
                "position": {"line": i + 1},
                "severity": "minor",
            })

    # 6. Double punctuation
    double_punct = list(re.finditer(r'[.!?]{2,}', text))
    for m in double_punct[:5]:
        line_num = text[:m.start()].count('\n') + 1
        issues.append({
            "type": "punctuation",
            "rule": "double_punctuation",
            "message": "Double punctuation detected",
            "suggestion": f"Use a single punctuation mark instead of '{m.group()}'",
            "position": {"line": line_num},
            "severity": "minor",
        })

    # 7. Passive voice detection
    passive_patterns = [
        r'\b(?:was|were|is|are|been|being)\s+(?:being\s+)?(\w+ed)\b',
        r'\b(?:was|were|is|are|been|being)\s+being\s+(\w+en)\b',
    ]
    for pattern in passive_patterns:
        for m in re.finditer(pattern, text):
            line_num = text[:m.start()].count('\n') + 1
            issues.append({
                "type": "style",
                "rule": "passive_voice",
                "message": f"Possible passive voice: '{m.group()}'",
                "suggestion": "Consider rewriting in active voice for clarity",
                "position": {"line": line_num},
                "severity": "suggestion",
            })

    # 8. Repeated words
    repeated = list(re.finditer(r'\b(\w+)\s+\1\b', text, re.IGNORECASE))
    for m in repeated[:5]:
        word = m.group(1)
        if word.lower() not in STOP_WORDS:
            line_num = text[:m.start()].count('\n') + 1
            issues.append({
                "type": "style",
                "rule": "repeated_word",
                "message": f"Repeated word: '{word} {word}'",
                "suggestion": f"Remove the duplicate '{word}'",
                "position": {"line": line_num},
                "severity": "minor",
            })

    # Count by severity
    severity_counts = Counter(issue["severity"] for issue in issues)

    return {
        "issues": issues,
        "total_issues": len(issues),
        "by_severity": dict(severity_counts),
        "by_type": dict(Counter(issue["type"] for issue in issues)),
        "grammar_score": max(0, 100 - len(issues) * 3),
    }


@ai_tools_bp.route("/grammar-checker", methods=["GET"])
def grammar_checker_page():
    return render_template("tools/grammar-checker.html")


@ai_tools_bp.route("/grammar-checker/check", methods=["POST"])
def grammar_checker_api():
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")

        if not text.strip():
            return jsonify({"status": "error", "message": "No text provided."})

        result = _check_grammar(text)

        log_tool_usage("grammar-checker", "check", f"issues={result['total_issues']}, score={result['grammar_score']}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 8. Plagiarism Detector (Offline — Structural)
# =========================================================================

def _get_ngrams(text, n):
    """Get n-grams from text as a list."""
    words = re.findall(r'\b\w+\b', text.lower())
    if len(words) < n:
        return []
    return [tuple(words[i:i+n]) for i in range(len(words) - n + 1)]


def _ngram_overlap(text1, text2, n):
    """Calculate n-gram overlap between two texts."""
    ngrams1 = set(_get_ngrams(text1, n))
    ngrams2 = set(_get_ngrams(text2, n))

    if not ngrams1 or not ngrams2:
        return 0.0, []

    overlap = ngrams1 & ngrams2
    union = ngrams1 | ngrams2

    similarity = len(overlap) / len(union) if union else 0.0
    matching_ngrams = [' '.join(ng) for ng in sorted(overlap)]

    return similarity, matching_ngrams


def _longest_common_substring(s1, s2):
    """Find the longest common substring between two strings."""
    s1 = s1.lower()
    s2 = s2.lower()
    m, n = len(s1), len(s2)
    if m == 0 or n == 0:
        return ""

    # Use dynamic programming approach
    max_len = 0
    end_idx = 0

    # Use a rolling array for memory efficiency
    prev = [0] * (n + 1)
    for i in range(1, m + 1):
        curr = [0] * (n + 1)
        for j in range(1, n + 1):
            if s1[i-1] == s2[j-1]:
                curr[j] = prev[j-1] + 1
                if curr[j] > max_len:
                    max_len = curr[j]
                    end_idx = i
        prev = curr

    return s1[end_idx - max_len:end_idx]


def _find_matching_passages(text1, text2, min_length=20):
    """Find matching passages between two texts."""
    words1 = re.findall(r'\b\w+\b', text1.lower())
    words2 = re.findall(r'\b\w+\b', text2.lower())

    if not words1 or not words2:
        return []

    # Convert to strings for comparison
    s1 = ' '.join(words1)
    s2 = ' '.join(words2)

    matches = []
    window = max(min_length, 10)

    # Slide window over text1 and search in text2
    s1_words = words1
    s2_str = s2

    for start in range(0, len(s1_words) - window + 1, max(1, window // 2)):
        chunk = ' '.join(s1_words[start:start + window])
        if chunk in s2_str:
            matches.append({
                "passage": chunk,
                "length": len(chunk.split()),
                "source": "text1",
            })

    # Also check from text2's perspective
    s2_words = words2
    s1_str = s1

    for start in range(0, len(s2_words) - window + 1, max(1, window // 2)):
        chunk = ' '.join(s2_words[start:start + window])
        if chunk in s1_str:
            # Avoid duplicates
            if not any(m["passage"] == chunk for m in matches):
                matches.append({
                    "passage": chunk,
                    "length": len(chunk.split()),
                    "source": "text2",
                })

    return matches


def _detect_plagiarism(text1, text2):
    """Detect structural similarity between two texts."""
    # N-gram analysis for various n sizes
    trigram_sim, trigram_matches = _ngram_overlap(text1, text2, 3)
    fourgram_sim, fourgram_matches = _ngram_overlap(text1, text2, 4)
    fivegram_sim, fivegram_matches = _ngram_overlap(text1, text2, 5)

    # Word-level Jaccard
    words1 = set(re.findall(r'\b\w+\b', text1.lower()))
    words2 = set(re.findall(r'\b\w+\b', text2.lower()))
    jaccard = len(words1 & words2) / len(words1 | words2) if (words1 | words2) else 0.0

    # Cosine similarity
    vec1 = _get_word_vector(text1)
    vec2 = _get_word_vector(text2)
    cosine = _cosine_similarity(vec1, vec2)

    # Longest common substring
    lcs = _longest_common_substring(text1, text2)
    lcs_words = len(lcs.split()) if lcs else 0
    avg_len = (len(re.findall(r'\b\w+\b', text1)) + len(re.findall(r'\b\w+\b', text2))) / 2

    # Structural similarity (sentence-level)
    sentences1 = set(re.findall(r'[^.!?]+[.!?]', text1.lower().strip()))
    sentences2 = set(re.findall(r'[^.!?]+[.!?]', text2.lower().strip()))
    sentence_overlap = len(sentences1 & sentences2) / max(len(sentences1 | sentences2), 1)

    # Find matching passages
    matching_passages = _find_matching_passages(text1, text2, min_length=15)

    # Overall similarity score (weighted average)
    # For short texts where n-grams can't form, rely more on Jaccard/cosine/LCS
    has_ngrams = trigram_sim > 0 or fourgram_sim > 0 or fivegram_sim > 0
    if has_ngrams:
        overall = round((
            0.15 * jaccard +
            0.15 * cosine +
            0.15 * trigram_sim +
            0.20 * fourgram_sim +
            0.15 * fivegram_sim +
            0.10 * sentence_overlap +
            0.10 * (lcs_words / max(avg_len, 1))
        ) * 100, 1)
    else:
        # Short text fallback: rely on word-level metrics
        lcs_ratio = lcs_words / max(avg_len, 1)
        overall = round((
            0.30 * jaccard +
            0.30 * cosine +
            0.25 * lcs_ratio +
            0.15 * sentence_overlap
        ) * 100, 1)

    # Determine risk level
    if overall >= 60:
        risk = "high"
        description = "Significant structural similarity detected. The texts share considerable content."
    elif overall >= 35:
        risk = "medium"
        description = "Moderate similarity detected. Some shared phrases and structure found."
    elif overall >= 15:
        risk = "low"
        description = "Minor similarity detected. Some common phrases or word overlap exists."
    else:
        risk = "minimal"
        description = "Very low similarity. The texts appear to be substantially different."

    return {
        "overall_similarity": min(overall, 100),
        "risk_level": risk,
        "description": description,
        "jaccard_similarity": round(jaccard * 100, 1),
        "cosine_similarity": round(cosine * 100, 1),
        "trigram_similarity": round(trigram_sim * 100, 1),
        "fourgram_similarity": round(fourgram_sim * 100, 1),
        "fivegram_similarity": round(fivegram_sim * 100, 1),
        "sentence_overlap": round(sentence_overlap * 100, 1),
        "longest_common_substring": lcs,
        "lcs_word_count": lcs_words,
        "matching_passages": matching_passages[:20],
        "matching_passage_count": len(matching_passages),
        "sample_ngram_matches": (trigram_matches + fourgram_matches)[:15],
    }


@ai_tools_bp.route("/plagiarism-checker", methods=["GET"])
def plagiarism_checker_page():
    return render_template("tools/plagiarism-checker.html")


@ai_tools_bp.route("/plagiarism-checker/check", methods=["POST"])
def plagiarism_checker_api():
    try:
        data = request.get_json(silent=True) or {}
        text1 = data.get("text1", "")
        text2 = data.get("text2", "")

        if not text1.strip() or not text2.strip():
            return jsonify({"status": "error", "message": "Both texts are required."})

        result = _detect_plagiarism(text1, text2)

        log_tool_usage("plagiarism-checker", "check", f"similarity={result['overall_similarity']}%, risk={result['risk_level']}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 9. Text Translator (Offline — Dictionary-based)
# =========================================================================

TRANSLATION_DICTIONARIES = {
    "en-es": {
        "hello": "hola", "goodbye": "adiós", "please": "por favor", "thank you": "gracias",
        "thanks": "gracias", "yes": "sí", "no": "no", "good morning": "buenos días",
        "good afternoon": "buenas tardes", "good night": "buenas noches", "good evening": "buenas noches",
        "how are you": "cómo estás", "i am fine": "estoy bien", "my name is": "me llamo",
        "what is": "qué es", "where is": "dónde está", "i want": "quiero", "i need": "necesito",
        "i like": "me gusta", "i love": "amo", "i think": "creo", "i know": "sé",
        "water": "agua", "food": "comida", "bread": "pan", "milk": "leche", "coffee": "café",
        "tea": "té", "meat": "carne", "fish": "pescado", "chicken": "pollo",
        "rice": "arroz", "salt": "sal", "sugar": "azúcar", "egg": "huevo",
        "apple": "manzana", "orange": "naranja", "banana": "plátano", "grape": "uva",
        "house": "casa", "home": "hogar", "door": "puerta", "window": "ventana",
        "table": "mesa", "chair": "silla", "bed": "cama", "room": "habitación",
        "kitchen": "cocina", "bathroom": "baño", "garden": "jardín", "street": "calle",
        "city": "ciudad", "country": "país", "school": "escuela", "hospital": "hospital",
        "church": "iglesia", "market": "mercado", "store": "tienda", "restaurant": "restaurante",
        "book": "libro", "pen": "bolígrafo", "paper": "papel", "computer": "computadora",
        "phone": "teléfono", "car": "coche", "bus": "autobús", "train": "tren",
        "plane": "avión", "boat": "barco", "bicycle": "bicicleta", "road": "camino",
        "man": "hombre", "woman": "mujer", "child": "niño", "children": "niños",
        "friend": "amigo", "family": "familia", "mother": "madre", "father": "padre",
        "brother": "hermano", "sister": "hermana", "son": "hijo", "daughter": "hija",
        "husband": "esposo", "wife": "esposa", "baby": "bebé", "dog": "perro",
        "cat": "gato", "bird": "pájaro", "horse": "caballo", "cow": "vaca",
        "day": "día", "night": "noche", "week": "semana", "month": "mes",
        "year": "año", "today": "hoy", "tomorrow": "mañana", "yesterday": "ayer",
        "morning": "mañana", "afternoon": "tarde", "evening": "noche",
        "sun": "sol", "moon": "luna", "star": "estrella", "rain": "lluvia",
        "snow": "nieve", "wind": "viento", "fire": "fuego", "earth": "tierra",
        "sea": "mar", "river": "río", "mountain": "montaña", "tree": "árbol",
        "flower": "flor", "sky": "cielo", "world": "mundo", "life": "vida",
        "love": "amor", "happiness": "felicidad", "sadness": "tristeza", "anger": "enojo",
        "fear": "miedo", "hope": "esperanza", "peace": "paz", "war": "guerra",
        "time": "tiempo", "money": "dinero", "work": "trabajo", "business": "negocio",
        "health": "salud", "education": "educación", "science": "ciencia", "art": "arte",
        "music": "música", "color": "color", "red": "rojo", "blue": "azul",
        "green": "verde", "yellow": "amarillo", "white": "blanco", "black": "negro",
        "big": "grande", "small": "pequeño", "hot": "caliente", "cold": "frío",
        "new": "nuevo", "old": "viejo", "good": "bueno", "bad": "malo",
        "fast": "rápido", "slow": "lento", "happy": "feliz", "sad": "triste",
        "beautiful": "hermoso", "ugly": "feo", "strong": "fuerte", "weak": "débil",
        "easy": "fácil", "difficult": "difícil", "important": "importante",
        "the": "el/la/los/las", "and": "y", "but": "pero", "or": "o",
        "with": "con", "without": "sin", "in": "en", "on": "en/encima de",
        "at": "en", "from": "de", "to": "a", "for": "para", "of": "de",
        "i": "yo", "you": "tú/usted", "he": "él", "she": "ella",
        "we": "nosotros", "they": "ellos/ellas", "it": "eso/él/ella",
        "my": "mi", "your": "tu/su", "his": "su", "her": "su",
        "our": "nuestro", "their": "su", "this": "esto/esta", "that": "eso/esa",
        "is": "es/está", "are": "son/están", "was": "era/estaba", "were": "eran/estaban",
        "have": "tener", "has": "tiene", "had": "tenía", "do": "hacer",
        "does": "hace", "did": "hizo", "will": "hará", "would": "haría",
        "can": "puede", "could": "podría", "should": "debería", "must": "debe",
        "not": "no", "very": "muy", "also": "también", "always": "siempre",
        "never": "nunca", "sometimes": "a veces", "here": "aquí", "there": "allí",
        "now": "ahora", "then": "entonces", "why": "por qué", "how": "cómo",
        "all": "todo", "many": "muchos", "some": "algunos", "any": "alguno",
        "more": "más", "less": "menos", "much": "mucho", "too": "demasiado",
    },
    "en-fr": {
        "hello": "bonjour", "goodbye": "au revoir", "please": "s'il vous plaît",
        "thank you": "merci", "thanks": "merci", "yes": "oui", "no": "non",
        "good morning": "bonjour", "good afternoon": "bon après-midi",
        "good night": "bonne nuit", "good evening": "bonsoir",
        "how are you": "comment allez-vous", "i am fine": "je vais bien",
        "my name is": "je m'appelle", "what is": "qu'est-ce que",
        "where is": "où est", "i want": "je veux", "i need": "j'ai besoin de",
        "i like": "j'aime", "i love": "j'aime", "i think": "je pense",
        "water": "eau", "food": "nourriture", "bread": "pain", "milk": "lait",
        "coffee": "café", "tea": "thé", "meat": "viande", "fish": "poisson",
        "chicken": "poulet", "rice": "riz", "salt": "sel", "sugar": "sucre",
        "egg": "œuf", "apple": "pomme", "orange": "orange", "banana": "banane",
        "house": "maison", "home": "foyer", "door": "porte", "window": "fenêtre",
        "table": "table", "chair": "chaise", "bed": "lit", "room": "chambre",
        "kitchen": "cuisine", "bathroom": "salle de bains", "garden": "jardin",
        "street": "rue", "city": "ville", "country": "pays", "school": "école",
        "hospital": "hôpital", "market": "marché", "store": "magasin",
        "restaurant": "restaurant", "book": "livre", "pen": "stylo", "paper": "papier",
        "computer": "ordinateur", "phone": "téléphone", "car": "voiture",
        "bus": "bus", "train": "train", "plane": "avion", "boat": "bateau",
        "bicycle": "bicyclette", "road": "route", "man": "homme", "woman": "femme",
        "child": "enfant", "children": "enfants", "friend": "ami", "family": "famille",
        "mother": "mère", "father": "père", "brother": "frère", "sister": "sœur",
        "son": "fils", "daughter": "fille", "husband": "mari", "wife": "femme",
        "baby": "bébé", "dog": "chien", "cat": "chat", "bird": "oiseau",
        "horse": "cheval", "cow": "vache", "day": "jour", "night": "nuit",
        "week": "semaine", "month": "mois", "year": "année", "today": "aujourd'hui",
        "tomorrow": "demain", "yesterday": "hier", "morning": "matin",
        "afternoon": "après-midi", "evening": "soir", "sun": "soleil", "moon": "lune",
        "star": "étoile", "rain": "pluie", "snow": "neige", "wind": "vent",
        "fire": "feu", "earth": "terre", "sea": "mer", "river": "rivière",
        "mountain": "montagne", "tree": "arbre", "flower": "fleur", "sky": "ciel",
        "world": "monde", "life": "vie", "love": "amour", "happiness": "bonheur",
        "sadness": "tristesse", "anger": "colère", "fear": "peur", "hope": "espoir",
        "peace": "paix", "war": "guerre", "time": "temps", "money": "argent",
        "work": "travail", "business": "entreprise", "health": "santé",
        "education": "éducation", "science": "science", "art": "art",
        "music": "musique", "color": "couleur", "red": "rouge", "blue": "bleu",
        "green": "vert", "yellow": "jaune", "white": "blanc", "black": "noir",
        "big": "grand", "small": "petit", "hot": "chaud", "cold": "froid",
        "new": "nouveau", "old": "vieux", "good": "bon", "bad": "mauvais",
        "fast": "rapide", "slow": "lent", "happy": "heureux", "sad": "triste",
        "beautiful": "beau", "ugly": "laid", "strong": "fort", "weak": "faible",
        "easy": "facile", "difficult": "difficile", "important": "important",
        "the": "le/la/les", "and": "et", "but": "mais", "or": "ou",
        "with": "avec", "without": "sans", "in": "dans", "on": "sur",
        "at": "à", "from": "de", "to": "à", "for": "pour", "of": "de",
        "i": "je", "you": "tu/vous", "he": "il", "she": "elle",
        "we": "nous", "they": "ils/elles", "it": "ça/il/elle",
        "my": "mon/ma", "your": "ton/votre", "his": "son/sa", "her": "son/sa",
        "our": "notre", "their": "leur", "this": "ce/cette", "that": "ce/cette",
        "is": "est", "are": "sont", "was": "était", "were": "étaient",
        "have": "avoir", "has": "a", "had": "avait", "do": "faire",
        "does": "fait", "did": "a fait", "will": "fera", "would": "ferait",
        "can": "peut", "could": "pourrait", "should": "devrait", "must": "doit",
        "not": "ne...pas", "very": "très", "also": "aussi", "always": "toujours",
        "never": "jamais", "sometimes": "parfois", "here": "ici", "there": "là",
        "now": "maintenant", "then": "alors", "why": "pourquoi", "how": "comment",
        "all": "tout", "many": "beaucoup", "some": "certains", "any": "aucun",
        "more": "plus", "less": "moins", "much": "beaucoup", "too": "trop",
    },
    "en-de": {
        "hello": "hallo", "goodbye": "auf wiedersehen", "please": "bitte",
        "thank you": "danke", "thanks": "danke", "yes": "ja", "no": "nein",
        "good morning": "guten morgen", "good afternoon": "guten tag",
        "good night": "gute nacht", "good evening": "guten abend",
        "how are you": "wie geht es ihnen", "i am fine": "mir geht es gut",
        "my name is": "ich heiße", "what is": "was ist", "where is": "wo ist",
        "i want": "ich will", "i need": "ich brauche", "i like": "ich mag",
        "i love": "ich liebe", "i think": "ich denke", "water": "wasser",
        "food": "essen", "bread": "brot", "milk": "milch", "coffee": "kaffee",
        "tea": "tee", "meat": "fleisch", "fish": "fisch", "chicken": "huhn",
        "rice": "reis", "salt": "salz", "sugar": "zucker", "egg": "ei",
        "apple": "apfel", "orange": "orange", "banana": "banane",
        "house": "haus", "home": "zuhause", "door": "tür", "window": "fenster",
        "table": "tisch", "chair": "stuhl", "bed": "bett", "room": "zimmer",
        "kitchen": "küche", "bathroom": "badezimmer", "garden": "garten",
        "street": "straße", "city": "stadt", "country": "land", "school": "schule",
        "hospital": "krankenhaus", "market": "markt", "store": "geschäft",
        "restaurant": "restaurant", "book": "buch", "pen": "kugelschreiber",
        "paper": "papier", "computer": "computer", "phone": "telefon",
        "car": "auto", "bus": "bus", "train": "zug", "plane": "flugzeug",
        "boat": "boot", "bicycle": "fahrrad", "road": "straße",
        "man": "mann", "woman": "frau", "child": "kind", "children": "kinder",
        "friend": "freund", "family": "familie", "mother": "mutter", "father": "vater",
        "brother": "bruder", "sister": "schwester", "son": "sohn", "daughter": "tochter",
        "husband": "emann", "wife": "frau", "baby": "baby", "dog": "hund",
        "cat": "katze", "bird": "vogel", "horse": "pferd", "cow": "kuh",
        "day": "tag", "night": "nacht", "week": "woche", "month": "monat",
        "year": "jahr", "today": "heute", "tomorrow": "morgen", "yesterday": "gestern",
        "morning": "morgen", "afternoon": "nachmittag", "evening": "abend",
        "sun": "sonne", "moon": "mond", "star": "stern", "rain": "regen",
        "snow": "schnee", "wind": "wind", "fire": "feuer", "earth": "erde",
        "sea": "meer", "river": "fluss", "mountain": "berg", "tree": "baum",
        "flower": "blume", "sky": "himmel", "world": "welt", "life": "leben",
        "love": "liebe", "happiness": "glück", "sadness": "trauer",
        "anger": "wut", "fear": "angst", "hope": "hoffnung", "peace": "frieden",
        "war": "krieg", "time": "zeit", "money": "geld", "work": "arbeit",
        "business": "geschäft", "health": "gesundheit", "education": "bildung",
        "science": "wissenschaft", "art": "kunst", "music": "musik",
        "color": "farbe", "red": "rot", "blue": "blau", "green": "grün",
        "yellow": "gelb", "white": "weiß", "black": "schwarz",
        "big": "groß", "small": "klein", "hot": "heiß", "cold": "kalt",
        "new": "neu", "old": "alt", "good": "gut", "bad": "schlecht",
        "fast": "schnell", "slow": "langsam", "happy": "glücklich", "sad": "traurig",
        "beautiful": "schön", "ugly": "hässlich", "strong": "stark", "weak": "schwach",
        "easy": "einfach", "difficult": "schwierig", "important": "wichtig",
        "the": "der/die/das", "and": "und", "but": "aber", "or": "oder",
        "with": "mit", "without": "ohne", "in": "in", "on": "auf",
        "at": "an", "from": "von", "to": "zu", "for": "für", "of": "von",
        "i": "ich", "you": "du/sie", "he": "er", "she": "sie",
        "we": "wir", "they": "sie", "it": "es",
        "my": "mein/meine", "your": "dein/ihr", "his": "sein", "her": "ihr",
        "our": "unser", "their": "ihr", "this": "dieser/diese/dieses",
        "is": "ist", "are": "sind", "was": "war", "were": "waren",
        "have": "haben", "has": "hat", "had": "hatte", "do": "tun",
        "does": "tut", "did": "tat", "will": "wird", "would": "würde",
        "can": "kann", "could": "könnte", "should": "sollte", "must": "muss",
        "not": "nicht", "very": "sehr", "also": "auch", "always": "immer",
        "never": "nie", "sometimes": "manchmal", "here": "hier", "there": "dort",
        "now": "jetzt", "then": "dann", "why": "warum", "how": "wie",
        "all": "alle", "many": "viele", "some": "einige", "any": "kein",
        "more": "mehr", "less": "weniger", "much": "viel", "too": "zu",
    },
    "en-ar": {
        "hello": "مرحبا", "goodbye": "وداعا", "please": "من فضلك",
        "thank you": "شكرا لك", "thanks": "شكرا", "yes": "نعم", "no": "لا",
        "good morning": "صباح الخير", "good afternoon": "مساء الخير",
        "good night": "تصبح على خير", "good evening": "مساء الخير",
        "how are you": "كيف حالك", "i am fine": "أنا بخير",
        "my name is": "اسمي", "what is": "ما هو", "where is": "أين",
        "i want": "أريد", "i need": "أحتاج", "i like": "أحب",
        "i love": "أحب", "i think": "أعتقد", "water": "ماء", "food": "طعام",
        "bread": "خبز", "milk": "حليب", "coffee": "قهوة", "tea": "شاي",
        "meat": "لحم", "fish": "سمك", "chicken": "دجاج", "rice": "أرز",
        "salt": "ملح", "sugar": "سكر", "egg": "بيضة", "apple": "تفاحة",
        "house": "بيت", "home": "منزل", "door": "باب", "window": "نافذة",
        "table": "طاولة", "chair": "كرسي", "bed": "سرير", "room": "غرفة",
        "kitchen": "مطبخ", "bathroom": "حمام", "garden": "حديقة",
        "street": "شارع", "city": "مدينة", "country": "بلد", "school": "مدرسة",
        "hospital": "مستشفى", "market": "سوق", "store": "متجر",
        "restaurant": "مطعم", "book": "كتاب", "pen": "قلم", "paper": "ورقة",
        "computer": "حاسوب", "phone": "هاتف", "car": "سيارة", "bus": "حافلة",
        "train": "قطار", "plane": "طائرة", "boat": "قارب", "road": "طريق",
        "man": "رجل", "woman": "امرأة", "child": "طفل", "children": "أطفال",
        "friend": "صديق", "family": "عائلة", "mother": "أم", "father": "أب",
        "brother": "أخ", "sister": "أخت", "son": "ابن", "daughter": "بنت",
        "husband": "زوج", "wife": "زوجة", "baby": "طفل رضيع", "dog": "كلب",
        "cat": "قطة", "bird": "طائر", "horse": "حصان", "day": "يوم",
        "night": "ليل", "week": "أسبوع", "month": "شهر", "year": "سنة",
        "today": "اليوم", "tomorrow": "غدا", "yesterday": "أمس",
        "morning": "صباح", "afternoon": "بعد الظهر", "evening": "مساء",
        "sun": "شمس", "moon": "قمر", "star": "نجم", "rain": "مطر",
        "snow": "ثلج", "wind": "ريح", "fire": "نار", "earth": "أرض",
        "sea": "بحر", "river": "نهر", "mountain": "جبل", "tree": "شجرة",
        "flower": "زهرة", "sky": "سماء", "world": "عالم", "life": "حياة",
        "love": "حب", "happiness": "سعادة", "sadness": "حزن",
        "anger": "غضب", "fear": "خوف", "hope": "أمل", "peace": "سلام",
        "war": "حرب", "time": "وقت", "money": "مال", "work": "عمل",
        "health": "صحة", "education": "تعليم", "science": "علوم",
        "art": "فن", "music": "موسيقى", "color": "لون", "red": "أحمر",
        "blue": "أزرق", "green": "أخضر", "yellow": "أصفر", "white": "أبيض",
        "black": "أسود", "big": "كبير", "small": "صغير", "hot": "حار",
        "cold": "بارد", "new": "جديد", "old": "قديم", "good": "جيد",
        "bad": "سيء", "fast": "سريع", "slow": "بطيء", "happy": "سعيد",
        "sad": "حزين", "beautiful": "جميل", "strong": "قوي", "weak": "ضعيف",
        "easy": "سهل", "difficult": "صعب", "important": "مهم",
        "the": "ال/ـ", "and": "و", "but": "لكن", "or": "أو",
        "with": "مع", "without": "بدون", "in": "في", "on": "على",
        "at": "في/عند", "from": "من", "to": "إلى", "for": "لأجل",
        "of": "من", "i": "أنا", "you": "أنت", "he": "هو", "she": "هي",
        "we": "نحن", "they": "هم", "it": "هو/هي",
        "is": "هو/يكون", "are": "يكونون", "have": "لدي", "not": "لا",
        "very": "جدا", "here": "هنا", "there": "هناك", "now": "الآن",
    },
    "en-bn": {
        "hello": "নমস্কার", "goodbye": "বিদায়", "please": "দয়া করে",
        "thank you": "ধন্যবাদ", "thanks": "ধন্যবাদ", "yes": "হ্যাঁ", "no": "না",
        "good morning": "সুপ্রভাত", "good afternoon": "শুভ দুপুর",
        "good night": "শুভ রাত্রি", "good evening": "শুভ সন্ধ্যা",
        "how are you": "কেমন আছেন", "i am fine": "আমি ভালো আছি",
        "my name is": "আমার নাম", "what is": "কি হলো", "where is": "কোথায়",
        "i want": "আমি চাই", "i need": "আমার প্রয়োজন", "i like": "আমি পছন্দ করি",
        "i love": "আমি ভালোবাসি", "i think": "আমি মনে করি", "water": "জল",
        "food": "খাবার", "bread": "রুটি", "milk": "দুধ", "coffee": "কফি",
        "tea": "চা", "meat": "মাংস", "fish": "মাছ", "chicken": "মুরগি",
        "rice": "ভাত", "salt": "লবণ", "sugar": "চিনি", "egg": "ডিম",
        "apple": "আপেল", "house": "বাড়ি", "home": "গৃহ", "door": "দরজা",
        "window": "জানালা", "table": "টেবিল", "chair": "চেয়ার", "bed": "বিছানা",
        "room": "ঘর", "kitchen": "রান্নাঘর", "bathroom": "গোসলখানা",
        "garden": "বাগান", "street": "রাস্তা", "city": "শহর", "country": "দেশ",
        "school": "স্কুল", "hospital": "হাসপাতাল", "market": "বাজার",
        "store": "দোকান", "restaurant": "রেস্তোরাঁ", "book": "বই", "pen": "কলম",
        "paper": "কাগজ", "computer": "কম্পিউটার", "phone": "ফোন", "car": "গাড়ি",
        "bus": "বাস", "train": "ট্রেন", "plane": "বিমান", "boat": "নৌকা",
        "road": "রাস্তা", "man": "পুরুষ", "woman": "মহিলা", "child": "শিশু",
        "children": "শিশুরা", "friend": "বন্ধু", "family": "পরিবার",
        "mother": "মা", "father": "বাবা", "brother": "ভাই", "sister": "বোন",
        "son": "পুত্র", "daughter": "কন্যা", "husband": "স্বামী", "wife": "স্ত্রী",
        "baby": "শিশু", "dog": "কুকুর", "cat": "বিড়াল", "bird": "পাখি",
        "horse": "ঘোড়া", "day": "দিন", "night": "রাত", "week": "সপ্তাহ",
        "month": "মাস", "year": "বছর", "today": "আজ", "tomorrow": "আগামীকাল",
        "yesterday": "গতকাল", "morning": "সকাল", "afternoon": "দুপুর",
        "evening": "সন্ধ্যা", "sun": "সূর্য", "moon": "চাঁদ", "star": "তারা",
        "rain": "বৃষ্টি", "snow": "তুষার", "wind": "বাতাস", "fire": "আগুন",
        "earth": "পৃথিবী", "sea": "সমুদ্র", "river": "নদী", "mountain": "পর্বত",
        "tree": "গাছ", "flower": "ফুল", "sky": "আকাশ", "world": "বিশ্ব",
        "life": "জীবন", "love": "ভালোবাসা", "happiness": "সুখ", "sadness": "দুঃখ",
        "anger": "রাগ", "fear": "ভয়", "hope": "আশা", "peace": "শান্তি",
        "war": "যুদ্ধ", "time": "সময়", "money": "টাকা", "work": "কাজ",
        "health": "স্বাস্থ্য", "education": "শিক্ষা", "science": "বিজ্ঞান",
        "art": "শিল্প", "music": "সঙ্গীত", "color": "রঙ", "red": "লাল",
        "blue": "নীল", "green": "সবুজ", "yellow": "হলুদ", "white": "সাদা",
        "black": "কালো", "big": "বড়", "small": "ছোট", "hot": "গরম",
        "cold": "ঠান্ডা", "new": "নতুন", "old": "পুরনো", "good": "ভালো",
        "bad": "খারাপ", "fast": "দ্রুত", "slow": "ধীর", "happy": "খুশি",
        "sad": "দুঃখিত", "beautiful": "সুন্দর", "strong": "শক্তিশালী",
        "weak": "দুর্বল", "easy": "সহজ", "difficult": "কঠিন",
        "important": "গুরুত্বপূর্ণ", "the": "টি/টা", "and": "এবং", "but": "কিন্তু",
        "or": "অথবা", "with": "সাথে", "in": "মধ্যে", "on": "উপর",
        "at": "এ", "from": "থেকে", "to": "পর্যন্ত", "for": "জন্য", "of": "এর",
        "i": "আমি", "you": "তুমি", "he": "সে", "she": "সে",
        "we": "আমরা", "they": "তারা", "it": "এটি",
        "is": "হলো", "are": "হলো", "have": "আছে", "not": "না",
        "very": "খুব", "here": "এখানে", "there": "সেখানে", "now": "এখন",
    },
}


def _translate_text(text, source_lang, target_lang):
    """Translate text using dictionary-based word-for-word approach."""
    # Normalize language codes
    lang_map = {
        "english": "en", "spanish": "es", "french": "fr", "german": "de",
        "arabic": "ar", "bengali": "bn", "es": "es", "fr": "fr", "de": "de",
        "ar": "ar", "bn": "bn", "en": "en",
    }
    src = lang_map.get(source_lang.lower(), source_lang.lower())
    tgt = lang_map.get(target_lang.lower(), target_lang.lower())

    if src == tgt:
        return {"translated_text": text, "note": "Source and target languages are the same.", "coverage": 100}

    # Build dictionary key
    dict_key = f"{src}-{tgt}"
    reverse_key = f"{tgt}-{src}"

    dictionary = TRANSLATION_DICTIONARIES.get(dict_key, {})
    reverse_dict = TRANSLATION_DICTIONARIES.get(reverse_key, {})

    if not dictionary and not reverse_dict:
        available = ", ".join(TRANSLATION_DICTIONARIES.keys())
        return {"error": f"No dictionary available for {source_lang} -> {target_lang}. Available: {available}"}

    # If we only have reverse dictionary, we need to invert it
    if not dictionary and reverse_dict:
        dictionary = {v: k for k, v in reverse_dict.items()}

    # Tokenize: split into words and punctuation
    tokens = re.findall(r'\b\w+\b|[.,!?;:]', text.lower())
    translated_tokens = []
    translated_count = 0
    total_translatable = 0

    # Also try phrase matching (multi-word phrases)
    i = 0
    words_lower = text.lower()
    result_parts = []
    pos = 0

    # First, try to match multi-word phrases
    sorted_phrases = sorted(dictionary.keys(), key=len, reverse=True)
    remaining = text.lower()
    result = ""
    translated_words = 0
    total_words = len(re.findall(r'\b\w+\b', text))

    while remaining:
        matched = False
        # Try longest phrase first
        for phrase in sorted_phrases:
            if remaining.startswith(phrase):
                # Check if it's a word boundary
                end_pos = len(phrase)
                if end_pos < len(remaining) and remaining[end_pos].isalpha():
                    continue
                result += dictionary[phrase]
                translated_words += len(phrase.split())
                remaining = remaining[end_pos:]
                matched = True
                break

        if not matched:
            result += remaining[0]
            remaining = remaining[1:]

    # Capitalize first letter
    if result:
        result = result[0].upper() + result[1:]

    # Calculate coverage
    coverage = round((translated_words / max(total_words, 1)) * 100, 1)

    language_names = {
        "en": "English", "es": "Spanish", "fr": "French",
        "de": "German", "ar": "Arabic", "bn": "Bengali",
    }

    return {
        "translated_text": result,
        "source_language": language_names.get(src, source_lang),
        "target_language": language_names.get(tgt, target_lang),
        "coverage_percent": coverage,
        "words_translated": translated_words,
        "total_words": total_words,
        "note": (
            "This is a basic offline dictionary-based translator. "
            "Translation is word-for-word and may not capture grammar, "
            "context, or idiomatic expressions. For accurate translations, "
            "please use a professional translation service."
        ),
    }


@ai_tools_bp.route("/text-translator", methods=["GET"])
def text_translator_page():
    return render_template("tools/text-translator.html")


@ai_tools_bp.route("/text-translator/translate", methods=["POST"])
def text_translator_api():
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")
        source_lang = data.get("source_language", "english").strip()
        target_lang = data.get("target_language", "spanish").strip()

        if not text.strip():
            return jsonify({"status": "error", "message": "No text provided."})

        result = _translate_text(text, source_lang, target_lang)

        if "error" in result:
            return jsonify({"status": "error", "message": result["error"]})

        log_tool_usage("text-translator", "translate",
                       f"{source_lang}->{target_lang}, coverage={result.get('coverage_percent', 0)}%")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 10. Code Quality Scorer
# =========================================================================

# Language-specific naming convention patterns
NAMING_PATTERNS = {
    "python": {
        "function": r'^[a-z_][a-z0-9_]*$',
        "class": r'^[A-Z][a-zA-Z0-9]*$',
        "variable": r'^[a-z_][a-z0-9_]*$',
        "constant": r'^[A-Z_][A-Z0-9_]*$',
    },
    "javascript": {
        "function": r'^[a-zA-Z_$][a-zA-Z0-9_$]*$',
        "class": r'^[A-Z][a-zA-Z0-9]*$',
        "variable": r'^[a-zA-Z_$][a-zA-Z0-9_$]*$',
        "constant": r'^[A-Z_][A-Z0-9_]*$',
    },
    "java": {
        "method": r'^[a-z][a-zA-Z0-9]*$',
        "class": r'^[A-Z][a-zA-Z0-9]*$',
        "variable": r'^[a-z][a-zA-Z0-9]*$',
        "constant": r'^[A-Z_][A-Z0-9_]*$',
    },
    "default": {
        "function": r'^[a-zA-Z_][a-zA-Z0-9_]*$',
        "class": r'^[A-Z][a-zA-Z0-9]*$',
        "variable": r'^[a-zA-Z_][a-zA-Z0-9_]*$',
        "constant": r'^[A-Z_][A-Z0-9_]*$',
    },
}

# Keywords that suggest security issues
SECURITY_PATTERNS = [
    (r'eval\s*\(', "Use of eval() — potential code injection risk", "critical"),
    (r'exec\s*\(', "Use of exec() — potential code injection risk", "critical"),
    (r'\.innerHTML\s*=', "Direct innerHTML assignment — XSS risk", "high"),
    (r'(?:password|passwd|pwd)\s*=\s*[\'"][^\'"]+[\'"]', "Hardcoded password detected", "critical"),
    (r'(?:api[_-]?key|secret[_-]?key)\s*=\s*[\'"][^\'"]+[\'"]', "Hardcoded API key/secret detected", "critical"),
    (r'sql\s*=\s*[\'"].*?\+\s*\w+', "Possible SQL injection via string concatenation", "high"),
    (r'os\.system\s*\(', "Use of os.system() — potential command injection", "high"),
    (r'subprocess\.call\s*\(\s*shell\s*=\s*True', "Shell=True in subprocess — command injection risk", "high"),
    (r'(?:pickle|marshal|yaml\.load)\s*\(', "Unsafe deserialization — potential RCE", "critical"),
    (r'(?i)(?:select|insert|update|delete|drop).*from.*where.*\+', "SQL query with concatenation", "high"),
    (r'document\.write\s*\(', "Use of document.write() — potential XSS", "medium"),
    (r'console\.log\s*\(.*(?:password|secret|key|token)', "Logging sensitive data", "medium"),
    (r'http://(?!localhost)', "Non-HTTPS URL detected", "low"),
    (r'md5\s*\(|sha1\s*\(', "Weak hash algorithm — consider SHA-256+", "medium"),
]


def _count_complexity(code):
    """Approximate cyclomatic complexity."""
    complexity = 1  # Base complexity
    # Decision points
    decision_patterns = [
        r'\bif\b', r'\belif\b', r'\belse\b', r'\bfor\b', r'\bwhile\b',
        r'\bcase\b', r'\bexcept\b', r'\bexcept\s*:', r'\bfinally\b',
        r'\band\b', r'\bor\b', r'\bcatch\b', r'\bdefault\b',
        r'\?\?.*:', r'&&', r'\|\|',
    ]
    for pattern in decision_patterns:
        complexity += len(re.findall(pattern, code))
    return complexity


def _analyze_function_lengths(code, language):
    """Find function lengths and flag overly long ones."""
    functions = []
    if language in ("python",):
        # Find function definitions
        pattern = r'(?m)^\s*def\s+(\w+)\s*\([^)]*\)\s*:.*?(?=^\s*def\s|\Z)'
        for m in re.finditer(pattern, code, re.DOTALL):
            name = m.group(1)
            body = m.group(0)
            lines = len([l for l in body.split('\n') if l.strip()])
            functions.append({"name": name, "lines": lines})
    else:
        # Generic function detection
        pattern = r'(?:function\s+(\w+)\s*\([^)]*\)\s*\{|(\w+)\s*:\s*function\s*\([^)]*\)\s*\{)'
        for m in re.finditer(pattern, code):
            name = m.group(1) or m.group(2)
            # Approximate: count lines until matching closing brace
            start = m.end()
            depth = 1
            end = start
            while end < len(code) and depth > 0:
                if code[end] == '{':
                    depth += 1
                elif code[end] == '}':
                    depth -= 1
                end += 1
            lines = len(code[start:end].split('\n'))
            functions.append({"name": name, "lines": lines})

    long_functions = [f for f in functions if f["lines"] > 30]
    return functions, long_functions


def _check_indentation(code):
    """Check indentation consistency."""
    lines = code.split('\n')
    indent_levels = set()
    inconsistent = 0

    for line in lines:
        if line.strip() == '':
            continue
        # Count leading spaces
        spaces = len(line) - len(line.lstrip())
        if spaces > 0:
            # Check for tabs vs spaces mixing
            if '\t' in line[:spaces]:
                inconsistent += 1
            indent_levels.add(spaces % 4)

    # If we have both 2-space and 4-space indentation, flag it
    mixing = len(indent_levels) > 1
    return {
        "indent_levels_found": sorted(indent_levels),
        "mixed_indentation": mixing,
        "tab_issues": inconsistent,
        "consistent": not mixing and inconsistent == 0,
    }


def _detect_duplication(code):
    """Detect code duplication (similar lines)."""
    lines = [l.strip() for l in code.split('\n') if l.strip() and len(l.strip()) > 10]
    seen = {}
    duplicates = []

    for i, line in enumerate(lines):
        normalized = re.sub(r'\s+', ' ', line.lower())
        if normalized in seen:
            duplicates.append({
                "line": line,
                "first_occurrence": seen[normalized],
                "duplicate_at": i,
            })
        else:
            seen[normalized] = i

    return duplicates[:10]


def _score_code_quality(code, language=None):
    """Comprehensive code quality scoring."""
    if not language or language == "auto":
        language = _detect_language(code)

    lines = code.split('\n')
    total_lines = len(lines)
    non_blank_lines = len([l for l in lines if l.strip()])

    # ---- Category 1: Naming Conventions (0-100) ----
    naming_score = 100
    naming_issues = []
    patterns = NAMING_PATTERNS.get(language, NAMING_PATTERNS["default"])

    # Check function/method names
    if language in ("python",):
        for m in re.finditer(r'def\s+(\w+)\s*\(', code):
            name = m.group(1)
            if not re.match(patterns["function"], name):
                naming_score -= 5
                naming_issues.append(f"Function '{name}' doesn't follow naming convention")
        # Check class names
        for m in re.finditer(r'class\s+(\w+)\s*:', code):
            name = m.group(1)
            if not re.match(patterns["class"], name):
                naming_score -= 5
                naming_issues.append(f"Class '{name}' doesn't follow naming convention")
    else:
        for m in re.finditer(r'(?:function|class)\s+(\w+)\s*[\(\{:]', code):
            name = m.group(1)
            keyword = "function" if "function" in code[m.start():m.end()] else "class"
            expected = patterns.get("class" if keyword == "class" else "function", patterns["function"])
            if not re.match(expected, name):
                naming_score -= 5
                naming_issues.append(f"{keyword.title()} '{name}' doesn't follow naming convention")

    # Check for single-letter names (except common ones like i, j, x, y, z)
    for m in re.finditer(r'(?:def|function)\s+\w*[=\s]\s*(\w)\s*[=\(]', code):
        name = m.group(1)
        if name not in ('i', 'j', 'k', 'x', 'y', 'z', 'e', '_', 'f'):
            naming_score -= 3
            naming_issues.append(f"Single-letter name '{name}' — consider a descriptive name")

    naming_score = max(0, naming_score)

    # ---- Category 2: Function Length (0-100) ----
    all_functions, long_functions = _analyze_function_lengths(code, language)
    if not all_functions:
        function_score = 100
        function_issues = ["No functions found — consider organizing code into functions"]
    else:
        function_score = 100
        function_issues = []
        for f in long_functions:
            penalty = min(20, (f["lines"] - 30))
            function_score -= penalty
            function_issues.append(f"Function '{f['name']}' is {f['lines']} lines long (recommended: < 30)")
        function_score = max(0, function_score)

    # ---- Category 3: Complexity (0-100) ----
    complexity = _count_complexity(code)
    if complexity <= 5:
        complexity_score = 100
        complexity_label = "Low"
    elif complexity <= 10:
        complexity_score = 85
        complexity_label = "Moderate"
    elif complexity <= 20:
        complexity_score = 65
        complexity_label = "High"
    else:
        complexity_score = 40
        complexity_label = "Very High"
    complexity_issues = [f"Cyclomatic complexity: {complexity} ({complexity_label})"]
    if complexity > 10:
        complexity_issues.append("Consider breaking complex logic into smaller functions")

    # ---- Category 4: Comment Ratio (0-100) ----
    comment_lines = 0
    for line in lines:
        stripped = line.strip()
        if language in ("python",) and (stripped.startswith('#') or stripped.startswith('"""') or stripped.startswith("'''")):
            comment_lines += 1
        elif language in ("javascript", "java") and (stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*')):
            comment_lines += 1

    comment_ratio = comment_lines / max(non_blank_lines, 1)
    if comment_ratio >= 0.15:
        comment_score = 100
    elif comment_ratio >= 0.08:
        comment_score = 80
    elif comment_ratio >= 0.03:
        comment_score = 60
    elif comment_lines > 0:
        comment_score = 40
    else:
        comment_score = 20

    comment_issues = [
        f"Comment ratio: {round(comment_ratio * 100, 1)}% ({comment_lines} comments / {non_blank_lines} code lines)"
    ]
    if comment_ratio < 0.08:
        comment_issues.append("Consider adding more comments to explain complex logic")

    # ---- Category 5: Indentation Consistency (0-100) ----
    indent_info = _check_indentation(code)
    if indent_info["consistent"]:
        indent_score = 100
        indent_issues = ["Indentation is consistent"]
    else:
        indent_score = 60
        indent_issues = []
        if indent_info["mixed_indentation"]:
            indent_score -= 20
            indent_issues.append(f"Mixed indentation levels detected: {indent_info['indent_levels_found']}")
        if indent_info["tab_issues"] > 0:
            indent_score -= 10
            indent_issues.append(f"Found {indent_info['tab_issues']} lines with tab/space mixing")
        indent_score = max(0, indent_score)

    # ---- Category 6: Duplication (0-100) ----
    duplicates = _detect_duplication(code)
    dup_score = max(0, 100 - len(duplicates) * 10)
    dup_issues = [f"Found {len(duplicates)} duplicate or near-duplicate code blocks"]
    if duplicates:
        for d in duplicates[:3]:
            dup_issues.append(f"  Duplicate: '{d['line'][:50]}...'")

    # ---- Category 7: Security (0-100) ----
    security_issues_found = []
    security_deductions = 0
    for pattern, message, severity in SECURITY_PATTERNS:
        matches = re.findall(pattern, code)
        if matches:
            severity_penalty = {"critical": 25, "high": 15, "medium": 8, "low": 3}
            security_deductions += severity_penalty.get(severity, 5) * len(matches)
            security_issues_found.append({"message": message, "severity": severity, "count": len(matches)})

    security_score = max(0, 100 - security_deductions)
    if not security_issues_found:
        security_issues_found = ["No obvious security issues detected"]

    # ---- Overall Score ----
    overall_score = round(
        0.15 * naming_score +
        0.15 * function_score +
        0.15 * complexity_score +
        0.10 * comment_score +
        0.10 * indent_score +
        0.10 * dup_score +
        0.25 * security_score,
        1
    )

    # Grade
    if overall_score >= 90:
        grade = "A"
    elif overall_score >= 80:
        grade = "B"
    elif overall_score >= 70:
        grade = "C"
    elif overall_score >= 60:
        grade = "D"
    else:
        grade = "F"

    return {
        "overall_score": overall_score,
        "grade": grade,
        "language": language,
        "total_lines": total_lines,
        "code_lines": non_blank_lines,
        "categories": {
            "naming_conventions": {"score": naming_score, "issues": naming_issues},
            "function_length": {"score": function_score, "issues": function_issues},
            "complexity": {"score": complexity_score, "cyclomatic_complexity": complexity, "issues": complexity_issues},
            "comment_ratio": {"score": comment_score, "ratio": round(comment_ratio, 3), "issues": comment_issues},
            "indentation": {"score": indent_score, "issues": indent_issues},
            "duplication": {"score": dup_score, "duplicates_found": len(duplicates), "issues": dup_issues},
            "security": {"score": security_score, "issues": security_issues_found},
        },
        "recommendations": _generate_recommendations(naming_score, function_score, complexity_score,
                                                       comment_score, indent_score, dup_score, security_score),
    }


def _generate_recommendations(naming, func_len, complexity, comments, indent, dup, security):
    """Generate actionable recommendations based on scores."""
    recs = []
    if naming < 80:
        recs.append("Follow language-specific naming conventions (camelCase for JS/Java, snake_case for Python)")
    if func_len < 80:
        recs.append("Break down functions longer than 30 lines into smaller, focused functions")
    if complexity < 70:
        recs.append("Reduce cyclomatic complexity by extracting complex conditions into helper functions")
    if comments < 60:
        recs.append("Add descriptive comments, especially for complex logic and public APIs")
    if indent < 80:
        recs.append("Standardize indentation (use 4 spaces for Python, 2/4 for JS)")
    if dup < 80:
        recs.append("Extract duplicated code into reusable functions or constants")
    if security < 80:
        recs.append("Address security issues: remove hardcoded secrets, use parameterized queries, avoid eval/exec")
    if not recs:
        recs.append("Code quality is good! Continue maintaining these standards.")
    return recs


@ai_tools_bp.route("/code-quality", methods=["GET"])
def code_quality_page():
    return render_template("tools/code-quality.html")


@ai_tools_bp.route("/code-quality/score", methods=["POST"])
def code_quality_api():
    try:
        data = request.get_json(silent=True) or {}
        code = data.get("code", "")
        language = data.get("language", "auto").strip().lower()

        if not code.strip():
            return jsonify({"status": "error", "message": "No code provided."})

        result = _score_code_quality(code, language)

        log_tool_usage("code-quality", "score",
                       f"language={result['language']}, score={result['overall_score']}, grade={result['grade']}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
