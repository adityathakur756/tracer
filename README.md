# TRACER — Flask + SQLite backend

This project keeps the supplied TRACER frontend design and connects its forms and lists to a Flask API backed by SQLite. New records persist in `tracer.db`, even after the server restarts.

## Run on macOS

1. Install Python 3 if it is not already installed.
2. Open Terminal and move into this folder:
   ```bash
   cd path/to/TRACER_backend_project
   ```
3. Create and activate a virtual environment (recommended):
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Start the server:
   ```bash
   python3 app.py
   ```
6. Open **http://127.0.0.1:5000** in your browser. Keep the terminal window open while using the app.

## Windows

```powershell
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

## Included API routes

- `GET /api/health` — server health
- `GET /api/bootstrap` — all records used by the frontend
- `GET, POST /api/peers`
- `PATCH /api/peers/<id>` — update peer check-in status
- `GET, POST /api/teams`
- `GET, POST /api/members`
- `GET, POST /api/pilgrims`
- `GET, POST /api/cases`
- `GET, POST /api/checkpoints`
- `GET, POST /api/medical`

## Notes

- Sample data is fictional and only for demonstration.
- Database file is created automatically on first run.
- This is a college-project prototype, not a production emergency-response system. Before real deployment, add authentication/authorization, input validation, audit logging, backups, HTTPS, rate limiting, and privacy/security review.
