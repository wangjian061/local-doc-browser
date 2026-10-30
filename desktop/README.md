# LocalDocBrowser 桌面重写版

Tauri 2 + Rust + React + shadcn/ui。目标为 Windows 11 x64、macOS 14 及以上 Apple Silicon，供个人本地使用。

## 已确认范围

沿用确认的三栏结构：左侧目录、中间文档／搜索结果、右侧多标签预览。设置在右上角，文件操作放在右键菜单。

迁移目录选择、上一级、手动刷新、隐藏与忽略规则、文件名／路径／正文搜索、Markdown 与 HTML 阅读、相对资源与文档链接、多标签关闭／重排、预览全屏、窗口全屏、PDF 输出、重命名、系统定位、默认应用打开和会话保存。删除必须移入系统回收站／废纸篓。

新增 HTML／HTM 页面文字编辑：打开 HTML 后点击右上角“编辑文字”，再点击正文、标题、列表、表格单元格或链接中的文字。底部抽屉只显示选定文字，修改后点击“保存到原文件”或按 ⌘S／Ctrl+S，直接替换原文件中的对应文字并更新预览和搜索。

原文件的其他内容不重新排版或序列化；加粗、链接等不同样式分别选择。输入尖括号和 & 等字符会按普通文字转义保存。动态生成、隐藏或无法可靠定位到原文的内容不能直接编辑。Markdown 保持只读。

未保存时，取消、切换文档、关闭标签、刷新／切换根目录、文件操作和退出应用会提示处理修改。保存失败保留草稿；检测到外部修改时停止覆盖。文件按原编码与 LF／CRLF 保存；无效编码、混合换行或新增字符无法用原编码保存时明确说明原因。

收藏面板、最近访问面板和文件变化自动刷新未加入。

## 启动与检查

需要 Node.js 22.12+（或受 Vite 支持的较新版本）、Rust stable、相应系统桌面构建工具。Mac 需要 Xcode Command Line Tools；Windows 需要 Visual Studio C++ Build Tools 和 WebView2。

```sh
cd desktop
npm ci
npm run tauri -- dev
npm run build
npm test
cargo test --manifest-path src-tauri/Cargo.toml --locked
cargo clippy --manifest-path src-tauri/Cargo.toml --locked --all-targets -- -D warnings
```

## 构建

2026-10-30 本轮仅交付 Mac Apple Silicon 本地测试包。下方 Windows 命令作为工程历史说明保留，本轮不执行。

Mac Apple Silicon：

```sh
npm run build:mac
```

产物在 `artifacts/LocalDocBrowser Rust.app` 与 `artifacts/LocalDocBrowser-0.2.0-macOS-AppleSilicon.zip`，附 SHA-256 校验文件。打包脚本对本地产物进行 ad-hoc 签名并验证资源封装。原始构建位于 `src-tauri/target/aarch64-apple-darwin/release/bundle/macos/LocalDocBrowser Rust.app`。本地构建使用独立名称和标识，方便与旧版共存。未使用 Apple Developer 证书签名或公证；当前以本机构建与使用为目标。

Windows 从源码拉取、启动和检查见 [WINDOWS.md](WINDOWS.md)。本次不生成 Windows 安装包；GitHub Actions 对 Windows 运行测试及 `tauri build --no-bundle`，Mac 构建 `.app`。

## 文档与状态

- 原文件留在原目录，阅读不改写内容。
- 重命名修改真实文件；删除使用系统回收站，失败时直接报错，不退化成永久删除。
- 符号链接不参与递归扫描；资源和文件操作必须在当前根目录内。
- 文件正文保存在内存搜索索引中；不上传文档。
- HTML 预览允许文档脚本，外部样式、图片或脚本可能产生文档自身声明的联网请求。文档在隔离 iframe 中显示，不授予原生命令权限。
- Markdown 支持 GFM 表格、任务列表、删除线与脚注。Mermaid、公式与自动语法着色没有单独扩展。
- 使用独立应用标识 `com.jianwang.localdocbrowser.rust`。会话保存在系统应用数据目录的 `session.json`，包含目录、标签、选中状态、扫描偏好和栏宽，不自动导入旧版状态。
- 损坏会话在读取时明确报错；用户选择目录后重新保存时保留原始损坏文件备份。
- “界面通透感”调整侧栏与工具栏的材料浓淡，不让文档或整个窗口半透明。主题色会转为可读的强调色角色。

## PDF 输出

“导出 PDF”打开专用文档窗口并调用系统打印对话框。macOS 选择“存储为 PDF”，Windows 选择“Microsoft Print to PDF”。当前不是静默直接写入 PDF 文件。对 HTML 使用其打印样式，Markdown 提供 A4 打印样式。最终保存流程需两端分别验收。

## 验证记录与边界

实际记录见 [VALIDATION.md](VALIDATION.md)。Mac 启动和真实目录恢复已观察；不能据此声称已验证 macOS 14 实机、所有原生系统对话框或 Windows 安装运行。

## 隔离联调

仅用于开发验证；不是 Web 版交付。Rust 示例服务固定监听回环地址，且只允许 `tests/fixtures` 目录的文件操作，拒绝执行外部应用与 PDF 操作。正式构建不包含 QA 服务及 HTTP 适配分支。

```sh
cargo run --manifest-path src-tauri/Cargo.toml --example qa_server -- "绝对项目路径/desktop/tests/fixtures"
npm run dev -- --mode qa
```

打开 `http://127.0.0.1:1420/`。联调使用同一套 Rust 扫描、搜索、渲染、重命名和回收站代码；其通过不替代原生 Tauri IPC／协议或系统对话框验收。
