// Application-level error types — serialisierbar für Tauri's invoke-Channel

use serde::{Serialize, Serializer};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Dialog-Fehler: {0}")]
    Dialog(String),

    #[error("IO-Fehler: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON-Fehler: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Sidecar-Fehler: {0}")]
    Sidecar(String),

    #[error("Pfad-Fehler: {0}")]
    Path(String),

    #[error("Tauri-Fehler: {0}")]
    Tauri(#[from] tauri::Error),
}

// Tauri verlangt Serialize für den invoke-Rückgabewert von Commands
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
