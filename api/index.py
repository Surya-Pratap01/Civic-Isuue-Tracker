# Vercel Python Function entrypoint for the Flask app
# Exposes the Flask WSGI application as `app`

from app import app as flask_app

# The name `app` is important for Vercel's Python runtime (WSGI)
app = flask_app
