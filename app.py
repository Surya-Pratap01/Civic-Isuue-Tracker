from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import uuid
import json
from flask_cors import CORS
import mimetypes
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'jharkhand-civic-system-2024')

# Detect serverless/Vercel environment
IS_VERCEL = bool(os.environ.get('VERCEL'))

# Database config: prefer DATABASE_URL (Postgres on Vercel), fallback to SQLite
# On Vercel the filesystem is read-only except /tmp, so use /tmp for SQLite fallback
default_sqlite = 'sqlite:////tmp/civic_issues.db' if IS_VERCEL else 'sqlite:///civic_issues.db'
db_url = os.environ.get('DATABASE_URL', default_sqlite)
# Normalize postgres scheme for SQLAlchemy if needed and sanitize query params for Neon
if db_url.startswith('postgres://'):
    db_url = db_url.replace('postgres://', 'postgresql+psycopg2://', 1)
try:
    from urllib.parse import urlparse, parse_qsl, urlencode, urlunparse
    parsed = urlparse(db_url)
    # Work only on postgres URLs
    if parsed.scheme.startswith('postgresql'):
        q = dict(parse_qsl(parsed.query, keep_blank_values=True))
        # Some environments add channel_binding=require which can fail on some platforms
        if 'channel_binding' in q:
            q.pop('channel_binding', None)
        # Ensure sslmode=require for Neon
        if q.get('sslmode') is None:
            q['sslmode'] = 'require'
        new_query = urlencode(q)
        db_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, new_query, parsed.fragment))
except Exception:
    pass
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# Use /tmp/uploads for non-Cloudinary uploads on Vercel to avoid read-only FS
default_uploads = '/tmp/uploads' if IS_VERCEL else 'static/uploads'
app.config['UPLOAD_FOLDER'] = default_uploads
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['ADMIN_USERNAME'] = os.environ.get('ADMIN_USERNAME', 'admin')
app.config['ADMIN_PASSWORD'] = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Ensure common audio MIME types are recognized by Python's mimetypes (serving via Flask static)
mimetypes.add_type('audio/mp4', '.m4a')
mimetypes.add_type('audio/aac', '.aac')
mimetypes.add_type('audio/mpeg', '.mp3')
mimetypes.add_type('audio/wav', '.wav')
mimetypes.add_type('audio/3gpp', '.3gp')

# Ensure upload directory exists (no-op if using Cloudinary later)
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Cloudinary config (auto-configured from CLOUDINARY_URL env if present)
USE_CLOUDINARY = bool(os.environ.get('CLOUDINARY_URL'))
if USE_CLOUDINARY:
    try:
        import cloudinary
        import cloudinary.uploader
        cloudinary.config()  # reads CLOUDINARY_URL
    except Exception:
        USE_CLOUDINARY = False

db = SQLAlchemy(app)

