import { useCallback, useEffect, useRef, useState } from "react";
import { call, pickDirectory } from "./api";
import {
  cleanSession,
  closeTabs,
  defaultSession,
  type Document,
  type Library,
  type Preferences,
  type Session,
} from "./types";

export function useBrowser() {
  const [session, reactSetSession] = useState<Session>(defaultSession),
    sessionRef = useRef(session);
  const setSession = useCallback(
    (change: Session | ((s: Session) => Session)) => {
      reactSetSession((old) => {
        const next = typeof change === "function" ? change(old) : change;
        sessionRef.current = next;
        return next;
      });
    },
    [],
  );
  const [library, setLibrary] = useState<Library | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [ready, setReady] = useState(false),
    [revision, setRevision] = useState(0);
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<Document[]>([]),
    [searching, setSearching] = useState(false),
    [previewError, setPreviewError] = useState("");
  const openId = useRef(0);
  const [activeFragment, setActiveFragment] = useState("");
  const scanId = useRef(0),
    saveAllowed = useRef(true),
    startup = useRef(false);
  const report = useCallback(
    (e: unknown) => setError(String(e instanceof Error ? e.message : e)),
    [],
  );
  const scan = useCallback(
    async (path: string, preferences?: Preferences, restored?: Session) => {
      const request = ++scanId.current;
      ++openId.current;
      setBusy(true);
      setError("");
      try {
        const prefs = preferences ?? sessionRef.current.preferences;
        const data = await call<Library>("scan_directory", {
          path,
          preferences: prefs,
        });
        if (request !== scanId.current) return false;
        const previous = restored ?? sessionRef.current;
        const switching = previous.rootPath !== data.root.path;
        const next = cleanSession(
          {
            ...previous,
            preferences: prefs,
            ...(switching
              ? {
                  selectedFolderPath: data.root.path,
                  openTabPaths: [],
                  activeTabPath: null,
                  expandedPaths: [data.root.path],
                }
              : {}),
          },
          data,
        );
        setLibrary(data);
        setSession(next);
        setRevision((v) => v + 1);
        setPreviewError("");
        setActiveFragment("");
        setQuery("");
        setNotice(
          data.warnings.length
            ? `已跳过或部分读取 ${data.warnings.length} 项。${data.warnings.slice(0, 3).join("；")}`
            : "",
        );
        return true;
      } catch (e) {
        if (request === scanId.current) report(e);
        return false;
      } finally {
        if (request === scanId.current) setBusy(false);
      }
    },
    [report, setSession],
  );
  useEffect(() => {
    if (startup.current) return;
    startup.current = true;
    (async () => {
      try {
        const saved = await call<Session>("load_session");
        const restored = {
          ...defaultSession,
          ...saved,
          preferences: { ...defaultSession.preferences, ...saved.preferences },
        };
        sessionRef.current = restored;
        setSession(restored);
        if (restored.rootPath)
          await scan(restored.rootPath, restored.preferences, restored);
      } catch (e) {
        saveAllowed.current = false;
        report(e);
      } finally {
        setBusy(false);
        setReady(true);
      }
    })();
  }, [report, scan, setSession]);
  useEffect(() => {
    if (!ready || !saveAllowed.current) return;
    void call("save_session", { session }).catch(report);
  }, [session, ready, report]);
  useEffect(() => {
    let canceled = false;
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      void call<Document[]>("search_documents", { query: q })
        .then((rows) => {
          if (!canceled) setResults(rows);
        })
        .catch((e) => {
          if (!canceled) report(e);
        })
        .finally(() => {
          if (!canceled) setSearching(false);
        });
    }, 180);
    return () => {
      canceled = true;
      clearTimeout(timer);
    };
  }, [query, revision, report]);
  const choose = useCallback(async () => {
    try {
      const path = await pickDirectory();
      if (path) {
        saveAllowed.current = true;
        await scan(path);
      }
    } catch (e) {
      report(e);
    }
  }, [scan, report]);
  const openDoc = useCallback(
    async (doc: Document, fragment = "") => {
      const request = ++openId.current;
      const openedRoot = sessionRef.current.rootPath;
      try {
        await call("document_exists", { path: doc.path });
        if (
          request !== openId.current ||
          openedRoot !== sessionRef.current.rootPath
        )
          return;
        setPreviewError("");
        setActiveFragment(fragment);
        setSession((s) => ({
          ...s,
          openTabPaths: s.openTabPaths.includes(doc.path)
            ? s.openTabPaths
            : [...s.openTabPaths, doc.path],
          activeTabPath: doc.path,
          selectedFolderPath: doc.parentPath,
          expandedPaths: [
            ...new Set([
              ...s.expandedPaths,
              ...ancestors(doc.parentPath, library?.root.path ?? ""),
            ]),
          ],
        }));
      } catch (e) {
        if (
          request === openId.current &&
          openedRoot === sessionRef.current.rootPath
        )
          report(e);
      }
    },
    [library, setSession, report],
  );
  const reload = useCallback(() => {
    if (sessionRef.current.rootPath) return scan(sessionRef.current.rootPath);
  }, [scan]);
  const parent = useCallback(async () => {
    try {
      const path = await call<string>("parent_directory");
      await scan(path);
    } catch (e) {
      report(e);
    }
  }, [scan, report]);
  const close = useCallback(
    (paths: string[]) => {
      ++openId.current;
      setPreviewError("");
      setActiveFragment("");
      setSession((s) => closeTabs(s, paths));
    },
    [setSession],
  );
  const rename = useCallback(
    async (doc: Document, name: string) => {
      const path = await call<string>("rename_document", {
        path: doc.path,
        name,
      });
      const s = sessionRef.current;
      const remap = (p: string) => (p === doc.path ? path : p);
      const next = {
        ...s,
        openTabPaths: s.openTabPaths.map(remap),
        activeTabPath: s.activeTabPath ? remap(s.activeTabPath) : null,
      };
      sessionRef.current = next;
      setSession(next);
      if (next.rootPath) await scan(next.rootPath);
      return path;
    },
    [setSession, scan],
  );
  const trash = useCallback(
    async (doc: Document) => {
      await call("trash_document", { path: doc.path });
      setSession((s) => closeTabs(s, [doc.path]));
      if (sessionRef.current.rootPath) await scan(sessionRef.current.rootPath);
      setNotice(`“${doc.name}”已移入系统回收站／废纸篓，可在系统中恢复。`);
    },
    [setSession, scan],
  );
  const preferences = useCallback(
    async (prefs: Preferences) => {
      if (sessionRef.current.rootPath) {
        const success = await scan(sessionRef.current.rootPath, prefs);
        if (!success)
          throw new Error("设置未保存：目录扫描失败，请处理错误后重试。");
      } else setSession((s) => ({ ...s, preferences: prefs }));
    },
    [scan, setSession],
  );
  const didSave = useCallback((doc: Document) => {
    setLibrary((lib) =>
      lib
        ? {
            ...lib,
            documents: lib.documents.map((d) =>
              d.path === doc.path ? doc : d,
            ),
          }
        : lib,
    );
    setPreviewError("");
    setRevision((v) => v + 1);
    setNotice(`“${doc.name}”已保存到原文件，预览已更新。`);
  }, []);
  const active = library?.documents.find(
    (d) => d.path === session.activeTabPath,
  );
  return {
    session,
    didSave,
    setSession,
    library,
    busy,
    error,
    setError,
    notice,
    setNotice,
    revision,
    query,
    setQuery,
    results,
    searching,
    previewError,
    activeFragment,
    setPreviewError,
    choose,
    scan,
    reload,
    parent,
    openDoc,
    active,
    close,
    rename,
    trash,
    preferences,
    report,
  };
}
function ancestors(path: string, root: string) {
  const result: string[] = [];
  let current = path;
  while (current && current.length >= root.length) {
    result.push(current);
    if (current === root) break;
    const i = Math.max(current.lastIndexOf("/"), current.lastIndexOf("\\"));
    if (i < 0) break;
    current = current.slice(0, i);
  }
  return result;
}
export type BrowserState = ReturnType<typeof useBrowser>;
