import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
import { textTargets } from "./html-text";
const bridge = readFileSync(
  new URL("../../src-tauri/src/preview-bridge.js", import.meta.url),
  "utf8",
);
it("can select text with an original tabindex after the editor adds keyboard navigation", async () => {
  const source =
    '<html><body><p tabindex="-1">可修改文字</p><p class="managed">原文</p><p id="mixed">前文<strong>加粗</strong>后文</p></body></html>';
  const dom = new JSDOM(source, {
    runScripts: "outside-only",
    url: "http://localhost/",
  });
  const w = dom.window;
  Object.defineProperty(w.HTMLElement.prototype, "getClientRects", {
    value: () => [{ width: 100, height: 30 }],
  });
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.eval(bridge);
  w.dispatchEvent(
    new w.MessageEvent("message", {
      source: w as unknown as Window,
      data: {
        channel: "local-doc-browser-preview",
        type: "text-edit-mode",
        active: true,
        targets: textTargets(source),
      },
    }),
  );
  const p = w.document.querySelector("p")!;
  expect(p.getAttribute("tabindex")).toBe("0");
  const selected = new Promise<unknown>((resolve) =>
    w.addEventListener("message", (e) => {
      if (e.data?.type === "select-text") resolve(e.data);
    }),
  );
  p.dispatchEvent(
    new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );
  expect(await selected).toMatchObject({
    type: "select-text",
    text: "可修改文字",
  });
  // Real attribute changes must still fail source matching.
  const changed = w.document.querySelector(".managed")!;
  changed.setAttribute("class", "changed");
  const unavailable = new Promise<unknown>((resolve) =>
    w.addEventListener("message", (e) => {
      if (e.data?.type === "text-unavailable") resolve(e.data);
    }),
  );
  changed.dispatchEvent(
    new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );
  expect(await unavailable).toMatchObject({ type: "text-unavailable" });
  w.dispatchEvent(
    new w.MessageEvent("message", {
      source: w as unknown as Window,
      data: {
        channel: "local-doc-browser-preview",
        type: "text-edit-mode",
        active: false,
      },
    }),
  );
  expect(p.getAttribute("tabindex")).toBe("-1");
  w.dispatchEvent(
    new w.MessageEvent("message", {
      source: w as unknown as Window,
      data: {
        channel: "local-doc-browser-preview",
        type: "text-edit-mode",
        active: true,
        targets: textTargets(source),
      },
    }),
  );
  const options = new Promise<unknown>((resolve) =>
    w.addEventListener("message", (e) => {
      if (e.data?.type === "select-text-options") resolve(e.data);
    }),
  );
  w.document
    .getElementById("mixed")!
    .dispatchEvent(
      new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
  expect(await options).toMatchObject({
    type: "select-text-options",
    ids: textTargets(source)
      .filter((t) => ["前文", "后文"].includes(t.text))
      .map((t) => t.id),
  });
  dom.window.close();
});
