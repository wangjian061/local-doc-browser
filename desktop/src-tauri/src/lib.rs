pub mod editor;
pub mod library;
mod persistence;
pub mod preview;
use library::{Document, Library, Preferences, ScanResult, Session};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Mutex,
    },
};
use tauri::{Emitter, Manager, State};

#[derive(Default)]
struct AppData {
    library: Mutex<Option<Library>>,
    session_lock: Mutex<()>,
    scan_id: AtomicU64,
    editing: AtomicBool,
}
fn root(data: &AppData) -> Result<PathBuf, String> {
    data.library
        .lock()
        .map_err(|_| "目录状态不可用")?
        .as_ref()
        .map(|l| l.root.clone())
        .ok_or_else(|| "请先选择目录。".into())
}
fn state_file(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let p = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&p).map_err(|e| e.to_string())?;
    Ok(p.join("session.json"))
}
#[tauri::command]
fn load_session(app: tauri::AppHandle, data: State<'_, AppData>) -> Result<Session, String> {
    let _guard = data.session_lock.lock().map_err(|_| "状态锁不可用")?;
    let p = state_file(&app)?;
    persistence::load(&p)
}
#[tauri::command]
fn save_session(
    app: tauri::AppHandle,
    data: State<'_, AppData>,
    mut session: Session,
) -> Result<(), String> {
    let _guard = data.session_lock.lock().map_err(|_| "状态锁不可用")?;
    if !session.preferences.window_opacity.is_finite() {
        session.preferences.window_opacity = 0.94
    }
    session.preferences.window_opacity = session.preferences.window_opacity.clamp(0.65, 1.0);
    let p = state_file(&app)?;
    persistence::save(&p, &session)
}
#[tauri::command]
async fn scan_directory(
    app: tauri::AppHandle,
    path: String,
    preferences: Preferences,
) -> Result<ScanResult, String> {
    let id = app
        .state::<AppData>()
        .scan_id
        .fetch_add(1, Ordering::SeqCst)
        + 1;
    let (scan, lib) =
        tauri::async_runtime::spawn_blocking(move || library::scan(Path::new(&path), &preferences))
            .await
            .map_err(|e| e.to_string())??;
    let state = app.state::<AppData>();
    if state.scan_id.load(Ordering::SeqCst) != id {
        return Err("目录扫描已被新请求替代。".into());
    }
    *state.library.lock().map_err(|_| "目录锁不可用")? = Some(lib);
    Ok(scan)
}
#[tauri::command]
async fn search_documents(app: tauri::AppHandle, query: String) -> Result<Vec<Document>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let data = app.state::<AppData>();
        let lib = data.library.lock().map_err(|_| "目录锁不可用")?;
        Ok(lib
            .as_ref()
            .map(|l| library::search(l, &query))
            .unwrap_or_default())
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
fn document_exists(data: State<'_, AppData>, path: String) -> Result<(), String> {
    let p = library::authorized(&root(&data)?, Path::new(&path))?;
    if !p.is_file() || library::kind(&p).is_none() {
        return Err("文档不存在或格式不支持。".into());
    }
    fs::File::open(p).map(|_| ()).map_err(|e| e.to_string())
}
#[tauri::command]
async fn read_html_source(app: tauri::AppHandle, path: String) -> Result<editor::Source, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let data = app.state::<AppData>();
        let source = editor::read(&root(&data)?, Path::new(&path))?;
        data.editing.store(true, Ordering::SeqCst);
        Ok(source)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
async fn save_html_source(
    app: tauri::AppHandle,
    path: String,
    revision: String,
    content: String,
) -> Result<Document, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let data = app.state::<AppData>();
        let mut guard = data.library.lock().map_err(|_| "目录锁不可用")?;
        let lib = guard.as_mut().ok_or("请先选择目录")?;
        editor::save(lib, Path::new(&path), &revision, &content)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
