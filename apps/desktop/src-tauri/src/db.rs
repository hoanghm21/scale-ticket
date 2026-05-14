use std::path::Path;
use std::sync::Mutex;

use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};

pub struct Db {
    conn: Mutex<Connection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedTicket {
    pub id: String,
    pub event_name: String,
    pub seat: String,
    pub status: String,
}

impl Db {
    pub fn open(path: &Path) -> Result<Self, String> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| format!("create db dir: {e}"))?;
        }
        let conn = Connection::open(path).map_err(|e| format!("open db: {e}"))?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS tickets (
                id TEXT PRIMARY KEY,
                event_name TEXT NOT NULL,
                seat TEXT NOT NULL,
                status TEXT NOT NULL,
                synced_at INTEGER NOT NULL
            );",
        )
        .map_err(|e| format!("init schema: {e}"))?;
        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn list_tickets(&self) -> Result<Vec<CachedTicket>, String> {
        let conn = self.conn.lock().map_err(|e| format!("lock: {e}"))?;
        let mut stmt = conn
            .prepare("SELECT id, event_name, seat, status FROM tickets ORDER BY synced_at DESC")
            .map_err(|e| format!("prepare: {e}"))?;
        let rows = stmt
            .query_map([], |row| {
                Ok(CachedTicket {
                    id: row.get(0)?,
                    event_name: row.get(1)?,
                    seat: row.get(2)?,
                    status: row.get(3)?,
                })
            })
            .map_err(|e| format!("query: {e}"))?;

        let mut out = Vec::new();
        for r in rows {
            out.push(r.map_err(|e| format!("row: {e}"))?);
        }
        Ok(out)
    }

    pub fn upsert_tickets(&self, tickets: &[CachedTicket]) -> Result<usize, String> {
        let mut conn = self.conn.lock().map_err(|e| format!("lock: {e}"))?;
        let tx = conn.transaction().map_err(|e| format!("tx: {e}"))?;
        let synced_at = chrono::Utc::now().timestamp();

        let mut count = 0usize;
        {
            let mut stmt = tx
                .prepare(
                    "INSERT INTO tickets (id, event_name, seat, status, synced_at)
                     VALUES (?1, ?2, ?3, ?4, ?5)
                     ON CONFLICT(id) DO UPDATE SET
                        event_name = excluded.event_name,
                        seat = excluded.seat,
                        status = excluded.status,
                        synced_at = excluded.synced_at",
                )
                .map_err(|e| format!("prepare upsert: {e}"))?;

            for t in tickets {
                stmt.execute(params![t.id, t.event_name, t.seat, t.status, synced_at])
                    .map_err(|e| format!("upsert: {e}"))?;
                count += 1;
            }
        }

        tx.commit().map_err(|e| format!("commit: {e}"))?;
        Ok(count)
    }
}
