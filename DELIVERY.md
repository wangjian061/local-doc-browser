# 应用交付记录

本项目为桌面 App，正式应用版本使用三段式编号。本次不交付独立原型基线，不分配原型编号。旧版 Swift 源码保留，新版源码位于 `desktop/`。

## 2026-10-30 · App 0.2.0

- 目标迭代：HTML 原页面文字修改及原文件保存；供个人 Mac 使用及 Windows 源码验证。
- 分支：`main`；不可变应用标签：`v0.2.0`，对应交付提交。准确提交可用 `git rev-parse v0.2.0^{commit}` 查询。
- 目标仓库：https://github.com/wangjian061/local-doc-browser ，公开，MIT License。
- 变更：Tauri 2 + Rust + React + shadcn/ui 本地文档浏览；选取 HTML 标题、正文、列表、表格、链接文字，底部抽屉纯文字编辑；保存精确替换原文片段，保留排版、标签与脚本，更新预览和搜索；草稿保护、外部修改检查、编码保留、系统回收站。
- 实际检查：前端 25 项、Rust 17 项、Clippy、TypeScript/Vite、Mac release 和 ad-hoc 签名校验通过。合成 fixture 验证真实磁盘写入、重复文字位置、转义、加粗、只读重试、外部冲突及取消／放弃；独立审查两项修复 resolved。
- 打包：仅 Mac Apple Silicon，最低 macOS 14；`LocalDocBrowser-0.2.0-macOS-AppleSilicon.zip`。SHA-256 `b197200efac0b2b0439a0023010b0d0a76f5a51ffb06cd6430e0f0c7c332b7b8`。
- 待验收：Mac 原生 IPC 完整编辑／保存／退出（本机屏幕捕获服务阻断自动化）；Windows 11 x64 实机运行与交互；两端系统对话框和 PDF 最终输出；macOS 14 实机。
- 发布范围：GitHub 源码和应用版本标签，Mac 包随 GitHub Release 提供。无站点部署、App Store 提审或上架。远端分支、标签与 Release 的最终状态以 GitHub 记录及交付消息核验结果为准。
- Windows 入口：[拉取与运行指南](desktop/WINDOWS.md)。CI 的 Windows 任务只运行测试和无安装包编译；Mac 任务生成 `.app`。

## 更新约定

后续应用变更使用新的三段式版本与新标签，不移动已发布版本标签。每次交付将实际验证与待验收事项分开记录；历史检查不替代当前平台验证。
