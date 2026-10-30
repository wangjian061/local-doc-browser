import Down
import Foundation

struct RenderedPreview {
    let id: String
    let content: PreviewContent
}

enum PreviewContent {
    case htmlFile(url: URL, readAccessURL: URL)
    case htmlString(baseURL: URL, html: String)
}

struct PreviewRenderer {
    func render(tab: DocumentTab, rootURL: URL) throws -> RenderedPreview {
        switch tab.kind {
        case .html:
            return RenderedPreview(
                id: "\(tab.path)#html",
                content: .htmlFile(url: tab.url, readAccessURL: rootURL)
            )
        case .markdown:
            let markdown = try String(contentsOf: tab.url, encoding: .utf8)
            let normalizedMarkdown = preprocessMarkdownTables(in: markdown)
            let htmlBody = try Down(markdownString: normalizedMarkdown).toHTML(.unsafe)
            let html = wrapMarkdownHTML(body: htmlBody, title: tab.title, baseURL: tab.url.deletingLastPathComponent())
            return RenderedPreview(
                id: "\(tab.path)#md",
                content: .htmlString(baseURL: tab.url.deletingLastPathComponent(), html: html)
            )
        case .folder:
            throw PreviewError.unsupported
        }
    }

    private func wrapMarkdownHTML(body: String, title: String, baseURL: URL) -> String {
        let escapedTitle = title
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
        let baseHref = baseURL.absoluteString.hasSuffix("/") ? baseURL.absoluteString : baseURL.absoluteString + "/"

        return """
        <!doctype html>
        <html lang="zh-CN">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <base href="\(baseHref)">
          <title>\(escapedTitle)</title>
          <style>
            :root {
              --bg: #f8f9fa;
              --border: #e5e7eb;
              --text: #1f2937;
              --text2: #374151;
              --text3: #6b7280;
              --accent: #2563eb;
              --accent-light: #eff6ff;
              --code-bg: #edf2f7;
            }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); }
            body {
              font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, sans-serif;
              max-width: 960px;
              margin: 0 auto;
              padding: 32px 28px 64px;
              line-height: 1.75;
              font-size: 15px;
              -webkit-font-smoothing: antialiased;
            }
            h1 {
              font-size: 28px;
              font-weight: 700;
              border-bottom: 2px solid var(--accent);
              padding-bottom: 12px;
              margin: 0 0 16px;
            }
            h2 {
              font-size: 22px;
              margin: 28px 0 12px;
              color: var(--text);
            }
            h3 {
              font-size: 18px;
              margin: 20px 0 8px;
              color: var(--text2);
            }
            h4, h5, h6 {
              font-size: 16px;
              margin: 18px 0 8px;
              color: var(--text2);
            }
            p, ul, ol, blockquote { margin: 8px 0 12px; }
            a { color: var(--accent); text-decoration: none; }
            a:hover { text-decoration: underline; }
            img { max-width: 100%; height: auto; }
            pre, code {
              font-family: "SF Mono", Menlo, Consolas, monospace;
            }
            code {
              background: var(--code-bg);
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 13px;
            }
            pre {
              background: #1a202c;
              color: #e2e8f0;
              padding: 16px;
              border-radius: 8px;
              overflow-x: auto;
              font-size: 13px;
              line-height: 1.5;
            }
            pre code {
              background: transparent;
              padding: 0;
              color: inherit;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 14px;
              margin: 12px 0;
              display: block;
              overflow-x: auto;
              white-space: nowrap;
            }
            th, td {
              padding: 10px 12px;
              border: 1px solid var(--border);
              vertical-align: top;
              text-align: left;
            }
            th {
              background: #f7fafc;
              font-weight: 600;
            }
            tr:hover td {
              background: #f7fafc;
            }
            blockquote {
              border-left: 4px solid var(--accent);
              background: var(--accent-light);
              padding: 12px 16px;
              border-radius: 0 10px 10px 0;
            }
            hr {
              border: none;
              border-top: 1px solid var(--border);
              margin: 24px 0;
            }
            strong { color: var(--text); }
            ul, ol { margin: 8px 0 12px 24px; }
            li { margin-bottom: 4px; }
          </style>
        </head>
        <body>
          \(body)
        </body>
        </html>
        """
    }

