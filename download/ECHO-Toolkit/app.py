import os
import sys
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
from database import init_db
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'echo-toolkit-secret-2024')
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

ALLOWED_EXTENSIONS = {'txt', 'py', 'js', 'html', 'css', 'json', 'csv', 'md',
                       'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg',
                       'mp4', 'mp3', 'wav', 'avi', 'mkv', 'mov', 'pdf', 'zip'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Register tool blueprints
from tools.developers.code_tools import code_tools_bp
from tools.developers.dev_utils import dev_utils_bp
from tools.content.writing_tools import writing_tools_bp
from tools.content.media_tools import media_tools_bp
from tools.content.social_tools import social_tools_bp
from tools.utilities.general_utils import general_utils_bp
from tools.ai.ai_tools import ai_tools_bp

app.register_blueprint(code_tools_bp, url_prefix='/tools/code')
app.register_blueprint(dev_utils_bp, url_prefix='/tools/dev')
app.register_blueprint(writing_tools_bp, url_prefix='/tools/writing')
app.register_blueprint(media_tools_bp, url_prefix='/tools/media')
app.register_blueprint(social_tools_bp, url_prefix='/tools/social')
app.register_blueprint(general_utils_bp, url_prefix='/tools/utils')
app.register_blueprint(ai_tools_bp, url_prefix='/tools/ai')

@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/tool/<tool_id>')
def tool_page(tool_id):
    return render_template(f'tools/{tool_id}.html')

@app.errorhandler(404)
def not_found(e):
    return render_template('404.html'), 404

@app.errorhandler(500)
def server_error(e):
    return render_template('500.html'), 500

if __name__ == '__main__':
    init_db()
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    print("=" * 50)
    print("  ECHO TOOLKIT - All-in-One Developer & Creator Suite")
    print("  Running at: http://localhost:5000")
    print("  Press CTRL+C to stop")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)
