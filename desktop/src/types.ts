export interface Preferences {
  showHiddenFiles: boolean;
  ignoredNames: string[];
  themeColor: string;
  windowOpacity: number;
}
export interface Session {
  rootPath: string | null;
  selectedFolderPath: string | null;
  expandedPaths: string[];
  openTabPaths: string[];
  activeTabPath: string | null;
  preferences: Preferences;
  sidebarWidth: number;
  listWidth: number;
}
export interface Folder {
  path: string;
  name: string;
  children: Folder[];
  documentCount: number;
}
export interface Document {
  path: string;
  name: string;
  relativePath: string;
  parentPath: string;
  kind: "markdown" | "html";
  modified: string;
  size: number;
}
export interface Library {
  root: Folder;
  documents: Document[];
  warnings: string[];
}
export const defaultPreferences: Preferences = {
  showHiddenFiles: false,
  ignoredNames: [
    ".git",
    "node_modules",
    ".DS_Store",
    ".build",
    "dist",
    "target",
  ],
  themeColor: "#3e6655",
  windowOpacity: 0.94,
};
export const defaultSession: Session = {
  rootPath: null,
  selectedFolderPath: null,
  expandedPaths: [],
  openTabPaths: [],
  activeTabPath: null,
  preferences: defaultPreferences,
  sidebarWidth: 19,
  listWidth: 22,
};
export function findFolder(
  root: Folder,
  path: string | null,
): Folder | undefined {
  if (root.path === path) return root;
  for (const child of root.children) {
    const found = findFolder(child, path);
    if (found) return found;
  }
}
export function cleanSession(session: Session, library: Library): Session {
  const valid = new Set(library.documents.map((d) => d.path));
  const tabs = [...new Set(session.openTabPaths)].filter((p) => valid.has(p));
  return {
    ...session,
    rootPath: library.root.path,
    selectedFolderPath:
      findFolder(library.root, session.selectedFolderPath)?.path ??
      library.root.path,
    openTabPaths: tabs,
    activeTabPath: tabs.includes(session.activeTabPath ?? "")
      ? session.activeTabPath
      : (tabs[0] ?? null),
  };
}
export function closeTabs(session: Session, paths: string[]): Session {
  const remove = new Set(paths);
  const tabs = session.openTabPaths.filter((p) => !remove.has(p));
  const oldIndex = session.openTabPaths.indexOf(session.activeTabPath ?? "");
  return {
    ...session,
    openTabPaths: tabs,
    activeTabPath: remove.has(session.activeTabPath ?? "")
      ? (tabs[Math.min(Math.max(oldIndex, 0), tabs.length - 1)] ?? null)
      : session.activeTabPath,
  };
}
export function moveBefore(
  tabs: string[],
  source: string,
  target: string,
): string[] {
  if (source === target || !tabs.includes(source) || !tabs.includes(target))
    return tabs;
  const rest = tabs.filter((p) => p !== source);
  rest.splice(rest.indexOf(target), 0, source);
  return rest;
}
