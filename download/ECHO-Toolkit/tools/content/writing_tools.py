"""
ECHO Toolkit — Writing Tools
Flask Blueprint with 10 fully functional writing & content utilities.
Each tool exposes a web UI route (GET -> HTML) and an API route (POST -> JSON).
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from flask import Blueprint, render_template, request, jsonify
import re
import math
import random
import string
import time
import json
import sqlite3
from datetime import datetime, timedelta

from database import log_tool_usage, save_content_post, get_all_posts

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------
writing_tools_bp = Blueprint(
    "writing_tools_bp",
    __name__,
    url_prefix="/tools/writing",
    template_folder="../../templates",
)

# ---------------------------------------------------------------------------
# Content Planner SQLite helper
# ---------------------------------------------------------------------------
PLANNER_DB_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'toolkit.db')


def _get_planner_db():
    """Get a connection to the shared toolkit.db and ensure content_plan table exists."""
    conn = sqlite3.connect(PLANNER_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS content_plan (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'general',
            target_date TEXT DEFAULT '',
            status TEXT DEFAULT 'idea',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    return conn


# =========================================================================
# 1. Markdown Converter
# =========================================================================

def _markdown_to_html(md_text):
    """Convert markdown text to HTML using a regex-based parser.

    Handles: headers (h1-h6), bold, italic, code (inline + blocks),
    links, images, ordered/unordered lists, blockquotes, tables,
    horizontal rules, strikethrough.
    """
    if not md_text:
        return ""

    html_parts = []
    lines = md_text.split('\n')
    i = 0

    while i < len(lines):
        line = lines[i]

        # --- Code block (fenced) ---
        if line.strip().startswith('```'):
            lang = line.strip()[3:].strip()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                code_lines.append(lines[i])
                i += 1
            code_body = '\n'.join(code_lines)
            lang_attr = f' class="language-{lang}"' if lang else ''
            html_parts.append(f'<pre><code{lang_attr}>{_html_escape(code_body)}</code></pre>')
            i += 1
            continue

        # --- Horizontal rule ---
        if re.match(r'^(\*{3,}|-{3,}|_{3,})\s*$', line.strip()):
            html_parts.append('<hr>')
            i += 1
            continue

        # --- Heading (ATX style: # to ######) ---
        heading_match = re.match(r'^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$', line)
        if heading_match:
            level = len(heading_match.group(1))
            text = _process_inline(heading_match.group(2).strip())
            html_parts.append(f'<h{level}>{text}</h{level}>')
            i += 1
            continue

        # --- Blockquote ---
        if line.strip().startswith('>'):
            quote_lines = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                quote_lines.append(re.sub(r'^>\s?', '', lines[i].strip()))
                i += 1
            inner_md = '\n'.join(quote_lines)
            inner_html = _markdown_to_html(inner_md)
            html_parts.append(f'<blockquote>{inner_html}</blockquote>')
            continue

        # --- Table ---
        if '|' in line and i + 1 < len(lines) and re.match(r'^[\s|:-]+$', lines[i + 1].strip()):
            table_lines = [line]
            i += 1  # skip separator
            while i < len(lines) and '|' in lines[i]:
                table_lines.append(lines[i])
                i += 1
            html_parts.append(_parse_table(table_lines))
            continue

        # --- Unordered list ---
        if re.match(r'^(\s*)[-*+]\s+', line):
            list_items, i = _parse_list(lines, i, unordered=True)
            html_parts.append(list_items)
            continue

        # --- Ordered list ---
        if re.match(r'^(\s*)\d+\.\s+', line):
            list_items, i = _parse_list(lines, i, unordered=False)
            html_parts.append(list_items)
            continue

        # --- Empty line ---
        if not line.strip():
            html_parts.append('')
            i += 1
            continue

        # --- Paragraph (normal text) ---
        para_lines = [line]
        i += 1
        while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith('#') \
                and not lines[i].strip().startswith('>') and not lines[i].strip().startswith('```') \
                and not lines[i].strip().startswith('- ') and not lines[i].strip().startswith('* ') \
                and not lines[i].strip().startswith('+ ') \
                and not re.match(r'^\d+\.\s+', lines[i].strip()) \
                and not re.match(r'^(\*{3,}|-{3,}|_{3,})\s*$', lines[i].strip()) \
                and '|' not in lines[i]:
            para_lines.append(lines[i])
            i += 1
        text = _process_inline('\n'.join(para_lines))
        html_parts.append(f'<p>{text}</p>')

    return '\n'.join(html_parts)


def _html_escape(text):
    """Escape HTML special characters."""
    text = text.replace('&', '&amp;')
    text = text.replace('<', '&lt;')
    text = text.replace('>', '&gt;')
    text = text.replace('"', '&quot;')
    return text


def _process_inline(text):
    """Process inline markdown elements: bold, italic, code, strikethrough, links, images."""
    # Escape HTML first
    text = _html_escape(text)

    # Images: ![alt](url "title")
    text = re.sub(
        r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)',
        r'<img src="\2" alt="\1" title="\3">',
        text,
    )

    # Links: [text](url "title")
    text = re.sub(
        r'\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)',
        r'<a href="\2" title="\3">\1</a>',
        text,
    )

    # Strikethrough: ~~text~~
    text = re.sub(r'~~(.+?)~~', r'<del>\1</del>', text)

    # Bold + Italic: ***text*** or ___text___
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'<strong><em>\1</em></strong>', text)
    text = re.sub(r'___(.+?)___', r'<strong><em>\1</em></strong>', text)

    # Bold: **text** or __text__
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'__(.+?)__', r'<strong>\1</strong>', text)

    # Italic: *text* or _text_
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    text = re.sub(r'(?<!_)_(?!_)(.+?)(?<!_)_(?!_)', r'<em>\1</em>', text)

    # Inline code: `text`
    text = re.sub(r'`(.+?)`', r'<code>\1</code>', text)

    # Line breaks within paragraphs
    text = re.sub(r'\n', '<br>', text)

    return text


def _parse_list(lines, start_idx, unordered=True):
    """Parse a list (ordered or unordered) starting at start_idx."""
    items = []
    i = start_idx
    tag = 'ul' if unordered else 'ol'

    while i < len(lines):
        line = lines[i]
        if unordered:
            m = re.match(r'^(\s*)([-*+])\s+(.*)', line)
        else:
            m = re.match(r'^(\s*)\d+\.\s+(.*)', line)

        if not m:
            break

        indent = len(m.group(1))
        item_text = m.group(3) if unordered else m.group(2)

        processed = _process_inline(item_text)

        # Check for nested list in next lines
        if i + 1 < len(lines):
            next_line = lines[i + 1]
            if unordered and re.match(r'^(\s*)([-*+])\s+', next_line) and \
                    len(next_line) - len(next_line.lstrip()) > indent:
                nested_tag = 'ul' if unordered else 'ol'
                # We only go one level deep for simplicity
                i += 1
                nested_items = []
                while i < len(lines):
                    nm = re.match(r'^\s+[-*+]\s+(.*)', lines[i]) if unordered \
                        else re.match(r'^\s+\d+\.\s+(.*)', lines[i])
                    if not nm:
                        break
                    nested_items.append(f'<li>{_process_inline(nm.group(1))}</li>')
                    i += 1
                items.append(f'<li>{processed}<{"ul" if unordered else "ol"}>{"".join(nested_items)}</{"ul" if unordered else "ol"}></li>')
                continue
            elif not unordered and re.match(r'^(\s*)\d+\.\s+', next_line) and \
                    len(next_line) - len(next_line.lstrip()) > indent:
                i += 1
                nested_items = []
                while i < len(lines):
                    nm = re.match(r'^\s+\d+\.\s+(.*)', lines[i])
                    if not nm:
                        break
                    nested_items.append(f'<li>{_process_inline(nm.group(1))}</li>')
                    i += 1
                items.append(f'<li>{processed}<ol>{"".join(nested_items)}</ol></li>')
                continue

        items.append(f'<li>{processed}</li>')
        i += 1

    return f'<{tag}>{"".join(items)}</{tag}>', i


def _parse_table(table_lines):
    """Parse a markdown table into HTML."""
    if len(table_lines) < 2:
        return ''

    def parse_row(row_line):
        cells = [c.strip() for c in row_line.strip().strip('|').split('|')]
        return [_process_inline(c) for c in cells]

    header_cells = parse_row(table_lines[0])
    header_html = ''.join(f'<th>{c}</th>' for c in header_cells)

    body_rows = []
    for row_line in table_lines[2:]:  # skip separator
        cells = parse_row(row_line)
        row_html = ''.join(f'<td>{c}</td>' for c in cells)
        body_rows.append(f'<tr>{row_html}</tr>')

    return f'<table><thead><tr>{header_html}</tr></thead><tbody>{"".join(body_rows)}</tbody></table>'


def _markdown_to_plain_text(md_text):
    """Convert markdown to plain text by stripping all markdown syntax."""
    if not md_text:
        return ""

    text = md_text

    # Code blocks
    text = re.sub(r'```[\w]*\n', '', text)
    text = re.sub(r'```', '', text)

    # Strikethrough
    text = re.sub(r'~~(.+?)~~', r'\1', text)

    # Bold + Italic
    text = re.sub(r'\*\*\*(.+?)\*\*\*', r'\1', text)
    text = re.sub(r'___(.+?)___', r'\1', text)

    # Bold
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'__(.+?)__', r'\1', text)

    # Italic
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)

    # Inline code
    text = re.sub(r'`(.+?)`', r'\1', text)

    # Links: [text](url)
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)

    # Images: ![alt](url)
    text = re.sub(r'!\[([^\]]*)\]\([^)]+\)', r'\1', text)

    # ATX headings
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)

    # Blockquotes
    text = re.sub(r'^>\s?', '', text, flags=re.MULTILINE)

    # Horizontal rules
    text = re.sub(r'^(\*{3,}|-{3,}|_{3,})\s*$', '', text, flags=re.MULTILINE)

    # Unordered list markers
    text = re.sub(r'^\s*[-*+]\s+', '- ', text, flags=re.MULTILINE)

    # Ordered list markers
    text = re.sub(r'^(\s*)\d+\.\s+', r'\1- ', text, flags=re.MULTILINE)

    # Table pipes
    text = re.sub(r'\|', ' | ', text)
    text = re.sub(r'^[\s|:-]+\n?', '', text, flags=re.MULTILINE)

    # Collapse multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


@writing_tools_bp.route("/markdown-converter", methods=["GET"])
def markdown_converter_page():
    """Render the Markdown Converter web UI."""
    return render_template("tools/markdown-converter.html")


@writing_tools_bp.route("/markdown-converter/convert", methods=["POST"])
def markdown_converter_api():
    """API: convert markdown to HTML or plain text."""
    try:
        data = request.get_json(silent=True) or {}
        markdown_text = data.get("markdown", "")
        output_format = data.get("output_format", "html")

        if not markdown_text.strip():
            return jsonify({"status": "error", "message": "No markdown text provided."})

        if output_format == "plain_text":
            result = _markdown_to_plain_text(markdown_text)
        elif output_format == "html":
            result = _markdown_to_html(markdown_text)
        else:
            return jsonify({"status": "error", "message": f"Unsupported output format: {output_format}. Use 'html' or 'plain_text'."})

        log_tool_usage("markdown-converter", "convert", f"format={output_format}, length={len(markdown_text)}")

        return jsonify({
            "status": "success",
            "data": {
                "result": result,
                "output_format": output_format,
                "input_length": len(markdown_text),
                "output_length": len(result),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 2. Headline Generator
# =========================================================================

HEADLINE_POWER_WORDS = [
    "essential", "ultimate", "proven", "powerful", "effective", "remarkable",
    "brilliant", "critical", "game-changing", "expert", "advanced", "simple",
    "smart", "fast", "easy", "complete", "comprehensive", "definitive",
    "practical", "foolproof", "secret", "hidden", "surprising", "little-known",
    "unconventional", "breakthrough", "revolutionary", "innovative", "cutting-edge",
    "transformative", "insider", "exclusive", "premium", "valuable", "actionable",
]

HEADLINE_TEMPLATES = [
    # How-to formulas
    ("how_to", "How to {topic} in {timeframe}"),
    ("how_to_benefit", "How {topic} Can {benefit}"),
    ("how_to_without", "How to {topic} Without {pain_point}"),
    ("how_to_step", "How to {topic} (Step-by-Step Guide)"),
    ("how_to_like", "How to {topic} Like a {expert}"),
    # Listicle formulas
    ("list_ways", "{number} Ways to {topic}"),
    ("list_reasons", "{number} Reasons Why {topic}"),
    ("list_secrets", "{number} {power_word} Secrets About {topic}"),
    ("list_tools", "{number} {power_word} {topic} {noun} You Need"),
    ("list_mistakes", "{number} {topic} Mistakes That Will Cost You"),
    ("list_tips", "{number} {power_word} Tips for {topic}"),
    # Question formulas
    ("question_why", "Why {topic}? The Answer May Surprise You"),
    ("question_what", "What {topic} and Why It {impact}"),
    ("question_how", "How Much Do You Really Know About {topic}?"),
    ("question_should", "Should You {topic}? Here's What You Need to Know"),
    ("question_can", "Can {topic}? The Truth {qualifier}"),
    # Power word formulas
    ("power_ultimate", "The {power_word} Guide to {topic}"),
    ("power_essential", "The {power_word} {noun} of {topic}"),
    ("power_truth", "The {power_word} Truth About {topic}"),
    # Number formulas
    ("number_stat", "{topic} in {year}: {number} Stats You Need to See"),
    ("number_percent", "{number}% of People Don't Know {topic} — Do You?"),
    # Controversial
    ("controversial_stop", "Stop {topic_ing} — Here's What Works Instead"),
    ("controversial_wrong", "Everything You Know About {topic} Is Wrong"),
    ("controversial_dead", "{topic} Is Dead — Here's What Replaced It"),
    ("controversial_truth", "The Ugly Truth About {topic} Nobody Talks About"),
    # Benefit-driven
    ("benefit_achieve", "Achieve {benefit} With This {power_word} {topic} Strategy"),
    ("benefit_double", "Double Your {benefit} With {topic}"),
    # Comparison
    ("comparison_a_vs_b", "{topic_a} vs {topic_b}: Which Is Better in {year}?"),
    # Title/Name
    ("title_definitive", "The Definitive {noun} to {topic}"),
    ("title_complete", "A Complete {noun} to Mastering {topic}"),
]

BENEFITS = [
    "Boost Your Productivity", "Save Time", "Grow Your Audience", "Increase Revenue",
    "Improve Your Skills", "Build Better Habits", "Achieve Your Goals", "Transform Your Life",
    "Get More Done", "Stand Out From the Crowd", "Level Up", "Stay Ahead of the Curve",
]

PAIN_POINTS = [
    "Wasting Time", "Feeling Overwhelmed", "Making Mistakes", "Losing Money",
    "Getting Stuck", "Being Overwhelmed", "Burning Out", "Starting From Scratch",
]

EXPERTS = [
    "Pro", "Expert", "Master", "Champion", "Veteran", "Specialist",
]

TIMEFRAMES = [
    "5 Minutes", "30 Minutes", "Under an Hour", "Just 10 Minutes", "a Weekend", "a Week",
    "One Day", "No Time", "Record Time",
]

NOUNS = [
    "Guide", "Handbook", "Blueprint", "Playbook", "Roadmap", "Framework",
    "Toolkit", "Manual", "Cheat Sheet", "Masterclass",
]

IMPACTS = [
    "Matters", "Changes Everything", "Is Transforming the Industry", "Could Save Your Career",
]

QUALIFIERS = [
    "Finally Revealed", "No One Tells You", "Experts Won't Share",
]


def _generate_headlines(topic):
    """Generate 10+ headline variations for a given topic."""
    topic_clean = topic.strip()
    if not topic_clean:
        return []

    # Extract a base topic and -ing form
    topic_ing = topic_clean
    if topic_clean.lower().startswith(("the ", "a ", "an ")):
        topic_ing = re.sub(r'^(the|a|an)\s+', '', topic_clean, flags=re.IGNORECASE)
    topic_ing = topic_ing.lower()
    if topic_ing.endswith("e") and not topic_ing.endswith(("ing", "le")):
        topic_ing = topic_ing[:-1] + "ing"
    elif not topic_ing.endswith("ing"):
        topic_ing = topic_ing + "ing"

    year = str(datetime.now().year)
    headlines = []
    used_templates = set()

    # Shuffle templates for variety, but try to cover different categories
    template_list = list(HEADLINE_TEMPLATES)
    random.shuffle(template_list)

    for template_type, template in template_list:
        try:
            headline = template.format(
                topic=topic_clean,
                topic_ing=topic_ing,
                number=random.choice([3, 5, 7, 10, 12, 15, 20]),
                power_word=random.choice(HEADLINE_POWER_WORDS),
                benefit=random.choice(BENEFITS),
                pain_point=random.choice(PAIN_POINTS),
                expert=random.choice(EXPERTS),
                timeframe=random.choice(TIMEFRAMES),
                noun=random.choice(NOUNS),
                impact=random.choice(IMPACTS),
                year=year,
                qualifier=random.choice(QUALIFIERS),
                topic_a=topic_clean,
                topic_b="Traditional " + topic_clean,
            )
            # De-duplicate
            if headline not in [h["headline"] for h in headlines]:
                headlines.append({
                    "headline": headline,
                    "formula": template_type,
                })
        except (KeyError, ValueError):
            continue

        if len(headlines) >= 15:
            break

    return headlines


@writing_tools_bp.route("/headline-generator", methods=["GET"])
def headline_generator_page():
    """Render the Headline Generator web UI."""
    return render_template("tools/headline-generator.html")


@writing_tools_bp.route("/headline-generator/generate", methods=["POST"])
def headline_generator_api():
    """API: generate headline variations for a topic or article."""
    try:
        data = request.get_json(silent=True) or {}
        topic = data.get("topic", "").strip()

        if not topic:
            return jsonify({"status": "error", "message": "No topic provided."})

        headlines = _generate_headlines(topic)

        if not headlines:
            return jsonify({"status": "error", "message": "Could not generate headlines for the given topic."})

        log_tool_usage("headline-generator", "generate", f"topic={topic[:50]}")

        return jsonify({
            "status": "success",
            "data": {
                "topic": topic,
                "headlines": headlines,
                "count": len(headlines),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 3. Reading Time Calculator
# =========================================================================

def _count_syllables(word):
    """Estimate the number of syllables in a word."""
    word = word.lower().strip()
    if not word:
        return 0

    # Remove trailing punctuation
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

    # Words like "the", "be" have 1 syllable minimum
    if count == 0:
        count = 1

    return count


def _flesch_reading_ease(text):
    """Calculate Flesch Reading Ease score.

    90-100: Very Easy
    80-89: Easy
    70-79: Fairly Easy
    60-69: Standard
    50-59: Fairly Difficult
    30-49: Difficult
    0-29: Very Difficult
    """
    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]

    if len(sentences) < 1:
        return 0, "N/A"

    words = re.findall(r'\b[a-zA-Z]+\b', text)
    if len(words) < 1:
        return 0, "N/A"

    total_words = len(words)
    total_sentences = len(sentences)
    total_syllables = sum(_count_syllables(w) for w in words)

    if total_words == 0 or total_sentences == 0:
        return 0, "N/A"

    score = 206.835 - 1.015 * (total_words / total_sentences) - 84.6 * (total_syllables / total_words)
    score = max(0, min(100, score))

    if score >= 90:
        level = "Very Easy"
    elif score >= 80:
        level = "Easy"
    elif score >= 70:
        level = "Fairly Easy"
    elif score >= 60:
        level = "Standard"
    elif score >= 50:
        level = "Fairly Difficult"
    elif score >= 30:
        level = "Difficult"
    else:
        level = "Very Difficult"

    return round(score, 1), level


def _calculate_reading_time(text):
    """Calculate reading time, speaking time, and various text statistics."""
    words = re.findall(r'\b\S+\b', text)
    word_count = len(words)

    characters = len(text)
    characters_no_spaces = len(text.replace(' ', '').replace('\n', '').replace('\t', '').replace('\r', ''))

    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]
    sentence_count = len(sentences)

    paragraphs = re.split(r'\n\s*\n', text.strip())
    paragraphs = [p for p in paragraphs if p.strip()]
    paragraph_count = len(paragraphs) if text.strip() else 0

    # Average word length
    if word_count > 0:
        avg_word_length = round(sum(len(w) for w in words) / word_count, 1)
    else:
        avg_word_length = 0

    # Average words per sentence
    avg_words_per_sentence = round(word_count / sentence_count, 1) if sentence_count > 0 else 0

    # Reading time: average adult reads ~200-250 wpm
    reading_wpm = 200
    reading_minutes = word_count / reading_wpm
    if reading_minutes < 1:
        reading_time_str = f"{max(1, round(reading_minutes * 60))} sec"
    else:
        mins = int(reading_minutes)
        secs = round((reading_minutes - mins) * 60)
        reading_time_str = f"{mins} min {secs} sec"

    # Speaking time: average ~130-150 wpm
    speaking_wpm = 130
    speaking_minutes = word_count / speaking_wpm
    if speaking_minutes < 1:
        speaking_time_str = f"{max(1, round(speaking_minutes * 60))} sec"
    else:
        mins = int(speaking_minutes)
        secs = round((speaking_minutes - mins) * 60)
        speaking_time_str = f"{mins} min {secs} sec"

    # Readability
    flesch_score, flesch_level = _flesch_reading_ease(text)

    return {
        "reading_time": reading_time_str,
        "reading_time_minutes": round(reading_minutes, 2),
        "speaking_time": speaking_time_str,
        "speaking_time_minutes": round(speaking_minutes, 2),
        "word_count": word_count,
        "character_count": characters,
        "character_count_no_spaces": characters_no_spaces,
        "sentence_count": sentence_count,
        "paragraph_count": paragraph_count,
        "average_word_length": avg_word_length,
        "average_words_per_sentence": avg_words_per_sentence,
        "flesch_reading_ease": flesch_score,
        "readability_level": flesch_level,
    }


@writing_tools_bp.route("/reading-time", methods=["GET"])
def reading_time_page():
    """Render the Reading Time Calculator web UI."""
    return render_template("tools/reading-time.html")


@writing_tools_bp.route("/reading-time/calculate", methods=["POST"])
def reading_time_api():
    """API: calculate reading time and text statistics."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")

        if not text.strip():
            return jsonify({"status": "error", "message": "No text provided."})

        stats = _calculate_reading_time(text)

        log_tool_usage("reading-time", "calculate", f"words={stats['word_count']}")

        return jsonify({
            "status": "success",
            "data": stats,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 4. Text Case Converter
# =========================================================================

TITLE_CASE_MINOR = {
    'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to',
    'by', 'in', 'of', 'off', 'out', 'up', 'as', 'if', 'so', 'is', 'am',
    'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'can', 'could', 'will', 'would', 'shall', 'should',
    'may', 'might', 'must', 'with', 'from', 'into', 'over', 'after', 'before',
}


def _to_uppercase(text):
    return text.upper()


def _to_lowercase(text):
    return text.lower()


def _to_title_case(text):
    """Convert to title case (first letter of each word capitalized, minor words lowercase)."""
    words = text.split()
    if not words:
        return text

    result = [words[0].capitalize()]
    for word in words[1:]:
        lower_word = word.lower()
        if lower_word in TITLE_CASE_MINOR and len(lower_word) < 5:
            result.append(lower_word)
        else:
            # Handle words with hyphens or slashes
            if '-' in word:
                parts = word.split('-')
                result.append('-'.join(p.capitalize() for p in parts))
            else:
                result.append(word.capitalize())
    return ' '.join(result)


def _to_sentence_case(text):
    """Convert to sentence case (first letter of each sentence capitalized)."""
    sentences = re.split(r'([.!?]\s*)', text)
    result = []
    capitalize_next = True
    for part in sentences:
        if capitalize_next and part.strip():
            result.append(part[0].upper() + part[1:].lower() if len(part) > 1 else part.upper())
            capitalize_next = False
        else:
            result.append(part.lower())
            if re.search(r'[.!?]', part):
                capitalize_next = True
    return ''.join(result)


def _to_camel_case(text):
    """Convert to camelCase."""
    words = re.split(r'[\s_-]+', text.strip().lower())
    if not words:
        return ""
    return words[0] + ''.join(w.capitalize() for w in words[1:] if w)


def _to_pascal_case(text):
    """Convert to PascalCase."""
    words = re.split(r'[\s_-]+', text.strip().lower())
    return ''.join(w.capitalize() for w in words if w)


def _to_snake_case(text):
    """Convert to snake_case."""
    words = re.split(r'[\s_-]+', text.strip().lower())
    return '_'.join(w for w in words if w)


def _to_kebab_case(text):
    """Convert to kebab-case."""
    words = re.split(r'[\s_-]+', text.strip().lower())
    return '-'.join(w for w in words if w)


def _to_constant_case(text):
    """Convert to CONSTANT_CASE."""
    words = re.split(r'[\s_-]+', text.strip().upper())
    return '_'.join(w for w in words if w)


def _to_alternating_case(text):
    """Convert to aLtErNaTiNg cAsE."""
    result = []
    i = 0
    for ch in text:
        if ch.isalpha():
            result.append(ch.upper() if i % 2 == 0 else ch.lower())
            i += 1
        else:
            result.append(ch)
    return ''.join(result)


def _to_dot_case(text):
    """Convert to dot.case."""
    words = re.split(r'[\s_-]+', text.strip().lower())
    return '.'.join(w for w in words if w)


CASE_CONVERTERS = {
    "uppercase": _to_uppercase,
    "lowercase": _to_lowercase,
    "title_case": _to_title_case,
    "sentence_case": _to_sentence_case,
    "camelCase": _to_camel_case,
    "PascalCase": _to_pascal_case,
    "snake_case": _to_snake_case,
    "kebab-case": _to_kebab_case,
    "CONSTANT_CASE": _to_constant_case,
    "alternating_case": _to_alternating_case,
    "dot.case": _to_dot_case,
}


@writing_tools_bp.route("/text-case", methods=["GET"])
def text_case_page():
    """Render the Text Case Converter web UI."""
    return render_template("tools/text-case.html")


@writing_tools_bp.route("/text-case/convert", methods=["POST"])
def text_case_convert_api():
    """API: convert text to a specified case."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")
        case_type = data.get("case_type", "uppercase")

        if not text.strip():
            return jsonify({"status": "error", "message": "No text provided."})

        if case_type not in CASE_CONVERTERS:
            valid = ", ".join(sorted(CASE_CONVERTERS.keys()))
            return jsonify({"status": "error", "message": f"Unknown case type: {case_type}. Supported: {valid}"})

        result = CASE_CONVERTERS[case_type](text)

        log_tool_usage("text-case", "convert", f"case={case_type}")

        return jsonify({
            "status": "success",
            "data": {
                "result": result,
                "case_type": case_type,
                "original_length": len(text),
                "result_length": len(result),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 5. Content Planner / Calendar
# =========================================================================

@writing_tools_bp.route("/content-planner", methods=["GET"])
def content_planner_page():
    """Render the Content Planner web UI."""
    return render_template("tools/content-planner.html")


@writing_tools_bp.route("/content-planner/add", methods=["POST"])
def content_planner_add_api():
    """API: add a new content idea to the plan."""
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title", "").strip()
        description = data.get("description", "").strip()
        category = data.get("category", "general").strip()
        target_date = data.get("target_date", "").strip()
        status = data.get("status", "idea").strip()

        if not title:
            return jsonify({"status": "error", "message": "Title is required."})

        # Validate status
        valid_statuses = ["idea", "draft", "in_progress", "review", "scheduled", "published", "archived"]
        if status not in valid_statuses:
            return jsonify({"status": "error", "message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"})

        # Validate date format if provided
        if target_date:
            try:
                datetime.strptime(target_date, "%Y-%m-%d")
            except ValueError:
                return jsonify({"status": "error", "message": "Invalid target_date format. Use YYYY-MM-DD."})

        conn = _get_planner_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO content_plan (title, description, category, target_date, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (title, description, category, target_date, status, datetime.now(), datetime.now()))
        conn.commit()
        item_id = cursor.lastrowid
        conn.close()

        log_tool_usage("content-planner", "add", f"title={title[:50]}, category={category}")

        return jsonify({
            "status": "success",
            "data": {
                "id": item_id,
                "title": title,
                "description": description,
                "category": category,
                "target_date": target_date,
                "status": status,
                "message": "Content idea added successfully.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@writing_tools_bp.route("/content-planner/list", methods=["GET"])
def content_planner_list_api():
    """API: list all planned content items."""
    try:
        category = request.args.get("category", "").strip()
        status = request.args.get("status", "").strip()
        sort = request.args.get("sort", "created_at").strip()
        order = request.args.get("order", "desc").strip()

        conn = _get_planner_db()
        cursor = conn.cursor()

        query = "SELECT * FROM content_plan WHERE 1=1"
        params = []

        if category:
            query += " AND category = ?"
            params.append(category)
        if status:
            query += " AND status = ?"
            params.append(status)

        # Validate sort field
        valid_sorts = ["created_at", "updated_at", "target_date", "title", "status"]
        if sort not in valid_sorts:
            sort = "created_at"

        direction = "DESC" if order.lower() == "desc" else "ASC"
        query += f" ORDER BY {sort} {direction}"

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        items = [dict(row) for row in rows]

        # Group by date for calendar view
        calendar = {}
        for item in items:
            date_key = item.get("target_date", "unscheduled")
            if date_key:
                if date_key not in calendar:
                    calendar[date_key] = []
                calendar[date_key].append(item)

        log_tool_usage("content-planner", "list", f"items={len(items)}")

        return jsonify({
            "status": "success",
            "data": {
                "items": items,
                "total": len(items),
                "calendar": calendar,
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@writing_tools_bp.route("/content-planner/<int:item_id>", methods=["DELETE"])
def content_planner_delete_api(item_id):
    """API: remove a content idea from the plan."""
    try:
        conn = _get_planner_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM content_plan WHERE id = ?", (item_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            return jsonify({"status": "error", "message": f"Content idea with id {item_id} not found."})

        cursor.execute("DELETE FROM content_plan WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()

        log_tool_usage("content-planner", "delete", f"id={item_id}")

        return jsonify({
            "status": "success",
            "data": {
                "id": item_id,
                "message": "Content idea removed successfully.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@writing_tools_bp.route("/content-planner/<int:item_id>", methods=["PUT"])
def content_planner_update_api(item_id):
    """API: update a content idea."""
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title", "").strip()
        description = data.get("description", "").strip()
        category = data.get("category", "").strip()
        target_date = data.get("target_date", "").strip()
        status = data.get("status", "").strip()

        conn = _get_planner_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM content_plan WHERE id = ?", (item_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            return jsonify({"status": "error", "message": f"Content idea with id {item_id} not found."})

        # Only update provided fields
        updates = []
        params = []
        if title:
            updates.append("title = ?")
            params.append(title)
        if description is not None:
            updates.append("description = ?")
            params.append(description)
        if category:
            updates.append("category = ?")
            params.append(category)
        if target_date is not None:
            updates.append("target_date = ?")
            params.append(target_date)
        if status:
            updates.append("status = ?")
            params.append(status)

        if not updates:
            conn.close()
            return jsonify({"status": "error", "message": "No fields to update."})

        updates.append("updated_at = ?")
        params.append(datetime.now())
        params.append(item_id)

        query = f"UPDATE content_plan SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
        conn.close()

        log_tool_usage("content-planner", "update", f"id={item_id}")

        return jsonify({
            "status": "success",
            "data": {
                "id": item_id,
                "message": "Content idea updated successfully.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 6. Blog Post Manager
# =========================================================================

@writing_tools_bp.route("/blog-manager", methods=["GET"])
def blog_manager_page():
    """Render the Blog Post Manager web UI."""
    return render_template("tools/blog-manager.html")


@writing_tools_bp.route("/blog-manager", methods=["POST"])
def blog_manager_create_api():
    """API: create a new blog post."""
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title", "").strip()
        content = data.get("content", "").strip()
        post_type = data.get("type", "blog").strip()
        tags = data.get("tags", "").strip()
        status = data.get("status", "draft").strip()
        seo_title = data.get("seo_title", "").strip()
        seo_description = data.get("seo_description", "").strip()

        if not title:
            return jsonify({"status": "error", "message": "Title is required."})

        valid_statuses = ["draft", "published", "archived", "scheduled"]
        if status not in valid_statuses:
            return jsonify({"status": "error", "message": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"})

        valid_types = ["blog", "article", "page", "review", "tutorial"]
        if post_type not in valid_types:
            return jsonify({"status": "error", "message": f"Invalid type. Must be one of: {', '.join(valid_types)}"})

        # Auto-generate SEO title/description if not provided
        if not seo_title:
            seo_title = title
        if not seo_description:
            # Take first 160 chars of content as SEO description
            seo_description = content[:157] + "..." if len(content) > 160 else content

        post_id = save_content_post(title, content, post_type, tags, status, seo_title, seo_description)

        log_tool_usage("blog-manager", "create", f"title={title[:50]}, type={post_type}")

        return jsonify({
            "status": "success",
            "data": {
                "id": post_id,
                "title": title,
                "type": post_type,
                "tags": tags,
                "status": status,
                "seo_title": seo_title,
                "seo_description": seo_description,
                "message": "Blog post created successfully.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@writing_tools_bp.route("/blog-manager/list", methods=["GET"])
def blog_manager_list_api():
    """API: list all blog posts with optional filtering."""
    try:
        post_type = request.args.get("type", "").strip() or None
        status = request.args.get("status", "").strip() or None

        posts = get_all_posts(post_type=post_type, status=status)

        log_tool_usage("blog-manager", "list", f"posts={len(posts)}")

        return jsonify({
            "status": "success",
            "data": {
                "posts": posts,
                "total": len(posts),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@writing_tools_bp.route("/blog-manager/<int:post_id>", methods=["GET"])
def blog_manager_get_api(post_id):
    """API: get a single blog post by ID."""
    try:
        posts = get_all_posts()
        post = None
        for p in posts:
            if p.get("id") == post_id:
                post = p
                break

        if not post:
            return jsonify({"status": "error", "message": f"Post with id {post_id} not found."})

        # Add word count
        content = post.get("content", "")
        word_count = len(re.findall(r'\b\S+\b', content)) if content else 0

        post_data = dict(post)
        post_data["word_count"] = word_count

        log_tool_usage("blog-manager", "get", f"id={post_id}")

        return jsonify({
            "status": "success",
            "data": post_data,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@writing_tools_bp.route("/blog-manager/<int:post_id>", methods=["DELETE"])
def blog_manager_delete_api(post_id):
    """API: delete a blog post."""
    try:
        import database as db_module
        conn = db_module.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title FROM content_posts WHERE id = ?", (post_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            return jsonify({"status": "error", "message": f"Post with id {post_id} not found."})

        post_title = dict(existing).get("title", "")
        cursor.execute("DELETE FROM content_posts WHERE id = ?", (post_id,))
        conn.commit()
        conn.close()

        log_tool_usage("blog-manager", "delete", f"id={post_id}, title={post_title[:50]}")

        return jsonify({
            "status": "success",
            "data": {
                "id": post_id,
                "message": "Blog post deleted successfully.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


@writing_tools_bp.route("/blog-manager/<int:post_id>", methods=["PUT"])
def blog_manager_update_api(post_id):
    """API: update a blog post."""
    try:
        import database as db_module
        data = request.get_json(silent=True) or {}
        title = data.get("title", "").strip()
        content = data.get("content", "").strip()
        post_type = data.get("type", "").strip()
        tags = data.get("tags", "").strip()
        status = data.get("status", "").strip()
        seo_title = data.get("seo_title", "").strip()
        seo_description = data.get("seo_description", "").strip()

        conn = db_module.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM content_posts WHERE id = ?", (post_id,))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            return jsonify({"status": "error", "message": f"Post with id {post_id} not found."})

        updates = []
        params = []
        if title:
            updates.append("title = ?")
            params.append(title)
        if content is not None:
            updates.append("content = ?")
            params.append(content)
        if post_type:
            updates.append("type = ?")
            params.append(post_type)
        if tags is not None:
            updates.append("tags = ?")
            params.append(tags)
        if status:
            updates.append("status = ?")
            params.append(status)
        if seo_title is not None:
            updates.append("seo_title = ?")
            params.append(seo_title)
        if seo_description is not None:
            updates.append("seo_description = ?")
            params.append(seo_description)

        if not updates:
            conn.close()
            return jsonify({"status": "error", "message": "No fields to update."})

        updates.append("updated_at = ?")
        params.append(datetime.now())
        params.append(post_id)

        query = f"UPDATE content_posts SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
        conn.close()

        log_tool_usage("blog-manager", "update", f"id={post_id}")

        return jsonify({
            "status": "success",
            "data": {
                "id": post_id,
                "message": "Blog post updated successfully.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 7. Newsletter Builder
# =========================================================================

def _hex_to_rgb_tuple(hex_color):
    """Convert a hex color string to an (R, G, B) tuple."""
    hex_color = hex_color.strip().lstrip('#')
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    if len(hex_color) != 6:
        return (51, 102, 204)  # fallback blue
    try:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        return (r, g, b)
    except ValueError:
        return (51, 102, 204)


def _lighten_color(hex_color, factor=0.8):
    """Lighten a hex color by a factor (0-1, where 1 = no change)."""
    r, g, b = _hex_to_rgb_tuple(hex_color)
    r = int(r + (255 - r) * (1 - factor))
    g = int(g + (255 - g) * (1 - factor))
    b = int(b + (255 - b) * (1 - factor))
    return f"#{r:02x}{g:02x}{b:02x}"


def _darken_color(hex_color, factor=0.2):
    """Darken a hex color by a factor (0-1, where 0 = black)."""
    r, g, b = _hex_to_rgb_tuple(hex_color)
    r = int(r * factor)
    g = int(g * factor)
    b = int(b * factor)
    return f"#{r:02x}{g:02x}{b:02x}"


def _generate_newsletter_html(title, content_sections, cta_text, cta_link,
                                sender_name, brand_color):
    """Generate a responsive HTML email template with inline CSS."""
    if isinstance(content_sections, str):
        try:
            content_sections = json.loads(content_sections)
        except (json.JSONDecodeError, TypeError):
            content_sections = [{"heading": "Content", "body": content_sections}]

    brand_color = brand_color or "#3366CC"
    light_bg = _lighten_color(brand_color, 0.92)
    dark_color = _darken_color(brand_color, 0.7)
    today = datetime.now().strftime("%B %d, %Y")

    # Build content section HTML
    sections_html = ""
    for idx, section in enumerate(content_sections):
        heading = section.get("heading", "")
        body = section.get("body", "")
        image_url = section.get("image_url", "")

        sections_html += f"""
        <tr>
            <td style="padding: 20px 30px; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.6; color: #333333;">
                {"<h2 style='margin: 0 0 12px 0; font-size: 22px; color: #1a1a1a;'>" + _html_escape(heading) + "</h2>" if heading else ""}
                {"<img src='" + _html_escape(image_url) + "' alt='" + _html_escape(heading) + "' style='max-width: 100%; height: auto; display: block; margin-bottom: 15px; border-radius: 6px;' />" if image_url else ""}
                {_html_escape(body).replace('\n', '<br>')}
            </td>
        </tr>"""

        # Add spacing between sections
        if idx < len(content_sections) - 1:
            sections_html += """
        <tr>
            <td style="padding: 0 30px;">
                <hr style="border: none; border-top: 1px solid #eeeeee; margin: 10px 0;" />
            </td>
        </tr>"""

    # CTA button HTML
    cta_html = ""
    if cta_text and cta_link:
        cta_html = f"""
        <tr>
            <td style="padding: 30px; text-align: center;">
                <a href="{_html_escape(cta_link)}" target="_blank"
                   style="display: inline-block; padding: 14px 40px; background-color: {brand_color};
                          color: #ffffff; text-decoration: none; font-family: Arial, Helvetica, sans-serif;
                          font-size: 16px; font-weight: bold; border-radius: 6px; letter-spacing: 0.5px;">
                    {_html_escape(cta_text)}
                </a>
            </td>
        </tr>"""

    html = f"""<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{_html_escape(title)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, Helvetica, sans-serif;">
    <!-- Preheader text (hidden) -->
    <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
        {_html_escape(content_sections[0].get("body", "")[:100]) if content_sections else ""}
    </div>

    <!-- Full-width wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color: #f4f4f4; padding: 20px 0;">
        <tr>
            <td align="center">
                <!-- Main container: 600px -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
                       style="background-color: #ffffff; border-radius: 8px; overflow: hidden;
                              box-shadow: 0 2px 8px rgba(0,0,0,0.06); max-width: 600px; width: 100%;">

                    <!-- Header -->
                    <tr>
                        <td style="background-color: {brand_color}; padding: 30px 30px 25px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-family: Arial, Helvetica, sans-serif;
                                       font-size: 24px; font-weight: bold; line-height: 1.3;">
                                {_html_escape(title)}
                            </h1>
                            <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.85); font-family: Arial, Helvetica, sans-serif;
                                       font-size: 13px;">
                                {today}
                                {" &middot; " + _html_escape(sender_name) if sender_name else ""}
                            </p>
                        </td>
                    </tr>

                    <!-- Content Sections -->
                    {sections_html}

                    <!-- CTA Button -->
                    {cta_html}

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: {light_bg}; padding: 25px 30px; text-align: center;
                                   font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #777777; line-height: 1.5;">
                            <p style="margin: 0 0 8px 0;">
                                {"Sent by " + _html_escape(sender_name) if sender_name else "Sent by our team"}
                            </p>
                            <p style="margin: 0 0 8px 0;">
                                <a href="{{UNSUBSCRIBE_URL}}" style="color: {dark_color}; text-decoration: underline;">Unsubscribe</a>
                                &nbsp;&middot;&nbsp;
                                <a href="{{PREFERENCES_URL}}" style="color: {dark_color}; text-decoration: underline;">Email Preferences</a>
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #999999;">
                                You received this email because you subscribed to our newsletter.
                            </p>
                        </td>
                    </tr>

                </table>
                <!-- /Main container -->
            </td>
        </tr>
    </table>
    <!-- /Full-width wrapper -->
</body>
</html>"""

    return html


@writing_tools_bp.route("/newsletter-builder", methods=["GET"])
def newsletter_builder_page():
    """Render the Newsletter Builder web UI."""
    return render_template("tools/newsletter-builder.html")


@writing_tools_bp.route("/newsletter-builder/generate", methods=["POST"])
def newsletter_builder_api():
    """API: generate a responsive HTML email template."""
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title", "Newsletter").strip()
        content_sections = data.get("content_sections", [])
        cta_text = data.get("cta_text", "").strip()
        cta_link = data.get("cta_link", "").strip()
        sender_name = data.get("sender_name", "").strip()
        brand_color = data.get("brand_color", "#3366CC").strip()

        if not title:
            return jsonify({"status": "error", "message": "Title is required."})

        if not content_sections:
            content_sections = [{"heading": "Welcome!", "body": "Add your content here."}]

        # Validate brand color format
        if not re.match(r'^#?[0-9a-fA-F]{3,6}$', brand_color):
            return jsonify({"status": "error", "message": "Invalid brand color format. Use hex like #3366CC."})

        # Validate content_sections structure
        if isinstance(content_sections, list):
            for section in content_sections:
                if not isinstance(section, dict):
                    return jsonify({"status": "error", "message": "Each content section must be an object with 'heading' and 'body' fields."})

        html_output = _generate_newsletter_html(
            title, content_sections, cta_text, cta_link, sender_name, brand_color
        )

        log_tool_usage("newsletter-builder", "generate", f"title={title[:50]}")

        return jsonify({
            "status": "success",
            "data": {
                "html": html_output,
                "title": title,
                "sections_count": len(content_sections),
                "has_cta": bool(cta_text and cta_link),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 8. Meta Tag Generator
# =========================================================================

def _escape_attr(value):
    """Escape a string for use in an HTML attribute."""
    return value.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;').replace('>', '&gt;')


def _generate_meta_tags(title, description, keywords, url, author, image_url, twitter_handle):
    """Generate complete HTML meta tags block (Open Graph, Twitter Card, standard SEO)."""
    tags = []

    # --- Standard SEO Meta Tags ---
    tags.append(f'<title>{_escape_attr(title)}</title>')
    if description:
        tags.append(f'<meta name="description" content="{_escape_attr(description)}" />')
    if keywords:
        tags.append(f'<meta name="keywords" content="{_escape_attr(keywords)}" />')
    if author:
        tags.append(f'<meta name="author" content="{_escape_attr(author)}" />')

    tags.append('<meta name="robots" content="index, follow" />')
    tags.append('<meta name="viewport" content="width=device-width, initial-scale=1.0" />')
    tags.append('<meta charset="UTF-8" />')

    # Canonical URL
    if url:
        tags.append(f'<link rel="canonical" href="{_escape_attr(url)}" />')

    # --- Open Graph (Facebook, LinkedIn, etc.) ---
    tags.append(f'<meta property="og:type" content="article" />')
    tags.append(f'<meta property="og:title" content="{_escape_attr(title)}" />')
    if description:
        tags.append(f'<meta property="og:description" content="{_escape_attr(description)}" />')
    if url:
        tags.append(f'<meta property="og:url" content="{_escape_attr(url)}" />')
    if image_url:
        tags.append(f'<meta property="og:image" content="{_escape_attr(image_url)}" />')
        # Add image dimensions if we can guess
        tags.append(f'<meta property="og:image:width" content="1200" />')
        tags.append(f'<meta property="og:image:height" content="630" />')
    tags.append(f'<meta property="og:site_name" content="{_escape_attr(author or title)}" />')
    tags.append(f'<meta property="og:locale" content="en_US" />')

    # --- Twitter Card ---
    if image_url:
        tags.append('<meta name="twitter:card" content="summary_large_image" />')
    else:
        tags.append('<meta name="twitter:card" content="summary" />')
    tags.append(f'<meta name="twitter:title" content="{_escape_attr(title)}" />')
    if description:
        tags.append(f'<meta name="twitter:description" content="{_escape_attr(description)}" />')
    if image_url:
        tags.append(f'<meta name="twitter:image" content="{_escape_attr(image_url)}" />')
    if twitter_handle:
        handle = twitter_handle.lstrip('@')
        tags.append(f'<meta name="twitter:creator" content="@{_escape_attr(handle)}" />')

    # --- Additional useful tags ---
    tags.append('<meta name="theme-color" content="#ffffff" />')

    # JSON-LD structured data (basic Article schema)
    json_ld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description or "",
    }
    if author:
        json_ld["author"] = {"@type": "Person", "name": author}
    if url:
        json_ld["mainEntityOfPage"] = {"@type": "WebPage", "@id": url}
    if image_url:
        json_ld["image"] = image_url

    tags.append(f'<script type="application/ld+json">{json.dumps(json_ld, indent=2)}</script>')

    return '\n'.join(tags)


@writing_tools_bp.route("/meta-generator", methods=["GET"])
def meta_generator_page():
    """Render the Meta Tag Generator web UI."""
    return render_template("tools/meta-generator.html")


@writing_tools_bp.route("/meta-generator/generate", methods=["POST"])
def meta_generator_api():
    """API: generate HTML meta tags for SEO."""
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title", "").strip()
        description = data.get("description", "").strip()
        keywords = data.get("keywords", "").strip()
        url = data.get("url", "").strip()
        author = data.get("author", "").strip()
        image_url = data.get("image_url", "").strip()
        twitter_handle = data.get("twitter_handle", "").strip()

        if not title:
            return jsonify({"status": "error", "message": "Title is required."})

        meta_html = _generate_meta_tags(title, description, keywords, url, author, image_url, twitter_handle)

        # Truncate description for display
        seo_description = description[:155] + "..." if len(description) > 160 else description

        log_tool_usage("meta-generator", "generate", f"title={title[:50]}")

        return jsonify({
            "status": "success",
            "data": {
                "meta_tags": meta_html,
                "title_length": len(title),
                "description_length": len(description),
                "title_seo_ok": 30 <= len(title) <= 60,
                "description_seo_ok": 120 <= len(description) <= 160,
                "title_recommendation": "Title length is optimal (30-60 chars)." if 30 <= len(title) <= 60
                    else "Title should be between 30-60 characters for best SEO." if len(title) > 60
                    else "Title is too short. Aim for 30-60 characters.",
                "description_recommendation": "Description length is optimal (120-160 chars)." if 120 <= len(description) <= 160
                    else "Description should be between 120-160 characters." if len(description) > 160
                    else "Description is too short. Aim for 120-160 characters.",
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 9. Word Counter / Text Analyzer
# =========================================================================

STOP_WORDS = {
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further',
    'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'can', 'will', 'just', 'should', 'now', 'is', 'am', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did',
    'doing', 'would', 'could', 'may', 'might', 'shall', 'must', 'i', 'me',
    'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
    'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
    'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
    'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that',
    'these', 'those', 'if', 'as', 'until', 'while', 'because', 'also', 'well',
    'however', 'therefore', 'thus', 'though', 'although', 'yet', 'still',
}


def _analyze_text(text):
    """Perform comprehensive text analysis."""
    if not text.strip():
        return {
            "word_count": 0, "character_count": 0, "character_count_no_spaces": 0,
            "sentence_count": 0, "paragraph_count": 0,
            "top_words": [], "average_word_length": 0,
            "reading_level": "N/A", "longest_word": "", "shortest_word": "",
            "keyword_density": [],
        }

    # Basic counts
    words = re.findall(r'\b[a-zA-Z\']+\b', text.lower())
    word_count = len(words)

    characters = len(text)
    characters_no_spaces = len(text.replace(' ', '').replace('\n', '').replace('\t', '').replace('\r', ''))

    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]
    sentence_count = len(sentences)

    paragraphs = re.split(r'\n\s*\n', text.strip())
    paragraphs = [p for p in paragraphs if p.strip()]
    paragraph_count = len(paragraphs)

    # Average word length
    avg_word_length = round(sum(len(w) for w in words) / word_count, 1) if word_count > 0 else 0

    # Longest and shortest word
    alpha_words = [re.sub(r"[^a-z']", '', w) for w in words if re.sub(r"[^a-z']", '', w)]
    longest_word = max(alpha_words, key=len) if alpha_words else ""
    shortest_word = min(alpha_words, key=len) if alpha_words else ""

    # Top 10 most frequent words (excluding stop words)
    meaningful_words = [w for w in words if w not in STOP_WORDS and len(w) > 1]
    word_freq = {}
    for w in meaningful_words:
        word_freq[w] = word_freq.get(w, 0) + 1

    top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]

    # Reading level
    flesch_score, flesch_level = _flesch_reading_ease(text)

    # Keyword density (top 20 meaningful words with percentage)
    keyword_density = []
    for word, count in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:20]:
        density = round((count / word_count) * 100, 2) if word_count > 0 else 0
        keyword_density.append({
            "word": word,
            "count": count,
            "density_percent": density,
        })

    return {
        "word_count": word_count,
        "character_count": characters,
        "character_count_no_spaces": characters_no_spaces,
        "sentence_count": sentence_count,
        "paragraph_count": paragraph_count,
        "top_words": [{"word": w, "count": c} for w, c in top_words],
        "average_word_length": avg_word_length,
        "reading_level": flesch_level,
        "flesch_score": flesch_score,
        "longest_word": longest_word,
        "shortest_word": shortest_word,
        "keyword_density": keyword_density,
    }


@writing_tools_bp.route("/word-counter", methods=["GET"])
def word_counter_page():
    """Render the Word Counter / Text Analyzer web UI."""
    return render_template("tools/word-counter.html")


@writing_tools_bp.route("/word-counter/analyze", methods=["POST"])
def word_counter_analyze_api():
    """API: analyze text and return comprehensive statistics."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "")

        if not text.strip():
            return jsonify({"status": "error", "message": "No text provided."})

        analysis = _analyze_text(text)

        log_tool_usage("word-counter", "analyze", f"words={analysis['word_count']}")

        return jsonify({
            "status": "success",
            "data": analysis,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 10. Auto-Tagger
# =========================================================================

EXTENDED_STOP_WORDS = STOP_WORDS | {
    'said', 'like', 'get', 'got', 'go', 'went', 'goes', 'going', 'gone',
    'make', 'made', 'take', 'took', 'taken', 'come', 'came', 'give', 'gave',
    'know', 'knew', 'known', 'see', 'saw', 'seen', 'think', 'thought',
    'look', 'find', 'found', 'tell', 'told', 'use', 'used', 'using',
    'new', 'old', 'first', 'last', 'one', 'two', 'three', 'many', 'much',
    'way', 'even', 'back', 'well', 'long', 'great', 'little', 'right',
    'big', 'high', 'different', 'small', 'large', 'next', 'early', 'young',
    'important', 'public', 'bad', 'good', 'day', 'time', 'people', 'work',
    'part', 'help', 'want', 'world', 'life', 'hand', 'thing', 'man', 'woman',
    'child', 'eye', 'place', 'case', 'week', 'company', 'system', 'program',
    'question', 'during', 'number', 'group', 'never', 'let', 'keep',
    'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power',
    'hour', 'game', 'line', 'end', 'member', 'law', 'car', 'city',
    'community', 'name', 'really', 'already', 'also', 'another', 'something',
    'nothing', 'everything', 'anything', 'still', 'enough', 'able',
    'since', 'without', 'around', 'upon', 'against', 'including',
    'per', 'via', 'etc', 'vs', 'e.g.', 'i.e.',
}


def _extract_tags(text, max_tags=15):
    """Extract tags from text content using frequency analysis and phrase extraction."""
    if not text.strip():
        return {"tags": [], "categories": []}

    # Clean and tokenize
    cleaned = text.lower()
    # Remove markdown syntax
    cleaned = re.sub(r'[#*`\[\]()>!_~|]', ' ', cleaned)
    # Remove URLs
    cleaned = re.sub(r'https?://\S+', ' ', cleaned)
    # Remove email addresses
    cleaned = re.sub(r'\S+@\S+', ' ', cleaned)
    # Keep only alphanumeric, spaces, and hyphens
    cleaned = re.sub(r'[^a-z0-9\s-]', ' ', cleaned)
    # Collapse whitespace
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    words = cleaned.split()

    # --- Single-word tags ---
    meaningful_words = [w for w in words if w not in EXTENDED_STOP_WORDS and len(w) > 2]
    single_word_freq = {}
    for w in meaningful_words:
        single_word_freq[w] = single_word_freq.get(w, 0) + 1

    # --- Bigram (2-word) phrases ---
    bigrams = []
    for i in range(len(words) - 1):
        w1, w2 = words[i], words[i + 1]
        if w1 not in EXTENDED_STOP_WORDS and w2 not in EXTENDED_STOP_WORDS and \
                len(w1) > 2 and len(w2) > 2:
            bigram = f"{w1} {w2}"
            bigrams.append(bigram)

    bigram_freq = {}
    for b in bigrams:
        bigram_freq[b] = bigram_freq.get(b, 0) + 1

    # --- Trigram (3-word) phrases ---
    trigrams = []
    for i in range(len(words) - 2):
        w1, w2, w3 = words[i], words[i + 1], words[i + 2]
        if all(w not in EXTENDED_STOP_WORDS and len(w) > 2 for w in [w1, w2, w3]):
            trigram = f"{w1} {w2} {w3}"
            trigrams.append(trigram)

    trigram_freq = {}
    for t in trigrams:
        trigram_freq[t] = trigram_freq.get(t, 0) + 1

    # --- Build final tag list with scores ---
    tags = []

    # Add trigrams (higher weight)
    for phrase, count in sorted(trigram_freq.items(), key=lambda x: x[1], reverse=True)[:5]:
        if count >= 1:
            tags.append({"tag": phrase, "type": "phrase", "score": count * 3})

    # Add bigrams
    for phrase, count in sorted(bigram_freq.items(), key=lambda x: x[1], reverse=True)[:5]:
        if count >= 1 and phrase not in [t["tag"] for t in tags]:
            tags.append({"tag": phrase, "type": "phrase", "score": count * 2})

    # Add single words
    for word, count in sorted(single_word_freq.items(), key=lambda x: x[1], reverse=True)[:max_tags]:
        if word not in [t["tag"] for t in tags]:
            tags.append({"tag": word, "type": "word", "score": count})

    # Sort by score and limit
    tags.sort(key=lambda x: x["score"], reverse=True)
    tags = tags[:max_tags]

    # --- Category detection ---
    category_keywords = {
        "technology": ["software", "hardware", "computer", "programming", "code", "algorithm",
                        "data", "machine", "learning", "ai", "api", "database", "server", "cloud",
                        "web", "app", "mobile", "tech", "digital", "cybersecurity", "blockchain"],
        "marketing": ["brand", "campaign", "audience", "conversion", "seo", "social media",
                       "content", "engagement", "analytics", "traffic", "funnel", "lead",
                       "advertising", "promotion", "strategy", "target", "growth", "roi"],
        "finance": ["money", "investment", "stock", "market", "economy", "bank", "budget",
                      "profit", "revenue", "financial", "tax", "crypto", "trading", "funds"],
        "health": ["health", "fitness", "exercise", "diet", "nutrition", "wellness", "mental",
                     "medical", "doctor", "patient", "symptoms", "treatment", "therapy",
                     "stress", "sleep", "weight"],
        "education": ["learn", "teach", "school", "student", "course", "education", "study",
                        "university", "training", "skill", "knowledge", "tutorial", "class"],
        "business": ["business", "startup", "company", "entrepreneur", "management", "product",
                      "leadership", "team", "project", "client", "customer", "innovation"],
        "lifestyle": ["travel", "food", "recipe", "cooking", "home", "design", "fashion",
                        "beauty", "style", "living", "garden", "hobby", "art", "music"],
        "science": ["research", "experiment", "theory", "science", "physics", "chemistry",
                      "biology", "discovery", "study", "analysis", "hypothesis", "laboratory"],
    }

    categories = []
    text_lower = cleaned
    for category, keywords in category_keywords.items():
        match_count = sum(1 for kw in keywords if kw in text_lower)
        if match_count >= 2:
            categories.append({
                "category": category,
                "confidence": round(min(match_count / len(keywords) * 100, 100), 1),
                "matched_keywords": [kw for kw in keywords if kw in text_lower][:5],
            })

    categories.sort(key=lambda x: x["confidence"], reverse=True)

    return {
        "tags": tags,
        "categories": categories,
    }


@writing_tools_bp.route("/auto-tagger", methods=["GET"])
def auto_tagger_page():
    """Render the Auto-Tagger web UI."""
    return render_template("tools/auto-tagger.html")


@writing_tools_bp.route("/auto-tagger/generate", methods=["POST"])
def auto_tagger_api():
    """API: generate tags from content text."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "").strip()
        max_tags = int(data.get("max_tags", 15))

        if not text:
            return jsonify({"status": "error", "message": "No text content provided."})

        if max_tags < 1 or max_tags > 50:
            max_tags = 15

        result = _extract_tags(text, max_tags=max_tags)

        log_tool_usage("auto-tagger", "generate", f"tags={len(result['tags'])}, categories={len(result['categories'])}")

        return jsonify({
            "status": "success",
            "data": {
                "tags": result["tags"],
                "categories": result["categories"],
                "tag_list": [t["tag"] for t in result["tags"]],
                "category_list": [c["category"] for c in result["categories"]],
                "total_tags": len(result["tags"]),
                "total_categories": len(result["categories"]),
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
