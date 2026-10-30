use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};
use unicode_normalization::{char::is_combining_mark, UnicodeNormalization};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Preferences {
    pub show_hidden_files: bool,
    pub ignored_names: Vec<String>,
    pub theme_color: String,
    pub window_opacity: f64,
}
impl Default for Preferences {
    fn default() -> Self {
        Self {
            show_hidden_files: false,
            ignored_names: [
                ".git",
                "node_modules",
                ".DS_Store",
                ".build",
                "dist",
                "target",
            ]
            .map(String::from)
            .to_vec(),
            theme_color: "#3e6655".into(),
            window_opacity: 0.94,
        }
    }
}
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct Session {
    pub root_path: Option<String>,
    pub selected_folder_path: Option<String>,
    pub expanded_paths: Vec<String>,
    pub open_tab_paths: Vec<String>,
    pub active_tab_path: Option<String>,
    pub preferences: Preferences,
    pub sidebar_width: f64,
    pub list_width: f64,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Folder {
    pub path: String,
    pub name: String,
    pub children: Vec<Folder>,
    pub document_count: usize,
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub path: String,
    pub name: String,
    pub relative_path: String,
    pub parent_path: String,
    pub kind: String,
    pub modified: String,
    pub size: u64,
}
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub root: Folder,
    pub documents: Vec<Document>,
    pub warnings: Vec<String>,
}
pub struct IndexEntry {
    pub document: Document,
    pub name: String,
    pub path: String,
    pub content: String,
}
pub struct Library {
    pub root: PathBuf,
    pub index: Vec<IndexEntry>,
}

pub fn normalize(text: &str) -> String {
    text.nfd()
        .filter(|c| !is_combining_mark(*c))
        .collect::<String>()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}
pub fn kind(path: &Path) -> Option<&'static str> {
    match path.extension()?.to_str()?.to_lowercase().as_str() {
        "md" | "markdown" => Some("markdown"),
        "htm" | "html" => Some("html"),
        _ => None,
    }
}
pub fn decode(bytes: &[u8]) -> Result<String, String> {
    if let Some(b) = bytes.strip_prefix(&[0xff, 0xfe]) {
        return Ok(encoding_rs::UTF_16LE
            .decode_without_bom_handling(b)
            .0
            .into_owned());
    }
    if let Some(b) = bytes.strip_prefix(&[0xfe, 0xff]) {
        return Ok(encoding_rs::UTF_16BE
            .decode_without_bom_handling(b)
            .0
            .into_owned());
    }
    if let Ok(s) = std::str::from_utf8(bytes) {
        return Ok(s.trim_start_matches('\u{feff}').into());
    }
    let head = String::from_utf8_lossy(&bytes[..bytes.len().min(2048)]);
    let re = Regex::new(r#"(?i)charset\s*=\s*["']?([\w-]+)"#).unwrap();
    if let Some(label) = re.captures(&head).and_then(|c| c.get(1)) {
        if let Some(enc) = encoding_rs::Encoding::for_label(label.as_str().as_bytes()) {
            return Ok(enc.decode(bytes).0.into_owned());
        }
    }
    Err("文档编码无法识别，请将文件保存为 UTF-8 或带 BOM 的 UTF-16。".into())
}
pub fn html_text(raw: &str) -> String {
    let scripts = Regex::new(r"(?is)<(script|style)\b[^>]*>.*?</(script|style)\s*>").unwrap();
    let tags = Regex::new(r"(?s)<[^>]+>").unwrap();
    html_escape::decode_html_entities(&tags.replace_all(&scripts.replace_all(raw, " "), " "))
        .into_owned()
}
pub fn scan(root: &Path, prefs: &Preferences) -> Result<(ScanResult, Library), String> {
    let root = dunce::canonicalize(root).map_err(|e| format!("无法打开目录：{e}"))?;
    if !root.is_dir() {
        return Err("请选择一个文件夹。".into());
    }
    let mut index = Vec::new();
    let mut warnings = Vec::new();
    let tree = scan_folder(&root, &root, prefs, &mut index, &mut warnings)?;
    let documents = index.iter().map(|e| e.document.clone()).collect();
    Ok((
        ScanResult {
            root: tree,
            documents,
            warnings,
        },
        Library { root, index },
    ))
}
fn scan_folder(
    path: &Path,
    root: &Path,
    prefs: &Preferences,
    index: &mut Vec<IndexEntry>,
    warnings: &mut Vec<String>,
) -> Result<Folder, String> {
    let mut children = Vec::new();
    let mut count = 0;
    let entries = fs::read_dir(path).map_err(|e| format!("无法读取 {}：{e}", path.display()))?;
    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(e) => {
                warnings.push(e.to_string());
                continue;
            }
        };
        let name = entry.file_name().to_string_lossy().to_string();
        let metadata = match fs::symlink_metadata(entry.path()) {
            Ok(m) => m,
            Err(e) => {
                warnings.push(format!("{name}：{e}"));
                continue;
            }
        };
        let hidden = name.starts_with('.') || is_hidden(&metadata);
        if metadata.file_type().is_symlink()
            || (!prefs.show_hidden_files && hidden)
            || prefs
                .ignored_names
                .iter()
                .any(|n| n.eq_ignore_ascii_case(&name))
        {
            continue;
        }
        let p = entry.path();
        if metadata.is_dir() {
            match scan_folder(&p, root, prefs, index, warnings) {
                Ok(folder) => {
                    count += folder.document_count;
                    children.push(folder)
                }
                Err(e) => warnings.push(e),
            }
        } else if metadata.is_file() {
            if let Some(k) = kind(&p) {
                let content = match fs::read(&p)
                    .map_err(|e| e.to_string())
                    .and_then(|b| decode(&b))
                {
                    Ok(v) => v,
                    Err(e) => {
                        warnings.push(format!("{name}：无法建立正文索引，{e}"));
                        String::new()
                    }
                };
                let modified = metadata
                    .modified()
                    .ok()
                    .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                    .map(|d| d.as_nanos().to_string())
                    .unwrap_or_default();
                let doc = Document {
                    path: p.to_string_lossy().into(),
                    name: name.clone(),
                    parent_path: path.to_string_lossy().into(),
                    relative_path: p.strip_prefix(root).unwrap_or(&p).to_string_lossy().into(),
                    kind: k.into(),
                    modified,
                    size: metadata.len(),
                };
                index.push(IndexEntry {
                    name: normalize(&name),
                    path: normalize(&doc.relative_path),
                    content: normalize(&if k == "html" {
                        html_text(&content)
                    } else {
                        content
                    }),
                    document: doc,
                });
                count += 1;
            }
        }
    }
    children.sort_by(|a, b| natord::compare(&a.name, &b.name));
    Ok(Folder {
        path: path.to_string_lossy().into(),
        name: path
            .file_name()
            .unwrap_or(path.as_os_str())
            .to_string_lossy()
            .into(),
        children,
        document_count: count,
    })
}
#[cfg(windows)]
fn is_hidden(m: &fs::Metadata) -> bool {
    use std::os::windows::fs::MetadataExt;
    m.file_attributes() & 2 != 0
}
#[cfg(not(windows))]
fn is_hidden(_: &fs::Metadata) -> bool {
    false
}

