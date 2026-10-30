import SwiftUI

struct FileTreeRow: View {
    @Bindable var appState: AppState
    let node: FileNode
    let level: Int

    var body: some View {
        if node.isDirectory {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 0) {
                    Button {
                        appState.setExpanded(!appState.isExpanded(node), for: node)
                    } label: {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 9, weight: .semibold))
                            .foregroundStyle(Color(nsColor: .secondaryLabelColor))
                            .rotationEffect(.degrees(appState.isExpanded(node) ? 90 : 0))
                            .frame(width: 16, height: 16)
                    }
                    .buttonStyle(.plain)

                    Button {
                        appState.setExpanded(!appState.isExpanded(node), for: node)
                    } label: {
                        rowLabel
                    }
                    .buttonStyle(.plain)
                }
                .padding(.leading, CGFloat(level) * 12)
                .contextMenu {
                    Button("复制文件夹名称") { appState.copyName(for: node) }
                    Button("在 Finder 中显示") { appState.showInFinder(node) }
                    Button("设为当前根目录") { appState.setRootDirectoryFromNode(node) }
                    Divider()
                    Button("取消") {}
                }

                if appState.isExpanded(node) {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(node.children) { child in
                            FileTreeRow(appState: appState, node: child, level: level + 1)
                        }
                    }
                }
            }
        } else {
            Button {
                appState.openNode(node)
            } label: {
                HStack(spacing: 0) {
                    Color.clear.frame(width: CGFloat(level) * 12 + 16)
                    rowLabel
                }
            }
            .buttonStyle(.plain)
            .contextMenu {
                Button("复制文件名称") { appState.copyName(for: node) }
                Button("在 Finder 中显示") { appState.showInFinder(node) }
                Button("用默认应用打开") { appState.openWithDefaultApp(node) }
                Divider()
                Button("取消") {}
            }
        }
    }

    private var rowLabel: some View {
        HStack(spacing: 0) {
            iconView

            Text(node.name)
                .lineLimit(1)
                .font(node.isDirectory ? .system(size: 13, weight: .medium) : .system(size: 13, weight: .regular))
                .foregroundStyle(labelColor)
                .padding(.leading, 6)

            Spacer(minLength: 8)

            if node.isDirectory {
                Text("\(node.documentCount)")
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(countColor)
            }
        }
        .frame(height: 31)
        .padding(.horizontal, 10)
        .background(rowBackground, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
        .contentShape(Rectangle())
    }

    private var iconView: some View {
        Group {
            switch node.kind {
            case .folder:
                Image(systemName: "folder")
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(labelColor)
            case .html:
                Image(systemName: "globe")
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(labelColor)
            case .markdown:
                Image(systemName: "doc.text")
                    .symbolRenderingMode(.hierarchical)
                    .foregroundStyle(labelColor)
            }
        }
        .frame(width: 18, height: 18)
    }

    private var labelColor: Color {
        if appState.isActive(node) {
            return .white
        }

        return node.isDirectory ? Color(nsColor: .labelColor) : Color(nsColor: .secondaryLabelColor)
    }

    private var countColor: Color {
        appState.isActive(node) ? .white.opacity(0.9) : Color(nsColor: .tertiaryLabelColor)
    }

    private var rowBackground: some ShapeStyle {
        if appState.isActive(node) {
            return AnyShapeStyle(appState.accentColor)
        }

        return AnyShapeStyle(Color.white.opacity(0.001))
    }
}
