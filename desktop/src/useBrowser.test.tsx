// @vitest-environment jsdom
import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { call } from "./api";
import { useBrowser } from "./useBrowser";
import { defaultSession, type Document, type Library } from "./types";
vi.mock("./api", () => ({ call: vi.fn(), pickDirectory: vi.fn() }));
const docs: Document[] = ["a", "b"].map((n) => ({
  path: `/root/${n}.md`,
  name: `${n}.md`,
  relativePath: `${n}.md`,
  parentPath: "/root",
  kind: "markdown",
  modified: "1",
  size: 1,
}));
const lib: Library = {
  root: { path: "/root", name: "root", children: [], documentCount: 2 },
  documents: docs,
  warnings: [],
};
const exists = new Map<string, ReturnType<typeof deferred>>();
function deferred() {
  let resolve!: () => void, reject!: (reason: unknown) => void;
  const promise = new Promise<void>((r, j) => {
    resolve = r;
    reject = j;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  exists.clear();
  vi.mocked(call).mockImplementation(async (command, args) => {
    if (command === "load_session")
      return {
        ...defaultSession,
        rootPath: "/root",
        selectedFolderPath: "/root",
        openTabPaths: ["/root/a.md"],
        activeTabPath: "/root/a.md",
      } as never;
    if (command === "scan_directory") return lib as never;
    if (command === "document_exists")
      return exists.get(args!.path as string)!.promise as never;
    return undefined as never;
  });
});
afterEach(() => cleanup());
describe("document selection truth", () => {
  it("keeps the current preview when another document fails to open", async () => {
    const { result } = renderHook(() => useBrowser());
    await waitFor(() => expect(result.current.busy).toBe(false));
    const pending = deferred();
    exists.set("/root/b.md", pending);
    let operation!: Promise<void>;
    act(() => {
      operation = result.current.openDoc(docs[1]);
    });
    await act(async () => {
      pending.reject("file missing");
      await operation;
    });
    expect(result.current.active?.path).toBe("/root/a.md");
    expect(result.current.previewError).toBe("");
    expect(result.current.error).toContain("file missing");
  });
  it("ignores a slower response from an older selection", async () => {
    const { result } = renderHook(() => useBrowser());
    await waitFor(() => expect(result.current.busy).toBe(false));
    const first = deferred(),
      second = deferred();
    exists.set("/root/a.md", first);
    exists.set("/root/b.md", second);
    let one!: Promise<void>, two!: Promise<void>;
    act(() => {
      one = result.current.openDoc(docs[0]);
      two = result.current.openDoc(docs[1], "#目标");
    });
    await act(async () => {
      second.resolve();
      await two;
    });
    expect(result.current.active?.path).toBe("/root/b.md");
    expect(result.current.activeFragment).toBe("#目标");
    await act(async () => {
      first.resolve();
      await one;
    });
    expect(result.current.active?.path).toBe("/root/b.md");
    expect(result.current.activeFragment).toBe("#目标");
  });
  it("invalidates a pending selection when the user closes its tab", async () => {
    const { result } = renderHook(() => useBrowser());
    await waitFor(() => expect(result.current.busy).toBe(false));
    const pending = deferred();
    exists.set("/root/b.md", pending);
    let operation!: Promise<void>;
    act(() => {
      operation = result.current.openDoc(docs[1]);
      result.current.close(["/root/a.md"]);
    });
    await act(async () => {
      pending.resolve();
      await operation;
    });
    expect(result.current.session.activeTabPath).toBe(null);
    expect(result.current.session.openTabPaths).toEqual([]);
  });
});
