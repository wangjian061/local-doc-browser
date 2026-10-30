---
name: "LocalDocBrowser"
description: "本地目录导航与 Markdown／HTML 多标签阅读的桌面设计系统。"
colors:
  primary: "#3e6655"
  primary-foreground: "#ffffff"
  background: "#ffffff"
  foreground: "#26342d"
  card: "#ffffff"
  popover: "#ffffff"
  secondary: "#edf1eb"
  muted: "#f1f3ef"
  muted-foreground: "#637166"
  accent: "#e6ede3"
  destructive: "#a83632"
  border: "#dce3d9"
  input: "#ccd5c9"
  ring: "#3e6655"
  toolbar-tint: "#f0f4ec"
  directory-tint: "#eef3e9"
  document-surface: "#fafbf8"
  status-surface: "#f7f9f4"
  folder-hover: "#e5ecdf"
  folder-selection-base: "#f4f7f0"
  document-hover: "#edf2e9"
  document-selected-text: "#254b39"
  preview-text: "#25312b"
  preview-heading: "#1c2922"
  preview-link: "#345f4d"
  preview-code: "#f3f5f2"
  preview-table-border: "#dce2dc"
  preview-table-head: "#f2f5f1"
  preview-quote: "#f7f9f5"
  preview-quote-text: "#53665b"
  preview-quote-border: "#92aa9b"
  notice-bg: "#edf5e9"
  notice-text: "#36512e"
  notice-border: "#d3e0cc"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "1.5"
  pane-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "14px"
    fontWeight: 650
    lineHeight: "1.5"
  document-name:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "1.6"
  control-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "calc(1.25 / 0.875)"
  tab-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: "calc(1.25 / 0.875)"
  metadata:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: "1.5"
  dialog-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "1"
  welcome-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: "calc(1.75 / 1.125)"
    letterSpacing: "-0.02em"
  reading-body:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "1.85"
  reading-h1:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: "1.4"
  reading-h2:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "22px"
    fontWeight: 650
    lineHeight: "1.4"
  reading-h3:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: "1.4"
  reading-code:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "0.88em"
    fontWeight: 400
    lineHeight: "inherit"
rounded:
  square: "0px"
  inline-code: "3px"
  sm: "4px"
  folder: "5px"
  md: "6px"
  lg: "9px"
  xl: "12px"
spacing:
  utility-unit: "0.25rem"
  xs: "7px"
  sm: "8px"
  row-gap: "11px"
  md: "12px"
  lg: "16px"
  pane: "18px"
  field: "20px"
  dialog-gap: "24px"
  dialog: "26px"
  reading-x: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.control-label}"
    rounded: "{rounded.md}"
    height: "2.25rem"
    padding: "0.5rem 1rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "2.25rem"
    padding: "0.5rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    size: "2rem"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "2.25rem"
    padding: "0.5rem 1rem"
  search-input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "33px"
    padding: "0 8px"
  folder-row:
    textColor: "{colors.foreground}"
    rounded: "{rounded.folder}"
    padding: "7px 0"
  document-row:
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "15px 12px"
    width: "100%"
  document-tab:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.square}"
    height: "49px"
    padding: "0 10px"
  dialog:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "26px"
    width: "32rem"
---

# Design System: LocalDocBrowser

## Overview

**Creative North Star: "本地阅读工作区"**

目录引导文档列表，列表引导持续保留的阅读标签。白色阅读画布承载内容，浅绿灰目录材料区分导航层，森林绿承担选择与操作反馈；界面密度服务个人桌面阅读。

这是 Operate／Read 工具：系统字体、Lucide 线性图标和 shadcn／Radix 控件保持操作清楚。设置位于工具栏右侧，真实文件操作留在上下文菜单与确认对话框中。应用图标沿用 Resources 资产，界面没有新增插画或生成图像。

**Key Characteristics:**

- 白色内容画布与浅绿灰导航材料。
- 紧凑的系统文字、细分隔线与小型线性图标。
- 可调整的目录／列表／预览三栏及持久阅读标签。
- 扫描、搜索、保存和错误状态使用真实操作结果。

本文记录 2026-10-29 已构建实现。规范来源为 `desktop/src/index.css`、`desktop/src/lib/theme.ts`、`desktop/src/components/ui/`、`desktop/src/App.tsx`、`desktop/src/useBrowser.ts` 与 `desktop/src-tauri/src/preview.css`。产品边界见 `PRODUCT.md`，已确认结构见 `.impeccable/surfaces/desktop.md`。头部 token 是默认静态值；运行时主题覆盖和色彩混合见下文。

## Colors

浅绿灰材料衬托森林绿操作色，白色阅读面与深灰绿文字保持内容优先。前置 token 为值的规范来源。侧车中的八级色带仅为面板预览推导元数据，不是应用运行时新增色阶。

