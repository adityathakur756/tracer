from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "tracer.db"
app = Flask(__name__)
CORS(app)

SCHEMA = {
    "peers": {"id":"TEXT PRIMARY KEY", "name":"TEXT NOT NULL", "group_name":"TEXT", "phone":"TEXT", "checkpoint":"TEXT", "status":"TEXT"},
    "teams": {"id":"TEXT PRIMARY KEY", "name":"TEXT NOT NULL", "lead":"TEXT NOT NULL", "skill":"TEXT", "zone":"TEXT", "status":"TEXT"},
    "members": {"id":"TEXT PRIMARY KEY", "name":"TEXT NOT NULL", "role":"TEXT", "team":"TEXT", "zone":"TEXT", "status":"TEXT", "qual":"TEXT", "contact":"TEXT"},
    "pilgrims": {"id":"TEXT PRIMARY KEY", "name":"TEXT NOT NULL", "age":"INTEGER", "phone":"TEXT", "destination":"TEXT NOT NULL", "group_name":"TEXT", "checkpoint":"TEXT", "emergency":"TEXT", "notes":"TEXT"},
    "cases": {"id":"TEXT PRIMARY KEY", "name":"TEXT NOT NULL", "checkpoint":"TEXT NOT NULL", "priority":"TEXT", "team":"TEXT", "status":"TEXT", "details":"TEXT"},
    "checkpoints": {"id":"TEXT PRIMARY KEY", "person":"TEXT NOT NULL", "zone":"TEXT", "status":"TEXT", "notes":"TEXT", "created_at":"TEXT DEFAULT CURRENT_TIMESTAMP"},
    "medical": {"id":"TEXT PRIMARY KEY", "person":"TEXT NOT NULL", "type":"TEXT", "location":"TEXT NOT NULL", "urgency":"TEXT", "team":"TEXT", "notes":"TEXT", "created_at":"TEXT DEFAULT CURRENT_TIMESTAMP"}
}

SEEDS = {
"peers": [
 {"id":"PEER-1001","name":"Aarav Demo","group_name":"GROUP-A","phone":"Demo contact","checkpoint":"Base Camp","status":"Connected"},
 {"id":"PEER-1002","name":"Mira Demo","group_name":"GROUP-A","phone":"Demo contact","checkpoint":"CP-01","status":"Connected"},
 {"id":"PEER-1003","name":"Kabir Demo","group_name":"GROUP-B","phone":"Demo contact","checkpoint":"CP-02","status":"Pending"},
 {"id":"PEER-1004","name":"Anaya Demo","group_name":"GROUP-B","phone":"Demo contact","checkpoint":"CP-02","status":"Connected"},
 {"id":"PEER-1005","name":"Dev Demo","group_name":"GROUP-C","phone":"Demo contact","checkpoint":"Upper Trail","status":"Pending"},
 {"id":"PEER-1006","name":"Tara Demo","group_name":"GROUP-C","phone":"Demo contact","checkpoint":"Base Camp","status":"Connected"},
 {"id":"PEER-1007","name":"Neel Demo","group_name":"GROUP-D","phone":"Demo contact","checkpoint":"CP-01","status":"Connected"},
 {"id":"PEER-1008","name":"Ira Demo","group_name":"GROUP-D","phone":"Demo contact","checkpoint":"CP-03","status":"Connected"}],
"teams": [
 {"id":"TEAM-001","name":"North Zone Response","lead":"Riya Demo","skill":"Search & Rescue","zone":"North Zone","status":"Available"},
 {"id":"TEAM-002","name":"Medical Support Unit","lead":"Arjun Demo","skill":"Medical Response","zone":"Base Camp","status":"Assigned"},
 {"id":"TEAM-003","name":"Checkpoint Verification","lead":"Meera Demo","skill":"Checkpoint Verification","zone":"Upper Trail","status":"Available"},
 {"id":"TEAM-004","name":"Route Logistics Team","lead":"Dev Demo","skill":"Logistics & Transport","zone":"South Zone","status":"Standby"}],
"members": [
 {"id":"MEM-001","name":"Riya Demo","role":"Team Lead","team":"TEAM-001","zone":"North Zone","status":"Assigned","qual":"Sample qualification","contact":"Demo contact"},
 {"id":"MEM-002","name":"Kabir Demo","role":"Search Volunteer","team":"TEAM-001","zone":"North Zone","status":"Assigned","qual":"Sample qualification","contact":"Demo contact"},
 {"id":"MEM-003","name":"Arjun Demo","role":"Medical Responder","team":"TEAM-002","zone":"Base Camp","status":"Assigned","qual":"Sample qualification","contact":"Demo contact"},
 {"id":"MEM-004","name":"Mira Demo","role":"Medical Responder","team":"TEAM-002","zone":"Base Camp","status":"Assigned","qual":"Sample qualification","contact":"Demo contact"},
 {"id":"MEM-005","name":"Meera Demo","role":"Checkpoint Officer","team":"TEAM-003","zone":"Upper Trail","status":"Assigned","qual":"Sample qualification","contact":"Demo contact"},
 {"id":"MEM-006","name":"Tara Demo","role":"Communications","team":"TEAM-003","zone":"Upper Trail","status":"Available","qual":"Sample qualification","contact":"Demo contact"},
 {"id":"MEM-007","name":"Dev Demo","role":"Team Lead","team":"TEAM-004","zone":"South Zone","status":"Standby","qual":"Sample qualification","contact":"Demo contact"},
 {"id":"MEM-008","name":"Neel Demo","role":"Logistics","team":"TEAM-004","zone":"South Zone","status":"Assigned","qual":"Sample qualification","contact":"Demo contact"}],
"pilgrims": [
 {"id":"PIL-1001","name":"Sample Pilgrim A","destination":"Demo Route A","group_name":"GROUP-A","checkpoint":"Base Camp"},
 {"id":"PIL-1002","name":"Sample Pilgrim B","destination":"Demo Route B","group_name":"GROUP-B","checkpoint":"CP-01"}],
"cases": [
 {"id":"CASE-4587","name":"Sample Pilgrim A","checkpoint":"Katra Checkpoint (demo)","priority":"High","team":"TEAM-001","status":"Follow-up required","details":"Sample case record"},
 {"id":"CASE-4812","name":"Sample Pilgrim B","checkpoint":"Base Camp 3 (demo)","priority":"Medium","team":"TEAM-002","status":"Under review","details":"Sample case record"},
 {"id":"CASE-4920","name":"Sample Pilgrim C","checkpoint":"Sangam Top (demo)","priority":"Medium","team":"TEAM-003","status":"Checkpoint pending","details":"Sample case record"}],
"checkpoints": [
 {"id":"CP-01","person":"PEER-1001","zone":"Base Camp","status":"Verified","notes":"Seeded demo record"},
 {"id":"CP-02","person":"PEER-1003","zone":"Forest Route","status":"Pending follow-up","notes":"Seeded demo record"},
 {"id":"CP-03","person":"PEER-1008","zone":"Upper Trail","status":"Verified","notes":"Seeded demo record"}],
"medical": []
}

