import { parse, type DefaultTreeAdapterMap } from "parse5";

export type TextTarget = {
  id: string;
  path: number[];
  text: string;
  label: string;
  start: number;
  end: number;
  ancestors: { tag: string; attrs: { name: string; value: string }[] }[];
};
const excluded = new Set([
  "head",
  "script",
  "style",
  "noscript",
  "template",
  "textarea",
  "title",
  "select",
  "input",
  "button",
  "svg",
  "math",
  "canvas",
  "iframe",
  "object",
  "xmp",
  "plaintext",
]);
const labels: Record<string, string> = {
  h1: "标题",
  h2: "标题",
  h3: "标题",
  h4: "标题",
  h5: "标题",
  h6: "标题",
  p: "段落",
  li: "列表文字",
  td: "表格文字",
  th: "表头文字",
  a: "链接文字",
  strong: "加粗文字",
  em: "强调文字",
};

// Parse source locations without rendering or serializing the document. Only the
// selected original text range is replaced; every other source character stays put.
export function textTargets(source: string): TextTarget[] {
  const tree = parse(source, { sourceCodeLocationInfo: true });
  const targets: TextTarget[] = [];
  function walk(
    node: DefaultTreeAdapterMap["node"],
    path: number[],
    label = "正文",
    blocked = false,
    ancestors: TextTarget["ancestors"] = [],
  ) {
    if ("tagName" in node) {
      blocked ||=
        excluded.has(node.tagName) ||
        node.namespaceURI !== "http://www.w3.org/1999/xhtml" ||
        node.attrs.some((a) =>
          ["hidden", "inert", "contenteditable"].includes(a.name),
        );
      label = labels[node.tagName] || label;
      ancestors = [...ancestors, { tag: node.tagName, attrs: node.attrs }];
    }
    if (
      !blocked &&
      node.nodeName === "#text" &&
      "value" in node &&
      node.value.trim() &&
      node.sourceCodeLocation
    ) {
      const { startOffset: start, endOffset: end } = node.sourceCodeLocation;
      targets.push({
        id: `${start}:${end}`,
        path,
        text: node.value,
        label,
        start,
        end,
        ancestors,
      });
    }
    if (!blocked && "childNodes" in node)
      node.childNodes.forEach((child, i) =>
        walk(child, [...path, i], label, blocked, ancestors),
      );
  }
  walk(tree, []);
  // Parser recovery can split one source span into multiple nodes. Ambiguous
  // ranges must never become editable (e.g. malformed formatting adoption).
  const sorted = targets.sort((a, b) => a.start - b.start);
  let previousEnd = -1;
  return sorted.filter((t, i) => {
    const safe =
      t.start >= previousEnd &&
      (!sorted[i + 1] || t.end <= sorted[i + 1].start);
    previousEnd = Math.max(previousEnd, t.end);
    return safe;
  });
}
export function replaceText(
  source: string,
  target: TextTarget,
  text: string,
): string {
  const current = textTargets(source).find((t) => t.id === target.id);
  if (
    !current ||
    current.text !== target.text ||
    current.path.join(".") !== target.path.join(".")
  )
    throw new Error("这处文字已变化，请重新选择后再修改。");
  if (text.includes("\0"))
    throw new Error("文字包含无法保存的空字符，请删除后重试。");
  if (text === current.text) return source;
  // Escaping prevents typed markup from changing the page structure or scripts.
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return source.slice(0, current.start) + escaped + source.slice(current.end);
}
