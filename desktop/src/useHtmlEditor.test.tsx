// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { call } from "./api";
import { useHtmlEditor } from "./useHtmlEditor";
import type { BrowserState } from "./useBrowser";
vi.mock("./api", () => ({ call: vi.fn(), native: false }));
const document = {
  path: "/root/a.html",
  name: "a.html",
  kind: "html",
  size: 10,
};
const source = {
  content: "<p>before</p>",
  revision: "original-hash",
  encoding: "UTF-8",
};
const didSave = vi.fn(),
  setNotice = vi.fn();
const browser = () =>
  ({
    active: document,
    busy: false,
    didSave,
    setNotice,
  }) as unknown as BrowserState;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(call).mockImplementation(async (command) => {
    if (command === "read_html_source") return source as never;
    if (command === "save_html_source") return document as never;
    return undefined as never;
  });
});
afterEach(cleanup);
it("edits only HTML, never requests Markdown source", async () => {
  const b = browser();
  b.active = { ...b.active!, kind: "markdown" };
  const { result } = renderHook(() => useHtmlEditor(b));
  await act(() => result.current.begin());
  expect(call).not.toHaveBeenCalled();
});
it("saves selected text against its revision and returns to refreshed preview", async () => {
  const { result } = renderHook(() => useHtmlEditor(browser()));
  await act(() => result.current.begin());
  act(() => {
    const t = result.current.draft!.targets[0];
    result.current.select(t.id, t.text);
  });
  act(() => result.current.change("<h1>修改</h1>"));
  expect(result.current.dirty).toBe(true);
  await act(() => result.current.save());
  expect(call).toHaveBeenCalledWith("save_html_source", {
    path: document.path,
    revision: source.revision,
    content: "<p>&lt;h1&gt;修改&lt;/h1&gt;</p>",
  });
  expect(didSave).toHaveBeenCalledWith(document);
  expect(result.current.draft).toBeNull();
});
it("cancel and failed save keep the draft and do not perform pending navigation", async () => {
  const navigate = vi.fn();
  const { result } = renderHook(() => useHtmlEditor(browser()));
  await act(() => result.current.begin());
  act(() => {
    const t = result.current.draft!.targets[0];
    result.current.select(t.id, t.text);
  });
  act(() => result.current.change("draft"));
  await act(() => result.current.run(navigate));
  expect(navigate).not.toHaveBeenCalled();
  act(() => result.current.cancel());
  expect(result.current.draft?.selection?.text).toBe("draft");
  await act(() => result.current.run(navigate));
  vi.mocked(call).mockRejectedValueOnce(new Error("外部修改冲突"));
  await act(() => result.current.resolve(true));
  expect(result.current.confirming).toBe(true);
  expect(result.current.draft?.selection?.text).toBe("draft");
  expect(result.current.error).toContain("外部修改冲突");
  expect(navigate).not.toHaveBeenCalled();
  expect(didSave).not.toHaveBeenCalled();
  await act(() => result.current.resolve(true));
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(result.current.confirming).toBe(false);
});
it("discard continues the original action without writing the file", async () => {
  const close = vi.fn();
  const { result } = renderHook(() => useHtmlEditor(browser()));
  await act(() => result.current.begin());
  act(() => {
    const t = result.current.draft!.targets[0];
    result.current.select(t.id, t.text);
  });
  act(() => result.current.change("draft"));
  await act(() => result.current.run(close));
  await act(() => result.current.resolve(false));
  expect(close).toHaveBeenCalledTimes(1);
  expect(call).not.toHaveBeenCalledWith("save_html_source", expect.anything());
  expect(result.current.draft).toBeNull();
});
it("guards navigation during an in-flight source read and prevents double save", async () => {
  let release!: (value: unknown) => void;
  vi.mocked(call).mockImplementationOnce(
    () =>
      new Promise((r) => {
        release = r;
      }) as never,
  );
  const { result } = renderHook(() => useHtmlEditor(browser()));
  let start!: Promise<void>;
  act(() => {
    start = result.current.begin();
  });
  const navigate = vi.fn();
  await act(() => result.current.run(navigate));
  expect(navigate).not.toHaveBeenCalled();
  await act(async () => {
    release(source);
    await start;
  });
  act(() => {
    const t = result.current.draft!.targets[0];
    result.current.select(t.id, t.text);
  });
  act(() => result.current.change("draft"));
  vi.mocked(call).mockImplementationOnce(
    () =>
      new Promise((r) => {
        release = r;
      }) as never,
  );
  let save!: Promise<boolean>;
  act(() => {
    save = result.current.save();
  });
  await act(() => result.current.save());
  await act(() => result.current.run(navigate));
  expect(navigate).not.toHaveBeenCalled();
  expect(
    vi.mocked(call).mock.calls.filter(([name]) => name === "save_html_source"),
  ).toHaveLength(1);
  await act(async () => {
    release(document);
    await save;
  });
});
it("reverting to original content makes leaving clean and does not write", async () => {
  const { result } = renderHook(() => useHtmlEditor(browser()));
  await act(() => result.current.begin());
  act(() => {
    const t = result.current.draft!.targets[0];
    result.current.select(t.id, t.text);
  });
  act(() => result.current.change("draft"));
  act(() => {
    const t = result.current.draft!.targets[0];
    result.current.select(t.id, t.text);
  });
  act(() => result.current.change("before"));
  await act(() => result.current.run(() => {}));
  expect(result.current.confirming).toBe(false);
  expect(result.current.draft).toBeNull();
  expect(didSave).not.toHaveBeenCalled();
});

it("offers only known fragments and can edit a later fragment without touching earlier ones", async () => {
  vi.mocked(call).mockResolvedValueOnce({
    ...source,
    content: "<p>前文<strong>加粗</strong>后文</p>",
  } as never);
  const { result } = renderHook(() => useHtmlEditor(browser()));
  await act(() => result.current.begin());
  const targets = result.current.draft!.targets;
  act(() =>
    result.current.selectOptions([targets[0].id, targets[2].id, "forged"]),
  );
  expect(result.current.draft?.options?.map((t) => t.text)).toEqual([
    "前文",
    "后文",
  ]);
  act(() => result.current.select(targets[2].id, targets[2].text));
  act(() => result.current.change("新后文"));
  await act(() => result.current.save());
  expect(call).toHaveBeenCalledWith("save_html_source", {
    path: document.path,
    revision: source.revision,
    content: "<p>前文<strong>加粗</strong>新后文</p>",
  });
});
