"""
ECHO Toolkit — Social & Content Tools
Flask Blueprint with 10 fully functional social media & content utilities.
Each tool exposes a web UI route (GET -> HTML) and an API route (POST -> JSON).
"""

import sys
import os
import re
import json
import math
import random
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from flask import Blueprint, render_template, request, jsonify
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
from datetime import datetime

from database import log_tool_usage

# ---------------------------------------------------------------------------
# Blueprint
# ---------------------------------------------------------------------------
social_tools_bp = Blueprint(
    "social_tools_bp",
    __name__,
    url_prefix="/tools/social",
    template_folder="../../templates",
)

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

STOP_WORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "up", "about", "into", "over", "after", "is", "it",
    "its", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "may", "might",
    "must", "shall", "can", "this", "that", "these", "those", "i", "you", "he",
    "she", "we", "they", "me", "him", "her", "us", "them", "my", "your", "his",
    "our", "their", "what", "which", "who", "whom", "where", "when", "how", "not",
    "no", "nor", "if", "then", "than", "too", "very", "just", "also", "more",
    "most", "some", "any", "all", "each", "every", "both", "few", "other", "so",
    "as", "such", "only", "own", "same", "here", "there", "out", "get", "got",
    "make", "like", "new", "one", "two", "know", "take", "people", "time", "way",
    "use", "say", "said", "many", "well", "back", "even", "give", "day", "think",
}


def _extract_keywords(text, max_keywords=30):
    """Extract significant keywords from text with frequency counting."""
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    word_freq = {}
    for word in words:
        if word not in STOP_WORDS:
            word_freq[word] = word_freq.get(word, 0) + 1

    sorted_words = sorted(word_freq.items(), key=lambda x: (-x[1], x[0]))
    return sorted_words[:max_keywords]


def _count_syllables(word):
    """Estimate syllable count for a word."""
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
    if word.endswith('e') and count > 1:
        count -= 1
    return max(count, 1)


def _flesch_reading_ease(text):
    """Calculate Flesch Reading Ease score (0-100)."""
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
    score = 206.835 - 1.015 * (total_words / total_sentences) - 84.6 * (total_syllables / total_words)
    score = max(0, min(100, round(score, 1)))
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
    return score, level


def _text_statistics(text):
    """Compute word count, sentence count, paragraph count, etc."""
    words = re.findall(r'\b\S+\b', text)
    word_count = len(words)
    sentences = [s for s in re.split(r'[.!?]+', text) if s.strip()]
    sentence_count = len(sentences)
    paragraphs = [p for p in re.split(r'\n\s*\n', text.strip()) if p.strip()]
    paragraph_count = len(paragraphs) if text.strip() else 0
    characters = len(text)
    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "paragraph_count": paragraph_count,
        "character_count": characters,
    }


def _safe_get(url, timeout=10, headers=None):
    """Fetch a URL safely, returning (text, status_code, error_message)."""
    try:
        resp = requests.get(
            url,
            timeout=timeout,
            headers=headers or {
                "User-Agent": "Mozilla/5.0 (compatible; ECHO-Toolkit/1.0; +http://localhost)"
            },
            allow_redirects=True,
        )
        return resp.text, resp.status_code, None
    except requests.Timeout:
        return None, 0, "Request timed out"
    except requests.ConnectionError:
        return None, 0, "Connection failed"
    except requests.TooManyRedirects:
        return None, 0, "Too many redirects"
    except Exception as e:
        return None, 0, str(e)


# =========================================================================
# 1. Hashtag Analyzer
# =========================================================================

HASHTAG_PREFIXES = {
    "marketing": ["digital", "content", "socialmedia", "growth"],
    "tech": ["tech", "coding", "programming", "developer", "dev"],
    "business": ["business", "startup", "entrepreneur", "leadership"],
    "lifestyle": ["lifestyle", "wellness", "motivation", "mindset"],
    "design": ["design", "ui", "ux", "creative", "branding"],
    "education": ["education", "learning", "study", "knowledge"],
    "health": ["health", "fitness", "nutrition", "wellbeing"],
    "food": ["food", "cooking", "recipe", "foodie"],
    "travel": ["travel", "adventure", "explore", "wanderlust"],
    "fashion": ["fashion", "style", "ootd", "trending"],
}

HASHTAG_SUFFIXES = ["tips", "tricks", "guide", "life", "daily", "goals", "hacks", "101",
                    "love", "community", "inspo", "vibes", "matters", "goals2024"]


def _generate_hashtags(text):
    """Extract keywords and generate related hashtags with relevance scoring."""
    keywords = _extract_keywords(text, max_keywords=20)
    total_keyword_freq = sum(freq for _, freq in keywords) or 1

    hashtags = []
    for keyword, freq in keywords:
        base_score = freq / total_keyword_freq

        # Direct hashtag
        hashtag = keyword.replace(" ", "")
        hashtags.append({
            "hashtag": f"#{hashtag}",
            "category": "direct",
            "relevance_score": round(min(base_score * 100, 100), 1),
            "type": "exact_keyword",
        })

        # Capitalized version (CamelCase)
        if len(hashtag) > 3:
            hashtags.append({
                "hashtag": f"#{hashtag.title()}",
                "category": "direct",
                "relevance_score": round(min(base_score * 90, 100), 1),
                "type": "camelcase",
            })

        # Generate combinations with common suffixes
        for suffix in HASHTAG_SUFFIXES[:3]:
            combined = f"{keyword}{suffix}"
            hashtags.append({
                "hashtag": f"#{combined}",
                "category": "long_tail",
                "relevance_score": round(min(base_score * 60, 85), 1),
                "type": "keyword_suffix",
            })

    # Categorize hashtags by topic area
    topic_categories = {}
    for cat_name, cat_prefixes in HASHTAG_PREFIXES.items():
        for keyword, freq in keywords:
            if any(p in keyword for p in cat_prefixes):
                if cat_name not in topic_categories:
                    topic_categories[cat_name] = []
                topic_categories[cat_name].append(f"#{keyword}")

    # Add trending-style hashtags based on detected topic
    trending = []
    for cat_name, detected in topic_categories.items():
        if detected:
            for prefix in HASHTAG_PREFIXES.get(cat_name, [])[:3]:
                tag = f"#{prefix}{random.choice(['trending', 'viral', 'daily', 'tips', 'inspo'])}"
                if tag not in [h["hashtag"] for h in trending]:
                    trending.append({
                        "hashtag": tag,
                        "category": "trending",
                        "relevance_score": round(random.uniform(40, 70), 1),
                        "type": "trending_style",
                    })

    hashtags.extend(trending)

    # Sort by relevance score descending, deduplicate
    seen = set()
    unique_hashtags = []
    for h in hashtags:
        tag_lower = h["hashtag"].lower()
        if tag_lower not in seen and len(h["hashtag"]) <= 100:
            seen.add(tag_lower)
            unique_hashtags.append(h)

    unique_hashtags.sort(key=lambda x: -x["relevance_score"])

    # Determine ideal hashtag count
    total = len(unique_hashtags)
    if total > 30:
        recommended_count = "15-20 (quality over quantity)"
    elif total > 15:
        recommended_count = "10-15 (good mix of niche and broad)"
    elif total > 5:
        recommended_count = "8-12 (use all high-relevance tags)"
    else:
        recommended_count = f"{total} (limited options — consider expanding your content)"

    # Group by category
    by_category = {}
    for h in unique_hashtags:
        cat = h["category"]
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(h["hashtag"])

    return {
        "hashtags": unique_hashtags[:30],
        "total_found": len(unique_hashtags),
        "recommended_count": recommended_count,
        "categories": by_category,
        "top_keywords": [kw for kw, _ in keywords[:10]],
    }


@social_tools_bp.route("/hashtag-analyzer", methods=["GET"])
def hashtag_analyzer_page():
    """Render the Hashtag Analyzer web UI."""
    return render_template("tools/hashtag-analyzer.html")


