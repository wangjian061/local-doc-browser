# LocalDocBrowser

<!-- impeccable:product-schema 1 -->

## Platform

web

桌面应用，目标平台为 Windows 与 macOS。上面的 web 指 Web 界面实现，不表示本轮交付网站。

## Stack

已确认：Tauri 2 + Rust 核心 + React + shadcn/ui。现有客户端为 SwiftUI + AppKit + WKWebView。

## Users

王健个人使用，优先本地安装与验证。

## Product Purpose

浏览本地目录中的 Markdown 与 HTML 文档，完成目录导航、搜索、多标签阅读和 PDF 导出。

## Capabilities and Constraints

- 首版迁移现有浏览功能并修复已发现的问题。
- 迁移目录选择、刷新、上一级目录、目录树、文件列表、文件名/路径/正文搜索、标签管理、Markdown/HTML 预览、预览与窗口全屏、PDF 导出、重命名、删除、Finder/资源管理器定位、默认应用打开、偏好和会话恢复。
- 2026-10-30 新增 HTML／HTM 页面文字选择、底部抽屉修改、原路径覆盖保存、保存后预览与搜索更新；Markdown 保持只读。
- 收藏入口、最近访问入口、文件变化自动刷新未纳入已确认范围。
- 本次 HTML 文字编辑由用户明确要求跳过结构样图，确认后直接完成并推送 GitHub；最终只打包 Mac。Windows 保留源码运行验证路径。
- 先展示可视结构样图，获得用户明确确认后才进入详细视觉设计和业务 UI 实现。
- 2026-10-29 用户已明确确认交互结构样图，授权按三栏结构实现。
- 目标为 Windows 11 x64、macOS 14 及以上 Apple Silicon。
- 删除文档必须移入系统回收站／废纸篓，可以恢复。
- 新工程位于 desktop/，旧版 Swift 源码保留；新版使用独立应用标识及会话文件，不自动改写旧版状态。

## Evidence on Hand

原实现位于 App/、Models/、Services/、Stores/、Support/、Views/；Package.swift 与 script/build_and_run.sh 描述当前构建方式。

## Open Decisions

- 是否需要另做旧版状态导入；当前没有自动迁移。
- 常用文档规模、HTML 脚本/联网资源兼容要求、特殊 Markdown 语法要求。
- PDF 输出分页要求及两端具体实现，需技术验证。

## Product Principles

- 阅读与本地文档导航是首版主任务。
- 两个平台保持主体结构一致，适配系统窗口、文件选择器和快捷键。
- 不将旧代码中没有界面入口的能力视为首版新增需求。
- 实现与验证结果据实记录，不把构建通过当作两端已验收。
