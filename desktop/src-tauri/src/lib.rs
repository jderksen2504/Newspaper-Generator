// Newspaper Generator — Tauri 2.0 Backend
//
// Commands exposed to the frontend:
//   - save_project_json(project, suggested_name) -> path
//   - load_project_json() -> project
//   - export_png(project) -> png bytes written to chosen path
//
// File dialogs use tauri-plugin-dialog. The PNG sidecar is spawned via
// std::process::Command (synchronous, simple, no event-loop overhead).

use std::path::PathBuf;
use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;
use std::sync::Mutex;

// Hinweis: tauri_plugin_shell wird nicht mehr für den Sidecar-Aufruf verwendet.
// Stattdessen nutzen wir std::process::Command direkt (in der export_png-Funktion).

mod errors;
use errors::AppError;

// ============================================================================
// Types (mirror of the TypeScript types in src/types.ts)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StampBox {
    pub heading: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Article {
    pub id: String,
    pub headline: String,
    pub subheadline: String,
    pub text: String,
    pub image_url: Option<String>,
    pub image_base64: Option<String>,
    pub headline_size: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FontSizeConfig {
    pub stamp_heading: f32,
    pub stamp_content: f32,
    pub title: f32,
    pub meta: f32,
    pub article_headline: f32,
    pub article_subheadline: f32,
    pub article_body: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Decorations {
    #[serde(default = "default_corner_ornament")]
    pub corner_ornament: String,
    #[serde(default = "default_corner_ornament_size")]
    pub corner_ornament_size: f32,
    #[serde(default = "default_divider_style")]
    pub divider_style: String,
    #[serde(default = "default_divider_custom_text")]
    pub divider_custom_text: String,
    #[serde(default = "default_divider_font_size")]
    pub divider_font_size: f32,
    #[serde(default)]
    pub divider_text_bold: bool,
    #[serde(default)]
    pub title_shadow: bool,
}

fn default_corner_ornament() -> String { "none".to_string() }
fn default_corner_ornament_size() -> f32 { 20.0 }
fn default_divider_style() -> String { "double".to_string() }
fn default_divider_custom_text() -> String { "ᚱ ᚢ ᚾ ᛁ ᚲ".to_string() }
fn default_divider_font_size() -> f32 { 14.0 }

// Custom Theme — 14 HEX-Farben, die ein Preset überschreiben.
// border-* Style/Width und paper.gradient werden vom baseTheme übernommen.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomThemeColors {
    #[serde(default)] pub paper_bg: String,
    #[serde(default)] pub text_primary: String,
    #[serde(default)] pub text_accent: String,
    #[serde(default)] pub text_muted: String,
    #[serde(default)] pub border_header_color: String,
    #[serde(default)] pub border_stamp_color: String,
    #[serde(default)] pub border_separator_color: String,
    #[serde(default)] pub border_footer_color: String,
    #[serde(default)] pub stamp_heading_color: String,
    #[serde(default)] pub stamp_content_color: String,
    #[serde(default)] pub stamp_bg: String,
    #[serde(default)] pub title_color: String,
    #[serde(default)] pub duotone_highlight: String,
    #[serde(default)] pub duotone_shadow: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomTheme {
    #[serde(default = "default_theme")]
    pub base_theme: String,
    #[serde(default)]
    pub colors: CustomThemeColors,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewspaperSettings {
    pub title: String,
    pub date: String,
    pub location: String,
    pub issue: String,
    pub stamp_left: StampBox,
    pub stamp_right: StampBox,

    /// Altes Feld (v1.0.0). Wird für Abwärtskompatibilität beibehalten.
    /// Neue Projekte nutzen stattdessen `font_sizes` + `zoom`.
    #[serde(default)]
    pub font_size_pt: Option<f32>,

    /// Pro-Zone-Schriftgrößen in pt (v1.1.0+).
    /// Wenn vorhanden, hat das Vorrang vor `font_size_pt`.
    #[serde(default)]
    pub font_sizes: Option<FontSizeConfig>,

    /// Globaler Zoom-Faktor (1.0 = 100%). Skaliert alle fontSizes.
    #[serde(default = "default_zoom")]
    pub zoom: f32,

    pub title_style: String,
    pub paper_format: String,
    pub column_count: u32,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default)]
    pub custom_theme: Option<CustomTheme>,
    #[serde(default = "default_decorations")]
    pub decorations: Decorations,
}

fn default_zoom() -> f32 {
    1.0
}

fn default_theme() -> String {
    "classic".to_string()
}

