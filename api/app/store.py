"""Where workspaces are saved.

Each workspace is one row: an id, whether it's a demo copy, and its data as JSON.
With DATABASE_URL set (Neon in production) it uses Postgres; without it, a
local SQLite file, so the app and tests run with no setup.
"""

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone

def connect():
    """Returns (connection, placeholder). Postgres uses %s, SQLite uses ?."""
    url = os.environ.get("DATABASE_URL")
    if url:
        import psycopg
        return psycopg.connect(url), "%s"
    return sqlite3.connect(os.environ.get("TRIMTAX_SQLITE_PATH", "trimtax.db")), "?"


def setup():
    conn, _ = connect()
    with conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS workspaces ("
            " id TEXT PRIMARY KEY,"
            " is_demo BOOLEAN NOT NULL,"
            " data TEXT NOT NULL,"
            " updated_at TEXT NOT NULL)"
        )
        # One row per AI call: what ran, how long it took, what it cost. No receipt text.
        conn.execute(
            "CREATE TABLE IF NOT EXISTS traces ("
            " id TEXT PRIMARY KEY,"
            " workspace_id TEXT NOT NULL,"
            " data TEXT NOT NULL,"
            " created_at TEXT NOT NULL)"
        )
        # Receipt files people upload, base64 text so SQLite and Postgres work the same.
        conn.execute(
            "CREATE TABLE IF NOT EXISTS uploads ("
            " id TEXT PRIMARY KEY,"
            " workspace_id TEXT NOT NULL,"
            " media_type TEXT NOT NULL,"
            " data TEXT NOT NULL,"
            " created_at TEXT NOT NULL)"
        )
    conn.close()


def now_text():
    return datetime.now(timezone.utc).isoformat()


def create(data, is_demo):
    workspace_id = uuid.uuid4().hex
    conn, mark = connect()
    with conn:
        conn.execute(
            f"INSERT INTO workspaces (id, is_demo, data, updated_at) VALUES ({mark}, {mark}, {mark}, {mark})",
            (workspace_id, is_demo, json.dumps(data), now_text()),
        )
    conn.close()
    return workspace_id


def load(workspace_id):
    """Returns (data, is_demo), or (None, None) if there's no such workspace."""
    conn, mark = connect()
    row = conn.execute(
        f"SELECT data, is_demo FROM workspaces WHERE id = {mark}", (workspace_id,)
    ).fetchone()
    conn.close()
    if row is None:
        return None, None
    return json.loads(row[0]), bool(row[1])


def save(workspace_id, data):
    conn, mark = connect()
    with conn:
        conn.execute(
            f"UPDATE workspaces SET data = {mark}, updated_at = {mark} WHERE id = {mark}",
            (json.dumps(data), now_text(), workspace_id),
        )
    conn.close()


def add_trace(workspace_id, trace):
    trace_id = uuid.uuid4().hex
    conn, mark = connect()
    with conn:
        conn.execute(
            f"INSERT INTO traces (id, workspace_id, data, created_at) VALUES ({mark}, {mark}, {mark}, {mark})",
            (trace_id, workspace_id, json.dumps(trace), now_text()),
        )
    conn.close()
    return trace_id


def list_traces(workspace_id):
    conn, mark = connect()
    rows = conn.execute(
        f"SELECT id, data, created_at FROM traces WHERE workspace_id = {mark} ORDER BY created_at",
        (workspace_id,),
    ).fetchall()
    conn.close()
    traces = []
    for trace_id, data, created_at in rows:
        trace = json.loads(data)
        trace["id"] = trace_id
        trace["created_at"] = created_at
        traces.append(trace)
    return traces


def save_upload(workspace_id, media_type, base64_text):
    upload_id = "up_" + uuid.uuid4().hex
    conn, mark = connect()
    with conn:
        conn.execute(
            f"INSERT INTO uploads (id, workspace_id, media_type, data, created_at) VALUES ({mark}, {mark}, {mark}, {mark}, {mark})",
            (upload_id, workspace_id, media_type, base64_text, now_text()),
        )
    conn.close()
    return upload_id


def load_upload(upload_id):
    """Returns (media_type, base64_text), or (None, None)."""
    conn, mark = connect()
    row = conn.execute(
        f"SELECT media_type, data FROM uploads WHERE id = {mark}", (upload_id,)
    ).fetchone()
    conn.close()
    if row is None:
        return None, None
    return row[0], row[1]


def uploads_since(iso_time):
    """How many files were uploaded since a time, across all workspaces."""
    conn, mark = connect()
    row = conn.execute(f"SELECT COUNT(*) FROM uploads WHERE created_at >= {mark}", (iso_time,)).fetchone()
    conn.close()
    return row[0]


def skill_calls_since(iso_time, skill):
    """How many calls of one AI skill were made since a time, across all workspaces."""
    conn, mark = connect()
    pattern = f'%"skill": "{skill}"%'
    row = conn.execute(
        f"SELECT COUNT(*) FROM traces WHERE created_at >= {mark} AND data LIKE {mark}", (iso_time, pattern)
    ).fetchone()
    conn.close()
    return row[0]
