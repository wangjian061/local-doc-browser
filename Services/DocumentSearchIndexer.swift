import Foundation

struct DocumentSearchIndexer {
    func buildIndex(for root: FileNode) -> [String: DocumentSearchEntry] {
        var index: [String: DocumentSearchEntry] = [:]

        for node in flattenDocuments(in: root) {
            let content = normalizedContent(for: node)
            index[node.id] = DocumentSearchEntry(
                node: node,
                normalizedName: normalize(node.name),
                normalizedRelativePath: normalize(node.relativePath),
                normalizedContent: content
            )
        }

        return index
    }

    private func flattenDocuments(in node: FileNode) -> [FileNode] {
        if !node.isDirectory {
            return [node]
        }

        return node.children.flatMap(flattenDocuments)
    }

    private func normalizedContent(for node: FileNode) -> String {
        guard
            let data = try? Data(contentsOf: node.url),
            let text = decodeText(data)
        else {
            return ""
        }

        switch node.kind {
        case .html:
            return normalize(stripHTML(from: text))
        case .markdown:
            return normalize(text)
        case .folder:
            return ""
        }
    }

    private func decodeText(_ data: Data) -> String? {
        if let utf8 = String(data: data, encoding: .utf8) {
            return utf8
        }
        if let unicode = String(data: data, encoding: .unicode) {
            return unicode
        }
        if let utf16 = String(data: data, encoding: .utf16) {
            return utf16
        }
        return String(data: data, encoding: .ascii)
    }

    private func stripHTML(from text: String) -> String {
        let withoutScript = text.replacingOccurrences(
            of: "(?is)<script\\b[^>]*>.*?</script>",
            with: " ",
            options: .regularExpression
        )
        let withoutStyle = withoutScript.replacingOccurrences(
            of: "(?is)<style\\b[^>]*>.*?</style>",
            with: " ",
            options: .regularExpression
        )
        let withoutTags = withoutStyle.replacingOccurrences(
            of: "(?is)<[^>]+>",
            with: " ",
            options: .regularExpression
        )

        return withoutTags
            .replacingOccurrences(of: "&nbsp;", with: " ")
            .replacingOccurrences(of: "&amp;", with: "&")
            .replacingOccurrences(of: "&lt;", with: "<")
            .replacingOccurrences(of: "&gt;", with: ">")
            .replacingOccurrences(of: "&quot;", with: "\"")
    }

    private func normalize(_ text: String) -> String {
        text
            .folding(options: [.diacriticInsensitive, .caseInsensitive], locale: .current)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
