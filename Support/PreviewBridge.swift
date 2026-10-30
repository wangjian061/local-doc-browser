import AppKit
import UniformTypeIdentifiers
import WebKit

@MainActor
final class PreviewBridge {
    weak var webView: WKWebView?
    weak var window: NSWindow?

    func bind(webView: WKWebView) {
        self.webView = webView
    }

    func bind(window: NSWindow) {
        self.window = window
    }

    func exportCurrentPreviewAsPDF(suggestedFileName: String) async {
        guard let webView else { return }

        do {
            let panel = NSSavePanel()
            panel.allowedContentTypes = [.pdf]
            panel.canCreateDirectories = true
            panel.nameFieldStringValue = suggestedName(from: suggestedFileName)

            guard panel.runModal() == .OK, let outputURL = panel.url else { return }

            let contentRect = try await fullContentRect(for: webView)
            let configuration = WKPDFConfiguration()
            configuration.rect = contentRect

            let data = try await pdfData(from: webView, configuration: configuration)
            try data.write(to: outputURL, options: .atomic)
        } catch {
            presentError(message: "导出 PDF 失败：\(error.localizedDescription)")
        }
    }

    func toggleWindowFullscreen() {
        window?.toggleFullScreen(nil)
    }

    private func suggestedName(from rawName: String) -> String {
        let trimmed = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
        let base = trimmed.isEmpty ? "Document" : trimmed
        return base.hasSuffix(".pdf") ? base : "\(base).pdf"
    }

    private func fullContentRect(for webView: WKWebView) async throws -> CGRect {
        let script = """
        (() => {
          const body = document.body || {};
          const doc = document.documentElement || {};
          const width = Math.max(body.scrollWidth || 0, body.offsetWidth || 0, doc.clientWidth || 0, doc.scrollWidth || 0, doc.offsetWidth || 0);
          const height = Math.max(body.scrollHeight || 0, body.offsetHeight || 0, doc.clientHeight || 0, doc.scrollHeight || 0, doc.offsetHeight || 0);
          return `${width}x${height}`;
        })()
        """

        let result = try await javaScriptString(script, in: webView)
        let parts = result.split(separator: "x")
        let widthValue = parts.first.flatMap { Double($0) } ?? 0
        let heightValue = parts.dropFirst().first.flatMap { Double($0) } ?? 0
        let width = max(widthValue, Double(webView.bounds.width), 640)
        let height = max(heightValue, Double(webView.bounds.height), 640)

        return CGRect(x: 0, y: 0, width: width, height: height)
    }

    private func javaScriptString(_ script: String, in webView: WKWebView) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            webView.evaluateJavaScript(script) { result, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: result as? String ?? "")
                }
            }
        }
    }

    private func pdfData(from webView: WKWebView, configuration: WKPDFConfiguration) async throws -> Data {
        try await withCheckedThrowingContinuation { continuation in
            webView.createPDF(configuration: configuration) { result in
                switch result {
                case let .success(data):
                    continuation.resume(returning: data)
                case let .failure(error):
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    private func presentError(message: String) {
        let alert = NSAlert()
        alert.alertStyle = .warning
        alert.messageText = "操作失败"
        alert.informativeText = message
        alert.addButton(withTitle: "确定")
        alert.runModal()
    }
}
