import Foundation

struct DirectoryScanner {
    private let fileManager = FileManager.default

    func scan(rootURL: URL, preferences: AppPreferences) throws -> FileNode {
        try scanDirectory(rootURL, rootURL: rootURL, preferences: preferences)
    }

    private func scanDirectory(_ url: URL, rootURL: URL, preferences: AppPreferences) throws -> FileNode {
        let values = try url.resourceValues(forKeys: [.isDirectoryKey, .isHiddenKey, .nameKey])

        if url != rootURL, shouldSkip(name: values.name ?? url.lastPathComponent, isHidden: values.isHidden ?? false, preferences: preferences) {
            throw ScanSkipError.skip
        }

        guard values.isDirectory == true else {
            let kind = kindForFile(url)
            guard kind != nil else {
                throw ScanSkipError.skip
            }
            return FileNode(url: url, rootURL: rootURL, kind: kind!, children: [])
        }

        let contents = try fileManager.contentsOfDirectory(
            at: url,
            includingPropertiesForKeys: [.isDirectoryKey, .isHiddenKey, .nameKey],
            options: [.skipsPackageDescendants]
        )

        var children: [FileNode] = []

        for child in contents {
            do {
                let node = try scanDirectory(child, rootURL: rootURL, preferences: preferences)
                children.append(node)
            } catch ScanSkipError.skip {
                continue
            }
        }

        children.sort { lhs, rhs in
            if lhs.isDirectory != rhs.isDirectory {
                return lhs.isDirectory && !rhs.isDirectory
            }

            return lhs.name.localizedStandardCompare(rhs.name) == .orderedAscending
        }
        return FileNode(url: url, rootURL: rootURL, kind: .folder, children: children)
    }

    private func shouldSkip(name: String, isHidden: Bool, preferences: AppPreferences) -> Bool {
        if !preferences.showHiddenFiles && isHidden {
            return true
        }

        return preferences.ignoredNames.contains { $0.caseInsensitiveCompare(name) == .orderedSame }
    }

    private func kindForFile(_ url: URL) -> FileNodeKind? {
        switch url.pathExtension.lowercased() {
        case "md", "markdown":
            return .markdown
        case "html", "htm":
            return .html
        default:
            return nil
        }
    }
}

private enum ScanSkipError: Error {
    case skip
}
