import { expect, it } from "vitest";
import { textTargets, replaceText } from "./html-text";
it("patches exactly the selected duplicate without rewriting markup, comments, styles or scripts", () => {
  const source =
    '<!doctype HTML>\n<!--keep-->\n<html><head><style>p{color:red}</style></head><body><p class="a">same</p><p class=\'b\'>same</p><script>document.x="same"</script></body></html>';
  const targets = textTargets(source);
  expect(targets.map((t) => t.text)).toEqual(["same", "same"]);
  expect(replaceText(source, targets[1], "新文字")).toBe(
    source.replace("class='b'>same", "class='b'>新文字"),
  );
});
it("preserves inline formatting and links when changing a text fragment", () => {
  const source =
    '<p>你好 <strong>重点</strong>，访问<a href="./a.html">链接</a>。</p>';
  const targets = textTargets(source);
  expect(targets.map((t) => t.text)).toEqual([
    "你好 ",
    "重点",
    "，访问",
    "链接",
    "。",
  ]);
  expect(replaceText(source, targets[1], "新重点")).toBe(
    source.replace("重点", "新重点"),
  );
});
it("decodes entities for editing and escapes all typed markup as plain text", () => {
  const source = "<table><tr><td>A &amp; B&nbsp;😀</td></tr></table>";
  const t = textTargets(source)[0];
  expect(t.text).toBe("A & B\u00a0😀");
  expect(replaceText(source, t, '<script>alert("x")</script> & 新')).toBe(
    '<table><tr><td>&lt;script&gt;alert("x")&lt;/script&gt; &amp; 新</td></tr></table>',
  );
  expect(replaceText(source, t, t.text)).toBe(source);
});
it("never offers metadata, scripts, templates, controls, SVG or hidden content as editable words", () => {
  const source =
    "<head><title>title</title></head><body><script>code</script><style>css</style><noscript>alt</noscript><template>template</template><textarea>value</textarea><button>button</button><svg><text>vector</text></svg><div hidden>secret</div><div contenteditable>managed</div><p>正文</p></body>";
  expect(textTargets(source).map((t) => t.text)).toEqual(["正文"]);
});
it("matches browser-inserted table containers while retaining original source positions", () => {
  const source = "<table><tr><td>12</td><td>12</td></tr></table>";
  const t = textTargets(source)[1];
  expect(t.path).toEqual([0, 1, 0, 0, 0, 1, 0]);
  expect(replaceText(source, t, "99")).toBe(
    "<table><tr><td>12</td><td>99</td></tr></table>",
  );
});
it("rejects stale or forged selections and null characters before any save", () => {
  const t = textTargets("<p>before</p>")[0];
  expect(() => replaceText("<p>external</p>", t, "draft")).toThrow();
  expect(() =>
    replaceText("<p>before</p>", { ...t, path: [999] }, "draft"),
  ).toThrow();
  expect(() => replaceText("<p>before</p>", t, "\0")).toThrow();
});
