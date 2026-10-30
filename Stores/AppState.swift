import AppKit
import Foundation
import Observation
import SwiftUI

@MainActor
@Observable
final class AppState {
    var rootURL: URL?
    var tree: FileNode?
    var selectedFolderPath: String?
    var searchText = ""
    var expandedPaths: Set<String> = []
    var favoritePaths: Set<String> = []
    var recentDocumentPaths: [String] = []
    var openTabs: [DocumentTab] = []
    var activeTabPath: String?
    var preview: RenderedPreview?
    var isPreviewFullscreen = false
    var isLoading = false
    var errorMessage: String?
    var preferences: AppPreferences

    private let renderer = PreviewRenderer()
    private let persistence = Persistence()
    private var didBootstrap = false
    private var didPromptInitialDirectory = false
    private var documentSearchIndex: [String: DocumentSearchEntry] = [:]
    let previewBridge = PreviewBridge()

    init() {
        let persisted = persistence.load()
        self.preferences = persisted.preferences
        self.expandedPaths = Set(persisted.expandedPaths)
        self.favoritePaths = Set(persisted.favoritePaths)
        self.recentDocumentPaths = persisted.recentDocumentPaths
        self.selectedFolderPath = persisted.selectedFolderPath
        self.activeTabPath = persisted.activeTabPath
    }

    func bootstrap() {
        guard !didBootstrap else { return }
        didBootstrap = true

        let persisted = persistence.load()
        preferences = persisted.preferences
        expandedPaths = Set(persisted.expandedPaths)
        favoritePaths = Set(persisted.favoritePaths)
        recentDocumentPaths = persisted.recentDocumentPaths
        selectedFolderPath = persisted.selectedFolderPath
        activeTabPath = persisted.activeTabPath

        guard let rootPath = persisted.rootPath else { return }
        let rootURL = URL(fileURLWithPath: rootPath)
        guard FileManager.default.fileExists(atPath: rootURL.path) else { return }

        Task {
            await setRootDirectory(rootURL, reopening: persisted.openTabPaths)
        }
    }

