# Windows 拉取运行

目标为 Windows 11 x64。本次提供源码运行验证，最终安装包仅打包 Mac。

## 首次准备

1. 安装 Git、Node.js 22.12+（可使用 Node.js 24 LTS）、Rust stable 1.88+，Rust 使用默认 MSVC 工具链。
2. 安装 Visual Studio 2022 Build Tools，选择“使用 C++ 的桌面开发”，包含 MSVC v143 和 Windows 10／11 SDK。
3. 确认系统有 Microsoft Edge WebView2 Runtime。Windows 11 通常自带。

系统依赖详情见 [Tauri 官方 Windows 环境准备](https://v2.tauri.app/start/prerequisites/#windows)。安装后重新打开 PowerShell，确认 `git --version`、`node --version`、`cargo --version` 可用。

## 克隆与启动

```powershell
git clone https://github.com/wangjian061/local-doc-browser.git
cd local-doc-browser\desktop
npm.cmd ci
npm.cmd run tauri -- dev
```

以后更新：

```powershell
cd local-doc-browser
git pull --ff-only
cd desktop
npm.cmd ci
npm.cmd run tauri -- dev
```

请从 `desktop` 目录运行命令。根目录是旧版 Swift 工程，不能用于 Windows。`npm.cmd` 可直接在 PowerShell 中运行，无需调整脚本执行策略。

## 功能验收

先复制一份 HTML 到临时目录，或使用项目自带 `desktop/tests/fixtures/文字编辑验证.html`：

1. 选择该目录并打开 HTML，确认原有排版、表格和图片正常。
2. 点击“编辑文字”，点击正文，在底部抽屉修改，再点击“保存到原文件”。
3. 用浏览器重新打开同一个 HTML，确认磁盘原文件已更新；也可搜索新文字。
4. 修改第二处“重复文字”，确认第一处没有变化。分别点击加粗和链接文字，确认样式保留。
5. 输入 `<文字> & 内容`，确认显示为文字。
6. 有未保存修改时按 Ctrl+W 或关闭窗口，检查继续修改／放弃／保存；保存使用 Ctrl+S。
7. 检查 Markdown 阅读、标签切换、目录搜索、手动刷新及回收站操作。

脚本生成的“动态生成的文字”用于验证不可直接编辑的状态，不会被写回其他位置。加粗、链接等不同样式的文字分别编辑。

## 本地检查与编译

```powershell
npm.cmd test
npm.cmd run build
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
npm.cmd run tauri -- build --no-bundle
```

最后一条编译 Windows 程序，不生成安装包。若遇到 `link.exe` 或 Windows SDK 缺失，补全 C++ 构建依赖；若 WebView2 启动失败，修复其运行时。

Windows 实机交互与保存、系统对话框和 PDF 输出仍以该机器验收为准，Mac 或 CI 构建通过不能替代这些检查。
