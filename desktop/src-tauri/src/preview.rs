use crate::library::{decode, kind};
use pulldown_cmark::{html, Options, Parser};
use std::path::Path;

pub fn render(path: &Path, bytes: &[u8]) -> Result<String, String> {
    let text = decode(bytes)?;
    let body = if kind(path) == Some("markdown") {
        let mut html = String::new();
        let options = Options::ENABLE_TABLES
            | Options::ENABLE_STRIKETHROUGH
            | Options::ENABLE_TASKLISTS
            | Options::ENABLE_FOOTNOTES
            | Options::ENABLE_GFM;
        html::push_html(&mut html, Parser::new_ext(&text, options));
        format!("<!doctype html><html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>{}</title><style>{}</style></head><body><main class=\"markdown\">{html}</main></body></html>",html_escape::encode_text(&path.file_name().unwrap_or_default().to_string_lossy()),include_str!("preview.css"))
    } else {
        text
    };
    // An opaque sandbox origin isolates documents from the privileged app shell.
    // Only navigation and print requests cross this bridge; no file mutations do.
    Ok(format!(
        "{body}<script>{}</script>",
        include_str!("preview-bridge.js")
    ))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn gfm_tables_and_code_fences() {
        let h = render(
            Path::new("example.md"),
            b"| A | B |\n|---|---|\n| **bold** | ok |\n\n```html\n<table>\n```\n\n- [x] done",
        )
        .unwrap();
        assert!(h.contains("<table>"));
        assert!(h.contains("<strong>bold</strong>"));
        assert!(h.contains("&lt;table&gt;"));
        assert!(h.contains("type=\"checkbox\""));
    }
    #[test]
    fn raw_html_preserves_scripts() {
        let h = render(
            Path::new("page.html"),
            b"<html><script>window.test=1</script></html>",
        )
        .unwrap();
        assert!(h.contains("window.test=1"));
    }
}