### Primary

- **森林绿**（`primary`）：选择目录按钮、当前目录文字、标签底线、选择圆点与根目录图标；`ring` 跟随同一运行时值。
- **白色主操作文字**（`primary-foreground`）：主按钮文字。设置中的主题色是种子，界面实际色由 `accessibleAccent` 输出。

**The Readable Accent Rule.** 用户选择的主题色必须先经过 accessibleAccent，再赋给主色与焦点色；白色按钮文字保持不变。

算法只接受六位十六进制色，其他输入退回默认主色；当相对亮度高于 0.14 时，将每个 RGB 通道乘以 0.9 并向下取整，循环至阈值内。白色种子实际得到 `#616161`，白色前景对比度约 6.19:1；该结果已在 `theme-contrast.png` 中观察。可配置主题只覆盖主色和焦点色；列表选中文字、图标及 Markdown 链接保留各自的既有颜色。

### Neutral

- **白色画布**（`background`、`card`、`popover`）：应用底面、阅读区域与浮层。`card` 为库语义 token，当前主工作区没有独立卡片布局。
- **深灰绿正文**（`foreground`）与 **中灰绿辅助字**（`muted-foreground`）：应用文字与路径、数量、状态、说明。
- **浅绿灰材料**（`toolbar-tint`、`directory-tint`）：工具栏与目录面。材料浓度默认 0.94，范围 0.65–1，按 sRGB 与白色混合。该值没有改变原生窗口透明度。
- **近白列表面**（`document-surface`）与 **状态栏面**（`status-surface`）：区分工作区层级。
- **柔和交互面**（`secondary`、`muted`、`accent`）：次要控件、加载占位与幽灵按钮／菜单聚焦背景；这些是同一中性色系的语义面，并非新增品牌色。
- **细分隔色**（`border`）与 **输入描边**（`input`）：划分三栏、标签及表单边界。
- **选择层**：目录选中面用主色 13% 与 `folder-selection-base` 混合；文档选中面用主色 9% 与白色混合，描边用主色 22% 与白色混合。目录与文档悬停分别使用已有悬停 token。
- **阅读层**（`preview-*`）：Markdown 正文、标题、链接、代码、表格与引用使用独立的低饱和绿灰值。HTML 预览保留文档自身样式。
- **恢复与错误**（`notice-*`、`destructive`）：扫描警告和操作通知使用浅绿提示条；错误与移入废纸篓／回收站操作使用暗红。

## Typography

**Body Font:** 系统 UI 字体栈，见 `body.fontFamily`。中西文均使用同一系统字体逻辑；没有品牌展示字体。

**Label/Mono Font:** 代码使用 `reading-code.fontFamily`；目录数量使用等宽数字。

**Character:** 导航、表单与元信息保持紧凑，Markdown 使用独立阅读字号和较松行距。系统字体是桌面操作与阅读界面的实现选择。

### Hierarchy

- **欢迎标题**：`welcome-title`，仅用于未选择目录时的开始阅读状态。
- **面板标题**：`pane-title`，目录根名和文档列表标题；单行省略。
- **对话框标题**：`dialog-title`，与字段标签和说明形成层次。
- **应用正文**：`body`；文件名使用 `document-name`，最多两行，长词允许换行；表单与按钮标签使用 `control-label`。
- **标签／元信息**：`tab-label` 与 `metadata`，路径和统计保持单行省略。
- **Markdown 阅读**：`reading-body`；一级至三级标题使用 `reading-h1`、`reading-h2`、`reading-h3`。代码为相对正文的字号。

**The Reading First Rule.** 正文在独立预览样式中保持阅读字号与行距；导航文字保持紧凑，二者不共享字号缩放。

应用根字号（13px）会影响 Tailwind 的 rem 单位；不要把 `h-8` 当作固定 32px。此处 `2rem` 为 26px，`2.25rem` 为 29.25px，按钮文字由应用样式覆盖为 12px。普通输入在桌面 `md` 断点为 0.875rem，搜索框有独立字号与高度覆盖。预览 iframe 的根字号（15px）与应用根字号独立。

## Layout

工具栏、工作区与状态栏构成纵向全窗布局。工具栏最小高度（60px）、内边距（12px 18px）、组间距（18px）；目录选择、刷新、上一级和当前位置在左侧，设置固定在右侧。状态栏高度（29px）、水平内边距（16px）。系统标题栏由原生窗口处理。

