import SwiftUI

struct ContentView: View {
    @Bindable var appState: AppState

    var body: some View {
        ZStack {
            NavigationSplitView {
                SidebarView(appState: appState)
            } content: {
                DocumentListView(appState: appState)
            } detail: {
                PreviewWorkspaceView(appState: appState)
            }
            .navigationSplitViewStyle(.balanced)
            .tint(appState.accentColor)
            .background(WindowConfigurator(appState: appState, opacity: appState.windowOpacity))
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    Button("选择目录") {
                        appState.chooseRootDirectory()
                    }

                    Button("刷新目录") {
                        appState.reload()
                    }
                    .disabled(appState.rootURL == nil)

                    Button("上一级目录") {
                        appState.goToParentDirectory()
                    }
                    .disabled(!appState.canGoToParent)
                }
            }

            if appState.isPreviewFullscreen {
                FullscreenPreviewOverlay(appState: appState)
            }
        }
        .overlay {
            if appState.isLoading {
                ZStack {
                    Rectangle()
                        .fill(.regularMaterial)
                        .ignoresSafeArea()

                    VStack(spacing: 14) {
                        ProgressView()
                            .controlSize(.large)
                        Text("正在扫描目录…")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                    .padding(28)
                    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
            }
        }
        .task {
            appState.bootstrap()
            appState.requestInitialDirectoryIfNeeded()
        }
        .onExitCommand {
            if appState.isPreviewFullscreen {
                appState.exitPreviewFullscreen()
            }
        }
        .alert("无法打开目录", isPresented: Binding(
            get: { appState.errorMessage != nil && appState.tree == nil },
            set: { newValue in
                if !newValue {
                    appState.errorMessage = nil
                }
            }
        )) {
            Button("确定", role: .cancel) {}
        } message: {
            Text(appState.errorMessage ?? "")
        }
    }
}

private struct FullscreenPreviewOverlay: View {
    @Bindable var appState: AppState

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black
                .ignoresSafeArea()

            if appState.preview != nil {
                PreviewWorkspaceView(appState: appState, immersive: true)
                    .ignoresSafeArea()
            }

            HStack(spacing: 10) {
                Button("导出 PDF") {
                    appState.exportActivePreviewPDF()
                }
                .buttonStyle(.bordered)

                Button("退出全屏") {
                    appState.exitPreviewFullscreen()
                }
                .keyboardShortcut(.cancelAction)
                .buttonStyle(.borderedProminent)
            }
            .padding(20)
        }
    }
}
