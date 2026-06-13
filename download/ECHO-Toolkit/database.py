import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'toolkit.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Snippets table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS snippets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            language TEXT DEFAULT 'python',
            code TEXT NOT NULL,
            description TEXT DEFAULT '',
            tags TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Bookmarks table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookmarks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            title TEXT DEFAULT '',
            category TEXT DEFAULT 'general',
            tags TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # API configs table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT NOT NULL UNIQUE,
            api_key TEXT DEFAULT '',
            endpoint TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Content posts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS content_posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT DEFAULT '',
            type TEXT DEFAULT 'blog',
            tags TEXT DEFAULT '',
            status TEXT DEFAULT 'draft',
            seo_title TEXT DEFAULT '',
            seo_description TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Tool usage logs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tool_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tool_name TEXT NOT NULL,
            action TEXT DEFAULT '',
            input_summary TEXT DEFAULT '',
            result_summary TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Scheduled tasks
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS scheduled_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tool_name TEXT NOT NULL,
            task_name TEXT NOT NULL,
            config TEXT DEFAULT '{}',
            schedule_type TEXT DEFAULT 'once',
            next_run TIMESTAMP,
            is_active INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Environment configs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS env_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_name TEXT NOT NULL,
            key_name TEXT NOT NULL,
            key_value TEXT NOT NULL,
            environment TEXT DEFAULT 'development',
            is_encrypted INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_name, key_name, environment)
        )
    ''')

    # Passwords / Secrets
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS secrets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service TEXT NOT NULL,
            username TEXT DEFAULT '',
            password_encrypted TEXT DEFAULT '',
            url TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            category TEXT DEFAULT 'general',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()
    print("[DB] Database initialized successfully")

def log_tool_usage(tool_name, action, input_summary='', result_summary=''):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO tool_logs (tool_name, action, input_summary, result_summary, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (tool_name, action, input_summary, result_summary, datetime.now()))
    conn.commit()
    conn.close()

def save_snippet(title, language, code, description='', tags=''):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO snippets (title, language, code, description, tags)
        VALUES (?, ?, ?, ?, ?)
    ''', (title, language, code, description, tags))
    conn.commit()
    snippet_id = cursor.lastrowid
    conn.close()
    return snippet_id

def get_all_snippets(language=None):
    conn = get_db()
    cursor = conn.cursor()
    if language:
        cursor.execute('SELECT * FROM snippets WHERE language = ? ORDER BY updated_at DESC', (language,))
    else:
        cursor.execute('SELECT * FROM snippets ORDER BY updated_at DESC')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_snippet(snippet_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM snippets WHERE id = ?', (snippet_id,))
    conn.commit()
    conn.close()

def save_content_post(title, content, post_type='blog', tags='', status='draft', seo_title='', seo_description=''):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO content_posts (title, content, type, tags, status, seo_title, seo_description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (title, content, post_type, tags, status, seo_title, seo_description))
    conn.commit()
    post_id = cursor.lastrowid
    conn.close()
    return post_id

def get_all_posts(post_type=None, status=None):
    conn = get_db()
    cursor = conn.cursor()
    query = 'SELECT * FROM content_posts WHERE 1=1'
    params = []
    if post_type:
        query += ' AND type = ?'
        params.append(post_type)
    if status:
        query += ' AND status = ?'
        params.append(status)
    query += ' ORDER BY updated_at DESC'
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def save_secret(service, username, password, url='', notes='', category='general'):
    import hashlib
    encoded = password.encode()
    hashed = hashlib.sha256(encoded).hexdigest()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO secrets (service, username, password_encrypted, url, notes, category)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (service, username, hashed, url, notes, category))
    conn.commit()
    conn.close()
    return True

def get_all_secrets():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT id, service, username, url, notes, category, created_at, updated_at FROM secrets ORDER BY updated_at DESC')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def save_env_config(project_name, key_name, key_value, environment='development'):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO env_configs (project_name, key_name, key_value, environment, updated_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (project_name, key_name, key_value, environment, datetime.now()))
    conn.commit()
    conn.close()
    return True

def get_env_configs(project_name=None):
    conn = get_db()
    cursor = conn.cursor()
    if project_name:
        cursor.execute('SELECT * FROM env_configs WHERE project_name = ? ORDER BY environment, key_name', (project_name,))
    else:
        cursor.execute('SELECT * FROM env_configs ORDER BY project_name, environment, key_name')
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_env_config(config_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM env_configs WHERE id = ?', (config_id,))
    conn.commit()
    conn.close()