# Allow CORS for API endpoints in development so the web app (localhost) can call the backend
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Database Models
class CivicIssue(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    priority = db.Column(db.String(20), default='Medium')
    status = db.Column(db.String(20), default='Submitted')
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    address = db.Column(db.String(500))
    photo_filename = db.Column(db.String(200))
    short_note = db.Column(db.String(300))
    voice_note_filename = db.Column(db.String(200))
    citizen_name = db.Column(db.String(100))
    citizen_phone = db.Column(db.String(15))
    citizen_email = db.Column(db.String(100))
    assigned_department = db.Column(db.String(100))
    admin_notes = db.Column(db.Text)
    upvotes = db.Column(db.Integer, default=0)
    downvotes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Department(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    categories = db.Column(db.Text)  # JSON string of categories this department handles

class CivicVote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    issue_id = db.Column(db.String(36), nullable=False)
    device_id = db.Column(db.String(100), nullable=False)
    vote = db.Column(db.Integer, nullable=False)  # +1 for upvote, -1 for downvote
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('issue_id', 'device_id', name='uq_vote_issue_device'),)

# Routes
@app.route('/')
def index():
    return render_template('index.html')

# Lightweight health check
@app.route('/health')
def health():
    try:
        db.session.execute(db.text('SELECT 1'))
        return jsonify(status='ok'), 200
    except Exception as e:
        return jsonify(status='db_error', error=str(e)), 500

# Serve uploaded files when not using Cloudinary
@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if not session.get('is_admin'):
            flash('Please login as admin to continue', 'warning')
            return redirect(url_for('admin_login', next=request.path))
        return f(*args, **kwargs)
    return wrapper

@app.route('/admin')
@login_required
def admin():
    return render_template('admin.html')

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username', '')
        password = request.form.get('password', '')
        if username == app.config['ADMIN_USERNAME'] and password == app.config['ADMIN_PASSWORD']:
            session['is_admin'] = True
            flash('Logged in successfully', 'success')
            next_url = request.args.get('next') or url_for('admin')
            return redirect(next_url)
        else:
            flash('Invalid credentials', 'danger')
    return render_template('login.html')

@app.route('/admin/logout')
def admin_logout():
    session.pop('is_admin', None)
    flash('Logged out', 'info')
    return redirect(url_for('admin_login'))

@app.route('/api/submit_issue', methods=['POST'])
def submit_issue():
    try:
        # Handle file upload
        photo_filename = None
        voice_note_filename = None
        if 'photo' in request.files:
            file = request.files['photo']
            if file and file.filename:
                if USE_CLOUDINARY:
                    up = cloudinary.uploader.upload(file, resource_type='image', folder='civic-issues')
                    photo_filename = up.get('secure_url')
                else:
                    filename = secure_filename(file.filename)
                    unique_filename = f"{uuid.uuid4()}_{filename}"
                    file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
                    photo_filename = unique_filename

        # Handle optional voice note upload
        if 'voice_note' in request.files:
            vfile = request.files['voice_note']
            if vfile and vfile.filename:
                if USE_CLOUDINARY:
                    up2 = cloudinary.uploader.upload(vfile, resource_type='auto', folder='civic-issues')
                    voice_note_filename = up2.get('secure_url')
                else:
                    vname = secure_filename(vfile.filename)
                    unique_vname = f"{uuid.uuid4()}_{vname}"
                    vfile.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_vname))
                    voice_note_filename = unique_vname

        # Auto-assign department based on category
        category = request.form.get('category')
        department_mapping = {
            'Roads & Infrastructure': 'Public Works Department',
            'Street Lighting': 'Electrical Department',
            'Water & Drainage': 'Water Supply Department',
            'Waste Management': 'Sanitation Department',
            'Parks & Environment': 'Environment Department',
            'Traffic & Transportation': 'Traffic Police',
            'Other': 'General Administration'
        }

        # Auto-assign priority based on category
        priority_mapping = {
            'Water & Drainage': 'High',
            'Street Lighting': 'Medium',
            'Roads & Infrastructure': 'High',
            'Waste Management': 'Medium',
            'Parks & Environment': 'Low',
            'Traffic & Transportation': 'High',
            'Other': 'Medium'
        }

        issue = CivicIssue(
            title=request.form.get('title'),
            description=request.form.get('description'),
            category=category,
            priority=priority_mapping.get(category, 'Medium'),
            latitude=float(request.form.get('latitude')) if request.form.get('latitude') else None,
            longitude=float(request.form.get('longitude')) if request.form.get('longitude') else None,
            address=request.form.get('address'),
            photo_filename=photo_filename,
            short_note=request.form.get('short_note'),
            voice_note_filename=voice_note_filename,
            citizen_name=request.form.get('citizen_name'),
            citizen_phone=request.form.get('citizen_phone'),
            citizen_email=request.form.get('citizen_email'),
            assigned_department=department_mapping.get(category, 'General Administration')
        )

        db.session.add(issue)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Issue reported successfully!',
            'issue_id': issue.issue_id
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error submitting issue: {str(e)}'
        }), 500

