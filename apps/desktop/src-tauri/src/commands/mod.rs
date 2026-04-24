// Desktop IPC command handlers
// Add Tauri commands here and register them in main.rs

pub mod tickets {
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Serialize, Deserialize)]
    pub struct CachedTicket {
        pub id: String,
        pub event_name: String,
        pub seat: String,
        pub status: String,
    }

    #[tauri::command]
    pub async fn get_cached_tickets() -> Result<Vec<CachedTicket>, String> {
        // TODO: Read from local SQLite cache
        Ok(vec![])
    }

    #[tauri::command]
    pub async fn sync_tickets() -> Result<(), String> {
        // TODO: Sync local cache with remote API
        Ok(())
    }
}
