/** Preserve path separators: encoded slashes break the base URL of local HTML/Markdown. */
export function documentAddress(
  path: string,
  revision: number,
  windows: boolean,
  fragment = "",
): string {
  const normalized = path.replaceAll("\\", "/");
  const encoded = normalized.split("/").map(encodeURIComponent).join("/");
  const uri = new URL(
    `${windows ? "http://document.localhost" : "document://localhost"}${encoded.startsWith("/") ? "" : "/"}${encoded}`,
  );
  uri.searchParams.set("v", String(revision));
  uri.hash = fragment;
  return uri.href;
}
