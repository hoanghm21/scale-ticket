// Desktop IPC command handlers
// Add Tauri commands here and register them in main.rs

pub mod tickets {
    use serde::Deserialize;
    use tauri::State;

    use crate::db::{CachedTicket, Db};

    #[tauri::command]
    pub async fn get_cached_tickets(db: State<'_, Db>) -> Result<Vec<CachedTicket>, String> {
        db.list_tickets()
    }

    #[derive(Debug, Deserialize)]
    struct RemoteTicket {
        id: String,
        #[serde(rename = "eventTitle", default)]
        event_title: String,
        #[serde(rename = "eventId", default)]
        event_id: String,
        #[serde(default)]
        seats: Vec<RemoteSeat>,
        #[serde(default)]
        status: String,
    }

    #[derive(Debug, Deserialize, Default)]
    struct RemoteSeat {
        #[serde(default)]
        id: String,
    }

    #[derive(Debug, Deserialize)]
    struct ListTicketsResponse {
        #[serde(default)]
        tickets: Vec<RemoteTicket>,
    }

    #[tauri::command]
    pub async fn sync_tickets(db: State<'_, Db>, user_id: String) -> Result<usize, String> {
        if user_id.trim().is_empty() {
            return Err("user_id is required".into());
        }

        let base = std::env::var("TICKET_API_BASE")
            .unwrap_or_else(|_| "http://localhost:4012".to_string());
        let url = format!("{}/api/tickets?userId={}", base.trim_end_matches('/'), user_id);

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| format!("http client: {e}"))?;

        let resp = client
            .get(&url)
            .send()
            .await
            .map_err(|e| format!("fetch: {e}"))?;

        if !resp.status().is_success() {
            return Err(format!("ticket api {}: {}", resp.status(), url));
        }

        let body: ListTicketsResponse = resp
            .json()
            .await
            .map_err(|e| format!("decode: {e}"))?;

        let cached: Vec<CachedTicket> = body
            .tickets
            .into_iter()
            .map(|t| {
                let seat = t
                    .seats
                    .first()
                    .map(|s| s.id.clone())
                    .unwrap_or_default();
                let event_name = if t.event_title.is_empty() { t.event_id } else { t.event_title };
                CachedTicket {
                    id: t.id,
                    event_name,
                    seat,
                    status: t.status,
                }
            })
            .collect();

        let n = db.upsert_tickets(&cached)?;
        tracing::info!("synced {} tickets", n);
        Ok(n)
    }
}
