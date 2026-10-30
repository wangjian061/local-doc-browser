import SwiftUI
import WebKit

struct PreviewWorkspaceView: View {
    @Bindable var appState: AppState
    var immersive = false

    var body: some View {
        VStack(spacing: 0) {
            if !immersive {
                PreviewToolbar(appState: appState)
                Divider()
            }
            previewArea
        }
        .background(immersive ? Color.black : Color(nsColor: .windowBackgroundColor))
    }

    @ViewBuilder
    private var previewArea: some View {
        if let preview = appState.preview {
            WebPreview(payload: preview, previewBridge: appState.previewBridge)
        } else if let message = appState.errorMessage {
            ContentUnavailableView("无法预览文档", systemImage: "exclamationmark.triangle", description: Text(message))
        } else {
            Color.clear
        }
    }
}

private struct PreviewToolbar: View {
    @Bindable var appState: AppState

    var body: some View {
        HStack(spacing: 12) {
            DocumentTabsView(appState: appState)

            Spacer(minLength: 12)

            HStack(spacing: 8) {
                Button("导出 PDF") {
                    appState.exportActivePreviewPDF()
                }
                .disabled(appState.preview == nil)

                Button("预览全屏") {
                    appState.togglePreviewFullscreen()
                }
                .disabled(appState.preview == nil)

                Button("窗口全屏") {
                    appState.toggleWindowFullscreen()
                }
            }
            .controlSize(.small)
            .padding(.trailing, 14)
        }
        .frame(height: 46)
        .background(Color(nsColor: .controlBackgroundColor))
    }
}

struct WebPreview: NSViewRepresentable {
    let payload: RenderedPreview
    let previewBridge: PreviewBridge

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeNSView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.setValue(false, forKey: "drawsBackground")
        webView.allowsBackForwardNavigationGestures = true
        previewBridge.bind(webView: webView)
        load(payload, into: webView)
        context.coordinator.lastID = payload.id
        return webView
    }

    func updateNSView(_ webView: WKWebView, context: Context) {
        previewBridge.bind(webView: webView)
        guard context.coordinator.lastID != payload.id else { return }
        context.coordinator.lastID = payload.id
        load(payload, into: webView)
    }

    private func load(_ payload: RenderedPreview, into webView: WKWebView) {
        switch payload.content {
        case let .htmlFile(url, readAccessURL):
            webView.loadFileURL(url, allowingReadAccessTo: readAccessURL)
        case let .htmlString(baseURL, html):
            webView.loadHTMLString(html, baseURL: baseURL)
        }
    }

    final class Coordinator {
        var lastID: String?
    }
}
