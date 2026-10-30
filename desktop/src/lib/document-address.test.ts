import { describe, it, expect } from "vitest";
import { documentAddress } from "./document-address";
import { accessibleAccent } from "./theme";
describe("native document base URLs", () => {
  it("resolves relative Mac resources alongside a Chinese document", () => {
    const address = documentAddress(
      "/Users/test/文档/阅读 #1.md",
      3,
      false,
      "#表格",
    );
    const relative = new URL("assets/图片.svg", address);
    expect(decodeURIComponent(relative.pathname)).toBe(
      "/Users/test/文档/assets/图片.svg",
    );
    expect(new URL(address).searchParams.get("v")).toBe("3");
    expect(decodeURIComponent(new URL(address).hash)).toBe("#表格");
  });
  it("resolves Windows drive paths and links without encoding separators", () => {
    const address = documentAddress(
      "C:\\Users\\test\\文档\\file.html",
      2,
      true,
    );
    expect(new URL(address).host).toBe("document.localhost");
    expect(
      decodeURIComponent(new URL("next.md#section", address).pathname),
    ).toBe("/C:/Users/test/文档/next.md");
  });
  it("preserves literal percent and question marks in paths", () => {
    const address = documentAddress("/tmp/100%/what?.md", 1, false);
    expect(decodeURIComponent(new URL(address).pathname)).toBe(
      "/tmp/100%/what?.md",
    );
  });
  it("adjusts white and yellow accents to readable roles", () => {
    expect(accessibleAccent("#ffffff")).not.toBe("#ffffff");
    expect(accessibleAccent("#ffff00")).not.toBe("#ffff00");
    expect(accessibleAccent("#000000")).toBe("#000000");
    expect(accessibleAccent("invalid")).toBe("#3e6655");
  });
});
