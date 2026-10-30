//! Local QA only: binds loopback and restricts all file operations to disposable fixtures.
//! Not linked into the desktop application.
use local_doc_browser::{
    editor,
    library::{self, Preferences, Session},
    preview,
};
use serde_json::{json, Value};
use std::{fs, path::PathBuf};
use tiny_http::{Header, Method, Response, Server};
fn main() {
    let root = std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .expect("fixture directory argument");
    let root = dunce::canonicalize(root).unwrap();
    assert!(
        root.ends_with("tests/fixtures"),
        "QA harness must use tests/fixtures"
    );
    let server = Server::http("127.0.0.1:1431").unwrap();
    let mut session = Session::default();
    for mut request in server.incoming_requests() {
        if request.method() == &Method::Options {
            let _ = request.respond(
                Response::empty(204)
                    .with_header(header("Access-Control-Allow-Origin", "*"))
                    .with_header(header("Access-Control-Allow-Headers", "content-type")),
            );
            continue;
        }
        let url = request.url().to_string();
        if let Some(path) = url.strip_prefix("/document") {
            let decoded = percent_encoding::percent_decode_str(path.split('?').next().unwrap())
                .decode_utf8_lossy();
            let response =
                library::authorized(&root, &PathBuf::from(decoded.as_ref())).and_then(|p| {
                    let b = fs::read(&p).map_err(|e| e.to_string())?;
                    if library::kind(&p).is_some() {
                        preview::render(&p, &b)
                            .map(|h| (h.into_bytes(), "text/html; charset=utf-8".to_string()))
                    } else {
                        Ok((
                            b,
                            mime_guess::from_path(p).first_or_octet_stream().to_string(),
                        ))
                    }
                });
            match response {
                Ok((bytes, mime)) => {
                    let _ = request.respond(
                        Response::from_data(bytes)
                            .with_header(header("Content-Type", &mime))
                            .with_header(header("Cache-Control", "no-store"))
                            .with_header(header("Access-Control-Allow-Origin", "*")),
                    );
                }
                Err(e) => {
                    let _ = request.respond(Response::from_string(e).with_status_code(404));
                }
            }
            continue;
        }
        let mut body = String::new();
        let _ = request.as_reader().read_to_string(&mut body);
        let result = (|| -> Result<Value, String> {
            let body: Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
            let a = &body["args"];
            let cmd = body["command"].as_str().unwrap_or("");
            let path = || -> Result<PathBuf, String> {
                library::authorized(&root, &PathBuf::from(a["path"].as_str().unwrap_or("")))
            };
            match cmd {
                "qa_directory" => Ok(json!(root.to_string_lossy())),
                "load_session" => Ok(json!(session)),
                "save_session" => {
                    session =
                        serde_json::from_value(a["session"].clone()).map_err(|e| e.to_string())?;
                    Ok(Value::Null)
                }
                "scan_directory" => {
                    let p = path()?;
                    let prefs: Preferences = serde_json::from_value(a["preferences"].clone())
                        .map_err(|e| e.to_string())?;
                    Ok(json!(library::scan(&p, &prefs)?.0))
                }
                "search_documents" => {
                    let (_, lib) = library::scan(&root, &session.preferences)?;
                    Ok(json!(library::search(
                        &lib,
                        a["query"].as_str().unwrap_or("")
                    )))
                }
                "read_html_source" => Ok(json!(editor::read(&root, &path()?)?)),
                "save_html_source" => {
                    let (_, mut lib) = library::scan(&root, &session.preferences)?;
                    Ok(json!(editor::save(
                        &mut lib,
                        &path()?,
                        a["revision"].as_str().unwrap_or(""),
                        a["content"].as_str().unwrap_or("")
                    )?))
                }
                "finish_html_edit" => Ok(Value::Null),
                "document_exists" => {
                    let p = path()?;
                    if !p.is_file() {
                        return Err("文件不存在".into());
                    }
                    Ok(Value::Null)
                }
                "rename_document" => Ok(json!(library::rename(
                    &root,
                    &path()?,
                    a["name"].as_str().unwrap_or("")
                )?
                .to_string_lossy())),
                "trash_document" => {
                    let p = path()?;
                    if !p.is_file() || library::kind(&p).is_none() {
                        return Err("仅可删除文档".into());
                    }
                    trash::delete(p).map_err(|e| e.to_string())?;
                    Ok(Value::Null)
                }
                _ => Err("QA 环境不执行系统窗口、外部应用或 PDF 操作。".into()),
            }
        })();
        let (status, result) = match result {
            Ok(v) => (200, v),
            Err(e) => (400, json!({"error":e})),
        };
        let _ = request.respond(
            Response::from_string(result.to_string())
                .with_status_code(status)
                .with_header(header("Content-Type", "application/json"))
                .with_header(header("Access-Control-Allow-Origin", "*")),
        );
    }
}
fn header(k: &str, v: &str) -> Header {
    Header::from_bytes(k.as_bytes(), v.as_bytes()).unwrap()
}