def ensure_issue_extra_columns():
    """Ensure new columns exist for short_note and voice_note_filename (SQLite ALTER TABLE)."""
    from sqlalchemy import inspect, text
    inspector = inspect(db.engine)
    cols = {c['name'] for c in inspector.get_columns('civic_issue')}
    with db.engine.begin() as conn:
        if 'short_note' not in cols:
            conn.execute(text('ALTER TABLE civic_issue ADD COLUMN short_note VARCHAR(300)'))
        if 'voice_note_filename' not in cols:
            conn.execute(text('ALTER TABLE civic_issue ADD COLUMN voice_note_filename VARCHAR(200)'))
        if 'upvotes' not in cols:
            conn.execute(text('ALTER TABLE civic_issue ADD COLUMN upvotes INTEGER DEFAULT 0'))
        if 'downvotes' not in cols:
            conn.execute(text('ALTER TABLE civic_issue ADD COLUMN downvotes INTEGER DEFAULT 0'))

@app.route('/api/issues')
def get_issues():
    try:
        status_filter = request.args.get('status')
        category_filter = request.args.get('category')
        priority_filter = request.args.get('priority')
        date_from = request.args.get('date_from')  # YYYY-MM-DD
        date_to = request.args.get('date_to')      # YYYY-MM-DD
        address_contains = request.args.get('address')
        lat = request.args.get('lat')
        lon = request.args.get('lon')
        radius_km = request.args.get('radius_km')
        
        query = CivicIssue.query
        
        if status_filter:
            query = query.filter(CivicIssue.status == status_filter)
        if category_filter:
            query = query.filter(CivicIssue.category == category_filter)
        if priority_filter:
            query = query.filter(CivicIssue.priority == priority_filter)
        # Date range filtering on created_at
        if date_from:
            try:
                start_dt = datetime.fromisoformat(date_from)
                query = query.filter(CivicIssue.created_at >= start_dt)
            except Exception:
                pass
        if date_to:
            try:
                # Inclusive end of day
                end_dt = datetime.fromisoformat(date_to)
                end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
                query = query.filter(CivicIssue.created_at <= end_dt)
            except Exception:
                pass
        # Address contains (case-insensitive)
        if address_contains:
            try:
                query = query.filter(CivicIssue.address.ilike(f"%{address_contains}%"))
            except Exception:
                pass
        # Location radius filter via bounding box approximation (if all provided)
        if lat and lon and radius_km:
            try:
                lat = float(lat)
                lon = float(lon)
                radius_km = float(radius_km)
                # 1 deg lat ~ 111 km; lon scales by cos(lat)
                lat_delta = radius_km / 111.0
                # avoid cos domain issues
                import math
                lon_delta = radius_km / (111.0 * max(0.0001, math.cos(math.radians(lat))))
                min_lat, max_lat = lat - lat_delta, lat + lat_delta
                min_lon, max_lon = lon - lon_delta, lon + lon_delta
                query = query.filter(
                    CivicIssue.latitude.isnot(None),
                    CivicIssue.longitude.isnot(None),
                    CivicIssue.latitude.between(min_lat, max_lat),
                    CivicIssue.longitude.between(min_lon, max_lon)
                )
            except Exception:
                pass
            
        # Sorting
        sort = request.args.get('sort', 'created_at_desc')
        if sort == 'created_at_asc':
            query = query.order_by(CivicIssue.created_at.asc())
        elif sort == 'votes_desc':
            query = query.order_by((CivicIssue.upvotes - CivicIssue.downvotes).desc(), CivicIssue.created_at.desc())
        elif sort == 'votes_asc':
            query = query.order_by((CivicIssue.upvotes - CivicIssue.downvotes).asc(), CivicIssue.created_at.desc())
        else:
            query = query.order_by(CivicIssue.created_at.desc())

        issues = query.all()
        
        issues_data = []
        base = request.host_url.rstrip('/')
        for issue in issues:
            # Build absolute URLs for media
            if issue.photo_filename:
                if str(issue.photo_filename).startswith('http'):
                    photo_url = issue.photo_filename
                else:
                    photo_url = url_for('uploaded_file', filename=issue.photo_filename, _external=True)
            else:
                photo_url = None
            if issue.voice_note_filename:
                if str(issue.voice_note_filename).startswith('http'):
                    voice_url = issue.voice_note_filename
                else:
                    voice_url = url_for('uploaded_file', filename=issue.voice_note_filename, _external=True)
            else:
                voice_url = None

            issues_data.append({
                'id': issue.id,
                'issue_id': issue.issue_id,
                'title': issue.title,
                'description': issue.description,
                'category': issue.category,
                'priority': issue.priority,
                'status': issue.status,
                'latitude': issue.latitude,
                'longitude': issue.longitude,
                'address': issue.address,
                'photo_filename': issue.photo_filename,
                'photo_url': photo_url,
                'short_note': issue.short_note,
                'voice_note_filename': issue.voice_note_filename,
                'voice_note_url': voice_url,
                'citizen_name': issue.citizen_name,
                'citizen_phone': issue.citizen_phone,
                'citizen_email': issue.citizen_email,
                'assigned_department': issue.assigned_department,
                'admin_notes': issue.admin_notes,
                'upvotes': issue.upvotes or 0,
                'downvotes': issue.downvotes or 0,
                'created_at': issue.created_at.isoformat(),
                'updated_at': issue.updated_at.isoformat()
            })
        
        return jsonify(issues_data)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vote/<issue_uuid>', methods=['POST', 'GET'])