pub fn search(lib: &Library, query: &str) -> Vec<Document> {
    let q = normalize(query);
    if q.is_empty() {
        return Vec::new();
    }
    let mut hits: Vec<_> = lib
        .index
        .iter()
        .filter_map(|e| {
            let score = if e.name.contains(&q) {
                0
            } else if e.path.contains(&q) {
                1
            } else if e.content.contains(&q) {
                2
            } else {
                return None;
            };
            Some((score, &e.document))
        })
        .collect();
    hits.sort_by(|a, b| {
        a.0.cmp(&b.0)
            .then_with(|| natord::compare(&a.1.relative_path, &b.1.relative_path))
    });
    hits.into_iter().map(|(_, d)| d.clone()).collect()
}
pub fn authorized(root: &Path, path: &Path) -> Result<PathBuf, String> {
    let canonical = dunce::canonicalize(path).map_err(|e| format!("文件不存在或无法读取：{e}"))?;
    // Normalize both sides: std::fs may return a Windows \\?\ path while
    // scanner paths use the regular drive form produced by dunce.
    let root = dunce::canonicalize(root).map_err(|e| format!("文档目录无法读取：{e}"))?;
    if !canonical.starts_with(&root) {
        return Err("文件不在当前文档目录中。".into());
    }
    Ok(canonical)
}
pub fn rename(root: &Path, path: &Path, name: &str) -> Result<PathBuf, String> {
    let source = authorized(root, path)?;
    if !source.is_file() || kind(&source).is_none() {
        return Err("仅支持重命名 Markdown 和 HTML 文档。".into());
    }
    let name = name.trim();
    if name.is_empty()
        || name == "."
        || name == ".."
        || name
            .chars()
            .any(|c| c.is_control() || "/\\:*?\"<>|".contains(c))
        || name.ends_with(['.', ' '])
    {
        return Err("文件名为空或包含 Windows / macOS 不支持的字符。".into());
    }
    let mut target_name = name.to_string();
    if Path::new(name).extension().is_none() {
        if let Some(ext) = source.extension() {
            target_name.push('.');
            target_name.push_str(&ext.to_string_lossy())
        }
    }
    let target = source.with_file_name(&target_name);
    let stem = Path::new(&target_name)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_uppercase();
    if [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ]
    .contains(&stem.as_str())
    {
        return Err("此名称为 Windows 保留名称，请使用其他文件名。".into());
    }
    if kind(&target).is_none() {
        return Err("请保留 .md、.markdown、.html 或 .htm 扩展名。".into());
    }
    if target == source {
        return Ok(source);
    }
    if target.exists() {
        return Err("目标文件名已存在。".into());
    }
    fs::rename(&source, &target).map_err(|e| format!("重命名失败：{e}"))?;
    Ok(target)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    #[test]
    fn root_files_nested_and_ignored() {
        let d = tempdir().unwrap();
        fs::write(d.path().join("root.md"), "# root").unwrap();
        fs::create_dir(d.path().join("child")).unwrap();
        fs::write(d.path().join("child/page.html"), "<p>你好</p>").unwrap();
        fs::create_dir(d.path().join("node_modules")).unwrap();
        fs::write(d.path().join("node_modules/no.md"), "no").unwrap();
        fs::write(d.path().join(".hidden.md"), "hidden").unwrap();
        let (s, l) = scan(d.path(), &Preferences::default()).unwrap();
        assert_eq!(s.documents.len(), 2);
        assert_eq!(s.root.document_count, 2);
        assert_eq!(search(&l, "你好").len(), 1);
    }
    #[test]
    fn ranking_and_script_exclusion() {
        let d = tempdir().unwrap();
        fs::write(d.path().join("target.md"), "name hit").unwrap();
        fs::write(
            d.path().join("other.html"),
            "<script>secret</script><style>secret</style><p>Tárget &amp; text</p>",
        )
        .unwrap();
        let (_, l) = scan(d.path(), &Preferences::default()).unwrap();
        let hits = search(&l, "TARGET");
        assert_eq!(hits.len(), 2);
        assert_eq!(hits[0].name, "target.md");
        assert!(search(&l, "secret").is_empty());
        assert!(search(&l, "  ").is_empty());
    }
    #[test]
    fn path_escape_rejected() {
        let d = tempdir().unwrap();
        let other = tempdir().unwrap();
        fs::write(other.path().join("outside.md"), "private").unwrap();
        assert!(authorized(d.path(), &other.path().join("outside.md")).is_err());
    }
    #[test]
    fn rename_preserves_extension_and_rejects_collision() {
        let d = tempdir().unwrap();
        let root = fs::canonicalize(d.path()).unwrap();
        let src = root.join("first.md");
        fs::write(&src, "hello").unwrap();
        let renamed = rename(&root, &src, "第二份").unwrap();
        assert_eq!(renamed.file_name().unwrap(), "第二份.md");
        assert!(!src.exists());
        assert!(rename(&root, &renamed, "../escape").is_err());
        assert!(rename(&root, &renamed, "CON").is_err());
        assert!(rename(&root, &renamed, "file.txt").is_err());
        fs::write(root.join("exists.md"), "existing").unwrap();
        assert!(rename(&root, &renamed, "exists").is_err());
    }
    #[cfg(unix)]
    #[test]
    fn symlinks_do_not_escape_or_cycle() {
        use std::os::unix::fs::symlink;
        let d = tempdir().unwrap();
        symlink(d.path(), d.path().join("cycle")).unwrap();
        fs::write(d.path().join("ok.md"), "ok").unwrap();
        let (s, _) = scan(d.path(), &Preferences::default()).unwrap();
        assert_eq!(s.documents.len(), 1);
    }
    #[test]
    fn utf16_decode() {
        assert_eq!(decode(&[0xff, 0xfe, 0x2d, 0x4e]).unwrap(), "中");
        assert_eq!(decode(b"\xef\xbb\xbfhello").unwrap(), "hello");
    }
    #[test]
    fn session_roundtrip_and_old_fields() {
        let s = Session::default();
        let encoded = serde_json::to_string(&s).unwrap();
        let restored: Session = serde_json::from_str(&encoded).unwrap();
        assert_eq!(restored.preferences.theme_color, s.preferences.theme_color);
        let old: Session = serde_json::from_str("{}").unwrap();
        assert!(!old.preferences.show_hidden_files);
    }
}