fn default_decorations() -> Decorations {
    Decorations {
        corner_ornament: "none".to_string(),
        corner_ornament_size: 20.0,
        divider_style: "double".to_string(),
        divider_custom_text: "ᚱ ᚢ ᚾ ᛁ ᚲ".to_string(),
        divider_font_size: 14.0,
        divider_text_bold: false,
        title_shadow: false,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewspaperProject {
    pub version: String,
    #[serde(default)]
    pub saved_at: String,
    pub settings: NewspaperSettings,
    pub articles: Vec<Article>,
}

// ============================================================================
// App state: stores the path of the last loaded/saved file
// ============================================================================

#[derive(Default)]
pub struct AppState {
    pub current_file: Mutex<Option<PathBuf>>,
}

// ============================================================================
// Command: save_project_json
// Opens a native save dialog, writes the project as pretty-printed JSON.
// Returns the chosen path as a string.
// ============================================================================

#[tauri::command]
async fn save_project_json(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    project: NewspaperProject,
    suggested_name: Option<String>,
) -> Result<String, AppError> {
    let default_name = format!(
        "{}.json",
        suggested_name
            .clone()
            .unwrap_or_else(|| "newspaper".to_string())
            .replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_', "_")
    );

    let file_path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .set_file_name(&default_name)
        .blocking_save_file();

    let path = file_path
        .ok_or_else(|| AppError::Dialog("Speichern abgebrochen".to_string()))?
        .into_path()
        .map_err(|e| AppError::Dialog(format!("Ungültiger Pfad: {e}")))?;

    let json = serde_json::to_string_pretty(&project)?;
    std::fs::write(&path, json)?;

    *state.current_file.lock().unwrap() = Some(path.clone());

    Ok(path.to_string_lossy().to_string())
}

// ============================================================================
// Command: load_project_json
// Opens a native open dialog, reads & parses the JSON file.
//
// Note: tauri-plugin-dialog v2.7 renames `blocking_open_file` → `blocking_pick_file`.
// ============================================================================

#[tauri::command]
async fn load_project_json(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<NewspaperProject, AppError> {
    let file_path = app
        .dialog()
        .file()
        .add_filter("JSON", &["json"])
        .blocking_pick_file();

    let path = file_path
        .ok_or_else(|| AppError::Dialog("Öffnen abgebrochen".to_string()))?
        .into_path()
        .map_err(|e| AppError::Dialog(format!("Ungültiger Pfad: {e}")))?;

    let content = std::fs::read_to_string(&path)?;
    let project: NewspaperProject = serde_json::from_str(&content)?;

    *state.current_file.lock().unwrap() = Some(path);

    Ok(project)
}

// ============================================================================
// Command: export_png
// Renders the project to PNG via the Playwright sidecar.
// Writes the PNG to a user-chosen path.
//
// We use std::process::Command instead of tauri_plugin_shell because we need
// synchronous "spawn + wait for exit code" semantics. The shell plugin's API
// is event-based (returns a Receiver<CommandEvent> + CommandChild tuple),
// which is more complex than we need here.
// ============================================================================

/// Gemeinsame Logik für PNG- und PDF-Export.
/// Ruft den Sidecar auf, parst den JSON-Output und gibt die Ergebnis-Dateipfade zurück.
async fn run_sidecar_export(
    app: &tauri::AppHandle,
    project: &NewspaperProject,
    output_prefix: &str,
    mode: &str,
    compression: &str,
) -> Result<(usize, Vec<String>), AppError> {
    let temp_dir = app.path().temp_dir()?;
    let temp_project_path = temp_dir.join(format!("newspaper-{}.json", uuid_stamp()));
    let project_json = serde_json::to_string(project)?;
    std::fs::write(&temp_project_path, &project_json)?;

    let resource_path = app
        .path()
        .resolve("sidecars/playwright-export/export.js", tauri::path::BaseDirectory::Resource)?;

    let node_bin = find_node_binary()?;

    log::info!(
        "Sidecar: {} {} {} {} {} {}",
        node_bin,
        resource_path.display(),
        temp_project_path.display(),
        output_prefix,
        mode,
        compression
    );

    let output = Command::new(&node_bin)
        .arg(&resource_path)
        .arg(&temp_project_path)
        .arg(output_prefix)
        .arg(mode)
        .arg(compression)
        .output()
        .map_err(|e| AppError::Sidecar(format!(
            "Node.js konnte nicht gestartet werden (Pfad: {}). Fehler: {}",
            node_bin, e
        )))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        return Err(AppError::Sidecar(format!(
            "Sidecar fehlgeschlagen (exit code: {:?}).\nstdout:\n{}\nstderr:\n{}",
            output.status.code(),
            stdout,
            stderr
        )));
    }

    // Aufräumen: JSON-Datei löschen
    let _ = std::fs::remove_file(&temp_project_path);

    // Sidecar gibt JSON auf stdout: { pages: N, files: [...] }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stdout_trimmed = stdout.trim();

    // Parse JSON output
    let result: serde_json::Value = serde_json::from_str(stdout_trimmed)
        .map_err(|e| AppError::Sidecar(format!(
            "Sidecar-Output konnte nicht geparsed werden: {}\nOutput: {}",
            e, stdout_trimmed
        )))?;

    let pages = result.get("pages")
        .and_then(|v| v.as_u64())
        .unwrap_or(0) as usize;
    let files = result.get("files")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    Ok((pages, files))
}

#[tauri::command]
async fn export_png(
    app: tauri::AppHandle,
    project: NewspaperProject,
) -> Result<String, AppError> {
    // 1. Save-Dialog: User wählt Dateinamen
    let safe_title = project
        .settings
        .title
        .replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_', "_");
    let default_name = if safe_title.is_empty() {
        "newspaper.png".to_string()
    } else {
        format!("{}.png", safe_title)
    };

    let file_path = app
        .dialog()
        .file()
        .add_filter("PNG", &["png"])
        .set_file_name(&default_name)
        .blocking_save_file();

    let target_path = file_path
        .ok_or_else(|| AppError::Dialog("Export abgebrochen".to_string()))?
        .into_path()
        .map_err(|e| AppError::Dialog(format!("Ungültiger Pfad: {e}")))?;

    // 2. Sidecar aufrufen mit mode="png"
    //    Der Sidecar erzeugt <prefix>-1.png, <prefix>-2.png, etc.
    //    Wir nutzen den target_path (ohne .png) als Prefix.
    let prefix = target_path.to_string_lossy()
        .trim_end_matches(".png")
        .to_string();

    let (pages, files) = run_sidecar_export(&app, &project, &prefix, "png", "").await?;

    // 3. Dateien vom Temp-Verzeichnis an den Zielort verschieben
    //    Der Sidecar schreibt bereits direkt in den Ziel-Pfad (kein Temp mehr nötig),
    //    weil wir den prefix als output_prefix übergeben.
    //    Wir müssen nur prüfen, dass die Dateien existieren.
    if files.is_empty() {
        return Err(AppError::Sidecar("Sidecar hat keine PNG-Dateien erzeugt".to_string()));
    }

    // 4. Ergebnis-Message zusammenbauen
    if pages == 1 {
        Ok(files[0].clone())
    } else {
        // Bei mehreren Seiten: Verzeichnis + Anzahl zurückgeben
        let dir = target_path.parent()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        Ok(format!("{} PNGs exportiert nach: {}", pages, dir))
    }
}

#[tauri::command]
async fn export_pdf(
    app: tauri::AppHandle,
    project: NewspaperProject,
    compression: String,
) -> Result<String, AppError> {
    // 1. Save-Dialog: User wählt Dateinamen
    let safe_title = project
        .settings
        .title
        .replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_', "_");
    let default_name = if safe_title.is_empty() {
        "newspaper.pdf".to_string()
    } else {
        format!("{}.pdf", safe_title)
    };

    let file_path = app
        .dialog()
        .file()
        .add_filter("PDF", &["pdf"])
        .set_file_name(&default_name)
        .blocking_save_file();

    let target_path = file_path
        .ok_or_else(|| AppError::Dialog("Export abgebrochen".to_string()))?
        .into_path()
        .map_err(|e| AppError::Dialog(format!("Ungültiger Pfad: {e}")))?;

    // 2. Sidecar aufrufen mit mode="pdf"
    let prefix = target_path.to_string_lossy()
        .trim_end_matches(".pdf")
        .to_string();

    let (pages, files) = run_sidecar_export(&app, &project, &prefix, "pdf", &compression).await?;

    if files.is_empty() {
        return Err(AppError::Sidecar("Sidecar hat keine PDF-Datei erzeugt".to_string()));
    }

    // 3. PDF wurde direkt an den Zielort geschrieben — nur prüfen
    let pdf_path = &files[0];
    if !std::path::Path::new(pdf_path).exists() {
        return Err(AppError::Sidecar(format!(
            "PDF wurde nicht erzeugt: {}",
            pdf_path
        )));
    }

    Ok(format!("PDF exportiert ({} Seiten): {}", pages, pdf_path))
}

// ============================================================================
// Command: get_app_version
// ============================================================================

#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

// ============================================================================
// Utility
// ============================================================================

fn uuid_stamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    format!("{nanos:x}")
}

/// Findet die Node.js-Binary.
///
/// WICHTIG: Apps, die aus /Applications/ auf macOS gestartet werden, haben
/// einen stark reduzierten PATH (nur /usr/bin:/bin:/usr/sbin:/sbin). Daher
/// findet `which::which("node")` Node oft nicht, obwohl es installiert ist.
///
/// Wir suchen der Reihe nach:
///   1. `which node` (PATH-Suche via `which`-crate)
///   2. Plattform-spezifische Standard-Installationspfade
///   3. PATH des Users (über Shell-Login) — für nicht-standard Installationen
///
/// Gibt `Err` mit verständlicher Fehlermeldung zurück, wenn Node fehlt.
fn find_node_binary() -> Result<String, AppError> {
    // 1. PATH-Suche
    if let Ok(path) = which::which("node") {
        return Ok(path.to_string_lossy().to_string());
    }

    // 2. Plattform-spezifische Standard-Installationspfade
    #[cfg(target_os = "macos")]
    let candidates: Vec<&str> = vec![
        "/opt/homebrew/bin/node",        // Apple Silicon via Homebrew
        "/usr/local/bin/node",            // Intel via Homebrew oder offizieller Installer
        "/opt/local/bin/node",            // MacPorts
    ];

    #[cfg(target_os = "windows")]
    let candidates: Vec<&str> = vec![
        r"C:\Program Files\nodejs\node.exe",
        r"C:\Program Files (x86)\nodejs\node.exe",
    ];

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let candidates: Vec<&str> = vec![
        "/usr/bin/node",
        "/usr/bin/nodejs",
        "/usr/local/bin/node",
    ];

    for c in &candidates {
        if std::path::Path::new(c).exists() {
            log::info!("Node gefunden unter: {}", c);
            return Ok(c.to_string());
        }
    }

    // 3. Versuchen, Node über die Login-Shell des Users zu finden.
    //    Das holt den vollen PATH inkl. ~/.zshrc, ~/.bash_profile etc.
    //    Auf macOS: z.B. /opt/homebrew/bin via Homebrew-Setup-Script.
    #[cfg(unix)]
    {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
        let result = Command::new(&shell)
            .args(["-l", "-i", "-c", "which node"])
            .output();
        if let Ok(out) = result {
            if out.status.success() {
                let path = String::from_utf8_lossy(&out.stdout).trim().to_string();
                if !path.is_empty() && std::path::Path::new(&path).exists() {
                    log::info!("Node via Login-Shell gefunden: {}", path);
                    return Ok(path);
                }
            }
        }
    }

    // 4. Node nicht gefunden — klare Fehlermeldung
    #[cfg(target_os = "macos")]
    let install_hint = format!(
        "Node.js wurde nicht gefunden. Dein Mac hat Node scheinbar installiert (Terminal: `node --version` \
        funktioniert), aber die App kann es nicht finden.\n\n\
        Das ist ein bekanntes macOS-Problem: Apps aus /Applications/ haben einen reduzierten PATH.\n\n\
        Lösung: Setze die Umgebungsvariable PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH nicht verwechseln — \
        stattdessen beim App-Start im Terminal:\n  \
        PLAYWRIGHT_NODE_PATH=$(which node) \"/Applications/Newspaper Generator.app/Contents/MacOS/newspaper-generator\"\n\n\
        Oder dauerhaft: Trage den Node-Pfad in ~/.zshrc als Standard ein.\n\n\
        Tatsächlicher Pfad von Node: {}",
        std::process::Command::new("which").arg("node").output()
            .ok().and_then(|o| if o.status.success() {
                Some(String::from_utf8_lossy(&o.stdout).trim().to_string())
            } else { None })
            .unwrap_or_else(|| "nicht ermittelbar".to_string())
    );

    #[cfg(target_os = "windows")]
    let install_hint = "Node.js wurde nicht gefunden. Bitte installiere Node.js 20+:\n  \
        Option A:  Lade den Installer von https://nodejs.org/ herunter und führe ihn aus.\n  \
        Option B:  winget install OpenJS.NodeJS\n  \
        Nach der Installation musst du den PC neu starten oder dich ab- und wieder anmelden.".to_string();

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let install_hint = "Node.js wurde nicht gefunden. Bitte installiere Node.js 20+ via deinem Paketmanager (z.B. apt, dnf, pacman).".to_string();

    Err(AppError::Sidecar(install_hint))
}

// ============================================================================
// Run
// ============================================================================

pub fn run() {
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .format_timestamp(None)
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::default())
        .setup(|_app| {
            log::info!("Newspaper Generator gestartet");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_project_json,
            load_project_json,
            export_png,
            export_pdf,
            get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