@social_tools_bp.route("/hashtag-analyzer/analyze", methods=["POST"])
def hashtag_analyzer_api():
    """API: analyze text content and suggest hashtags with relevance scores."""
    try:
        data = request.get_json(silent=True) or {}
        content = data.get("content", "").strip()

        if not content:
            return jsonify({"status": "error", "message": "No content provided."})

        result = _generate_hashtags(content)

        log_tool_usage("hashtag-analyzer", "analyze", f"content_length={len(content)}")

        return jsonify({
            "status": "success",
            "data": result,
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 2. Content Repurposer
# =========================================================================


def _split_into_sentences(text):
    """Split text into sentences."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in sentences if s.strip()]


def _summarize_text(text, max_words=120):
    """Extractive summarization: pick the most important sentences based on keyword frequency."""
    sentences = _split_into_sentences(text)
    if not sentences:
        return ""

    keywords = _extract_keywords(text, max_keywords=15)
    keyword_set = set(kw for kw, _ in keywords)

    scored = []
    for sent in sentences:
        words = set(re.findall(r'\b[a-zA-Z]{3,}\b', sent.lower()))
        score = len(words & keyword_set) / max(len(words), 1)
        # Boost shorter sentences slightly
        score *= (1.0 / (1.0 + 0.05 * len(sent)))
        scored.append((score, sent))

    scored.sort(key=lambda x: -x[0])
    # Keep original order of top sentences
    selected = sorted(scored[:5], key=lambda x: sentences.index(x[1]))

    summary_words = []
    result = []
    for _, sent in selected:
        sent_words = sent.split()
        if len(summary_words) + len(sent_words) > max_words:
            break
        result.append(sent)
        summary_words.extend(sent_words)

    return " ".join(result)


def _extract_bullet_points(text, max_bullets=8):
    """Extract key points as bullet items."""
    sentences = _split_into_sentences(text)
    keywords = _extract_keywords(text, max_keywords=20)
    keyword_set = set(kw for kw, _ in keywords)

    scored = []
    for sent in sentences:
        if len(sent) < 15:
            continue
        words = set(re.findall(r'\b[a-zA-Z]{3,}\b', sent.lower()))
        score = len(words & keyword_set) / max(len(words), 1)
        # Penalize very long sentences
        if len(sent.split()) > 30:
            score *= 0.8
        scored.append((score, sent))

    scored.sort(key=lambda x: -x[0])
    return [sent.strip() for _, sent in scored[:max_bullets]]


def _generate_email_subjects(text, count=5):
    """Generate email subject line variations from content."""
    keywords = _extract_keywords(text, max_keywords=5)
    top_words = [kw for kw, _ in keywords[:3]]
    topic = " ".join(top_words) if top_words else "this"

    # Sentence-based subjects: pick the most informative sentence
    sentences = _split_into_sentences(text)
    short_sents = [s for s in sentences if 5 < len(s.split()) <= 15]

    subjects = []
    # Direct from content
    for s in short_sents[:2]:
        sub = s.rstrip('.')
        if len(sub) <= 60:
            subjects.append(sub)

    # Generated variations
    templates = [
        f"What you need to know about {topic}",
        f"Quick update: {topic}",
        f"Don't miss this — {topic} insights",
        f"{topic}: your weekly digest",
        f"The latest on {topic} — read now",
        f"Expert take: {topic} explained",
        f"Must-read: {topic} trends",
        f"{topic.title()}: what's next?",
    ]

    for tmpl in templates:
        if len(subjects) >= count:
            break
        if tmpl not in subjects:
            subjects.append(tmpl)

    # Calculate character counts and open-rate hints
    result = []
    for sub in subjects[:count]:
        char_count = len(sub)
        if char_count <= 41:
            open_rate_hint = "High (under 41 chars)"
        elif char_count <= 70:
            open_rate_hint = "Good (41-70 chars)"
        else:
            open_rate_hint = "May get truncated (70+ chars)"
        result.append({
            "subject": sub,
            "character_count": char_count,
            "open_rate_hint": open_rate_hint,
        })

    return result


def _repurpose_content(content, target_format):
    """Repurpose long-form content into a target format."""
    if not content.strip():
        return {"error": "No content provided"}

    stats = _text_statistics(content)

    if target_format == "twitter_thread":
        # Split into tweet-sized chunks (~250 chars to allow for numbering)
        sentences = _split_into_sentences(content)
        tweets = []
        current = ""
        for sent in sentences:
            candidate = current + (" " if current else "") + sent
            if len(candidate) > 260 and current:
                tweets.append(current)
                current = sent
            else:
                current = candidate
        if current:
            tweets.append(current)

        # If still too long, force-split
        final_tweets = []
        for tweet in tweets:
            while len(tweet) > 280:
                split_pos = tweet.rfind(' ', 0, 270)
                if split_pos == -1:
                    split_pos = 270
                final_tweets.append(tweet[:split_pos].strip())
                tweet = tweet[split_pos:].strip()
            if tweet:
                final_tweets.append(tweet)

        # Number the tweets
        numbered = []
        total = len(final_tweets)
        for i, tweet in enumerate(final_tweets, 1):
            prefix = f"{i}/{total} "
            # Shrink tweet if numbering makes it too long
            max_tweet_len = 280 - len(prefix)
            if len(tweet) > max_tweet_len:
                tweet = tweet[:max_tweet_len - 3].strip() + "..."
            numbered.append(f"{prefix}{tweet}")

        return {
            "format": "twitter_thread",
            "total_tweets": len(numbered),
            "tweets": numbered,
            "content": "\n\n---\n\n".join(numbered),
            "original_word_count": stats["word_count"],
        }

    elif target_format == "linkedin_post":
        summary = _summarize_text(content, max_words=200)
        bullets = _extract_bullet_points(content, max_bullets=5)
        intro = summary

        parts = []
        parts.append(intro)
        if bullets:
            parts.append("\nKey takeaways:")
            for i, b in enumerate(bullets, 1):
                parts.append(f"\n{i}. {b}")
        parts.append("\n\nWhat are your thoughts? Drop a comment below.")
        parts.append("\n\n#LinkedIn #Content #Insights")

        full_post = "".join(parts)

        return {
            "format": "linkedin_post",
            "content": full_post,
            "character_count": len(full_post),
            "is_within_limit": len(full_post) <= 3000,
            "original_word_count": stats["word_count"],
        }

    elif target_format == "instagram_caption":
        # Short, engaging with hashtags
        summary = _summarize_text(content, max_words=80)
        hashtags_result = _generate_hashtags(content)
        top_hashtags = [h["hashtag"] for h in hashtags_result["hashtags"][:15]]

        caption = summary + "\n\n.\n.\n.\n" + " ".join(top_hashtags)

        return {
            "format": "instagram_caption",
            "content": caption,
            "character_count": len(caption),
            "is_within_limit": len(caption) <= 2200,
            "hashtag_count": len(top_hashtags),
            "original_word_count": stats["word_count"],
        }

    elif target_format == "email_subject":
        subjects = _generate_email_subjects(content, count=6)
        return {
            "format": "email_subject",
            "subjects": subjects,
            "original_word_count": stats["word_count"],
        }

    elif target_format == "summary":
        summary = _summarize_text(content, max_words=150)
        return {
            "format": "summary",
            "content": summary,
            "word_count": len(summary.split()),
            "original_word_count": stats["word_count"],
            "compression_ratio": round(len(summary.split()) / max(stats["word_count"], 1) * 100, 1),
        }

    elif target_format == "bullet_points":
        bullets = _extract_bullet_points(content, max_bullets=10)
        bullet_text = "\n".join(f"• {b}" for b in bullets)
        return {
            "format": "bullet_points",
            "bullets": bullets,
            "content": bullet_text,
            "count": len(bullets),
            "original_word_count": stats["word_count"],
        }

    else:
        return {"error": f"Unsupported format: {target_format}"}


@social_tools_bp.route("/content-repurposer", methods=["GET"])
def content_repurposer_page():
    """Render the Content Repurposer web UI."""
    return render_template("tools/content-repurposer.html")


@social_tools_bp.route("/content-repurposer/convert", methods=["POST"])
def content_repurposer_api():
    """API: repurpose long-form content into a target format."""
    try:
        data = request.get_json(silent=True) or {}
        content = data.get("content", "").strip()
        target_format = data.get("target_format", "").strip()

        if not content:
            return jsonify({"status": "error", "message": "No content provided."})

        valid_formats = [
            "twitter_thread", "linkedin_post", "instagram_caption",
            "email_subject", "summary", "bullet_points",
        ]
        if target_format not in valid_formats:
            return jsonify({
                "status": "error",
                "message": f"Invalid target format: {target_format}. Supported: {', '.join(valid_formats)}",
            })

        result = _repurpose_content(content, target_format)

        if "error" in result:
            return jsonify({"status": "error", "message": result["error"]})

        log_tool_usage("content-repurposer", "convert", f"format={target_format}")

        return jsonify({"status": "success", "data": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 3. Keyword Researcher
# =========================================================================

QUESTION_WORDS = ["how", "what", "why", "when", "where", "which", "who", "can", "is", "does", "should"]
SEARCH_MODIFIERS = [
    "best", "top", "free", "cheap", "online", "tutorial", "guide", "examples",
    "vs", "alternative", "review", "for beginners", "advanced", "tips",
    "tools", "strategy", "course", "certification", "salary", "jobs",
    "near me", "in 2024", "reddit", "quora", "youtube", "pdf", "template",
]
LONG_TAIL_FILLERS = [
    "for small business", "step by step", "without experience",
    "from scratch", "fast and easy", "on a budget", "that works",
    "for beginners", "at home", "with examples", "in 5 minutes",
]


def _estimate_difficulty(keyword):
    """Estimate keyword difficulty (0-100) based on heuristics.

    Factors: word length, word count, common search patterns.
    """
    words = keyword.lower().split()
    score = 20  # base difficulty

    # Shorter keywords are more competitive
    word_count = len(words)
    if word_count == 1:
        score += 40
    elif word_count == 2:
        score += 25
    elif word_count == 3:
        score += 10
    elif word_count >= 5:
        score -= 15

    # Very common modifiers increase competition
    high_competition_words = {
        "best", "free", "how", "what", "guide", "tutorial",
        "top", "review", "online",
    }
    overlap = len(set(words) & high_competition_words)
    score += overlap * 8

    # Very short word (highly competitive)
    if len(keyword) <= 8 and word_count == 1:
        score += 15

    # Long-tail with specific qualifiers is easier
    low_competition = {"without", "alternative", "for beginners", "on a budget"}
    if any(q in keyword.lower() for q in low_competition):
        score -= 10

    return max(5, min(95, score))


def _estimate_volume_hint(keyword):
    """Provide a rough search volume category based on heuristics."""
    words = keyword.lower().split()
    word_count = len(words)

    # Question-based keywords get moderate volume
    if any(w in QUESTION_WORDS for w in words):
        return "1K-10K"

    if word_count == 1:
        return "10K-100K+"
    elif word_count == 2:
        return "1K-50K"
    elif word_count == 3:
        return "100-10K"
    elif word_count == 4:
        return "50-5K"
    else:
        return "10-1K"


def _categorize_keyword(keyword):
    """Categorize a keyword into an intent/topic bucket."""
    kw_lower = keyword.lower()

    informational_words = {"how", "what", "why", "guide", "tutorial", "learn", "examples", "tips", "explained"}
    transactional_words = {"buy", "price", "cheap", "best", "review", "free", "download", "coupon", "discount", "order"}
    navigational_words = {"login", "website", "official", "app", "sign up", "register"}

    words = set(kw_lower.split())

    if words & transactional_words:
        return "transactional"
    elif words & navigational_words:
        return "navigational"
    elif words & informational_words:
        return "informational"
    else:
        return "informational"


def _research_keywords(seed_keyword):
    """Generate related keywords, categorize, and score them."""
    seed = seed_keyword.strip().lower()
    if not seed:
        return []

    keywords_data = []

    # 1. Exact keyword
    keywords_data.append({
        "keyword": seed,
        "category": _categorize_keyword(seed),
        "difficulty": _estimate_difficulty(seed),
        "volume_hint": _estimate_volume_hint(seed),
        "source": "seed",
    })

    # 2. Prefix variations
    for modifier in ["best", "top", "free", "easy", "simple", "complete"]:
        kw = f"{modifier} {seed}"
        keywords_data.append({
            "keyword": kw,
            "category": _categorize_keyword(kw),
            "difficulty": _estimate_difficulty(kw),
            "volume_hint": _estimate_volume_hint(kw),
            "source": "prefix_modifier",
        })

    # 3. Suffix variations
    for modifier in SEARCH_MODIFIERS[:10]:
        kw = f"{seed} {modifier}"
        keywords_data.append({
            "keyword": kw,
            "category": _categorize_keyword(kw),
            "difficulty": _estimate_difficulty(kw),
            "volume_hint": _estimate_volume_hint(kw),
            "source": "suffix_modifier",
        })

    # 4. Question variations
    for qw in QUESTION_WORDS:
        kw = f"{qw} {seed}"
        keywords_data.append({
            "keyword": kw,
            "category": "informational",
            "difficulty": _estimate_difficulty(kw),
            "volume_hint": _estimate_volume_hint(kw),
            "source": "question",
        })

    # 5. Long-tail variations
    for filler in LONG_TAIL_FILLERS[:6]:
        kw = f"{seed} {filler}"
        keywords_data.append({
            "keyword": kw,
            "category": _categorize_keyword(kw),
            "difficulty": _estimate_difficulty(kw),
            "volume_hint": _estimate_volume_hint(kw),
            "source": "long_tail",
        })

    # 6. Plural / singular swap
    if seed.endswith("s") and not seed.endswith("ss"):
        kw = seed[:-1]
    else:
        kw = seed + "s"
    if kw != seed:
        keywords_data.append({
            "keyword": kw,
            "category": _categorize_keyword(kw),
            "difficulty": _estimate_difficulty(kw),
            "volume_hint": _estimate_volume_hint(kw),
            "source": "plural_variation",
        })

    # Sort by estimated difficulty (ascending — easiest first for opportunities)
    keywords_data.sort(key=lambda x: (x["difficulty"], -len(x["keyword"])))

    # Group by category
    by_category = {}
    for kw_info in keywords_data:
        cat = kw_info["category"]
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(kw_info["keyword"])

    return {
        "seed_keyword": seed,
        "keywords": keywords_data,
        "total_keywords": len(keywords_data),
        "categories": by_category,
        "difficulty_distribution": {
            "easy": len([k for k in keywords_data if k["difficulty"] < 30]),
            "medium": len([k for k in keywords_data if 30 <= k["difficulty"] < 60]),
            "hard": len([k for k in keywords_data if k["difficulty"] >= 60]),
        },
    }


@social_tools_bp.route("/keyword-researcher", methods=["GET"])
def keyword_researcher_page():
    """Render the Keyword Researcher web UI."""
    return render_template("tools/keyword-researcher.html")


@social_tools_bp.route("/keyword-researcher/research", methods=["POST"])
def keyword_researcher_api():
    """API: research related keywords for a seed keyword."""
    try:
        data = request.get_json(silent=True) or {}
        seed_keyword = data.get("keyword", "").strip()

        if not seed_keyword:
            return jsonify({"status": "error", "message": "No keyword provided."})

        result = _research_keywords(seed_keyword)

        log_tool_usage("keyword-researcher", "research", f"seed={seed_keyword[:50]}")

        return jsonify({"status": "success", "data": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 4. SEO Audit Tool
# =========================================================================


def _analyze_html_for_seo(html_content, source_url=""):
    """Analyze HTML content for SEO factors."""
    soup = BeautifulSoup(html_content, "html.parser")

    report = {"checks": [], "score": 0, "max_score": 0, "issues": [], "warnings": [], "good": []}

    # --- Title tag ---
    title_tag = soup.find("title")
    title_text = title_tag.get_text(strip=True) if title_tag else ""
    title_check = {
        "name": "Title Tag",
        "status": "good",
        "details": title_text or "MISSING",
        "recommendations": [],
    }
    report["max_score"] += 15
    if not title_text:
        title_check["status"] = "critical"
        title_check["recommendations"].append("Add a title tag between 50-60 characters")
        report["issues"].append("Missing title tag — critical for SEO")
    elif len(title_text) < 30:
        title_check["status"] = "warning"
        title_check["recommendations"].append("Title is too short (aim for 50-60 characters)")
        report["warnings"].append(f"Title too short: {len(title_text)} chars")
        report["score"] += 7
    elif len(title_text) > 60:
        title_check["status"] = "warning"
        title_check["recommendations"].append("Title is too long (aim for 50-60 characters)")
        report["warnings"].append(f"Title too long: {len(title_text)} chars")
        report["score"] += 7
    else:
        report["score"] += 15
        report["good"].append("Title tag length is optimal")
    title_check["length"] = len(title_text)
    report["checks"].append(title_check)

    # --- Meta description ---
    meta_desc = soup.find("meta", attrs={"name": "description"})
    meta_desc_text = meta_desc.get("content", "").strip() if meta_desc else ""
    desc_check = {
        "name": "Meta Description",
        "status": "good",
        "details": meta_desc_text or "MISSING",
        "recommendations": [],
    }
    report["max_score"] += 10
    if not meta_desc_text:
        desc_check["status"] = "critical"
        desc_check["recommendations"].append("Add a meta description between 150-160 characters")
        report["issues"].append("Missing meta description")
    elif len(meta_desc_text) < 120:
        desc_check["status"] = "warning"
        desc_check["recommendations"].append("Meta description is short (aim for 150-160 characters)")
        report["warnings"].append("Meta description too short")
        report["score"] += 5
    elif len(meta_desc_text) > 160:
        desc_check["status"] = "warning"
        desc_check["recommendations"].append("Meta description may be truncated in SERPs (aim for 150-160 characters)")
        report["warnings"].append("Meta description too long")
        report["score"] += 5
    else:
        report["score"] += 10
        report["good"].append("Meta description length is optimal")
    desc_check["length"] = len(meta_desc_text)
    report["checks"].append(desc_check)

    # --- H1 tag ---
    h1_tags = soup.find_all("h1")
    h1_check = {
        "name": "H1 Heading",
        "status": "good",
        "details": f"Found {len(h1_tags)} H1 tag(s)",
        "recommendations": [],
    }
    report["max_score"] += 10
    if len(h1_tags) == 0:
        h1_check["status"] = "critical"
        h1_check["recommendations"].append("Add exactly one H1 tag per page")
        report["issues"].append("Missing H1 tag")
    elif len(h1_tags) > 1:
        h1_check["status"] = "warning"
        h1_check["recommendations"].append("Use only one H1 tag per page for best SEO practice")
        report["warnings"].append("Multiple H1 tags found")
        report["score"] += 5
    else:
        report["score"] += 10
        report["good"].append("Single H1 tag present")
    report["checks"].append(h1_check)

    # --- Heading structure ---
    headings = soup.find_all(re.compile(r'^h[1-6]$'))
    heading_structure = []
    for h in headings:
        heading_structure.append({
            "tag": h.name,
            "text": h.get_text(strip=True)[:100],
        })
    heading_check = {
        "name": "Heading Structure",
        "status": "good",
        "details": f"{len(headings)} headings found",
        "headings": heading_structure[:20],
        "recommendations": [],
    }
    report["max_score"] += 10
    # Check if headings follow proper hierarchy (no skipping levels)
    if heading_structure:
        prev_level = 0
        skipped = False
        for h in heading_structure:
            level = int(h["tag"][1])
            if prev_level and level > prev_level + 1:
                skipped = True
                break
            prev_level = level
        if skipped:
            heading_check["status"] = "warning"
            heading_check["recommendations"].append("Heading levels are skipping (e.g., H1 → H3). Maintain proper hierarchy.")
            report["warnings"].append("Heading hierarchy skips levels")
            report["score"] += 5
        else:
            report["score"] += 10
            report["good"].append("Heading hierarchy is proper")
    else:
        heading_check["status"] = "warning"
        heading_check["recommendations"].append("No headings found. Add H2/H3 tags to structure content.")
        report["warnings"].append("No headings found")
        report["score"] += 2
    report["checks"].append(heading_check)

    # --- Image alt tags ---
    images = soup.find_all("img")
    images_without_alt = []
    image_details = []
    for img in images:
        src = img.get("src", "")[:100]
        alt = img.get("alt", "")
        image_details.append({"src": src, "alt": alt})
        if not alt or alt.strip() == "":
            images_without_alt.append(src)

    img_check = {
        "name": "Image Alt Tags",
        "status": "good",
        "details": f"{len(images)} images, {len(images_without_alt)} missing alt tags",
        "recommendations": [],
    }
    report["max_score"] += 10
    if len(images) > 0 and len(images_without_alt) == 0:
        report["score"] += 10
        report["good"].append("All images have alt tags")
    elif len(images) > 0:
        ratio = len(images_without_alt) / len(images)
        if ratio > 0.5:
            img_check["status"] = "critical"
            img_check["recommendations"].append(f"{len(images_without_alt)} of {len(images)} images are missing alt tags")
            report["issues"].append(f"Most images missing alt tags ({len(images_without_alt)}/{len(images)})")
            report["score"] += 2
        else:
            img_check["status"] = "warning"
            img_check["recommendations"].append(f"{len(images_without_alt)} images missing alt tags — add descriptive alt text")
            report["warnings"].append(f"Some images missing alt tags ({len(images_without_alt)}/{len(images)})")
            report["score"] += 6
    else:
        img_check["details"] = "No images found"
        report["score"] += 10  # No penalty for no images
    report["checks"].append(img_check)

    # --- Links ---
    all_links = soup.find_all("a", href=True)
    internal_links = []
    external_links = []
    parsed_source = urlparse(source_url) if source_url else None
    source_domain = parsed_source.netloc if parsed_source else ""

    for link in all_links:
        href = link["href"]
        parsed = urlparse(href)
        if parsed.netloc and parsed.netloc != source_domain:
            external_links.append({"href": href[:100], "text": link.get_text(strip=True)[:50]})
        else:
            internal_links.append({"href": href[:100], "text": link.get_text(strip=True)[:50]})

    link_check = {
        "name": "Links",
        "status": "good",
        "details": f"{len(internal_links)} internal, {len(external_links)} external",
        "internal_count": len(internal_links),
        "external_count": len(external_links),
        "recommendations": [],
    }
    report["max_score"] += 10
    if len(all_links) == 0:
        link_check["status"] = "warning"
        link_check["recommendations"].append("No links found. Add internal and external links.")
        report["warnings"].append("No links found on the page")
        report["score"] += 3
    elif len(internal_links) == 0:
        link_check["status"] = "warning"
        link_check["recommendations"].append("No internal links found. Link to other pages on your site.")
        report["warnings"].append("No internal links")
        report["score"] += 6
    elif len(external_links) == 0:
        link_check["status"] = "warning"
        link_check["recommendations"].append("No external links found. Consider linking to authoritative sources.")
        report["warnings"].append("No external links")
        report["score"] += 7
    else:
        report["score"] += 10
        report["good"].append("Good mix of internal and external links")
    report["checks"].append(link_check)

    # --- Body text analysis ---
    body_text = soup.get_text(separator=" ", strip=True)
    words = re.findall(r'\b\S+\b', body_text)
    word_count = len(words)

    content_check = {
        "name": "Content",
        "status": "good",
        "details": f"{word_count} words in body",
        "recommendations": [],
    }
    report["max_score"] += 10
    if word_count < 300:
        content_check["status"] = "warning"
        content_check["recommendations"].append(f"Only {word_count} words. Aim for 300+ words for better SEO.")
        report["warnings"].append("Thin content detected")
        report["score"] += 3
    elif word_count >= 300 and word_count < 1000:
        content_check["status"] = "good"
        content_check["recommendations"].append(f"{word_count} words is good, but longer content tends to rank better.")
        report["score"] += 7
    else:
        report["score"] += 10
        report["good"].append("Substantial content length")
    report["checks"].append(content_check)

    # --- Readability ---
    flesch_score, flesch_level = _flesch_reading_ease(body_text)
    readability_check = {
        "name": "Readability",
        "status": "good",
        "details": f"Flesch Reading Ease: {flesch_score} ({flesch_level})",
        "score": flesch_score,
        "level": flesch_level,
        "recommendations": [],
    }
    report["max_score"] += 5
    if flesch_score >= 50:
        report["score"] += 5
        report["good"].append(f"Good readability: {flesch_level}")
    elif flesch_score >= 30:
        readability_check["status"] = "warning"
        readability_check["recommendations"].append("Text is somewhat difficult to read. Use shorter sentences.")
        report["warnings"].append("Readability could be improved")
        report["score"] += 3
    else:
        readability_check["status"] = "critical"
        readability_check["recommendations"].append("Text is very difficult to read. Simplify language and shorten sentences.")
        report["issues"].append("Very low readability score")
        report["score"] += 1
    report["checks"].append(readability_check)

    # --- Keyword density ---
    if title_text:
        title_words = [w.lower() for w in re.findall(r'\b[a-zA-Z]{3,}\b', title_text) if w.lower() not in STOP_WORDS]
        body_words_lower = [w.lower() for w in words if len(w) >= 3]

        density_data = []
        for tw in set(title_words):
            count = body_words_lower.count(tw)
            density = (count / max(word_count, 1)) * 100
            if density > 0:
                density_data.append({"keyword": tw, "count": count, "density": round(density, 2)})

        density_data.sort(key=lambda x: -x["density"])

        kw_check = {
            "name": "Keyword Density",
            "status": "good",
            "details": f"{len(density_data)} title keywords found in body",
            "density": density_data[:10],
            "recommendations": [],
        }
        report["max_score"] += 10
        over_dense = [d for d in density_data if d["density"] > 3]
        if over_dense:
            kw_check["status"] = "warning"
            for od in over_dense:
                kw_check["recommendations"].append(f"'{od['keyword']}' has {od['density']}% density (aim for 1-2%)")
            report["warnings"].append("Keyword stuffing detected")
            report["score"] += 5
        elif len(density_data) == 0:
            kw_check["status"] = "warning"
            kw_check["recommendations"].append("Title keywords not found in body text. Include them naturally.")
            report["warnings"].append("Title keywords not used in body")
            report["score"] += 4
        else:
            report["score"] += 10
            report["good"].append("Good keyword density in body text")
        report["checks"].append(kw_check)
    else:
        report["max_score"] += 10

    # --- Overall score ---
    overall_pct = round((report["score"] / max(report["max_score"], 1)) * 100, 1)
    report["overall_score"] = overall_pct

    if overall_pct >= 80:
        report["grade"] = "A"
    elif overall_pct >= 65:
        report["grade"] = "B"
    elif overall_pct >= 50:
        report["grade"] = "C"
    elif overall_pct >= 35:
        report["grade"] = "D"
    else:
        report["grade"] = "F"

    return report


@social_tools_bp.route("/seo-audit", methods=["GET"])
def seo_audit_page():
    """Render the SEO Audit Tool web UI."""
    return render_template("tools/seo-audit.html")


@social_tools_bp.route("/seo-audit/analyze", methods=["POST"])
def seo_audit_api():
    """API: analyze a URL or HTML content for SEO issues."""
    try:
        data = request.get_json(silent=True) or {}
        url = data.get("url", "").strip()
        html_content = data.get("html", "").strip()

        if not url and not html_content:
            return jsonify({"status": "error", "message": "Provide a URL or HTML content to analyze."})

        source_url = ""
        if url:
            html, status_code, error = _safe_get(url, timeout=10)
            if error or not html:
                if html_content:
                    source_url = url
                else:
                    return jsonify({
                        "status": "error",
                        "message": f"Could not fetch URL: {error}. Paste HTML content instead.",
                    })
            else:
                html_content = html
                source_url = url

        report = _analyze_html_for_seo(html_content, source_url)
        report["source_url"] = source_url or "pasted_html"

        log_tool_usage("seo-audit", "analyze", f"source={source_url[:50] if source_url else 'html_paste'}")

        return jsonify({"status": "success", "data": report})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 5. Content Score Checker
# =========================================================================

TRANSITION_WORDS = {
    "also", "additionally", "furthermore", "moreover", "in addition", "besides",
    "however", "nevertheless", "on the other hand", "conversely", "although",
    "therefore", "consequently", "as a result", "thus", "hence",
    "for example", "for instance", "namely", "such as", "specifically",
    "in conclusion", "to summarize", "in summary", "overall", "finally",
    "meanwhile", "simultaneously", "subsequently", "then", "next",
    "firstly", "secondly", "thirdly", "lastly", "above all",
    "similarly", "likewise", "in contrast", "compared to", "instead",
    "because", "since", "due to", "as a result of", "owing to",
}

PASSIVE_VOICE_INDICATORS = re.compile(
    r'\b(is|are|was|were|be|been|being)\s+(being\s+)?\w+ed\b|'
    r'\b(is|are|was|were|be|been|being)\s+being\s+\w+en\b',
    re.IGNORECASE
)


def _detect_passive_voice_sentences(text):
    """Return a list of sentences that appear to use passive voice."""
    sentences = re.split(r'(?<=[.!?])\s+', text)
    passive_sentences = []
    for sent in sentences:
        if sent.strip() and PASSIVE_VOICE_INDICATORS.search(sent):
            passive_sentences.append(sent.strip())
    return passive_sentences


def _analyze_content_score(text):
    """Analyze content quality and return a comprehensive score."""
    if not text.strip():
        return {"error": "No text provided"}

    stats = _text_statistics(text)
    word_count = stats["word_count"]
    sentence_count = stats["sentence_count"]
    paragraph_count = stats["paragraph_count"]

    breakdown = []
    total_score = 0
    max_score = 100

    # 1. Readability (20 points)
    flesch_score, flesch_level = _flesch_reading_ease(text)
    if flesch_score >= 70:
        readability_pts = 20
    elif flesch_score >= 60:
        readability_pts = 16
    elif flesch_score >= 50:
        readability_pts = 12
    elif flesch_score >= 30:
        readability_pts = 6
    else:
        readability_pts = 2
    total_score += readability_pts
    breakdown.append({
        "category": "Readability",
        "score": readability_pts,
        "max": 20,
        "details": f"Flesch Reading Ease: {flesch_score} ({flesch_level})",
        "recommendation": (
            "Good readability score."
            if flesch_score >= 60
            else "Use shorter sentences and simpler words to improve readability."
        ),
    })

    # 2. Word Count Adequacy (15 points)
    if word_count >= 1500:
        wc_pts = 15
    elif word_count >= 1000:
        wc_pts = 13
    elif word_count >= 600:
        wc_pts = 10
    elif word_count >= 300:
        wc_pts = 6
    elif word_count >= 100:
        wc_pts = 3
    else:
        wc_pts = 1
    total_score += wc_pts
    breakdown.append({
        "category": "Word Count",
        "score": wc_pts,
        "max": 15,
        "details": f"{word_count} words",
        "recommendation": (
            f"Good word count."
            if word_count >= 600
            else "Aim for at least 600 words for a substantive article."
        ),
    })

    # 3. Paragraph Length (15 points)
    paragraphs = [p for p in re.split(r'\n\s*\n', text.strip()) if p.strip()]
    long_paragraphs = 0
    for p in paragraphs:
        para_words = len(re.findall(r'\b\S+\b', p))
        if para_words > 150:
            long_paragraphs += 1

    if len(paragraphs) == 0:
        para_pts = 0
        para_detail = "No paragraphs detected"
        para_rec = "Break your content into paragraphs for better readability."
    elif long_paragraphs == 0:
        para_pts = 15
        para_detail = f"{len(paragraphs)} paragraphs, all well-sized"
        para_rec = "Good paragraph structure."
    elif long_paragraphs <= len(paragraphs) // 3:
        para_pts = 10
        para_detail = f"{long_paragraphs} of {len(paragraphs)} paragraphs are over 150 words"
        para_rec = "Break long paragraphs into smaller ones (aim for 50-100 words each)."
    else:
        para_pts = 5
        para_detail = f"{long_paragraphs} of {len(paragraphs)} paragraphs are too long"
        para_rec = "Most paragraphs are too long. Break them up for readability."
    total_score += para_pts
    breakdown.append({
        "category": "Paragraph Structure",
        "score": para_pts,
        "max": 15,
        "details": para_detail,
        "recommendation": para_rec,
    })

    # 4. Heading Structure (10 points)
    headings = re.findall(r'^#+\s+.+$', text, re.MULTILINE)
    h1_count = sum(1 for h in headings if h.startswith('# ') and not h.startswith('## '))
    if len(headings) >= 3:
        heading_pts = 10
        heading_detail = f"{len(headings)} headings found"
        heading_rec = "Good use of headings to structure content."
    elif len(headings) > 0:
        heading_pts = 5
        heading_detail = f"Only {len(headings)} heading(s) found"
        heading_rec = "Add more headings (H2, H3) to break content into sections."
    else:
        heading_pts = 0
        heading_detail = "No headings found"
        heading_rec = "Add headings to structure your content and improve scannability."
    if h1_count > 1:
        heading_rec += " Also, use only one H1 per article."
        heading_pts = max(heading_pts - 2, 0)
    total_score += heading_pts
    breakdown.append({
        "category": "Heading Structure",
        "score": heading_pts,
        "max": 10,
        "details": heading_detail,
        "recommendation": heading_rec,
    })

    # 5. Keyword Density (10 points)
    keywords = _extract_keywords(text, max_keywords=10)
    if not keywords:
        kd_pts = 5
        kd_detail = "No significant keywords detected"
        kd_rec = "Use consistent keywords throughout your content."
    else:
        top_kw, top_freq = keywords[0]
        density = (top_freq / max(word_count, 1)) * 100
        if 0.5 <= density <= 2.5:
            kd_pts = 10
            kd_detail = f"Top keyword '{top_kw}' at {density:.1f}% density"
            kd_rec = "Good keyword density."
        elif density < 0.5:
            kd_pts = 6
            kd_detail = f"Top keyword '{top_kw}' at {density:.1f}% density (too low)"
            kd_rec = "Keyword density is low. Use your main keyword more consistently."
        else:
            kd_pts = 4
            kd_detail = f"Top keyword '{top_kw}' at {density:.1f}% density (too high)"
            kd_rec = "Keyword density is too high (keyword stuffing). Use synonyms and variations."
    total_score += kd_pts
    breakdown.append({
        "category": "Keyword Density",
        "score": kd_pts,
        "max": 10,
        "details": kd_detail,
        "recommendation": kd_rec,
    })

    # 6. Sentence Variety (15 points)
    sentences = [s for s in re.split(r'[.!?]+', text) if s.strip()]
    sentence_lengths = [len(s.split()) for s in sentences]
    if sentence_lengths:
        avg_len = sum(sentence_lengths) / len(sentence_lengths)
        variance = sum((l - avg_len) ** 2 for l in sentence_lengths) / len(sentence_lengths)
        std_dev = math.sqrt(variance)

        if 15 <= avg_len <= 25 and std_dev >= 5:
            sv_pts = 15
            sv_detail = f"Avg {avg_len:.0f} words/sentence, good variety (σ={std_dev:.1f})"
            sv_rec = "Good sentence variety keeps readers engaged."
        elif 10 <= avg_len <= 30:
            sv_pts = 10
            sv_detail = f"Avg {avg_len:.0f} words/sentence, moderate variety (σ={std_dev:.1f})"
            sv_rec = "Mix short and long sentences more for better rhythm."
        else:
            sv_pts = 5
            sv_detail = f"Avg {avg_len:.0f} words/sentence, low variety (σ={std_dev:.1f})"
            sv_rec = "Sentences are too uniform in length. Vary them for better flow."
    else:
        sv_pts = 0
        sv_detail = "No sentences detected"
        sv_rec = "Ensure your content has complete sentences."
    total_score += sv_pts
    breakdown.append({
        "category": "Sentence Variety",
        "score": sv_pts,
        "max": 15,
        "details": sv_detail,
        "recommendation": sv_rec,
    })

    # 7. Passive Voice (10 points)
    passive_sents = _detect_passive_voice_sentences(text)
    passive_ratio = len(passive_sents) / max(len(sentences), 1) * 100
    if passive_ratio <= 10:
        pv_pts = 10
        pv_detail = f"{len(passive_sents)} passive sentences ({passive_ratio:.0f}%)"
        pv_rec = "Low passive voice usage — active voice makes writing more engaging."
    elif passive_ratio <= 20:
        pv_pts = 6
        pv_detail = f"{len(passive_sents)} passive sentences ({passive_ratio:.0f}%)"
        pv_rec = "Moderate passive voice. Try converting some to active voice."
    else:
        pv_pts = 2
        pv_detail = f"{len(passive_sents)} passive sentences ({passive_ratio:.0f}%)"
        pv_rec = "High passive voice usage. Convert to active voice for stronger writing."
    total_score += pv_pts
    breakdown.append({
        "category": "Passive Voice",
        "score": pv_pts,
        "max": 10,
        "details": pv_detail,
        "recommendation": pv_rec,
    })

    # 8. Transition Words (5 points)
    text_lower = text.lower()
    transition_count = sum(1 for tw in TRANSITION_WORDS if tw in text_lower)
    if transition_count >= 5:
        tw_pts = 5
        tw_detail = f"{transition_count} transition words found"
        tw_rec = "Good use of transition words for flow."
    elif transition_count >= 2:
        tw_pts = 3
        tw_detail = f"{transition_count} transition words found"
        tw_rec = "Add more transition words to improve content flow."
    else:
        tw_pts = 0
        tw_detail = f"{transition_count} transition words found"
        tw_rec = "Very few transition words. Add transitions like 'however', 'therefore', 'for example'."
    total_score += tw_pts
    breakdown.append({
        "category": "Transition Words",
        "score": tw_pts,
        "max": 5,
        "details": tw_detail,
        "recommendation": tw_rec,
    })

    # Grade
    if total_score >= 85:
        grade = "A"
        grade_label = "Excellent"
    elif total_score >= 70:
        grade = "B"
        grade_label = "Good"
    elif total_score >= 55:
        grade = "C"
        grade_label = "Average"
    elif total_score >= 40:
        grade = "D"
        grade_label = "Below Average"
    else:
        grade = "F"
        grade_label = "Poor"

    return {
        "overall_score": total_score,
        "max_score": max_score,
        "grade": grade,
        "grade_label": grade_label,
        "breakdown": breakdown,
        "statistics": stats,
        "passive_voice_examples": passive_sents[:5],
    }


@social_tools_bp.route("/content-score", methods=["GET"])
def content_score_page():
    """Render the Content Score Checker web UI."""
    return render_template("tools/content-score.html")


@social_tools_bp.route("/content-score/analyze", methods=["POST"])
def content_score_analyze_api():
    """API: analyze content quality and return a score with breakdown."""
    try:
        data = request.get_json(silent=True) or {}
        text = data.get("text", "").strip()

        if not text:
            return jsonify({"status": "error", "message": "No text provided."})

        result = _analyze_content_score(text)

        if "error" in result:
            return jsonify({"status": "error", "message": result["error"]})

        log_tool_usage("content-score", "analyze", f"words={result['statistics']['word_count']}")

        return jsonify({"status": "success", "data": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 6. Social Media Post Formatter
# =========================================================================

PLATFORM_CONFIG = {
    "twitter": {
        "name": "Twitter / X",
        "max_chars": 280,
        "max_hashtags": 5,
        "ideal_hashtags": "1-3",
        "hashtag_placement": "within text or at end",
        "tone": "Conversational, concise, punchy",
        "cta_suggestions": ["Retweet if you agree", "Like if you relate", "Drop your thoughts below", "Bookmark this for later", "Share with someone who needs this"],
    },
    "instagram": {
        "name": "Instagram",
        "max_chars": 2200,
        "max_hashtags": 30,
        "ideal_hashtags": "15-20",
        "hashtag_placement": "at the end after dots/spaces",
        "tone": "Visual-first, engaging, authentic",
        "cta_suggestions": ["Double-tap if you agree", "Save this post for later", "Tag a friend who needs this", "Comment your favorite below", "Share to your story"],
    },
    "linkedin": {
        "name": "LinkedIn",
        "max_chars": 3000,
        "max_hashtags": 5,
        "ideal_hashtags": "3-5",
        "hashtag_placement": "at the end of the post",
        "tone": "Professional, insightful, thought-leadership",
        "cta_suggestions": ["What's your experience with this?", "Agree or disagree?", "Comment below with your thoughts", "Share if this resonates", "Follow for more insights like this"],
    },
    "facebook": {
        "name": "Facebook",
        "max_chars": 63206,
        "max_hashtags": 10,
        "ideal_hashtags": "2-5",
        "hashtag_placement": "within text naturally",
        "tone": "Conversational, community-focused, personal",
        "cta_suggestions": ["Like if you agree", "Share with your friends", "Tag someone who needs to see this", "Comment your thoughts", "Click the link to learn more"],
    },
    "tiktok": {
        "name": "TikTok",
        "max_chars": 150,
        "max_hashtags": 8,
        "ideal_hashtags": "3-6",
        "hashtag_placement": "at the end",
        "tone": "Short, punchy, hooky, casual",
        "cta_suggestions": ["Follow for more!", "Link in bio", "Part 2? Comment YES", "Save this!", "Duet this if you relate"],
    },
}

HOOK_TEMPLATES = [
    "Here's the truth about",
    "Nobody talks about this, but",
    "I wish someone told me this earlier:",
    "Stop doing this:",
    "This changed everything:",
    "The secret is:",
    "You won't believe this:",
    "Here's what most people get wrong about",
    "POV:",
    "Let me break this down for you:",
]


def _format_for_platform(text, platform):
    """Format content for a specific social media platform."""
    if not text.strip():
        return {"error": "No content provided"}

    platform = platform.lower().strip()
    if platform not in PLATFORM_CONFIG:
        return {"error": f"Unsupported platform: {platform}. Supported: {', '.join(PLATFORM_CONFIG.keys())}"}

    config = PLATFORM_CONFIG[platform]
    max_chars = config["max_chars"]
    ideal_hashtags = config["ideal_hashtags"]
    max_hashtags = config["max_hashtags"]

    # Generate hashtags
    hashtags_result = _generate_hashtags(text)
    top_hashtags = [h["hashtag"] for h in hashtags_result["hashtags"][:max_hashtags]]
    recommended_count = int(ideal_hashtags.split("-")[0]) if "-" in ideal_hashtags else int(ideal_hashtags)
    selected_hashtags = top_hashtags[:recommended_count]

    original_length = len(text)

    if platform == "twitter":
        # 280 char limit with thread splitting
        hook = random.choice(HOOK_TEMPLATES)
        # Try to make it fit in one tweet
        one_tweet = f"{hook} {text}"

        if len(one_tweet) > max_chars:
            # Summarize and fit
            summary = _summarize_text(text, max_words=30)
            one_tweet = f"{hook} {summary}"
            if len(one_tweet) > max_chars:
                one_tweet = one_tweet[:max_chars - 3] + "..."

        hashtags_str = " " + " ".join(selected_hashtags) if selected_hashtags else ""

        formatted = one_tweet + hashtags_str

        # If still over limit, split into thread
        if len(formatted) > max_chars:
            sentences = _split_into_sentences(text)
            tweets = []
            current = f"{hook} "
            for sent in sentences:
                candidate = current + sent + " "
                if len(candidate) > max_chars - 50 and current:
                    tweets.append(current.strip())
                    current = sent + " "
                else:
                    current = candidate
            if current.strip():
                tweets.append(current.strip())

            total = len(tweets)
            numbered = []
            for i, tweet in enumerate(tweets, 1):
                numbered.append(f"🧵 {i}/{total}: {tweet}")
            formatted = None  # thread mode
            thread = numbered
        else:
            thread = None

        cta = random.choice(config["cta_suggestions"])

        return {
            "platform": platform,
            "platform_name": config["name"],
            "formatted": formatted if formatted else None,
            "thread": thread,
            "character_count": len(formatted) if formatted else sum(len(t) for t in thread),
            "is_within_limit": (len(formatted) <= max_chars) if formatted else all(len(t) <= max_chars for t in thread),
            "max_chars": max_chars,
            "hashtags": selected_hashtags,
            "cta_suggestion": cta,
            "tone_guide": config["tone"],
            "original_length": original_length,
        }

    elif platform == "instagram":
        # Short, engaging caption with hashtags at the end
        summary = _summarize_text(text, max_words=100)
        line_breaks = "\n\n.\n.\n.\n"
        hashtags_str = " ".join(top_hashtags[:20])
        formatted = f"{summary}{line_breaks}{hashtags_str}"

        # Trim to max chars if needed
        if len(formatted) > max_chars:
            hashtags_str = " ".join(top_hashtags[:15])
            formatted = f"{summary}{line_breaks}{hashtags_str}"
        if len(formatted) > max_chars:
            formatted = formatted[:max_chars]

        cta = random.choice(config["cta_suggestions"])

        return {
            "platform": platform,
            "platform_name": config["name"],
            "formatted": formatted,
            "character_count": len(formatted),
            "is_within_limit": len(formatted) <= max_chars,
            "max_chars": max_chars,
            "hashtags": top_hashtags[:20],
            "hashtag_count": len(top_hashtags[:20]),
            "cta_suggestion": cta,
            "tone_guide": config["tone"],
            "original_length": original_length,
        }

    elif platform == "linkedin":
        # Professional, longer format with key takeaways
        hook = random.choice(HOOK_TEMPLATES[:5])
        summary = _summarize_text(text, max_words=180)
        bullets = _extract_bullet_points(text, max_bullets=4)

        parts = []
        parts.append(f"{hook}\n\n")
        parts.append(summary)
        parts.append("\n\nHere are the key takeaways:")
        for i, b in enumerate(bullets, 1):
            parts.append(f"\n👉 {b}")
        parts.append(f"\n\n{' '.join(selected_hashtags)}")

        formatted = "".join(parts)

        if len(formatted) > max_chars:
            formatted = formatted[:max_chars - 3] + "..."

        cta = random.choice(config["cta_suggestions"])

        return {
            "platform": platform,
            "platform_name": config["name"],
            "formatted": formatted,
            "character_count": len(formatted),
            "is_within_limit": len(formatted) <= max_chars,
            "max_chars": max_chars,
            "hashtags": selected_hashtags,
            "cta_suggestion": cta,
            "tone_guide": config["tone"],
            "original_length": original_length,
        }

    elif platform == "facebook":
        # Engagement-focused, conversational
        summary = _summarize_text(text, max_words=200)
        hashtags_str = " ".join(selected_hashtags)
        cta = random.choice(config["cta_suggestions"])
        formatted = f"{summary}\n\n{cta}\n\n{hashtags_str}"

        if len(formatted) > max_chars:
            formatted = formatted[:max_chars]

        return {
            "platform": platform,
            "platform_name": config["name"],
            "formatted": formatted,
            "character_count": len(formatted),
            "is_within_limit": len(formatted) <= max_chars,
            "max_chars": max_chars,
            "hashtags": selected_hashtags,
            "cta_suggestion": cta,
            "tone_guide": config["tone"],
            "original_length": original_length,
        }

    elif platform == "tiktok":
        # Short, punchy, hooky
        sentences = _split_into_sentences(text)
        first_sentence = sentences[0] if sentences else text[:50]

        hook = random.choice(HOOK_TEMPLATES)
        short_caption = f"{hook} {first_sentence}"

        if len(short_caption) > max_chars:
            short_caption = short_caption[:max_chars]

        hashtags_str = " ".join(selected_hashtags[:5])
        formatted = f"{short_caption}\n\n{hashtags_str}"

        if len(formatted) > max_chars:
            formatted = short_caption + "\n" + " ".join(selected_hashtags[:3])
        if len(formatted) > max_chars:
            formatted = formatted[:max_chars]

        cta = random.choice(config["cta_suggestions"])

        return {
            "platform": platform,
            "platform_name": config["name"],
            "formatted": formatted,
            "character_count": len(formatted),
            "is_within_limit": len(formatted) <= max_chars,
            "max_chars": max_chars,
            "hashtags": selected_hashtags[:5],
            "cta_suggestion": cta,
            "tone_guide": config["tone"],
            "original_length": original_length,
        }


@social_tools_bp.route("/social-formatter", methods=["GET"])
def social_formatter_page():
    """Render the Social Media Post Formatter web UI."""
    return render_template("tools/social-formatter.html")


@social_tools_bp.route("/social-formatter/format", methods=["POST"])
def social_formatter_api():
    """API: format content for a specific social media platform."""
    try:
        data = request.get_json(silent=True) or {}
        content = data.get("content", "").strip()
        platform = data.get("platform", "").strip()

        if not content:
            return jsonify({"status": "error", "message": "No content provided."})
        if not platform:
            return jsonify({"status": "error", "message": "No platform specified."})

        result = _format_for_platform(content, platform)

        if "error" in result:
            return jsonify({"status": "error", "message": result["error"]})

        log_tool_usage("social-formatter", "format", f"platform={platform}")

        return jsonify({"status": "success", "data": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 7. Robots.txt Generator
# =========================================================================


def _generate_robots_txt(site_url, allow_paths, disallow_paths, sitemap_url, crawl_delay, user_agents):
    """Generate a valid robots.txt content string."""
    lines = []

    # Clean site URL
    site_url = site_url.strip().rstrip("/")
    if not site_url:
        site_url = "https://example.com"

    # Comments header
    lines.append("# robots.txt generated by ECHO Toolkit")
    lines.append(f"# Site: {site_url}")
    lines.append(f"# Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")

    if not user_agents:
        user_agents = ["*"]

    for agent in user_agents:
        agent = agent.strip() or "*"
        lines.append(f"User-agent: {agent}")

        if allow_paths:
            for path in allow_paths:
                path = path.strip()
                if path and not path.startswith("/"):
                    path = "/" + path
                lines.append(f"Allow: {path}")

        if disallow_paths:
            for path in disallow_paths:
                path = path.strip()
                if path:
                    if not path.startswith("/"):
                        path = "/" + path
                    lines.append(f"Disallow: {path}")
        else:
            lines.append("Disallow:")  # Allow everything if no disallows

        if crawl_delay and int(crawl_delay) > 0:
            lines.append(f"Crawl-delay: {int(crawl_delay)}")

        lines.append("")

    # Sitemap
    if sitemap_url and sitemap_url.strip():
        sitemap = sitemap_url.strip()
        if not sitemap.startswith("http"):
            sitemap = f"{site_url}/sitemap.xml"
        lines.append(f"Sitemap: {sitemap}")
    else:
        lines.append(f"Sitemap: {site_url}/sitemap.xml")

    robots_content = "\n".join(lines)
    return robots_content


@social_tools_bp.route("/robots-generator", methods=["GET"])
def robots_generator_page():
    """Render the Robots.txt Generator web UI."""
    return render_template("tools/robots-generator.html")


@social_tools_bp.route("/robots-generator/generate", methods=["POST"])
def robots_generator_api():
    """API: generate a robots.txt file."""
    try:
        data = request.get_json(silent=True) or {}
        site_url = data.get("site_url", "").strip()
        allow_paths = data.get("allow_paths", [])
        disallow_paths = data.get("disallow_paths", [])
        sitemap_url = data.get("sitemap_url", "").strip()
        crawl_delay = data.get("crawl_delay", 0)
        user_agents = data.get("user_agents", [])

        # Handle string inputs for paths
        if isinstance(allow_paths, str):
            allow_paths = [p.strip() for p in allow_paths.split("\n") if p.strip()]
        if isinstance(disallow_paths, str):
            disallow_paths = [p.strip() for p in disallow_paths.split("\n") if p.strip()]
        if isinstance(user_agents, str):
            user_agents = [a.strip() for a in user_agents.split(",") if a.strip()]

        robots_content = _generate_robots_txt(
            site_url, allow_paths, disallow_paths,
            sitemap_url, crawl_delay, user_agents,
        )

        log_tool_usage("robots-generator", "generate", f"site={site_url[:50]}")

        return jsonify({
            "status": "success",
            "data": {
                "robots_txt": robots_content,
                "site_url": site_url or "https://example.com",
                "user_agents": user_agents or ["*"],
                "allow_count": len(allow_paths),
                "disallow_count": len(disallow_paths),
                "has_sitemap": bool(sitemap_url),
                "crawl_delay": crawl_delay,
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 8. Sitemap Generator
# =========================================================================


def _generate_sitemap_xml(urls, changefreq="weekly", priority="0.8"):
    """Generate a proper XML sitemap string."""
    today = datetime.now().strftime("%Y-%m-%d")

    # Normalize changefreq
    valid_freqs = ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"]
    if changefreq not in valid_freqs:
        changefreq = "weekly"

    # Normalize priority
    try:
        prio = float(priority)
        prio = max(0.0, min(1.0, prio))
    except (ValueError, TypeError):
        prio = 0.8
    priority_str = f"{prio:.1f}"

    # Parse URLs
    if isinstance(urls, str):
        url_list = [u.strip() for u in urls.strip().split("\n") if u.strip()]
    elif isinstance(urls, list):
        url_list = [str(u).strip() for u in urls if str(u).strip()]
    else:
        url_list = []

    # Deduplicate
    seen = set()
    unique_urls = []
    for url in url_list:
        if url not in seen:
            seen.add(url)
            unique_urls.append(url)

    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]

    for url in unique_urls:
        xml_lines.append("  <url>")
        xml_lines.append(f"    <loc>{url}</loc>")
        xml_lines.append(f"    <lastmod>{today}</lastmod>")
        xml_lines.append(f"    <changefreq>{changefreq}</changefreq>")
        xml_lines.append(f"    <priority>{priority_str}</priority>")
        xml_lines.append("  </url>")

    xml_lines.append("</urlset>")
    sitemap_xml = "\n".join(xml_lines)

    return {
        "sitemap_xml": sitemap_xml,
        "url_count": len(unique_urls),
        "changefreq": changefreq,
        "priority": priority_str,
        "lastmod": today,
        "urls": unique_urls,
    }


@social_tools_bp.route("/sitemap-generator", methods=["GET"])
def sitemap_generator_page():
    """Render the Sitemap Generator web UI."""
    return render_template("tools/sitemap-generator.html")


@social_tools_bp.route("/sitemap-generator/generate", methods=["POST"])
def sitemap_generator_api():
    """API: generate an XML sitemap from a list of URLs."""
    try:
        data = request.get_json(silent=True) or {}
        urls = data.get("urls", [])
        changefreq = data.get("changefreq", "weekly").strip()
        priority = data.get("priority", "0.8").strip()

        if not urls:
            return jsonify({"status": "error", "message": "No URLs provided."})

        # Handle JSON array or newline-separated string
        if isinstance(urls, str):
            url_list = [u.strip() for u in urls.strip().split("\n") if u.strip()]
        elif isinstance(urls, list):
            url_list = [str(u).strip() for u in urls if str(u).strip()]
        else:
            return jsonify({"status": "error", "message": "URLs must be a list or newline-separated string."})

        if not url_list:
            return jsonify({"status": "error", "message": "No valid URLs found."})

        result = _generate_sitemap_xml(url_list, changefreq, priority)

        log_tool_usage("sitemap-generator", "generate", f"urls={result['url_count']}")

        return jsonify({"status": "success", "data": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 9. Open Graph Preview
# =========================================================================

# Common fallback images by type
OG_TYPE_ICONS = {
    "article": "📰",
    "website": "🌐",
    "blog": "📝",
    "video": "🎬",
    "audio": "🎵",
    "product": "🛍️",
    "profile": "👤",
    "book": "📚",
}


def _generate_og_preview(title, description, url, image_url, site_name, og_type):
    """Generate an HTML preview of how the OG card will look."""
    title = title or "Untitled Page"
    description = description or "No description available."
    url = url or "https://example.com"
    site_name = site_name or urlparse(url).netloc or "example.com"
    og_type = og_type or "website"
    image_url = image_url or ""

    # Truncate for display
    display_title = title[:70] + "..." if len(title) > 70 else title
    display_desc = description[:160] + "..." if len(description) > 160 else description

    icon = OG_TYPE_ICONS.get(og_type, "📄")
    domain = urlparse(url).netloc or "example.com"

    # Generate previews for Facebook, Twitter, and LinkedIn
    previews = {}

    # Facebook / Generic card
    facebook_card = f"""
<div style="max-width:500px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
  <div style="height:200px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;font-size:48px;color:white;">
    {"<img src='" + image_url + "' style='width:100%;height:100%;object-fit:cover;' alt='OG Image'>" if image_url else icon}
  </div>
  <div style="padding:12px 14px;">
    <div style="text-transform:uppercase;font-size:11px;color:#65676b;letter-spacing:0.5px;">{domain.upper()}</div>
    <div style="font-size:16px;font-weight:600;color:#1d2129;margin:4px 0 2px 0;line-height:1.3;">{display_title}</div>
    <div style="font-size:14px;color:#606770;line-height:1.4;">{display_desc}</div>
  </div>
</div>"""
    previews["facebook"] = facebook_card.strip()

    # Twitter card (large)
    twitter_card = f"""
<div style="max-width:500px;border:1px solid #e1e8ed;border-radius:14px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="height:200px;background:linear-gradient(135deg,#1da1f2 0%,#0d8ecf 100%);display:flex;align-items:center;justify-content:center;font-size:48px;color:white;">
    {"<img src='" + image_url + "' style='width:100%;height:100%;object-fit:cover;' alt='OG Image'>" if image_url else icon}
  </div>
  <div style="padding:12px 14px;border-top:1px solid #e1e8ed;">
    <div style="font-size:15px;font-weight:600;color:#1d2129;line-height:1.3;">{display_title}</div>
    <div style="font-size:13px;color:#657786;margin-top:2px;line-height:1.4;">{display_desc}</div>
    <div style="font-size:13px;color:#657786;margin-top:4px;">🔗 {domain}</div>
  </div>
</div>"""
    previews["twitter"] = twitter_card.strip()

    # LinkedIn card
    linkedin_card = f"""
<div style="max-width:500px;border:1px solid #e0e0e0;border-radius:4px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="height:200px;background:linear-gradient(135deg,#0077b5 0%,#005f92 100%);display:flex;align-items:center;justify-content:center;font-size:48px;color:white;">
    {"<img src='" + image_url + "' style='width:100%;height:100%;object-fit:cover;' alt='OG Image'>" if image_url else icon}
  </div>
  <div style="padding:10px 12px;background:#f3f2ef;">
    <div style="font-size:14px;font-weight:600;color:#1a1a1a;line-height:1.3;">{display_title}</div>
    <div style="font-size:12px;color:#666666;margin-top:2px;line-height:1.4;">{display_desc}</div>
    <div style="font-size:12px;color:#006097;margin-top:3px;">🔗 {domain}</div>
  </div>
</div>"""
    previews["linkedin"] = linkedin_card.strip()

    # Meta tags code
    meta_tags = f"""<!-- Open Graph Meta Tags -->
<meta property="og:title" content="{title}" />
<meta property="og:description" content="{description[:160]}" />
<meta property="og:url" content="{url}" />
<meta property="og:type" content="{og_type}" />
<meta property="og:site_name" content="{site_name}" />"""
    if image_url:
        meta_tags += f"""
<meta property="og:image" content="{image_url}" />"""

    meta_tags += f"""

<!-- Twitter Card Meta Tags -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title}" />
<meta name="twitter:description" content="{description[:200]}" />"""
    if image_url:
        meta_tags += f"""
<meta name="twitter:image" content="{image_url}" />"""

    return {
        "title": title,
        "description": description,
        "url": url,
        "site_name": site_name,
        "type": og_type,
        "image_url": image_url,
        "previews": previews,
        "meta_tags": meta_tags,
        "title_length": len(title),
        "description_length": len(description),
        "title_optimal": 40 <= len(title) <= 70,
        "description_optimal": 100 <= len(description) <= 160,
    }


@social_tools_bp.route("/og-preview", methods=["GET"])
def og_preview_page():
    """Render the Open Graph Preview web UI."""
    return render_template("tools/og-preview.html")


@social_tools_bp.route("/og-preview/generate", methods=["POST"])
def og_preview_generate_api():
    """API: generate Open Graph preview cards and meta tags."""
    try:
        data = request.get_json(silent=True) or {}
        title = data.get("title", "").strip()
        description = data.get("description", "").strip()
        url = data.get("url", "").strip()
        image_url = data.get("image_url", "").strip()
        site_name = data.get("site_name", "").strip()
        og_type = data.get("type", "website").strip()

        if not title:
            return jsonify({"status": "error", "message": "Title is required."})

        result = _generate_og_preview(title, description, url, image_url, site_name, og_type)

        log_tool_usage("og-preview", "generate", f"title={title[:50]}")

        return jsonify({"status": "success", "data": result})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})


# =========================================================================
# 10. Broken Link Checker
# =========================================================================


def _check_urls(urls):
    """Check a list of URLs and return their status information."""
    results = []

    for url in urls:
        url = url.strip()
        if not url:
            continue

        # Ensure URL has a scheme
        if not url.startswith(("http://", "https://")):
            url = "https://" + url

        parsed = urlparse(url)
        if not parsed.netloc:
            results.append({
                "url": url,
                "status_code": None,
                "status": "invalid",
                "category": "Invalid URL",
                "response_time_ms": None,
                "error": "Invalid URL format",
            })
            continue

        start_time = time.time()
        html, status_code, error = _safe_get(url, timeout=8)
        elapsed_ms = round((time.time() - start_time) * 1000)

        if error:
            if "timeout" in error.lower():
                category = "Timeout"
                status = "timeout"
            elif "connection" in error.lower():
                category = "Connection Error"
                status = "connection_error"
            else:
                category = "Error"
                status = "error"
            results.append({
                "url": url,
                "status_code": None,
                "status": status,
                "category": category,
                "response_time_ms": elapsed_ms,
                "error": error,
            })
        else:
            # Classify status code
            if 200 <= status_code < 300:
                category = "OK"
                status = "ok"
            elif 300 <= status_code < 400:
                category = "Redirect"
                status = "redirect"
            elif 400 <= status_code < 500:
                if status_code == 404:
                    category = "Not Found"
                elif status_code == 403:
                    category = "Forbidden"
                else:
                    category = f"Client Error ({status_code})"
                status = "client_error"
            elif 500 <= status_code < 600:
                category = f"Server Error ({status_code})"
                status = "server_error"
            else:
                category = f"Unknown ({status_code})"
                status = "unknown"

            results.append({
                "url": url,
                "status_code": status_code,
                "status": status,
                "category": category,
                "response_time_ms": elapsed_ms,
                "error": None,
            })

    return results


@social_tools_bp.route("/link-checker", methods=["GET"])
def link_checker_page():
    """Render the Broken Link Checker web UI."""
    return render_template("tools/link-checker.html")


@social_tools_bp.route("/link-checker/check", methods=["POST"])
def link_checker_check_api():
    """API: check a list of URLs for broken links."""
    try:
        data = request.get_json(silent=True) or {}
        urls_input = data.get("urls", [])

        if not urls_input:
            return jsonify({"status": "error", "message": "No URLs provided."})

        # Handle single URL string
        if isinstance(urls_input, str):
            urls_input = [urls_input.strip()]

        # Handle newline-separated text
        if isinstance(urls_input, list) and len(urls_input) == 1:
            potential = urls_input[0]
            if "\n" in potential:
                urls_input = [u.strip() for u in potential.split("\n") if u.strip()]

        # Validate
        if not isinstance(urls_input, list) or not urls_input:
            return jsonify({"status": "error", "message": "Provide a URL or list of URLs."})

        # Limit to 20 URLs to prevent abuse
        if len(urls_input) > 20:
            return jsonify({"status": "error", "message": "Maximum 20 URLs per request."})

        results = _check_urls(urls_input)

        # Summary
        ok_count = len([r for r in results if r["status"] == "ok"])
        broken_count = len([r for r in results if r["status"] in ("client_error", "server_error")])
        redirect_count = len([r for r in results if r["status"] == "redirect"])
        error_count = len([r for r in results if r["status"] in ("timeout", "connection_error", "error", "invalid")])

        summary = {
            "total": len(results),
            "ok": ok_count,
            "broken": broken_count,
            "redirects": redirect_count,
            "errors": error_count,
        }

        log_tool_usage("link-checker", "check", f"urls={len(urls_input)}, broken={broken_count}")

        return jsonify({
            "status": "success",
            "data": {
                "results": results,
                "summary": summary,
            },
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})
