import SwiftUI

struct DocumentListView: View {
    @Bindable var appState: AppState
    @State private var renameTarget: FileNode?
    @State private var renameText = ""
    @State private var deleteTarget: FileNode?

    var body: some View {
        VStack(spacing: 0) {
            if showsHeader {
                header
                Divider()
            }
            content
        }
        .sheet(item: $renameTarget) { node in
            RenameDocumentSheet(
                fileName: $renameText,
                node: node,
                onCancel: {
                    renameTarget = nil
                },
                onConfirm: {
                    appState.renameDocument(node, to: renameText)
                    renameTarget = nil
                }
            )
        }
        .alert(
            "确认删除文件？",
            isPresented: Binding(
                get: { deleteTarget != nil },
                set: { newValue in
                    if !newValue {
                        deleteTarget = nil
                    }
                }
            ),
            presenting: deleteTarget
        ) { node in
            Button("删除", role: .destructive) {
                appState.deleteDocument(node)
                deleteTarget = nil
            }
            Button("取消", role: .cancel) {
                deleteTarget = nil
            }
        } message: { node in
            Text("“\(node.name)” 会从真实目录中删除，此操作不可撤销。")
        }
    }

    private var showsHeader: Bool {
        appState.rootURL != nil
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let selectedFolder = appState.selectedFolder {
                Text(selectedFolder.name)
                    .font(.headline)
                    .lineLimit(1)

                Text(appState.searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "当前目录中的文档" : "搜索结果")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else if appState.rootURL != nil {
                Text("文件")
                    .font(.headline)
                Text("先在左侧选择一个目录。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                Text("文件")
                    .font(.headline)
                Text("选择目录后，这里显示文件列表。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
    }

    @ViewBuilder
    private var content: some View {
        if appState.rootURL == nil {
            Color.clear
        } else if appState.selectedFolder == nil && appState.searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            Color.clear
        } else if appState.visibleDocuments.isEmpty {
            Color.clear
        } else {
            List(selection: activeDocumentSelection) {
                ForEach(appState.visibleDocuments) { node in
                    DocumentRow(node: node, isActive: appState.isActive(node))
                        .tag(node.id)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            appState.openNode(node)
                        }
                        .contextMenu {
                            Button("重命名") {
                                renameText = node.name
                                renameTarget = node
                            }
                            Button("删除", role: .destructive) {
                                deleteTarget = node
                            }
                            Divider()
                            Button("复制文件名称") { appState.copyName(for: node) }
                            Button("在 Finder 中显示") { appState.showInFinder(node) }
                            Button("用默认应用打开") { appState.openWithDefaultApp(node) }
                        }
                }
            }
            .listStyle(.inset(alternatesRowBackgrounds: false))
            .scrollContentBackground(.hidden)
        }
    }

    private var activeDocumentSelection: Binding<String?> {
        Binding(
            get: { appState.activeTabPath },
            set: { path in
                guard
                    let path,
                    let node = appState.visibleDocuments.first(where: { $0.id == path })
                else { return }
                appState.openNode(node)
            }
        )
    }
}

private struct RenameDocumentSheet: View {
    @Binding var fileName: String
    let node: FileNode
    let onCancel: () -> Void
    let onConfirm: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("重命名文件")
                .font(.title3.weight(.semibold))

            VStack(alignment: .leading, spacing: 8) {
                Text("新文件名")
                    .font(.headline)
                TextField("", text: $fileName)
                    .textFieldStyle(.roundedBorder)
                Text("可直接修改完整文件名；如果不写扩展名，会保留原扩展名。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            HStack {
                Spacer()
                Button("取消", action: onCancel)
                Button("保存", action: onConfirm)
                    .keyboardShortcut(.defaultAction)
                    .disabled(fileName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
        }
        .padding(24)
        .frame(width: 420, height: 180)
    }
}

private struct DocumentRow: View {
    let node: FileNode
    let isActive: Bool

    private var displayName: String {
        node.url.deletingPathExtension().lastPathComponent
    }

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(displayName)
                    .font(.system(size: 13, weight: isActive ? .semibold : .regular))
                    .foregroundStyle(.primary)
                    .lineLimit(2)

                Text(node.kind == .markdown ? "Markdown" : "HTML")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)
        }
        .padding(.vertical, 4)
    }
}
