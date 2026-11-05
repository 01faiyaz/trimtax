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
