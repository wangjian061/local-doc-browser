//! HTML source editing. Preserve encoding and use a same-directory atomic replacement.
use crate::library::{self, Document, Library};
use encoding_rs::{Encoding, UTF_16BE, UTF_16LE, UTF_8};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Source {
    pub content: String,
    pub revision: String,
    pub encoding: String,
}
fn revision(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
fn html_path(root: &Path, path: &Path) -> Result<PathBuf, String> {
    let p = library::authorized(root, path)?;
    if !p.is_file() || library::kind(path) != Some("html") || library::kind(&p) != Some("html") {
        return Err("仅支持编辑 .html 和 .htm 文件。".into());
    }
    if fs::symlink_metadata(path)
        .map_err(|e| e.to_string())?
        .file_type()
        .is_symlink()
    {
        return Err("请直接打开原始 HTML 文件，不能编辑符号链接。".into());
    }
    Ok(p)
}
struct TextFormat {
    encoding: &'static Encoding,
    bom: &'static [u8],
    crlf: bool,
}
fn decode(bytes: &[u8]) -> Result<(String, TextFormat), String> {
    let (encoding, bom, offset): (_, &[u8], _) = if bytes.starts_with(b"\xef\xbb\xbf") {
        (UTF_8, &b"\xef\xbb\xbf"[..], 3)
    } else if bytes.starts_with(b"\xff\xfe") {
        (UTF_16LE, &b"\xff\xfe"[..], 2)
    } else if bytes.starts_with(b"\xfe\xff") {
        (UTF_16BE, &b"\xfe\xff"[..], 2)
    } else {
        let head = String::from_utf8_lossy(&bytes[..bytes.len().min(2048)]);
        let re = regex::Regex::new(r#"(?i)charset\s*=\s*["']?([\w-]+)"#).unwrap();
        let enc = re
            .captures(&head)
            .and_then(|c| Encoding::for_label(c[1].as_bytes()))
            .or_else(|| std::str::from_utf8(bytes).is_ok().then_some(UTF_8))
            .ok_or("无法无损读取文件编码，请先将文件转换为 UTF-8。")?;
        (enc, &b""[..], 0)
    };
    let (text, malformed) = encoding.decode_without_bom_handling(&bytes[offset..]);
    if malformed {
        return Err("文件包含无效编码，已停止编辑以避免损坏原文。".into());
    }
    let crlf = text.contains("\r\n");
    let normalized = text.replace("\r\n", "\n");
    if normalized.contains('\r') || (crlf && text.replace("\r\n", "").contains('\n')) {
        return Err("文件混用了换行格式，请先统一为 LF 或 CRLF 后再编辑。".into());
    }
    Ok((
        normalized,
        TextFormat {
            encoding,
            bom,
            crlf,
        },
    ))
}
fn encode(content: &str, format: &TextFormat) -> Result<Vec<u8>, String> {
    let normalized = content.replace("\r\n", "\n").replace('\r', "\n");
    let text = if format.crlf {
        normalized.replace('\n', "\r\n")
    } else {
        normalized
    };
    let mut out = format.bom.to_vec();
    if format.encoding == UTF_16LE || format.encoding == UTF_16BE {
        for unit in text.encode_utf16() {
            out.extend(if format.encoding == UTF_16LE {
                unit.to_le_bytes()
            } else {
                unit.to_be_bytes()
            });
        }
    } else {
        let (bytes, _, errors) = format.encoding.encode(&text);
        if errors {
            return Err(format!("新增字符无法使用原编码 {} 保存，原文件未修改。请调整字符或使用外部编辑器转换编码。", format.encoding.name()));
        }
        out.extend_from_slice(&bytes);
    }
    Ok(out)
}
pub fn read(root: &Path, path: &Path) -> Result<Source, String> {
    let p = html_path(root, path)?;
    let bytes = fs::read(p).map_err(|e| format!("无法读取原文件：{e}"))?;
    let (content, format) = decode(&bytes)?;
    if encode(&content, &format)? != bytes {
        return Err("原文件无法按原编码无损往返转换，请先使用外部编辑器转换为 UTF-8。".into());
    }
    Ok(Source {
        content,
        revision: revision(&bytes),
        encoding: format.encoding.name().into(),
    })
}
pub fn save(
    lib: &mut Library,
    path: &Path,
    expected: &str,
    content: &str,
) -> Result<Document, String> {
    let p = html_path(&lib.root, path)?;
    let entry = lib
        .index
        .iter_mut()
        .find(|e| Path::new(&e.document.path) == p)
        .ok_or("文件不在当前文档索引中，请重新打开目录。")?;
    let original = fs::read(&p).map_err(|e| format!("无法读取原文件：{e}"))?;
    if revision(&original) != expected {
        return Err("原文件已被外部修改。草稿已保留；请复制需要的内容，再放弃当前编辑并重新打开文件，核对后重试。".into());
    }
    let (_, format) = decode(&original)?;
    let bytes = encode(content, &format)?;
    let metadata = fs::metadata(&p).map_err(|e| e.to_string())?;
    if metadata.permissions().readonly() {
        return Err("文件为只读，原文件未修改。请调整文件权限后重试。".into());
    }
    let mut temp = tempfile::NamedTempFile::new_in(p.parent().ok_or("文件目录无效")?)
        .map_err(|e| format!("无法创建保存文件：{e}"))?;
    temp.write_all(&bytes)
        .and_then(|_| temp.as_file().sync_all())
        .map_err(|e| format!("无法写入文件，原文件未修改：{e}"))?;
    temp.as_file()
        .set_permissions(metadata.permissions())
        .map_err(|e| e.to_string())?;
    // Recheck after preparing the replacement, avoiding overwriting ordinary external edits.
    if html_path(&lib.root, path)? != p || fs::read(&p).map_err(|e| e.to_string())? != original {
        return Err("原文件在保存期间发生变化，草稿已保留，请重新核对文件。".into());
    }
    let modified = temp
        .as_file()
        .metadata()
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_nanos().to_string())
        .unwrap_or_default();
    temp.persist(&p)
        .map_err(|e| format!("无法替换原文件，草稿已保留：{}", e.error))?;
    // No fallible operations after commit: callers must never mistake a committed save for failure.
    entry.document.size = bytes.len() as u64;
    entry.document.modified = modified;
    entry.content = library::normalize(&library::html_text(content));
    Ok(entry.document.clone())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture(name: &str, bytes: &[u8]) -> (tempfile::TempDir, PathBuf, Library) {
        let dir = tempfile::tempdir().unwrap();
        let root = dunce::canonicalize(dir.path()).unwrap();
        let path = root.join(name);
        fs::write(&path, bytes).unwrap();
        let (_, lib) = library::scan(&root, &Default::default()).unwrap();
        (dir, path, lib)
    }
    #[test]
    fn overwrites_html_and_updates_search_without_injecting_preview_code() {
        let (_d, p, mut lib) = fixture("页面.HTML", b"<h1>before</h1>");
        let source = read(&lib.root, &p).unwrap();
        let text = "<h1>更新后的正文</h1><script>window.x=1</script>";
        save(&mut lib, &p, &source.revision, text).unwrap();
        assert_eq!(fs::read_to_string(&p).unwrap(), text);
        assert_eq!(library::search(&lib, "更新后的正文").len(), 1);
        assert!(library::search(&lib, "before").is_empty());
    }
    #[test]
    fn rejects_markdown_outside_root_and_conflicting_writes() {
        let (_d, p, mut lib) = fixture("page.html", b"old");
        let s = read(&lib.root, &p).unwrap();
        fs::write(&p, "external").unwrap();
        assert!(save(&mut lib, &p, &s.revision, "draft").is_err());
        assert_eq!(fs::read_to_string(&p).unwrap(), "external");
        let md = lib.root.join("read.md");
        fs::write(&md, "md").unwrap();
        assert!(read(&lib.root, &md).is_err());
        assert!(save(&mut lib, &md, "", "change").is_err());
        let (_d2, outside, _) = fixture("outside.html", b"private");
        assert!(read(&lib.root, &outside).is_err());
        assert!(save(&mut lib, &outside, "", "change").is_err());
    }
    #[test]
    fn preserves_utf8_bom_crlf_and_utf16_in_both_orders() {
        for encoding in [UTF_8, UTF_16LE, UTF_16BE] {
            let bom: &[u8] = if encoding == UTF_8 {
                b"\xef\xbb\xbf"
            } else if encoding == UTF_16LE {
                b"\xff\xfe"
            } else {
                b"\xfe\xff"
            };
            let format = TextFormat {
                encoding,
                bom,
                crlf: true,
            };
            let original = encode("<p>旧文</p>\n", &format).unwrap();
            let (_d, p, mut lib) = fixture("page.htm", &original);
            let s = read(&lib.root, &p).unwrap();
            save(&mut lib, &p, &s.revision, "<p>新文</p>\n").unwrap();
            assert_eq!(
                fs::read(p).unwrap(),
                encode("<p>新文</p>\n", &format).unwrap()
            );
        }
    }
    #[test]
    fn preserves_legacy_encoding_and_rejects_unrepresentable_characters() {
        let format = TextFormat {
            encoding: encoding_rs::WINDOWS_1252,
            bom: b"",
            crlf: false,
        };
        let original = encode("<meta charset=windows-1252><p>café</p>", &format).unwrap();
        let (_d, p, mut lib) = fixture("page.html", &original);
        let s = read(&lib.root, &p).unwrap();
        assert!(save(&mut lib, &p, &s.revision, "中文").is_err());
        assert_eq!(fs::read(&p).unwrap(), original);
        save(
            &mut lib,
            &p,
            &s.revision,
            "<meta charset=windows-1252><p>thé</p>",
        )
        .unwrap();
        assert_eq!(
            read(&lib.root, &p).unwrap().content,
            "<meta charset=windows-1252><p>thé</p>"
        );
    }
    #[test]
    fn read_only_and_deleted_files_are_not_replaced_or_recreated() {
        let (_d, p, mut lib) = fixture("page.html", b"original");
        let s = read(&lib.root, &p).unwrap();
        let permissions = fs::metadata(&p).unwrap().permissions();
        let mut ro = permissions.clone();
        ro.set_readonly(true);
        fs::set_permissions(&p, ro).unwrap();
        assert!(save(&mut lib, &p, &s.revision, "draft").is_err());
        assert_eq!(fs::read(&p).unwrap(), b"original");
        fs::set_permissions(&p, permissions).unwrap();
        fs::remove_file(&p).unwrap();
        assert!(save(&mut lib, &p, &s.revision, "draft").is_err());
        assert!(!p.exists());
    }
    #[test]
    fn rejects_invalid_encoding_and_mixed_line_endings() {
        let (_d, p, lib) = fixture("page.html", b"\xff\xfe\x00");
        assert!(read(&lib.root, &p).is_err());
        fs::write(&p, b"one\r\ntwo\n").unwrap();
        assert!(read(&lib.root, &p).is_err());
    }
}