工作区是可调整宽度的目录／文档列表／预览三栏。目录默认宽度（19%）、下限（180px）、上限（35%）；列表默认宽度（22%）、下限（200px）、上限（40%）；预览下限（350px），占剩余空间。分栏分隔线（1px）带扩展拖动命中区。比例保存进会话。窗口默认（1340×860），最小（1000×660）；没有手机布局，也没有根据窄屏自动改变三栏结构。已观察布局为（1280×720）和最小窗口尺寸。

面板标题区最小高度（94px），内边距（21px 18px 17px）。目录的搜索框位于根目录名下方，顶部间隔（16px）；目录列表内边距（12px 8px）。文件列表内边距（10px），文档行内边距见 token；文件名与格式说明之间间距（7px）。目录、文件列表、标签条与文档内容各自滚动，整页不滚动。

预览标签与操作栏高（49px），标签最小宽（115px）、最大宽（230px），标签文字最大宽（165px）；横向溢出可滚动。路径行内边距（11px 24px）。Markdown 内容最大宽（850px）、居中，内边距（36px 40px 80px）。段落、列表、表格、代码块与标题使用阅读样式内的块间距，不强行套用面板间距。图片和视频最大宽度为容器宽，表格和代码块可横向滚动。

预览全屏隐藏顶部工具栏、目录、列表与分隔线，保留阅读标签、预览操作和状态栏；Esc 退出。窗口全屏是独立原生操作。打印样式为 A4、页边距（16mm），正文取消最大宽度与内边距；这是输出样式配置，不等于系统 PDF 保存已验证。

## Elevation & Depth

工作区通过背景层次和细描边表达结构。按钮描边与普通输入保留 shadcn 的轻阴影，菜单与模态对话框用浮层阴影。没有装饰性硬偏移阴影、渐变或玻璃模糊。

### Shadow Vocabulary

- **轻控件**：`0 1px 2px 0 #0000000d`，描边按钮、普通输入。
- **菜单**：`0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a`，上下文菜单与下拉菜单。
- **对话框**：`0 18px 65px #26342d20`，应用对话框覆盖库默认阴影。背景遮罩为黑色 50%。

**The Quiet Structure Rule.** 三栏以背景层次和细线分隔；浮层阴影只用于对话框、菜单与表单控件已有的深度。

控件颜色过渡默认（150ms），文档行背景过渡（150ms）；对话框过渡（200ms）。刷新图标使用旋转加载，骨架使用渐隐脉冲。减少动态效果偏好会将动画和过渡时长压至（0.01ms）。

## Shapes

主工作区与标签使用直角结构，控件使用小圆角。菜单项为 `sm`，目录行为 `folder`，按钮、输入、文档行及代码块为 `md`；模态框为 `lg`。欢迎状态图标材料块为 `xl`，大小（58×58px），不用于普通文档行。内联代码使用独立小圆角。选中圆点（5×5px）是状态标记。

## Components

### Buttons

文字与小图标组成直接操作。主按钮用于选择目录、保存及必要的错误恢复；描边按钮用于取消；幽灵按钮用于刷新、导航、设置、标签关闭与预览操作；暗红按钮仅出现在文件移除确认中。默认按钮内边距见 token，含直接 SVG 时水平内边距为（0.75rem）；`sm` 高度（2rem）、文字按钮水平内边距（0.75rem），含 SVG 时为（0.625rem）。小图标按钮为（2rem），标签关闭按钮为（1.5rem）。

主／暗红按钮悬停使用对应颜色的 90% 不透明度；幽灵与描边按钮悬停使用交互面。按钮可见焦点为（2px）轮廓、偏移（2px），库控件同时保留已有焦点环；禁用状态降低透明度并阻止操作。图标通过 SVG 渲染，按钮提供可访问名称及标题提示。

### Inputs / Fields

搜索是白底、细描边、圆角的组合控件，搜索图标在左，非空时出现清空按钮。框内高度见 `search-input`，输入本身没有阴影和描边。整体聚焦时使用主色 35% 的（2px）轮廓，偏移（1px）。普通字段保留库输入样式，聚焦时焦点色描边及（3px）50% 焦点环，错误状态为暗红描边与提示。

设置对话框包含颜色输入、界面通透感滑块、隐藏文件开关与逗号分隔的忽略名称。修改先保留在草稿，保存成功后关闭；扫描失败保留错误，保存中阻止重复提交和关闭。设置对话框内边距（26px）、区块间距（24px）、字段组间距（20px）。滑块改变导航材料浓淡，正文保持白底清晰。

### Navigation

目录行最小高（34px），左缩进为（10px + 层级 × 16px）。展开按钮与目录选择是独立操作，选中目录使用浅色背景、主色文字与半粗字重。文件名在选中状态使用独立深绿文字与半粗字重，配合背景、描边和圆点表达当前文档。路径、数量与格式说明使用弱化文字。