def vote_issue(issue_uuid):
    """Handle voting with one vote per device. POST to cast/toggle vote, GET to read current device vote.
    Body for POST: { action: 'upvote'|'downvote', device_id: 'uuid-string' }
    Query for GET: ?device_id=... to fetch current device vote for this issue.
    """
    try:
        issue = CivicIssue.query.filter_by(issue_id=issue_uuid).first()
        if not issue:
            return jsonify({'success': False, 'message': 'Issue not found'}), 404

        if request.method == 'GET':
            device_id = request.args.get('device_id')
            if not device_id:
                return jsonify({'success': True, 'vote': 0, 'upvotes': issue.upvotes or 0, 'downvotes': issue.downvotes or 0})
            existing = CivicVote.query.filter_by(issue_id=issue_uuid, device_id=device_id).first()
            return jsonify({'success': True, 'vote': existing.vote if existing else 0, 'upvotes': issue.upvotes or 0, 'downvotes': issue.downvotes or 0})

        data = request.get_json(silent=True) or {}
        action = data.get('action')
        device_id = data.get('device_id')
        if action not in ('upvote', 'downvote'):
            return jsonify({'success': False, 'message': 'Invalid action'}), 400
        if not device_id:
            return jsonify({'success': False, 'message': 'Missing device_id'}), 400

        desired = 1 if action == 'upvote' else -1
        existing = CivicVote.query.filter_by(issue_id=issue_uuid, device_id=device_id).first()

        if existing:
            if existing.vote == desired:
                # Already voted the same way; no change
                return jsonify({'success': True, 'vote': existing.vote, 'upvotes': issue.upvotes or 0, 'downvotes': issue.downvotes or 0, 'message': 'Already voted'})
            # Toggle from previous to new
            if existing.vote == 1:
                issue.upvotes = max(0, (issue.upvotes or 0) - 1)
            elif existing.vote == -1:
                issue.downvotes = max(0, (issue.downvotes or 0) - 1)
            # Apply new vote
            if desired == 1:
                issue.upvotes = (issue.upvotes or 0) + 1
            else:
                issue.downvotes = (issue.downvotes or 0) + 1
            existing.vote = desired
        else:
            # First vote from this device
            if desired == 1:
                issue.upvotes = (issue.upvotes or 0) + 1
            else:
                issue.downvotes = (issue.downvotes or 0) + 1
            db.session.add(CivicVote(issue_id=issue_uuid, device_id=device_id, vote=desired))

        db.session.commit()
        return jsonify({'success': True, 'vote': desired, 'upvotes': issue.upvotes or 0, 'downvotes': issue.downvotes or 0})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/delete_issue/<int:issue_id>', methods=['DELETE', 'POST'])
