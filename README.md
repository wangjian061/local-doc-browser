# LocalDocBrowser

本地 HTML／Markdown 阅读器。HTML 可以在页面上选中文字，用底部抽屉修改，并直接保存回同一个本地文件。

当前应用版本：**0.2.0**。新版源码位于 [`desktop/`](desktop/)，使用 Tauri 2 + Rust + React + shadcn/ui；根目录保留旧版 SwiftUI 工程。

- [Windows 拉取与运行](desktop/WINDOWS.md)
- [完整功能、启动和 Mac 打包](desktop/README.md)
- [实际验证记录](desktop/VALIDATION.md)
- [版本与交付记录](DELIVERY.md)

## 使用

选择本地目录，打开 HTML，点击右上角“编辑文字”，再点击正文、标题或表格中的文字。在底部抽屉修改后，点击“保存到原文件”或按 ⌘S／Ctrl+S。页面和搜索结果随保存更新。

不同样式的文字分别点击修改。Markdown 当前用于阅读。脚本生成、隐藏或无法可靠对应原文件的文字会停止编辑并提示。文件始终在本机处理。

## 开发

需要 Node.js 22.12+、Rust stable 1.88+ 及系统构建依赖。Mac 需要 Xcode Command Line Tools；Windows 依赖见上方运行指南。

```sh
cd desktop
npm ci
npm run tauri -- dev
```

```sh
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
```

本次仅交付 Mac Apple Silicon 包；Windows 可从源码运行验证。两端均有 CI 检查配置，实际通过情况以 GitHub Actions 为准。

代码采用 [MIT License](LICENSE)。