文档标签具有关闭按钮、拖动排序、右键批量关闭与左右移动操作。活动标签白底、半粗主色文字，底部（2px）主色线，两侧缩进（12px）。标签与列表保持同一活动文档；重新打开已有标签不重复增加标签。

### Reading Preview

Markdown 由应用阅读样式渲染；HTML 通过独立 iframe 保留本地相对资源和文档样式。预览有标题、路径、格式和加载占位。外部链接交由系统打开；库内 Markdown／HTML 链接定位对应标签与片段，纯片段链接留在文档内。标题缺少 id 时由桥接脚本生成，重复标题添加序号。

⌘／Ctrl + F 聚焦目录搜索；⌘／Ctrl + W 关闭当前标签。这两项在正文 iframe 内也转交主界面处理。预览尚未加载时 PDF 操作禁用。PDF 按钮请求系统打印路径，完成请求时文案只说明导出窗口已打开，不声称文件已保存。

### Async, Empty & Recovery States

扫描与搜索期间显示骨架，工作区标记 busy，搜索说明显示正在搜索。没有目录、没有文档、没有匹配结果与预览失败分别表达原因和下一步。扫描失败保留上一次有效库；扫描请求和文档打开请求使用递增标识，仅最新有效结果更新状态，打开前确认真实文件存在，关闭标签或切换根目录会使旧打开请求失效。搜索有（180ms）去抖与过期结果取消。

上下文菜单的重命名、系统定位和默认应用打开都对应真实文件。移除操作先显示文件名与废纸篓／回收站恢复文案，成功后才移除标签并更新列表，错误保留提示。错误以顶部 Alert 展示，操作通知以可关闭提示条展示。没有独立标签芯片或通用卡片组件用法，不能从 token 名推断新增界面模块。

## Do's and Don'ts

### Do:

- **Do** 沿用系统字体和 Lucide SVG 图标，图标按钮保留可读的操作名称。
- **Do** 保持目录、列表、预览的顺序及各区独立滚动，让设置留在右上角。
- **Do** 用选中背景、文字字重、标签底线和圆点共同表达当前文档。
- **Do** 等待真实异步结果，再更新文件状态、标签和保存反馈。
- **Do** 将删除表达为移入系统废纸篓／回收站，并展示恢复路径。

### Don't:

- **Don't** 把界面通透感应用到正文或整个窗口透明度。
- **Don't** 直接把未经对比度处理的用户种子色用作主色或焦点色。
- **Don't** 将目录读取中、搜索中、没有结果与读取失败显示为同一种空状态。
- **Don't** 把 HTML 文档自身的样式归入应用主题，也不要用演示截图代替原生平台验证。

当前记录的验证边界：本轮 finish 判定只覆盖四项评分修复——异步文档状态真实、iframe 内关闭标签快捷键、片段导航、可配置强调色对比度。布局证据为 `.impeccable/review/desktop.png`、`desktop-minimum.png`、`theme-contrast.png`；前两张尺寸分别为 1280×720、1000×660。浏览器 QA 通过本机 Rust 共享核心 fixture 验证，不能替代原生 IPC、系统文档协议及平台验收。

macOS release 已构建，真实目录、标签与 Markdown 会话恢复已在原生应用观察；原生系统对话框和 PDF 保存仍未验证。Windows 安装包构建被 Microsoft SDK CDN 超时阻断；macOS 14 最低兼容版本已配置，未在该系统验证。以上未验证项不记为通过，也不被固化成设计约束。

## HTML 文字编辑增量（2026-10-30）

用户确认本次沿用三栏阅读工作区，跳过样图及后续确认。HTML／HTM 右上角入口为“编辑文字”，预览持续显示原页面。进入后显示轻量选择提示；点击正文、标题、列表、表格或链接中的文字，原位置出现森林绿细轮廓，底部抽屉显示该片段的纯文字。

抽屉沿用 shadcn Sheet 的底部动效、焦点管理与标题语义，使用系统字体；以文件名、文字输入、保存状态和“保存到原文件”为主要层级。固定在右下方，宽度最大 720px，窗口两侧至少留 20px，最大高度 70vh；编辑区为 15px／1.8，支持长文字滚动和调整高度。减少动态效果设置沿用全局规则。

只替换选定的原文片段；加粗、链接等内联样式分别选择，输入的尖括号按普通文字保存。保存后关闭抽屉、刷新当前预览和搜索，错误保留草稿。取消或离开时处理未保存修改；动态生成、隐藏或无法可靠定位的文字不会写回。Markdown 保持阅读状态。

UI 验证证据为 `.impeccable/review/text-edit-drawer.png` 和 `text-edit-error.png`；实际功能与平台检查以 `desktop/VALIDATION.md` 为准。
