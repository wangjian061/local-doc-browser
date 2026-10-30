use crate::library::Session;
use std::{
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};
pub fn load(path: &Path) -> Result<Session, String> {
    if !path.exists() {
        return Ok(Session::default());
    }
    let bytes = fs::read(path).map_err(|e| format!("无法读取会话：{e}"))?;
    serde_json::from_slice(&bytes).map_err(|e| format!("会话文件无法解析，原文件已保留：{e}"))
}
pub fn save(path: &Path, session: &Session) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?
    }
    if let Ok(original) = fs::read(path) {
        if serde_json::from_slice::<Session>(&original).is_err() {
            let stamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_nanos();
            fs::copy(path, path.with_extension(format!("invalid-{stamp}.json")))
                .map_err(|e| format!("无法备份损坏的会话文件：{e}"))?;
        }
    }
    let temp = path.with_extension("tmp");
    let bytes = serde_json::to_vec_pretty(session).map_err(|e| e.to_string())?;
    fs::write(&temp, bytes)
        .and_then(|_| fs::rename(&temp, path))
        .map_err(|e| format!("无法保存会话：{e}"))
}
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    #[test]
    fn actual_roundtrip_and_replace() {
        let d = tempdir().unwrap();
        let p = d.path().join("session.json");
        assert!(load(&p).unwrap().root_path.is_none());
        let mut s = Session {
            root_path: Some("/documents".into()),
            open_tab_paths: vec!["/documents/a.md".into()],
            ..Session::default()
        };
        save(&p, &s).unwrap();
        assert_eq!(load(&p).unwrap().open_tab_paths, s.open_tab_paths);
        s.open_tab_paths.clear();
        save(&p, &s).unwrap();
        assert!(load(&p).unwrap().open_tab_paths.is_empty());
        assert!(!p.with_extension("tmp").exists());
    }
    #[test]
    fn corrupt_state_is_preserved() {
        let d = tempdir().unwrap();
        let p = d.path().join("session.json");
        fs::write(&p, b"broken original").unwrap();
        assert!(load(&p).is_err());
        assert_eq!(fs::read(&p).unwrap(), b"broken original");
        save(&p, &Session::default()).unwrap();
        let backup = fs::read_dir(d.path())
            .unwrap()
            .filter_map(Result::ok)
            .find(|e| e.file_name().to_string_lossy().contains("invalid-"))
            .unwrap();
        assert_eq!(fs::read(backup.path()).unwrap(), b"broken original");
        assert!(load(&p).is_ok());
    }
}