    private func preprocessMarkdownTables(in markdown: String) -> String {
        let lines = markdown.components(separatedBy: .newlines)
        var result: [String] = []
        var index = 0
        var inFence = false
        var fenceMarker = ""

        while index < lines.count {
            let line = lines[index]
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            if let marker = fenceDelimiter(in: trimmed) {
                if inFence, marker == fenceMarker {
                    inFence = false
                    fenceMarker = ""
                } else if !inFence {
                    inFence = true
                    fenceMarker = marker
                }
                result.append(line)
                index += 1
                continue
            }

            if !inFence,
               index + 1 < lines.count,
               isTableHeader(lines[index]),
               isTableSeparator(lines[index + 1]) {
                var tableLines = [lines[index], lines[index + 1]]
                var nextIndex = index + 2

                while nextIndex < lines.count, isTableRow(lines[nextIndex]) {
                    tableLines.append(lines[nextIndex])
                    nextIndex += 1
                }

                result.append(renderHTMLTable(from: tableLines))
                index = nextIndex
                continue
            }

            result.append(line)
            index += 1
        }

        return result.joined(separator: "\n")
    }

    private func fenceDelimiter(in line: String) -> String? {
        if line.hasPrefix("```") { return "```" }
        if line.hasPrefix("~~~") { return "~~~" }
        return nil
    }

    private func isTableHeader(_ line: String) -> Bool {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        return trimmed.contains("|") && !trimmed.hasPrefix(">") && !trimmed.hasPrefix("- ")
    }

    private func isTableSeparator(_ line: String) -> Bool {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        guard trimmed.contains("|") else { return false }

        let cells = splitTableRow(trimmed)
        guard !cells.isEmpty else { return false }

        return cells.allSatisfy { cell in
            let value = cell.replacingOccurrences(of: " ", with: "")
            guard !value.isEmpty else { return false }
            return value.allSatisfy { $0 == "-" || $0 == ":" }
        }
    }

    private func isTableRow(_ line: String) -> Bool {
        let trimmed = line.trimmingCharacters(in: .whitespaces)
        return !trimmed.isEmpty && trimmed.contains("|")
    }

    private func splitTableRow(_ line: String) -> [String] {
        var text = line.trimmingCharacters(in: .whitespaces)
        if text.hasPrefix("|") { text.removeFirst() }
        if text.hasSuffix("|") { text.removeLast() }
        return text.split(separator: "|", omittingEmptySubsequences: false).map {
            $0.trimmingCharacters(in: .whitespaces)
        }
    }

    private func renderHTMLTable(from tableLines: [String]) -> String {
        let headerCells = splitTableRow(tableLines[0])
        let separatorCells = splitTableRow(tableLines[1])
        let bodyRows = tableLines.dropFirst(2).map(splitTableRow)
        let alignments = separatorCells.map(tableAlignment)

        var html: [String] = []
        html.append("<table>")
        html.append("<thead><tr>")

        for (index, cell) in headerCells.enumerated() {
            let alignment = index < alignments.count ? alignments[index] : nil
            html.append("<th\(alignmentAttribute(for: alignment))>\(renderInlineMarkdown(cell))</th>")
        }

        html.append("</tr></thead>")

        if !bodyRows.isEmpty {
            html.append("<tbody>")
            for row in bodyRows {
                html.append("<tr>")
                for (index, cell) in row.enumerated() {
                    let alignment = index < alignments.count ? alignments[index] : nil
                    html.append("<td\(alignmentAttribute(for: alignment))>\(renderInlineMarkdown(cell))</td>")
                }
                html.append("</tr>")
            }
            html.append("</tbody>")
        }

        html.append("</table>")
        return html.joined()
    }

    private func tableAlignment(_ cell: String) -> String? {
        let value = cell.replacingOccurrences(of: " ", with: "")
        let hasLeading = value.hasPrefix(":")
        let hasTrailing = value.hasSuffix(":")

        switch (hasLeading, hasTrailing) {
        case (true, true):
            return "center"
        case (true, false):
            return "left"
        case (false, true):
            return "right"
        case (false, false):
            return nil
        }
    }

    private func alignmentAttribute(for alignment: String?) -> String {
        guard let alignment else { return "" }
        return " style=\"text-align:\(alignment)\""
    }

    private func renderInlineMarkdown(_ markdown: String) -> String {
        guard !markdown.isEmpty else { return "" }

        do {
            let rendered = try Down(markdownString: markdown).toHTML(.unsafe).trimmingCharacters(in: .whitespacesAndNewlines)
            if rendered.hasPrefix("<p>"), rendered.hasSuffix("</p>") {
                return String(rendered.dropFirst(3).dropLast(4))
            }
            return rendered
        } catch {
            return escapeHTML(markdown)
        }
    }

    private func escapeHTML(_ text: String) -> String {
        text
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
    }
}

enum PreviewError: LocalizedError {
    case unsupported

    var errorDescription: String? {
        switch self {
        case .unsupported:
            return "当前文件类型不支持预览。"
        }
    }
}
