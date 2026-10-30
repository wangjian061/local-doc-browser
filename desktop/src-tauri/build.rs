fn main() {
    let manifest = tauri_build::AppManifest::new().commands(&[
        "read_html_source",
        "save_html_source",
        "finish_html_edit",
        "confirm_app_exit",
        "load_session",
        "save_session",
        "scan_directory",
        "search_documents",
        "document_exists",
        "rename_document",
        "trash_document",
        "open_external",
        "open_document",
        "reveal_document",
        "parent_directory",
        "export_pdf",
    ]);
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(manifest))
        .expect("failed to build desktop resources and command permissions");
}