def connect():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con

def init_db():
    with connect() as con:
        for table, cols in SCHEMA.items():
            con.execute(f"CREATE TABLE IF NOT EXISTS {table} ({', '.join(f'{k} {v}' for k,v in cols.items())})")
            count = con.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            if count == 0:
                for record in SEEDS.get(table, []):
                    row = dict(record)
                    keys = list(row.keys())
                    con.execute(f"INSERT OR IGNORE INTO {table} ({','.join(keys)}) VALUES ({','.join('?' for _ in keys)})", [row[k] for k in keys])

def public_row(table, row):
    data = dict(row)
    if table in ("peers","pilgrims") and "group_name" in data:
        data["group"] = data.pop("group_name")
    return data

def all_rows(table):
    with connect() as con:
        return [public_row(table, r) for r in con.execute(f"SELECT * FROM {table} ORDER BY rowid DESC").fetchall()]

def clean_payload(table, payload):
    allowed = set(SCHEMA[table].keys())
    if table in ("peers","pilgrims") and "group" in payload:
        payload["group_name"] = payload.pop("group")
    return {k: payload.get(k) for k in allowed if k in payload and k not in ("created_at",)}

@app.get("/")
def index():
    return render_template("index.html")

@app.get("/api/health")
def health():
    return jsonify({"status":"ok","service":"TRACER API","database":"SQLite"})

@app.get("/api/bootstrap")
def bootstrap():
    return jsonify({table: all_rows(table) for table in SCHEMA})

def register_collection(table, required):
    def list_records():
        return jsonify(all_rows(table))
    def create_record():
        payload = request.get_json(silent=True) or {}
        data = clean_payload(table, payload)
        missing = [key for key in required if not str(data.get(key) or "").strip()]
        if missing:
            return jsonify({"error":"Required field(s): " + ", ".join(missing)}), 400
        keys = list(data.keys())
        if "id" not in data or not str(data["id"]).strip():
            return jsonify({"error":"A unique ID is required."}), 400
        try:
            with connect() as con:
                con.execute(f"INSERT INTO {table} ({','.join(keys)}) VALUES ({','.join('?' for _ in keys)})", [data[k] for k in keys])
        except sqlite3.IntegrityError:
            return jsonify({"error":f"{table[:-1].title()} ID already exists: {data.get('id')}"}), 409
        return jsonify({"message":"Created","record":data}), 201
    app.add_url_rule(f"/api/{table}", f"list_{table}", list_records, methods=["GET"])
    app.add_url_rule(f"/api/{table}", f"create_{table}", create_record, methods=["POST"])

for table, required in {
    "peers":["id","name"], "teams":["id","name","lead"], "members":["id","name","team"],
    "pilgrims":["id","name","destination"], "cases":["id","name","checkpoint"],
    "checkpoints":["id","person"], "medical":["id","person","location"]
}.items():
    register_collection(table, required)

@app.patch("/api/peers/<record_id>")
def update_peer(record_id):
    payload = request.get_json(silent=True) or {}
    allowed = {"status","group_name","phone","checkpoint"}
    fields = {k:v for k,v in payload.items() if k in allowed}
    if not fields:
        return jsonify({"error":"No editable fields supplied."}), 400
    with connect() as con:
        cur = con.execute("UPDATE peers SET " + ", ".join(f"{k}=?" for k in fields) + " WHERE id=?", [*fields.values(), record_id])
        if cur.rowcount == 0:
            return jsonify({"error":"Peer not found."}), 404
        row = con.execute("SELECT * FROM peers WHERE id=?", (record_id,)).fetchone()
    return jsonify(public_row("peers", row))

@app.errorhandler(404)
def not_found(_):
    return jsonify({"error":"API route not found."}), 404

@app.errorhandler(500)
def server_error(_):
    return jsonify({"error":"Internal server error. Check the Flask terminal for details."}), 500

init_db()

if __name__ == "__main__":
    print("TRACER API starting at http://127.0.0.1:5000")
    app.run(debug=True, host="127.0.0.1", port=5000)
