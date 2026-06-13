# ECHO Toolkit — All-in-One Developer & Creator Suite

<p align="center">
  <strong>71 Tools</strong> • <strong>7 Categories</strong> • <strong>0 API Keys</strong> • <strong>100% Offline</strong>
</p>

## Quick Start

```bash
# 1. Install Python 3.8+ (if not installed)

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the application
python app.py

# 4. Open in browser
# http://localhost:5000
```

## Categories

### 👨‍💻 Developer Code Tools (12)
JSON Formatter, Base64 Encoder/Decoder, Regex Tester, Hash Generator, JWT Decoder, Timestamp Converter, URL Encoder/Decoder, Unicode Lookup, Color Converter, Lorem Ipsum Generator, Markdown Preview, SQL Formatter

### 🔧 Developer Utilities (10)
Dependency Checker, Password Generator, Slug Generator, Cron Expression Builder, Project Scaffolder, Webhook Tester, Diff Tool, Snippet Manager, Env Manager, Secret Manager

### ✍️ Writing & Content (10)
Markdown Converter, Headline Generator, Reading Time Calculator, Text Case Converter, Content Planner, Blog Manager, Newsletter Builder, Meta Tag Generator, Word Counter, Auto-Tagger

### 🎨 Media & Design (9)
QR Code Generator, Color Palette Generator, Image Format Converter, Image Resizer, Meme Generator, Watermark Tool, Favicon Generator, Image Info, GIF Text Animator

### 📊 Social & SEO (10)
Hashtag Analyzer, Content Repurposer, Keyword Researcher, SEO Audit Tool, Content Score Checker, Social Post Formatter, Robots.txt Generator, Sitemap Generator, OG Preview, Broken Link Checker

### 🛠️ General Utilities (10)
Text Encryptor/Decryptor, File Organizer, Batch Renamer, Calculator, Unit Converter, Age Calculator, Pomodoro Timer, Countdown Generator, Text Statistics, Number Base Converter

### 🤖 AI Tools — Offline (10)
AI Summarizer, Code Explainer, Text Generator, Sentiment Analyzer, Text Similarity Checker, Keyword Extractor, Grammar Checker, Plagiarism Detector, Text Translator, Code Quality Scorer

## Tech Stack

- **Backend:** Python 3 / Flask / SQLite
- **Frontend:** HTML5 / CSS3 / Vanilla JavaScript
- **Styling:** Custom dark theme (Terminal aesthetic)
- **Database:** SQLite (zero config)

## Requirements

- Python 3.8 or higher
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Project Structure

```
ECHO-Toolkit/
├── app.py                      # Main Flask application
├── database.py                 # SQLite database layer
├── requirements.txt            # Python dependencies
├── static/
│   ├── css/style.css           # Main stylesheet (dark theme)
│   ├── js/app.js               # Main JavaScript
│   └── img/                    # Images directory
├── templates/
│   ├── dashboard.html           # Main dashboard
│   └── tools/                  # 71 individual tool pages
├── tools/
│   ├── developers/
│   │   ├── code_tools.py       # Code tools blueprint
│   │   └── dev_utils.py        # Developer utilities blueprint
│   ├── content/
│   │   ├── writing_tools.py    # Writing tools blueprint
│   │   ├── media_tools.py      # Media tools blueprint
│   │   └── social_tools.py     # Social/SEO tools blueprint
│   ├── utilities/
│   │   └── general_utils.py    # General utilities blueprint
│   └── ai/
│       └── ai_tools.py          # AI tools blueprint
├── uploads/                    # File upload directory
└── toolkit.db                  # SQLite database (auto-created)
```

## License

Built by ECHO — The Code Mind
From idea to executable. That's the whole job.