@login_required
def delete_issue(issue_id):
    try:
        issue = CivicIssue.query.get_or_404(issue_id)
        # Remove uploaded files if they exist
        try:
            if issue.photo_filename:
                p = os.path.join(app.config['UPLOAD_FOLDER'], issue.photo_filename)
                if os.path.exists(p):
                    os.remove(p)
            if issue.voice_note_filename:
                vp = os.path.join(app.config['UPLOAD_FOLDER'], issue.voice_note_filename)
                if os.path.exists(vp):
                    os.remove(vp)
        except Exception:
            # Non-fatal: if file deletion fails, still delete DB row
            pass

        # Also remove any votes for this issue to maintain integrity
        try:
            CivicVote.query.filter_by(issue_id=issue.issue_id).delete()
        except Exception:
            pass

        db.session.delete(issue)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Issue deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/update_issue/<int:issue_id>', methods=['PUT'])
def update_issue(issue_id):
    try:
        issue = CivicIssue.query.get_or_404(issue_id)
        data = request.get_json()
        
        if 'status' in data:
            issue.status = data['status']
        if 'priority' in data:
            issue.priority = data['priority']
        if 'assigned_department' in data:
            issue.assigned_department = data['assigned_department']
        if 'admin_notes' in data:
            issue.admin_notes = data['admin_notes']
            
        issue.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Issue updated successfully'})
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/analytics')
def get_analytics():
    try:
        total_issues = CivicIssue.query.count()
        
        # Status distribution
        status_counts = db.session.query(
            CivicIssue.status, 
            db.func.count(CivicIssue.id)
        ).group_by(CivicIssue.status).all()
        
        # Category distribution
        category_counts = db.session.query(
            CivicIssue.category, 
            db.func.count(CivicIssue.id)
        ).group_by(CivicIssue.category).all()
        
        # Priority distribution
        priority_counts = db.session.query(
            CivicIssue.priority, 
            db.func.count(CivicIssue.id)
        ).group_by(CivicIssue.priority).all()
        
        # Department workload
        department_counts = db.session.query(
            CivicIssue.assigned_department, 
            db.func.count(CivicIssue.id)
        ).group_by(CivicIssue.assigned_department).all()
        
        return jsonify({
            'total_issues': total_issues,
            'status_distribution': dict(status_counts),
            'category_distribution': dict(category_counts),
            'priority_distribution': dict(priority_counts),
            'department_workload': dict(department_counts)
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/track/<issue_id>')
def track_issue(issue_id):
    issue = CivicIssue.query.filter_by(issue_id=issue_id).first_or_404()
    return render_template('track.html', issue=issue)

def seed_departments_if_needed():
    """Seed default departments on first run."""
    if Department.query.count() == 0:
        departments = [
            Department(name='Public Works Department', categories='["Roads & Infrastructure"]'),
            Department(name='Electrical Department', categories='["Street Lighting"]'),
            Department(name='Water Supply Department', categories='["Water & Drainage"]'),
            Department(name='Sanitation Department', categories='["Waste Management"]'),
            Department(name='Environment Department', categories='["Parks & Environment"]'),
            Department(name='Traffic Police', categories='["Traffic & Transportation"]'),
            Department(name='General Administration', categories='["Other"]')
        ]
        for dept in departments:
            db.session.add(dept)
        db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        # Auto-migrate new columns if needed
        ensure_issue_extra_columns()
        seed_departments_if_needed()
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)

# Ensure DB is ready on serverless platforms (e.g., Vercel) before first request
@app.before_first_request
def _init_db_on_first_request():
    try:
        with app.app_context():
            db.create_all()
            ensure_issue_extra_columns()
            seed_departments_if_needed()
    except Exception:
        pass
