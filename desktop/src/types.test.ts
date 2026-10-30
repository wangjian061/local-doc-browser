import { describe, it, expect } from "vitest";
import {
  cleanSession,
  closeTabs,
  moveBefore,
  defaultSession,
  type Library,
} from "./types";
describe("session and tabs", () => {
  it("closes active tab with a valid neighbor", () => {
    const s = {
      ...defaultSession,
      openTabPaths: ["a", "b", "c"],
      activeTabPath: "b",
    };
    expect(closeTabs(s, ["b"]).activeTabPath).toBe("c");
    expect(closeTabs(s, ["a", "b", "c"]).activeTabPath).toBe(null);
  });
  it("preserves current tab when closing other tabs", () => {
    const s = {
      ...defaultSession,
      openTabPaths: ["a", "b"],
      activeTabPath: "a",
    };
    expect(closeTabs(s, ["b"]).activeTabPath).toBe("a");
  });
  it("moves in both directions without duplicate or dropped tabs", () => {
    expect(moveBefore(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
    expect(moveBefore(["a", "b", "c"], "a", "c")).toEqual(["b", "a", "c"]);
  });
  it("drops missing tabs and invalid folders on refresh", () => {
    const lib: Library = {
      root: { path: "/root", name: "root", children: [], documentCount: 1 },
      documents: [
        {
          path: "/root/a.md",
          name: "a.md",
          relativePath: "a.md",
          parentPath: "/root",
          kind: "markdown",
          modified: "1",
          size: 1,
        },
      ],
      warnings: [],
    };
    const s = cleanSession(
      {
        ...defaultSession,
        selectedFolderPath: "/missing",
        activeTabPath: "/missing.md",
        openTabPaths: ["/missing.md", "/root/a.md", "/root/a.md"],
      },
      lib,
    );
    expect(s.openTabPaths).toEqual(["/root/a.md"]);
    expect(s.activeTabPath).toBe("/root/a.md");
    expect(s.selectedFolderPath).toBe("/root");
  });
});
