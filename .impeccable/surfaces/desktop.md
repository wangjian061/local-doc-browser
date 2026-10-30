# Desktop document browser

Mode: Operate for navigation and file operations; Read for the preview.
Scope: desktop/src/App.tsx, desktop/src/index.css, desktop/src-tauri/src/preview.css.

The user explicitly approved the interactive three-column structure on 2026-10-29. Preserve that topology; no alternative structure or visual-world workshop is needed for this migration.

## Direction contract

THESIS: A local reading workspace: folders lead to document lists, and lists lead to persistent reading tabs. Keep file operations contextual and protect the reading area from configuration.

OWN-WORLD: White reading canvas, lightly tinted green-gray directory chrome, restrained forest accent, system typography, small Lucide icons and shadcn/Radix controls. Native OS titlebars remain native.

STORY: Choose a real local root; navigate or search; open and compare documents; refresh after external edits. Rename and trash act on actual files with recovery-oriented copy.

FIRST VIEWPORT: A 60px toolbar contains directory selection, refresh, parent navigation and location, with settings at the right. Three resizable columns place folders left, files in the middle and a dominant preview right. Tabs and preview actions sit above document content. A narrow status bar closes the window.

FORM: User approved the three-column structure on 2026-10-29. The narrow HTML text-edit extension on 2026-10-30 explicitly waives further mockups and approval: choose text in the original preview, edit plain text in a bottom sheet, save into the same original local file. Preserve the inherited visual system and keep Markdown read-only.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Verification boundaries

The Mac binary was built and the native first-run screen observed. Subsequent native automation timed out around directory selection; native dialogs and PDF output are not yet verified. Browser QA at 127.0.0.1:1420 uses the real shared Rust scanner/renderer/file operations through a loopback fixture harness, not the native Tauri IPC or document protocol. QA screenshots are evidence for layout and shared-core behavior only. Windows build and minimum macOS compatibility require their own evidence. Do not claim these absent checks passed.
