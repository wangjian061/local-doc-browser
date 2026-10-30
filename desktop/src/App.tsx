import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  FolderOpen,
  Folder as FolderIcon,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  ArrowUp,
  Search,
  Settings2,
  FileText,
  Globe,
  Download,
  Expand,
  Minimize,
  Maximize,
  X,
  Copy,
  ExternalLink,
  FolderSearch,
  Trash2,
  Pencil,
  Ellipsis,
  AlertCircle,
  BookOpen,
  Check,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldSet,
  FieldLegend,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useHtmlEditor } from "./useHtmlEditor";
import {
  HtmlEditor,
  EditorError,
  UnsavedDialog,
} from "./components/HtmlEditor";
import { accessibleAccent } from "./lib/theme";
import { cn } from "@/lib/utils";
import { call, documentURL, toggleWindowFullscreen } from "./api";
import { useBrowser, type BrowserState } from "./useBrowser";
import {
  findFolder,
  moveBefore,
  type Document,
  type Folder,
  type Preferences,
} from "./types";

export default function App() {
  const raw = useBrowser();
  const editor = useHtmlEditor(raw);
  const b: BrowserState = {
    ...raw,
    openDoc: async (doc, fragment) => {
      if (doc.path === raw.active?.path && editor.draft) return;
      await editor.run(() => raw.openDoc(doc, fragment));
    },
    close: (paths) => {
      if (editor.draft && !paths.includes(editor.draft.path)) raw.close(paths);
      else void editor.run(() => raw.close(paths));
    },
    choose: async () => {
      await editor.run(raw.choose);
    },
    reload: async () => editor.run(raw.reload),
    parent: async () => {
      await editor.run(raw.parent);
    },
    scan: async (...args) => editor.run(() => raw.scan(...args)),
  };
  const [settings, setSettings] = useState(false),
    [renameTarget, setRenameTarget] = useState<Document | null>(null),
    [deleteTarget, setDeleteTarget] = useState<Document | null>(null),
    [immersive, setImmersive] = useState(false),
    [mutating, setMutating] = useState(false);
  const iframe = useRef<HTMLIFrameElement>(null),
    searchInput = useRef<HTMLInputElement>(null),
    [loaded, setLoaded] = useState(false);
  const isMac = /Mac/i.test(navigator.platform),
    root = b.library?.root;
  const pending = b.busy || mutating || editor.busy;
  const safe = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      b.report(e);
    }
  };
  useEffect(() => {
    setLoaded(false);
  }, [b.active?.path, b.revision]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setImmersive(false);
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        searchInput.current?.focus();
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "w" &&
        !settings &&
        !renameTarget &&
        !deleteTarget
      ) {
        e.preventDefault();
        if (b.active && !editor.confirming) b.close([b.active.path]);
      }
    };
    const saveHandler = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "s" &&
        editor.draft
      ) {
        e.preventDefault();
        if (!editor.confirming) void editor.save();
      }
    };
    window.addEventListener("keydown", saveHandler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keydown", saveHandler);
    };
  }, [b.active, b.close, settings, renameTarget, deleteTarget, editor]);
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (
        e.source !== iframe.current?.contentWindow ||
        e.data?.channel !== "local-doc-browser-preview"
      )
        return;
      if (e.data.type === "escape") setImmersive(false);
      if (
        e.data.type === "select-text" &&
        typeof e.data.id === "string" &&
        typeof e.data.text === "string"
      )
        editor.select(e.data.id, e.data.text);
      if (
        e.data.type === "select-text-options" &&
        Array.isArray(e.data.ids) &&
        e.data.ids.every((id: unknown) => typeof id === "string")
      )
        editor.selectOptions(e.data.ids);
      if (e.data.type === "save-text" && !editor.confirming) void editor.save();
      if (e.data.type === "text-unavailable")
        b.setNotice(
          "这处文字无法直接修改。请选择正文中的文字；动态生成的内容需要在来源处更新。",
        );
      if (e.data.type === "search") {
        setImmersive(false);
        searchInput.current?.focus();
      }
      if (e.data.type === "ready") {
        setLoaded(true);
        iframe.current?.contentWindow?.postMessage(
          {
            channel: "local-doc-browser-preview",
            type: "scroll-to",
            hash: b.activeFragment,
          },
          "*",
        );
      }
      if (e.data.type === "close-tab" && b.active) b.close([b.active.path]);
      if (e.data.type === "navigate" && typeof e.data.href === "string") {
        void safe(async () => {
          const u = new URL(e.data.href);
          const qaLink =
            import.meta.env.MODE === "qa" &&
            u.origin === "http://127.0.0.1:1431" &&
            u.pathname.startsWith("/document/");
          if (
            ["https:", "mailto:"].includes(u.protocol) ||
            (u.protocol === "http:" &&
              u.hostname !== "document.localhost" &&
              !qaLink)
          )
            return call("open_external", { url: u.href });
          if (
            u.protocol === "document:" ||
            u.hostname === "document.localhost" ||
            qaLink
          ) {
            let p = decodeURIComponent(
              qaLink ? u.pathname.slice("/document".length) : u.pathname,
            );
            if (!isMac) p = p.replace(/^\/(\w:)/, "$1").replaceAll("/", "\\");
            const doc = b.library?.documents.find((d) => d.path === p);
            if (doc) await b.openDoc(doc, u.hash);
            else throw new Error("此链接目标不在当前目录的可浏览文档中。");
          }
        });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [
    b.library,
    b.openDoc,
    b.activeFragment,
    b.active,
    b.close,
    isMac,
    editor,
  ]);
  useEffect(() => {
    if (!loaded) return;
    iframe.current?.contentWindow?.postMessage(
      {
        channel: "local-doc-browser-preview",
        type: "text-edit-mode",
        targets: editor.draft?.targets ?? [],
        active: !!editor.draft,
      },
      "*",
    );
  }, [loaded, editor.draft?.targets, b.revision]);
  const folder = findFolder(
    root ?? { path: "", name: "", children: [], documentCount: 0 },
    b.session.selectedFolderPath,
  );
  const visible = b.query.trim()
    ? b.results
    : (
        b.library?.documents.filter((d) => d.parentPath === folder?.path) ?? []
      ).sort((a, c) =>
        a.name.localeCompare(c.name, "zh-CN", { numeric: true }),
      );
  const style = {
    "--primary": accessibleAccent(b.session.preferences.themeColor),
    "--ring": accessibleAccent(b.session.preferences.themeColor),
    "--chrome-opacity": Math.max(
      0.65,
      Math.min(1, b.session.preferences.windowOpacity),
    ),
  } as CSSProperties;
  const context = (doc: Document, children: ReactNode) => (
    <ContextMenu key={doc.path}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem
            onSelect={() => void editor.run(() => setRenameTarget(doc))}
            disabled={pending}
          >
            <Pencil />
            重命名
          </ContextMenuItem>
          <ContextMenuItem
            variant="destructive"
            onSelect={() => void editor.run(() => setDeleteTarget(doc))}
            disabled={pending}
          >
            <Trash2 />
            移入{isMac ? "废纸篓" : "回收站"}…
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem
            onSelect={() =>
              void safe(() => navigator.clipboard.writeText(doc.name))
            }
          >
            <Copy />
            复制文件名称
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              void safe(() => call("reveal_document", { path: doc.path }))
            }
          >
            <FolderSearch />
            {isMac ? "在 Finder 中显示" : "在资源管理器中显示"}
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              void safe(() => call("open_document", { path: doc.path }))
            }
          >
            <ExternalLink />
            用默认应用打开
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  );
  const pdf = () => {
    if (b.active)
      void safe(async () => {
        await call("export_pdf", { path: b.active!.path });
        b.setNotice(
          "已打开导出窗口。请在系统打印对话框中选择“保存为 PDF”或“Microsoft Print to PDF”。",
        );
      });
  };
  return (
    <div className={cn("app-shell", immersive && "immersive")} style={style}>
      <header className="app-toolbar">
        <div className="toolbar-leading">
          <Button size="sm" onClick={() => void b.choose()} disabled={pending}>
            <FolderOpen data-icon="inline-start" />
            选择目录
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            title="刷新目录"
            aria-label="刷新目录"
            disabled={!root || pending}
            onClick={() => void b.reload()}
          >
            <RefreshCw className={cn(b.busy && "animate-spin")} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            title="上一级目录"
            aria-label="上一级目录"
            disabled={
              !root ||
              pending ||
              root.path === "/" ||
              /^\w:\\?$/.test(root.path)
            }
            onClick={() => void b.parent()}
          >
            <ArrowUp />
          </Button>
        </div>
        <div className="location" title={root?.path}>
          <FolderIcon />
          <span>{root?.path ?? "本地文档"}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void editor.run(() => setSettings(true))}
          disabled={pending}
        >
          <Settings2 data-icon="inline-start" />
          设置
        </Button>
      </header>
      {b.error && (
        <Alert variant="destructive" className="app-message">
          <AlertCircle />
          <AlertTitle>操作未完成</AlertTitle>
          <AlertDescription>{b.error}</AlertDescription>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="关闭错误提示"
            onClick={() => b.setError("")}
          >
            <X />
          </Button>
        </Alert>
      )}
      {b.notice && (
        <div className="notice" role="status">
          <Check />
          <span>{b.notice}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="关闭提示"
            onClick={() => b.setNotice("")}
          >
            <X />
          </Button>
        </div>
      )}
      {!root && !b.busy ? (
        <main className="welcome">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderOpen />
              </EmptyMedia>
              <EmptyTitle>从一个文档目录开始</EmptyTitle>
              <EmptyDescription>
                在目录之间切换，在文档之间阅读。
                <br />
                打开本地 Markdown 和 HTML，文件始终保留在原位置。
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => void b.choose()}>
                <FolderOpen data-icon="inline-start" />
                选择本地目录
              </Button>
              <p className="welcome-hint">
                下次打开时，自动恢复目录与阅读标签。
              </p>
            </EmptyContent>
          </Empty>
        </main>
      ) : (
        <main className="workspace" aria-busy={b.busy}>
          <ResizablePanelGroup
            orientation="horizontal"
            onLayoutChanged={(sizes) => {
              if (!immersive)
                b.setSession((s) => ({
                  ...s,
                  sidebarWidth: sizes.directories ?? 19,
                  listWidth: sizes.documents ?? 22,
                }));
            }}
          >
            <ResizablePanel
              id="directories"
              className="directory-panel"
              defaultSize={`${b.session.sidebarWidth || 19}%`}
              minSize="180px"
              maxSize="35%"
            >
              <aside className="directory-pane">
                <div className="pane-heading">
                  <div className="root-name">
                    <FolderOpen />
                    <h1>{root?.name ?? "文档目录"}</h1>
                  </div>
                  <div className="search-box">
                    <Search />
                    <Input
                      ref={searchInput}
                      value={b.query}
                      onChange={(e) => b.setQuery(e.target.value)}
                      placeholder="搜索文件名、路径或正文"
                      aria-label="搜索文件名、路径或正文"
                      disabled={b.busy}
                    />
                    {b.query && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label="清空搜索"
                        onClick={() => b.setQuery("")}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="tree-scroll" aria-label="目录导航">
                  {root ? (
                    <FolderRow
                      folder={root}
                      b={b}
                      level={0}
                      disabled={pending}
                    />
                  ) : (
                    <LoadingRows />
                  )}
                </div>
                <div className="sidebar-bottom">
                  <span>
                    {root ? `${root.documentCount} 篇文档` : "读取目录中"}
                  </span>
                  <span>Markdown / HTML</span>
                </div>
              </aside>
            </ResizablePanel>
            <ResizableHandle className="directory-divider" />
            <ResizablePanel
              id="documents"
              className="list-panel"
              defaultSize={`${b.session.listWidth || 22}%`}
              minSize="200px"
              maxSize="40%"
            >
              <section className="document-pane" aria-label="文档列表">
                <div className="pane-heading">
                  <h2>
                    {b.query.trim() ? "搜索结果" : (folder?.name ?? "文件")}
                  </h2>
                  <p>
                    {b.query.trim()
                      ? b.searching
                        ? "正在搜索…"
                        : `${visible.length} 个结果 · 当前根目录`
                      : `${visible.length} 篇文档 · 当前目录`}
                  </p>
                </div>
                <div className="file-scroll">
                  {b.busy || b.searching ? (
                    <LoadingRows />
                  ) : visible.length ? (
                    visible.map((doc) =>
                      context(
                        doc,
                        <button
                          key={doc.path}
                          className={cn(
                            "document-row",
                            b.active?.path === doc.path && "selected",
                          )}
                          onClick={() => void b.openDoc(doc)}
                          title={doc.relativePath}
                        >
                          <span className="document-icon">
                            {doc.kind === "markdown" ? <FileText /> : <Globe />}
                          </span>
                          <span className="document-info">
                            <span className="document-name">
                              {doc.name.replace(
                                /\.(md|markdown|html|htm)$/i,
                                "",
                              )}
                            </span>
                            <span className="document-detail">
                              {doc.kind === "markdown" ? "Markdown" : "HTML"}
                              {b.query.trim() ? ` · ${doc.relativePath}` : ""}
                            </span>
                          </span>
                          {b.active?.path === doc.path && (
                            <span className="selection-dot" />
                          )}
                        </button>,
                      ),
                    )
                  ) : (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia>
                          <Search />
                        </EmptyMedia>
                        <EmptyTitle>
                          {b.query.trim() ? "没有匹配文档" : "此目录暂无文档"}
                        </EmptyTitle>
                        <EmptyDescription>
                          {b.query.trim()
                            ? "换一个关键词，或清空搜索返回目录。"
                            : "仅展示 Markdown 和 HTML 文档。可选择其他目录，或添加文件后刷新。"}
                        </EmptyDescription>
                      </EmptyHeader>
                      {b.query && (
                        <EmptyContent>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => b.setQuery("")}
                          >
                            清空搜索
                          </Button>
                        </EmptyContent>
                      )}
                    </Empty>
                  )}
                </div>
              </section>
            </ResizablePanel>
            <ResizableHandle className="document-divider" />
            <ResizablePanel
              id="preview"
              className="preview-panel"
              minSize="350px"
            >
              <section className="preview-pane" aria-label="文档预览">
                <Tabs
                  value={b.session.activeTabPath ?? ""}
                  onValueChange={(path) => {
                    const doc = b.library?.documents.find(
                      (d) => d.path === path,
                    );
                    if (doc) void b.openDoc(doc);
                  }}
                  className="preview-tabs"
                >
                  <div className="preview-toolbar">
                    <DocumentTabs
                      b={b}
                      dirtyPath={editor.dirty ? editor.draft?.path : undefined}
                    />
                    <div className="preview-actions">
                      {b.active?.kind === "html" && !editor.draft && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending || !loaded}
                          onClick={() => void editor.begin()}
                        >
                          <Pencil data-icon="inline-start" />
                          编辑文字
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="导出 PDF"
                        title="导出 PDF"
                        disabled={
                          !b.active || pending || !loaded || !!editor.draft
                        }
                        onClick={pdf}
                      >
                        <Download />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={immersive ? "退出预览全屏" : "预览全屏"}
                        title={immersive ? "退出预览全屏" : "预览全屏"}
                        disabled={!b.active}
                        onClick={() => setImmersive((v) => !v)}
                      >
                        {immersive ? <Minimize /> : <Expand />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="窗口全屏"
                        title="窗口全屏"
                        onClick={() => void safe(toggleWindowFullscreen)}
                      >
                        <Maximize />
                      </Button>
                    </div>
                  </div>
                  {b.active ? (
                    <TabsContent
                      value={b.session.activeTabPath!}
                      className="preview-body"
                    >
                      <div
                        className="document-path"
                        title={b.active.relativePath}
                      >
                        {b.active.kind === "markdown" ? (
                          <FileText />
                        ) : (
                          <Globe />
                        )}
                        <span>{b.active.relativePath}</span>
                        <span className="file-kind">
                          {b.active.kind === "markdown" ? "Markdown" : "HTML"}
                        </span>
                      </div>
                      {!editor.draft && <EditorError message={editor.error} />}
                      {editor.draft && <HtmlEditor editor={editor} />}
                      {b.previewError ? (
                        <Empty>
                          <EmptyHeader>
                            <EmptyTitle>无法读取文档</EmptyTitle>
                            <EmptyDescription>
                              {b.previewError}
                            </EmptyDescription>
                          </EmptyHeader>
                          <EmptyContent>
                            <Button onClick={() => void b.reload()}>
                              刷新目录
                            </Button>
                          </EmptyContent>
                        </Empty>
                      ) : (
                        <>
                          <iframe
                            ref={iframe}
                            key={`${b.active.path}:${b.revision}`}
                            title={`文档预览：${b.active.name}`}
                            src={documentURL(
                              b.active.path,
                              b.revision,
                              b.activeFragment,
                            )}
                            sandbox="allow-scripts allow-modals allow-downloads"
                            onLoad={() => setLoaded(true)}
                            onError={() =>
                              b.setPreviewError(
                                "文档加载失败，请刷新目录后重试。",
                              )
                            }
                          />
                          {!loaded && (
                            <div className="preview-loading">
                              <LoadingRows />
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                  ) : b.busy ? (
                    <LoadingRows />
                  ) : (
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <BookOpen />
                        </EmptyMedia>
                        <EmptyTitle>选择文档，开始阅读</EmptyTitle>
                        <EmptyDescription>
                          从中间列表打开文档。
                          <br />
                          多个文档会在这里以标签呈现。
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  )}
                </Tabs>
              </section>
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      )}
      <footer className="statusbar">
        <span>
          {b.busy
            ? "正在扫描目录并建立搜索索引…"
            : b.active
              ? b.active.name
              : root
                ? "选择文档开始阅读"
                : "所有文档在本机处理"}
        </span>
        <span>
          {immersive
            ? "Esc 退出预览全屏"
            : `${isMac ? "⌘" : "Ctrl +"} F 搜索　·　${isMac ? "⌘" : "Ctrl +"} W 关闭标签`}
        </span>
      </footer>
      <UnsavedDialog editor={editor} />
      <SettingsDialog
        open={settings}
        onOpenChange={setSettings}
        value={b.session.preferences}
        onSave={async (prefs) => {
          await b.preferences(prefs);
          setSettings(false);
        }}
      />
      <RenameDialog
        doc={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSave={async (name) => {
          if (!renameTarget) return;
          setMutating(true);
          try {
            await b.rename(renameTarget, name);
            setRenameTarget(null);
          } finally {
            setMutating(false);
          }
        }}
      />
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v && !mutating) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>移入{isMac ? "废纸篓" : "回收站"}？</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.name}”将从当前目录移除。你可以在系统
              {isMac ? "废纸篓" : "回收站"}中恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={mutating}
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              disabled={mutating}
              onClick={() =>
                void safe(async () => {
                  if (!deleteTarget) return;
                  setMutating(true);
                  try {
                    await b.trash(deleteTarget);
                    setDeleteTarget(null);
                  } finally {
                    setMutating(false);
                  }
                })
              }
            >
              {mutating ? "正在移动…" : `移入${isMac ? "废纸篓" : "回收站"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function LoadingRows() {
  return (
    <div className="loading-rows" aria-label="正在加载">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="loading-row">
          <Skeleton className="size-4" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-2 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
function FolderRow({
  folder,
  b,
  level,
  disabled,
}: {
  folder: Folder;
  b: BrowserState;
  level: number;
  disabled: boolean;
}) {
  const expanded = level === 0 || b.session.expandedPaths.includes(folder.path),
    selected = b.session.selectedFolderPath === folder.path;
  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn("folder-row", selected && "selected")}
            style={{ paddingLeft: 10 + level * 16 }}
          >
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`${expanded ? "收起" : "展开"} ${folder.name}`}
              disabled={disabled || !folder.children.length || level === 0}
              onClick={() =>
                b.setSession((s) => ({
                  ...s,
                  expandedPaths: expanded
                    ? s.expandedPaths.filter((p) => p !== folder.path)
                    : [...s.expandedPaths, folder.path],
                }))
              }
            >
              {folder.children.length ? (
                expanded ? (
                  <ChevronDown />
                ) : (
                  <ChevronRight />
                )
              ) : (
                <span />
              )}
            </Button>
            <button
              className="folder-select"
              aria-current={selected ? "location" : undefined}
              disabled={disabled}
              onClick={() => {
                b.setQuery("");
                b.setSession((s) => ({
                  ...s,
                  selectedFolderPath: folder.path,
                }));
              }}
              title={folder.path}
            >
              {expanded ? <FolderOpen /> : <FolderIcon />}
              <span>
                {folder.name}
                {level === 0 && <small>根目录</small>}
              </span>
              <span className="folder-count">{folder.documentCount}</span>
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuGroup>
            <ContextMenuItem
              onSelect={() =>
                void navigator.clipboard.writeText(folder.name).catch(b.report)
              }
            >
              <Copy />
              复制文件夹名称
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() =>
                void call("reveal_document", { path: folder.path }).catch(
                  b.report,
                )
              }
            >
              <FolderSearch />
              在系统文件管理器中显示
            </ContextMenuItem>
            <ContextMenuItem
              disabled={disabled}
              onSelect={() => void b.scan(folder.path)}
            >
              <FolderOpen />
              设为当前根目录
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>
      {expanded &&
        folder.children.map((child) => (
          <FolderRow
            key={child.path}
            folder={child}
            b={b}
            level={level + 1}
            disabled={disabled}
          />
        ))}
    </div>
  );
}
function DocumentTabs({
  b,
  dirtyPath,
}: {
  b: BrowserState;
  dirtyPath?: string;
}) {
  const dragged = useRef<string | null>(null),
    paths = b.session.openTabPaths;
  const reorder = (path: string, delta: number) =>
    b.setSession((s) => {
      const order = [...s.openTabPaths],
        i = order.indexOf(path),
        j = i + delta;
      if (i < 0 || j < 0 || j >= order.length) return s;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...s, openTabPaths: order };
    });
  return (
    <div className="tabs-scroll">
      <TabsList className="document-tabs" aria-label="打开的文档">
        {paths.map((path, i) => {
          const doc = b.library?.documents.find((d) => d.path === path);
          if (!doc) return null;
          return (
            <ContextMenu key={path}>
              <ContextMenuTrigger asChild>
                <div
                  className={cn(
                    "tab-item",
                    path === b.session.activeTabPath && "active",
                  )}
                  draggable
                  onDragStart={(e) => {
                    dragged.current = path;
                    e.dataTransfer.setData("text/plain", path);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragged.current)
                      b.setSession((s) => ({
                        ...s,
                        openTabPaths: moveBefore(
                          s.openTabPaths,
                          dragged.current!,
                          path,
                        ),
                      }));
                    dragged.current = null;
                  }}
                  onDragEnd={() => {
                    dragged.current = null;
                  }}
                >
                  <TabsTrigger
                    value={path}
                    title={doc.name}
                    className="document-tab"
                  >
                    {doc.kind === "markdown" ? <FileText /> : <Globe />}
                    <span>
                      {doc.name.replace(/\.(md|markdown|html|htm)$/i, "")}
                    </span>
                    {dirtyPath === path && (
                      <span aria-label="未保存修改">●</span>
                    )}
                  </TabsTrigger>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`关闭 ${doc.name}`}
                    onClick={() => b.close([path])}
                  >
                    <X />
                  </Button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuGroup>
                  <ContextMenuItem onSelect={() => b.close([path])}>
                    关闭
                  </ContextMenuItem>
                  <ContextMenuItem
                    onSelect={() => b.close(paths.filter((p) => p !== path))}
                  >
                    关闭其他标签
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={i === 0}
                    onSelect={() => b.close(paths.slice(0, i))}
                  >
                    关闭左侧标签
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={i === paths.length - 1}
                    onSelect={() => b.close(paths.slice(i + 1))}
                  >
                    关闭右侧标签
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => b.close(paths)}>
                    关闭全部标签
                  </ContextMenuItem>
                </ContextMenuGroup>
                <ContextMenuSeparator />
                <ContextMenuGroup>
                  <ContextMenuItem
                    disabled={i === 0}
                    onSelect={() => reorder(path, -1)}
                  >
                    <ArrowLeft />
                    左移
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={i === paths.length - 1}
                    onSelect={() => reorder(path, 1)}
                  >
                    <ArrowRight />
                    右移
                  </ContextMenuItem>
                </ContextMenuGroup>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </TabsList>
      {!!paths.length && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label="标签操作">
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={() => b.close(b.active ? [b.active.path] : [])}
              >
                关闭当前标签
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => b.close(paths)}>
                关闭全部标签
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
function SettingsDialog({
  open,
  onOpenChange,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: Preferences;
  onSave: (v: Preferences) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value),
    [ignored, setIgnored] = useState(""),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setDraft(value);
      setIgnored(value.ignoredNames.join(", "));
      setError("");
    }
  }, [open, value]);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!saving) onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <DialogDescription>调整阅读环境与目录扫描范围。</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <FieldSet>
            <FieldLegend>外观</FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="theme">主题色</FieldLabel>
                <Input
                  id="theme"
                  type="color"
                  value={draft.themeColor}
                  className="color-input"
                  onInput={(e) => {
                    const color = e.currentTarget.value;
                    setDraft((s) => ({ ...s, themeColor: color }));
                  }}
                  onChange={(e) => {
                    const color = e.currentTarget.value;
                    setDraft((s) => ({ ...s, themeColor: color }));
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="opacity">
                  界面通透感{" "}
                  <span className="ml-auto">
                    {Math.round(draft.windowOpacity * 100)}%
                  </span>
                </FieldLabel>
                <Slider
                  id="opacity"
                  aria-label="界面通透感"
                  min={65}
                  max={100}
                  step={1}
                  value={[Math.round(draft.windowOpacity * 100)]}
                  onValueChange={(v) =>
                    setDraft((s) => ({ ...s, windowOpacity: v[0] / 100 }))
                  }
                />
                <FieldDescription>
                  调整侧栏和工具栏的材料浓淡，文档内容保持清晰。
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
          <FieldSet>
            <FieldLegend>目录扫描</FieldLegend>
            <FieldGroup>
              <Field orientation="horizontal">
                <FieldLabel htmlFor="hidden">显示隐藏文件</FieldLabel>
                <Switch
                  id="hidden"
                  checked={draft.showHiddenFiles}
                  onCheckedChange={(v) =>
                    setDraft((s) => ({ ...s, showHiddenFiles: v }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ignored">忽略目录或文件名</FieldLabel>
                <Input
                  id="ignored"
                  value={ignored}
                  onChange={(e) => setIgnored(e.target.value)}
                />
                <FieldDescription>
                  使用英文逗号分隔。保存后重新扫描当前目录。
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            disabled={saving}
            onClick={() => {
              setSaving(true);
              void onSave({
                ...draft,
                ignoredNames: ignored
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
                .catch((e) => setError(String(e)))
                .finally(() => setSaving(false));
            }}
          >
            {saving ? "正在保存…" : "保存设置"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function RenameDialog({
  doc,
  onClose,
  onSave,
}: {
  doc: Document | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    if (doc) {
      setName(doc.name);
      setError("");
    }
  }, [doc]);
  const submit = () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    void onSave(name)
      .catch((e) => setError(String(e)))
      .finally(() => setSaving(false));
  };
  return (
    <Dialog
      open={!!doc}
      onOpenChange={(v) => {
        if (!v && !saving) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名文件</DialogTitle>
          <DialogDescription>
            修改真实文件名，并同步打开的标签。
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="name">新文件名</FieldLabel>
            <Input
              id="name"
              value={name}
              aria-invalid={!!error}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <FieldDescription>不填写扩展名时，保留原扩展名。</FieldDescription>
          </Field>
        </FieldGroup>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            取消
          </Button>
          <Button disabled={!name.trim() || saving} onClick={submit}>
            {saving ? "正在重命名…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