fn finish_html_edit(data: State<'_, AppData>) {
    data.editing.store(false, Ordering::SeqCst);
}
#[tauri::command]
fn confirm_app_exit(app: tauri::AppHandle, data: State<'_, AppData>) {
    data.editing.store(false, Ordering::SeqCst);
    app.exit(0);
}
#[tauri::command]
fn rename_document(data: State<'_, AppData>, path: String, name: String) -> Result<String, String> {
    library::rename(&root(&data)?, Path::new(&path), &name).map(|p| p.to_string_lossy().into())
}
#[tauri::command]
async fn trash_document(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let p = library::authorized(&root(&app.state::<AppData>())?, Path::new(&path))?;
    if !p.is_file() || library::kind(&p).is_none() {
        return Err("仅支持将文档移入回收站。".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        trash::delete(&p).map_err(|e| format!("移入回收站失败：{e}"))
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
fn open_external(url: String) -> Result<(), String> {
    let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;
    if !matches!(parsed.scheme(), "http" | "https" | "mailto") {
        return Err("此链接协议不受支持。".into());
    }
    open::that_detached(url).map_err(|e| e.to_string())
}
#[tauri::command]
fn open_document(data: State<'_, AppData>, path: String) -> Result<(), String> {
    let p = library::authorized(&root(&data)?, Path::new(&path))?;
    open::that_detached(p).map_err(|e| e.to_string())
}
#[tauri::command]
fn reveal_document(data: State<'_, AppData>, path: String) -> Result<(), String> {
    let p = library::authorized(&root(&data)?, Path::new(&path))?;
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-R")
            .arg(p)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer.exe")
            .arg(format!("/select,{}", p.display()))
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
#[tauri::command]
fn parent_directory(data: State<'_, AppData>) -> Result<String, String> {
    let p = root(&data)?;
    p.parent()
        .map(|p| p.to_string_lossy().into())
        .ok_or_else(|| "当前已是最上级目录。".into())
}
#[tauri::command]
async fn export_pdf(
    app: tauri::AppHandle,
    data: State<'_, AppData>,
    path: String,
) -> Result<(), String> {
    let path = library::authorized(&root(&data)?, Path::new(&path))?;
    let file = url::Url::from_file_path(&path).map_err(|_| "文件路径无法转换")?;
    #[cfg(target_os = "windows")]
    let address = format!("http://document.localhost{}?print=1", file.path());
    #[cfg(not(target_os = "windows"))]
    let address = format!("document://localhost{}?print=1", file.path());
    let url = url::Url::parse(&address).map_err(|e| e.to_string())?;
    if let Some(w) = app.get_webview_window("pdf-export") {
        w.close().map_err(|e| e.to_string())?;
    }
    tauri::WebviewWindowBuilder::new(&app, "pdf-export", tauri::WebviewUrl::External(url))
        .title("导出 PDF — 在打印对话框中选择保存为 PDF")
        .inner_size(920., 760.)
        .on_page_load(|window, event| {
            if event.event() == tauri::webview::PageLoadEvent::Finished {
                let _ = window.eval("setTimeout(()=>window.print(),400)");
            }
        })
        .build()
        .map_err(|e| format!("无法打开 PDF 导出窗口：{e}"))?;
    Ok(())
}
fn protocol_response(
    app: &tauri::AppHandle,
    uri: &tauri::http::Uri,
) -> Result<(Vec<u8>, String), String> {
    let decoded = percent_encoding::percent_decode_str(uri.path())
        .decode_utf8()
        .map_err(|e| e.to_string())?;
    #[cfg(windows)]
    let path = if decoded.starts_with("//") {
        PathBuf::from(decoded.replace('/', "\\"))
    } else {
        PathBuf::from(decoded.trim_start_matches('/'))
    };
    #[cfg(not(windows))]
    let path = PathBuf::from(decoded.as_ref());
    let canonical = library::authorized(&root(&app.state::<AppData>())?, &path)?;
    if !canonical.is_file() {
        return Err("该路径不是文件。".into());
    }
    let bytes = fs::read(&canonical).map_err(|e| format!("无法读取文档：{e}"))?;
    if library::kind(&canonical).is_some() {
        Ok((
            preview::render(&canonical, &bytes)?.into_bytes(),
            "text/html; charset=utf-8".into(),
        ))
    } else {
        Ok((
            bytes,
            mime_guess::from_path(&canonical)
                .first_or_octet_stream()
                .to_string(),
        ))
    }
}
pub fn run() {
    tauri::Builder::default().manage(AppData::default()).plugin(tauri_plugin_dialog::init())
        .register_asynchronous_uri_scheme_protocol("document",|ctx,request,responder|{
            let app=ctx.app_handle().clone();
            tauri::async_runtime::spawn_blocking(move||{
                let response=match protocol_response(&app,request.uri()){
                    Ok((bytes,mime))=>tauri::http::Response::builder().status(200).header("Content-Type",mime).header("Cache-Control","no-store").header("Access-Control-Allow-Origin","*").body(bytes),
                    Err(message)=>{let html=format!("<!doctype html><meta charset=utf-8><style>body{{font:15px system-ui;padding:40px;color:#5d2929}}</style><h2>无法预览文档</h2><p>{}</p><p>刷新目录或重新选择文档。</p>",html_escape::encode_text(&message));tauri::http::Response::builder().status(404).header("Content-Type","text/html; charset=utf-8").header("Cache-Control","no-store").body(html.into_bytes())}
                };if let Ok(response)=response{responder.respond(response)}
            });
        })
        .invoke_handler(tauri::generate_handler![read_html_source,save_html_source,finish_html_edit,confirm_app_exit,load_session,save_session,scan_directory,search_documents,document_exists,rename_document,trash_document,open_external,open_document,reveal_document,parent_directory,export_pdf])
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    if window.state::<AppData>().editing.load(Ordering::SeqCst) {
                        api.prevent_close();
                        let _ = window.emit("request-editor-exit", ());
                    }
                }
            }
        })
        .build(tauri::generate_context!()).expect("客户端启动失败")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if app.state::<AppData>().editing.load(Ordering::SeqCst) {
                    api.prevent_exit();
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.set_focus();
                        let _ = window.emit("request-editor-exit", ());
                    }
                }
            }
        });
}