    var filteredTree: FileNode? {
        guard let tree else { return nil }
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return tree }
        return filter(node: tree, query: query.lowercased())
    }

    var searchResults: [FileNode] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty, let tree else { return [] }
        let normalizedQuery = normalizeSearchQuery(query)

        let hits = documentSearchIndex.values.compactMap { entry -> (DocumentSearchEntry, Int)? in
            if entry.normalizedName.contains(normalizedQuery) {
                return (entry, 0)
            }
            if entry.normalizedRelativePath.contains(normalizedQuery) {
                return (entry, 1)
            }
            if entry.normalizedContent.contains(normalizedQuery) {
                return (entry, 2)
            }
            return nil
        }

        if !hits.isEmpty {
            return hits
                .sorted {
                    if $0.1 != $1.1 { return $0.1 < $1.1 }
                    return $0.0.node.relativePath.localizedStandardCompare($1.0.node.relativePath) == .orderedAscending
                }
                .map(\.0.node)
        }

        return flattenedDocuments(in: tree).filter {
            $0.name.localizedCaseInsensitiveContains(query) || $0.relativePath.localizedCaseInsensitiveContains(query)
        }
    }

    var activeTab: DocumentTab? {
        guard let activeTabPath else { return openTabs.first }
        return openTabs.first(where: { $0.path == activeTabPath }) ?? openTabs.first
    }

    var activeNode: FileNode? {
        guard let tree, let activeTabPath else { return nil }
        return findNode(in: tree, path: activeTabPath)
    }

    var selectedFolder: FileNode? {
        guard let tree else { return nil }
        guard let selectedFolderPath else { return nil }
        return findNode(in: tree, path: selectedFolderPath)
    }

    var rootFolders: [FileNode] {
        tree?.children.filter(\.isDirectory) ?? []
    }

    var visibleDocuments: [FileNode] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        if !query.isEmpty {
            return searchResults
        }

        guard let selectedFolder else { return [] }
        return selectedFolder.children.filter { !$0.isDirectory }
    }

    var favoriteDocuments: [DocumentTab] {
        let nodes = favoritePaths
            .compactMap { path in nodeForPath(path) }
            .filter { !$0.isDirectory }
            .sorted { $0.relativePath.localizedStandardCompare($1.relativePath) == .orderedAscending }

        return nodes.map { DocumentTab(url: $0.url, kind: $0.kind) }
    }

    var recentDocuments: [DocumentTab] {
        recentDocumentPaths.compactMap { path in
            guard let node = nodeForPath(path), !node.isDirectory else { return nil }
            return DocumentTab(url: node.url, kind: node.kind)
        }
    }

    var rootDisplayName: String {
        guard let rootURL else { return "未选择目录" }
        return rootURL.lastPathComponent.isEmpty ? rootURL.path : rootURL.lastPathComponent
    }

    var accentColor: Color {
        guard preferences.usesCustomAppearance else {
            return Color.accentColor
        }
        let color = preferences.themeColor
        return Color(.sRGB, red: color.red, green: color.green, blue: color.blue, opacity: color.alpha)
    }

    var windowOpacity: Double {
        preferences.usesCustomAppearance ? preferences.windowOpacity : 1.0
    }

    var usesCustomAppearance: Bool {
        preferences.usesCustomAppearance
    }

    var canGoToParent: Bool {
        guard let rootURL else { return false }
        return rootURL.path != "/" && rootURL.deletingLastPathComponent().path != rootURL.path
    }

    func chooseRootDirectory() {
        guard let url = FolderPicker.pickFolder(startingAt: rootURL) else { return }
        Task {
            await setRootDirectory(url, reopening: [])
        }
    }

    func setRootDirectoryFromNode(_ node: FileNode) {
        Task {
            await setRootDirectory(node.url, reopening: [])
        }
    }

    func goToParentDirectory() {
        guard let rootURL else { return }
        let parent = rootURL.deletingLastPathComponent()
        guard parent.path != rootURL.path else { return }
        Task {
            await setRootDirectory(parent, reopening: [])
        }
    }

    func reload() {
        guard let rootURL else { return }
        let reopen = openTabs.map(\.path)
        Task {
            await setRootDirectory(rootURL, reopening: reopen)
        }
    }

    func requestInitialDirectoryIfNeeded() {
        guard rootURL == nil, !didPromptInitialDirectory else { return }
        didPromptInitialDirectory = true
        chooseRootDirectory()
    }

    func selectFolder(_ node: FileNode) {
        guard node.isDirectory else { return }
        selectedFolderPath = node.id
        saveState()
    }

    func updatePreferences(showHiddenFiles: Bool, ignoredNamesText: String) {
        preferences.showHiddenFiles = showHiddenFiles
        preferences.ignoredNames = ignoredNamesText
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
        saveState()
        reload()
    }

    func updateAppearance(themeColor: ThemeColorData, windowOpacity: Double) {
        preferences.themeColor = themeColor
        preferences.windowOpacity = min(max(windowOpacity, 0.65), 1.0)
        preferences.usesCustomAppearance = true
        saveState()
    }

    func isExpanded(_ node: FileNode) -> Bool {
        expandedPaths.contains(node.id)
    }

    func setExpanded(_ isExpanded: Bool, for node: FileNode) {
        if isExpanded {
            expandedPaths.insert(node.id)
        } else {
            expandedPaths.remove(node.id)
        }
        saveState()
    }

    func openNode(_ node: FileNode) {
        guard !node.isDirectory else { return }

        let tab = DocumentTab(url: node.url, kind: node.kind)
        if !openTabs.contains(tab) {
            openTabs.append(tab)
        }
        activeTabPath = tab.path
        selectedFolderPath = node.url.deletingLastPathComponent().path
        expandAncestors(of: node.url)
        renderActiveTab()
        saveState()
    }

    func togglePreviewFullscreen() {
        guard preview != nil else { return }
        isPreviewFullscreen.toggle()
    }

    func exitPreviewFullscreen() {
        isPreviewFullscreen = false
    }

    func toggleWindowFullscreen() {
        previewBridge.toggleWindowFullscreen()
    }

    func exportActivePreviewPDF() {
        guard let activeTab else { return }
        Task {
            await previewBridge.exportCurrentPreviewAsPDF(suggestedFileName: activeTab.title)
        }
    }

    func activateTab(_ tab: DocumentTab) {
        activeTabPath = tab.path
        expandAncestors(of: tab.url)
        renderActiveTab()
        saveState()
    }

    func closeTab(_ tab: DocumentTab) {
        openTabs.removeAll { $0.id == tab.id }
        if activeTabPath == tab.path {
            activeTabPath = openTabs.last?.path
            renderActiveTab()
        }
        if openTabs.isEmpty {
            preview = nil
            isPreviewFullscreen = false
        }
        saveState()
    }

    func closeActiveTab() {
        guard let activeTab else { return }
        closeTab(activeTab)
    }

    func closeAllTabs() {
        openTabs.removeAll()
        activeTabPath = nil
        preview = nil
        isPreviewFullscreen = false
        saveState()
    }

    func closeOtherTabs(keeping tab: DocumentTab) {
        openTabs = openTabs.filter { $0.id == tab.id }
        activeTabPath = tab.path
        renderActiveTab()
        saveState()
    }

    func closeTabsToLeft(of tab: DocumentTab) {
        guard let index = openTabs.firstIndex(of: tab) else { return }
        openTabs.removeFirst(index)
        if !openTabs.contains(where: { $0.path == activeTabPath }) {
            activeTabPath = tab.path
            renderActiveTab()
        }
        saveState()
    }

    func closeTabsToRight(of tab: DocumentTab) {
        guard let index = openTabs.firstIndex(of: tab) else { return }
        openTabs = Array(openTabs.prefix(index + 1))
        if !openTabs.contains(where: { $0.path == activeTabPath }) {
            activeTabPath = tab.path
            renderActiveTab()
        }
        saveState()
    }

    func moveTabLeft(_ tab: DocumentTab) {
        guard let index = openTabs.firstIndex(of: tab), index > 0 else { return }
        openTabs.swapAt(index, index - 1)
        saveState()
    }

    func moveTabRight(_ tab: DocumentTab) {
        guard let index = openTabs.firstIndex(of: tab), index < openTabs.count - 1 else { return }
        openTabs.swapAt(index, index + 1)
        saveState()
    }

    func moveTab(_ dragged: DocumentTab, before target: DocumentTab) {
        guard
            dragged != target,
            let fromIndex = openTabs.firstIndex(of: dragged),
            let toIndex = openTabs.firstIndex(of: target)
        else { return }

        let item = openTabs.remove(at: fromIndex)
        let destination = fromIndex < toIndex ? max(toIndex - 1, 0) : toIndex
        openTabs.insert(item, at: destination)
        saveState()
    }

    func copyName(for node: FileNode) {
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(node.name, forType: .string)
    }

    func showInFinder(_ node: FileNode) {
        NSWorkspace.shared.activateFileViewerSelecting([node.url])
    }

    func openWithDefaultApp(_ node: FileNode) {
        NSWorkspace.shared.open(node.url)
    }

    func renameDocument(_ node: FileNode, to proposedName: String) {
        guard !node.isDirectory, let rootURL else { return }

        let trimmed = proposedName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            presentFileOperationError("文件名不能为空。")
            return
        }
        guard !trimmed.contains("/") else {
            presentFileOperationError("文件名不能包含斜杠。")
            return
        }

        let targetName = normalizedTargetName(from: trimmed, originalURL: node.url)
        let targetURL = node.url.deletingLastPathComponent().appendingPathComponent(targetName)

        guard targetURL.path != node.url.path else { return }
        guard !FileManager.default.fileExists(atPath: targetURL.path) else {
            presentFileOperationError("目标文件已存在：\(targetName)")
            return
        }

        do {
            try FileManager.default.moveItem(at: node.url, to: targetURL)
            remapStoredPaths(from: node.url.path, to: targetURL.path)
            let reopen = openTabs.map(\.path)
            Task {
                await setRootDirectory(rootURL, reopening: reopen)
            }
        } catch {
            presentFileOperationError("重命名失败：\(error.localizedDescription)")
        }
    }

    func deleteDocument(_ node: FileNode) {
        guard !node.isDirectory, let rootURL else { return }

        do {
            try FileManager.default.removeItem(at: node.url)
            removeStoredReferences(for: node.url.path)
            let reopen = openTabs.map(\.path)
            Task {
                await setRootDirectory(rootURL, reopening: reopen)
            }
        } catch {
            presentFileOperationError("删除失败：\(error.localizedDescription)")
        }
    }

    func isFavorite(_ node: FileNode) -> Bool {
        favoritePaths.contains(node.id)
    }

    func toggleFavorite(_ node: FileNode) {
        guard !node.isDirectory else { return }

        if favoritePaths.contains(node.id) {
            favoritePaths.remove(node.id)
        } else {
            favoritePaths.insert(node.id)
        }

        saveState()
    }

    func openDocument(_ tab: DocumentTab) {
        activeTabPath = tab.path

        if !openTabs.contains(tab) {
            openTabs.append(tab)
        }

        selectedFolderPath = tab.url.deletingLastPathComponent().path
        expandAncestors(of: tab.url)
        registerRecentDocument(tab.path)
        renderActiveTab()
        saveState()
    }

    func revealActiveDocumentInFinder() {
        guard let activeNode else { return }
        showInFinder(activeNode)
    }

    func openActiveDocumentInDefaultApp() {
        guard let activeNode else { return }
        openWithDefaultApp(activeNode)
    }

    func copyActiveDocumentName() {
        guard let activeNode else { return }
        copyName(for: activeNode)
    }

    func isActive(_ node: FileNode) -> Bool {
        activeTabPath == node.id
    }

    func containsActiveDocument(_ node: FileNode) -> Bool {
        guard node.isDirectory, let activeTabPath else { return false }
        return activeTabPath.hasPrefix(node.id + "/")
    }

    private func setRootDirectory(_ url: URL, reopening paths: [String]) async {
        isLoading = true
        errorMessage = nil

        do {
            let currentPreferences = preferences
            let scannedTree = try await Task.detached(priority: .userInitiated) {
                let tree = try DirectoryScanner().scan(rootURL: url, preferences: currentPreferences)
                let searchIndex = DocumentSearchIndexer().buildIndex(for: tree)
                return (tree, searchIndex)
            }.value

            rootURL = url
            tree = scannedTree.0
            documentSearchIndex = scannedTree.1
            if let restoredFolder = selectedFolderPath,
               findNode(in: scannedTree.0, path: restoredFolder)?.isDirectory == true {
                selectedFolderPath = restoredFolder
            } else if let active = activeTabPath {
                let folderPath = URL(fileURLWithPath: active).deletingLastPathComponent().path
                selectedFolderPath = findNode(in: scannedTree.0, path: folderPath)?.isDirectory == true ? folderPath : nil
            } else {
                selectedFolderPath = nil
            }

            let validTabs = paths.compactMap { path -> DocumentTab? in
                let fileURL = URL(fileURLWithPath: path)
                guard FileManager.default.fileExists(atPath: fileURL.path) else { return nil }
                switch fileURL.pathExtension.lowercased() {
                case "md", "markdown":
                    return DocumentTab(url: fileURL, kind: .markdown)
                case "html", "htm":
                    return DocumentTab(url: fileURL, kind: .html)
                default:
                    return nil
                }
            }

            openTabs = deduplicateTabs(validTabs)
            if let active = activeTabPath, openTabs.contains(where: { $0.path == active }) {
                activeTabPath = active
            } else {
                activeTabPath = openTabs.first?.path
            }
            if let activeTab {
                expandAncestors(of: activeTab.url)
            }
            renderActiveTab()
            saveState()
        } catch {
            documentSearchIndex = [:]
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    private func renderActiveTab() {
        guard let rootURL, let activeTab else {
            preview = nil
            return
        }

        do {
            registerRecentDocument(activeTab.path)
            preview = try renderer.render(tab: activeTab, rootURL: rootURL)
            errorMessage = nil
        } catch {
            preview = nil
            errorMessage = error.localizedDescription
        }
    }

    private func deduplicateTabs(_ tabs: [DocumentTab]) -> [DocumentTab] {
        var seen: Set<String> = []
        return tabs.filter { seen.insert($0.path).inserted }
    }

    private func filter(node: FileNode, query: String) -> FileNode? {
        let matchesSelf = node.name.lowercased().contains(query) || node.relativePath.lowercased().contains(query)

        guard node.isDirectory else {
            return matchesSelf ? node : nil
        }

        let filteredChildren = node.children.compactMap { filter(node: $0, query: query) }
        if matchesSelf || !filteredChildren.isEmpty {
            return FileNode(url: node.url, rootURL: node.rootURL, kind: node.kind, children: filteredChildren)
        }
        return nil
    }

    private func expandAncestors(of url: URL) {
        guard let rootURL else { return }
        var current = url.deletingLastPathComponent()

        while current.path.hasPrefix(rootURL.path), current.path != rootURL.path {
            expandedPaths.insert(current.path)
            current = current.deletingLastPathComponent()
        }
    }

    private func registerRecentDocument(_ path: String) {
        recentDocumentPaths.removeAll { $0 == path }
        recentDocumentPaths.insert(path, at: 0)
        if recentDocumentPaths.count > 18 {
            recentDocumentPaths = Array(recentDocumentPaths.prefix(18))
        }
    }

    private func nodeForPath(_ path: String) -> FileNode? {
        guard let tree else { return nil }
        return findNode(in: tree, path: path)
    }

    private func findNode(in node: FileNode, path: String) -> FileNode? {
        if node.id == path {
            return node
        }

        for child in node.children {
            if let match = findNode(in: child, path: path) {
                return match
            }
        }

        return nil
    }

    private func flattenedDocuments(in node: FileNode) -> [FileNode] {
        if !node.isDirectory {
            return [node]
        }

        return node.children.flatMap(flattenedDocuments)
    }

    private func saveState() {
        let state = PersistedState(
            rootPath: rootURL?.path,
            selectedFolderPath: selectedFolderPath,
            expandedPaths: Array(expandedPaths),
            openTabPaths: openTabs.map(\.path),
            activeTabPath: activeTabPath,
            favoritePaths: Array(favoritePaths),
            recentDocumentPaths: recentDocumentPaths,
            preferences: preferences
        )
        persistence.save(state)
    }

    private func normalizeSearchQuery(_ text: String) -> String {
        text
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func normalizedTargetName(from proposedName: String, originalURL: URL) -> String {
        if proposedName.contains("." ) || originalURL.pathExtension.isEmpty {
            return proposedName
        }
        return "\(proposedName).\(originalURL.pathExtension)"
    }

    private func remapStoredPaths(from oldPath: String, to newPath: String) {
        openTabs = openTabs.map { tab in
            tab.path == oldPath ? DocumentTab(url: URL(fileURLWithPath: newPath), kind: tab.kind) : tab
        }
        activeTabPath = activeTabPath == oldPath ? newPath : activeTabPath
        favoritePaths = Set(favoritePaths.map { $0 == oldPath ? newPath : $0 })
        recentDocumentPaths = recentDocumentPaths.map { $0 == oldPath ? newPath : $0 }
    }

    private func removeStoredReferences(for path: String) {
        openTabs.removeAll { $0.path == path }
        favoritePaths.remove(path)
        recentDocumentPaths.removeAll { $0 == path }

        if activeTabPath == path {
            activeTabPath = openTabs.last?.path
            renderActiveTab()
        }

        if openTabs.isEmpty {
            preview = nil
            isPreviewFullscreen = false
        }
    }

    private func presentFileOperationError(_ message: String) {
        let alert = NSAlert()
        alert.alertStyle = .warning
        alert.messageText = "文件操作失败"
        alert.informativeText = message
        alert.addButton(withTitle: "确定")
        alert.runModal()
    }
}
