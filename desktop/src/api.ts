import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { documentAddress } from "./lib/document-address";
export const native = isTauri();
const qa = import.meta.env.MODE === "qa";
export async function call<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (qa) {
    const response = await fetch("http://127.0.0.1:1431/api", {
      method: "POST",
      body: JSON.stringify({ command, args }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result as T;
  }
  if (!native) throw new Error("请使用桌面应用打开本地文档。");
  return invoke<T>(command, args);
}
export async function pickDirectory(): Promise<string | null> {
  if (qa) return call<string>("qa_directory");
  if (!native) throw new Error("请启动桌面应用后选择本地目录。");
  return open({ directory: true, multiple: false, title: "选择本地文档目录" });
}
export function documentURL(path: string, revision: number, fragment = "") {
  if (qa)
    return `http://127.0.0.1:1431/document${path}?v=${revision}${fragment}`;
  return documentAddress(
    path,
    revision,
    /Win/i.test(navigator.platform),
    fragment,
  );
}
export async function toggleWindowFullscreen() {
  if (native) {
    const w = getCurrentWindow();
    await w.setFullscreen(!(await w.isFullscreen()));
  }
}
