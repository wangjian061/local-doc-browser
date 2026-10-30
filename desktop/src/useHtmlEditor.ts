import { useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { call, native } from "./api";
import { textTargets, replaceText, type TextTarget } from "./lib/html-text";
import type { Document } from "./types";
import type { BrowserState } from "./useBrowser";

type Source = { content: string; revision: string; encoding: string };
type Selection = { target: TextTarget; text: string };
type Draft = Source & {
  path: string;
  name: string;
  targets: TextTarget[];
  selection: Selection | null;
  options: TextTarget[] | null;
};
type Action = () => unknown | Promise<unknown>;

export function useHtmlEditor(b: BrowserState) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const current = useRef(draft);
  const [busy, setBusy] = useState(false),
    locked = useRef(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const continuation = useRef<Action | null>(null);
  const dirty =
    !!draft?.selection && draft.selection.text !== draft.selection.target.text;
  function update(value: Draft | null) {
    current.current = value;
    setDraft(value);
  }
  function lock(value: boolean) {
    locked.current = value;
    setBusy(value);
  }
  const report = (e: unknown) =>
    setError(String(e instanceof Error ? e.message : e));
  async function finish() {
    // Release the native quit guard before dropping the only in-memory copy.
    await call("finish_html_edit");
    update(null);
    setError("");
  }
  async function begin() {
    if (
      locked.current ||
      current.current ||
      b.busy ||
      b.active?.kind !== "html"
    )
      return;
    const doc = b.active;
    lock(true);
    setError("");
    b.setNotice("");
    try {
      const source = await call<Source>("read_html_source", { path: doc.path });
      update({
        ...source,
        targets: textTargets(source.content),
        selection: null,
        options: null,
        path: doc.path,
        name: doc.name,
      });
    } catch (e) {
      report(e);
    } finally {
      lock(false);
    }
  }
  async function save() {
    const d = current.current;
    if (!d || locked.current) return false;
    lock(true);
    setError("");
    try {
      if (d.selection && d.selection.text !== d.selection.target.text) {
        const content = replaceText(
          d.content,
          d.selection.target,
          d.selection.text,
        );
        const doc = await call<Document>("save_html_source", {
          path: d.path,
          revision: d.revision,
          content,
        });
        // The write is committed. Clear the dirty flag even if releasing the guard fails.
        update({ ...d, content, selection: null });
        b.didSave(doc);
      }
      await finish();
      return true;
    } catch (e) {
      report(e);
      return false;
    } finally {
      lock(false);
    }
  }
  async function run(action: Action): Promise<boolean> {
    if (locked.current || continuation.current) return false;
    const d = current.current;
    if (d?.selection && d.selection.text !== d.selection.target.text) {
      continuation.current = action;
      setConfirming(true);
      return false;
    }
    lock(true);
    setError("");
    try {
      if (d) await finish();
      await action();
      return true;
    } catch (e) {
      report(e);
      return false;
    } finally {
      lock(false);
    }
  }
  function cancel() {
    if (locked.current) return;
    continuation.current = null;
    setConfirming(false);
  }
  async function resolve(saveFirst: boolean) {
    if (locked.current) return;
    const next = continuation.current;
    if (saveFirst) {
      if (!(await save())) return;
    } else {
      lock(true);
      try {
        await finish();
      } catch (e) {
        report(e);
        return;
      } finally {
        lock(false);
      }
    }
    continuation.current = null;
    setConfirming(false);
    if (next) await run(next);
  }
  const exit = useRef<() => void>(() => {});
  exit.current = () => {
    void run(() => call("confirm_app_exit"));
  };
  useEffect(() => {
    if (!native) return;
    let disposed = false,
      unlisten: (() => void) | undefined;
    void listen("request-editor-exit", () => exit.current())
      .then((stop) => {
        if (disposed) stop();
        else unlisten = stop;
      })
      .catch(report);
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      const d = current.current;
      if (
        locked.current ||
        (d?.selection && d.selection.text !== d.selection.target.text)
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
  return {
    draft,
    dirty,
    busy,
    error,
    confirming,
    begin,
    save,
    run,
    cancel,
    resolve,
    select(id: string, original: string) {
      const d = current.current;
      if (!d || locked.current || continuation.current || d.selection) return;
      const target = d.targets.find((t) => t.id === id && t.text === original);
      if (!target) {
        setError("这处文字无法安全定位，请退出编辑并刷新页面后重试。");
        return;
      }
      update({ ...d, options: null, selection: { target, text: target.text } });
      setError("");
    },
    selectOptions(ids: string[]) {
      const d = current.current;
      if (!d || locked.current || continuation.current || d.selection) return;
      const allowed = new Set(ids);
      const options = d.targets.filter((t) => allowed.has(t.id));
      if (options.length) {
        update({ ...d, options });
        setError("");
      }
    },
    closeSelection() {
      if (!current.current || locked.current) return;
      if (
        current.current.selection?.text !==
        current.current.selection?.target.text
      ) {
        void run(() => {});
      } else {
        update({ ...current.current, selection: null, options: null });
        setError("");
      }
    },
    change(text: string) {
      if (current.current?.selection && !locked.current) {
        update({
          ...current.current,
          selection: { ...current.current.selection, text },
        });
        setError("");
      }
    },
  };
}
export type HtmlEditorState = ReturnType<typeof useHtmlEditor>;
