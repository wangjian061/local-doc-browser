import SwiftUI
import UniformTypeIdentifiers

struct DocumentTabsView: View {
    @Bindable var appState: AppState
    @State private var draggedTabPath: String?

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(appState.openTabs) { tab in
                    TabChip(
                        tab: tab,
                        isActive: appState.activeTabPath == tab.path,
                        onActivate: { appState.activateTab(tab) },
                        onClose: { appState.closeTab(tab) },
                        onMoveLeft: { appState.moveTabLeft(tab) },
                        onMoveRight: { appState.moveTabRight(tab) },
                        onCloseOthers: { appState.closeOtherTabs(keeping: tab) },
                        onCloseLeft: { appState.closeTabsToLeft(of: tab) },
                        onCloseRight: { appState.closeTabsToRight(of: tab) },
                        onCloseAll: { appState.closeAllTabs() }
                    )
                    .onDrag {
                        draggedTabPath = tab.path
                        return NSItemProvider(object: tab.path as NSString)
                    }
                    .onDrop(of: [UTType.text], delegate: TabDropDelegate(
                        targetTab: tab,
                        draggedTabPath: $draggedTabPath,
                        appState: appState
                    ))
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
        }
        .background(Color(nsColor: .controlBackgroundColor))
        .contextMenu {
            Button("关闭当前标签页") { appState.closeActiveTab() }
                .disabled(appState.activeTab == nil)
            Button("关闭全部标签页") { appState.closeAllTabs() }
                .disabled(appState.openTabs.isEmpty)
        }
    }
}

private struct TabChip: View {
    let tab: DocumentTab
    let isActive: Bool
    let onActivate: () -> Void
    let onClose: () -> Void
    let onMoveLeft: () -> Void
    let onMoveRight: () -> Void
    let onCloseOthers: () -> Void
    let onCloseLeft: () -> Void
    let onCloseRight: () -> Void
    let onCloseAll: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Button(action: onActivate) {
                HStack(spacing: 8) {
                    Image(systemName: tab.kind == .markdown ? "text.document.fill" : "globe")
                        .foregroundStyle(tab.kind == .markdown ? Color(nsColor: .systemGreen) : Color(nsColor: .systemBlue))
                    Text(tab.title)
                        .lineLimit(1)
                }
                .padding(.leading, 10)
                .padding(.vertical, 8)
            }
            .buttonStyle(.plain)

            Button(action: onClose) {
                Image(systemName: "xmark")
                    .font(.caption2.weight(.bold))
                    .padding(8)
            }
            .buttonStyle(.plain)
        }
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(isActive ? Color(nsColor: .selectedControlColor).opacity(0.16) : Color(nsColor: .windowBackgroundColor))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(isActive ? Color.accentColor.opacity(0.35) : Color.secondary.opacity(0.16), lineWidth: 1)
        )
        .contextMenu {
            Button("关闭") { onClose() }
            Button("关闭其他标签页") { onCloseOthers() }
            Button("关闭左侧标签页") { onCloseLeft() }
            Button("关闭右侧标签页") { onCloseRight() }
            Button("关闭全部标签页") { onCloseAll() }
            Divider()
            Button("左移") { onMoveLeft() }
            Button("右移") { onMoveRight() }
        }
    }
}

private struct TabDropDelegate: DropDelegate {
    let targetTab: DocumentTab
    @Binding var draggedTabPath: String?
    let appState: AppState

    func dropEntered(info: DropInfo) {
        guard
            let draggedTabPath,
            let draggedTab = appState.openTabs.first(where: { $0.path == draggedTabPath })
        else { return }

        appState.moveTab(draggedTab, before: targetTab)
    }

    func performDrop(info: DropInfo) -> Bool {
        draggedTabPath = nil
        return true
    }

    func dropUpdated(info: DropInfo) -> DropProposal? {
        DropProposal(operation: .move)
    }
}
