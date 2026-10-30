#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$TASK_ROOT"
npm run tauri -- build --target aarch64-apple-darwin --bundles app
TASK_BUNDLE="$TASK_ROOT/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/LocalDocBrowser Rust.app"
TASK_VERSION="$(node -p 'JSON.parse(require("fs").readFileSync("package.json","utf8")).version')"
mkdir -p "$TASK_ROOT/artifacts"
codesign --force --deep --sign - "$TASK_BUNDLE"
codesign --verify --deep --strict "$TASK_BUNDLE"
ditto "$TASK_BUNDLE" "$TASK_ROOT/artifacts/LocalDocBrowser Rust.app"
codesign --verify --deep --strict "$TASK_ROOT/artifacts/LocalDocBrowser Rust.app"
TASK_ARCHIVE="artifacts/LocalDocBrowser-${TASK_VERSION}-macOS-AppleSilicon.zip"
ditto -c -k --sequesterRsrc --keepParent "$TASK_ROOT/artifacts/LocalDocBrowser Rust.app" "$TASK_ARCHIVE"
shasum -a 256 "$TASK_ARCHIVE" > artifacts/SHA256SUMS.txt
cat artifacts/SHA256SUMS.txt
