import SwiftUI

struct SidebarView: View {
    @Bindable var appState: AppState
    @State private var showingPreferences = false
    @State private var ignoredNamesText = ""
    @State private var showHiddenFiles = false
    @State private var themeColor = Color.accentColor
    @State private var windowOpacity = 0.94

    var body: some View {
        VStack(spacing: 0) {
            if appState.rootURL != nil {
                header
                Divider()
            }
            content
        }
        .sheet(isPresented: $showingPreferences) {
            PreferencesSheet(
                showHiddenFiles: $showHiddenFiles,
                ignoredNamesText: $ignoredNamesText,
                themeColor: $themeColor,
                windowOpacity: $windowOpacity,
                onConfirm: {
                    appState.updatePreferences(showHiddenFiles: showHiddenFiles, ignoredNamesText: ignoredNamesText)
                    appState.updateAppearance(themeColor: themeColorData(from: themeColor), windowOpacity: windowOpacity)
                    showingPreferences = false
                }
            )
            .frame(width: 460)
            .onAppear {
                showHiddenFiles = appState.preferences.showHiddenFiles
                ignoredNamesText = appState.preferences.ignoredNames.joined(separator: ", ")
                themeColor = appState.accentColor
                windowOpacity = appState.windowOpacity
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(appState.rootDisplayName)
                        .font(.system(size: 16, weight: .semibold))
                        .lineLimit(1)
                    if let path = appState.rootURL?.path {
                        Text(path)
                            .font(.system(size: 12))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                Button {
                    showingPreferences = true
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
                .buttonStyle(.borderless)
            }

            TextField("搜索文件名、目录名或内容", text: $appState.searchText)
                .textFieldStyle(.roundedBorder)
        }
        .padding(16)
    }

    @ViewBuilder
    private var content: some View {
        if appState.rootURL == nil || appState.rootFolders.isEmpty {
            Color.clear
        } else {
            List {
                Section("目录") {
                    ForEach(Array(appState.rootFolders.enumerated()), id: \.element.id) { index, node in
                        DirectoryRow(
                            appState: appState,
                            node: node,
                            level: 0,
                            ancestryHasVertical: [],
                            isLastSibling: index == appState.rootFolders.count - 1
                        )
                    }
                }
            }
            .listStyle(.sidebar)
            .scrollContentBackground(.hidden)
        }
    }

    private func themeColorData(from color: Color) -> ThemeColorData {
        let nsColor = NSColor(color)
        let converted = nsColor.usingColorSpace(.sRGB) ?? .systemOrange
        return ThemeColorData(
            red: Double(converted.redComponent),
            green: Double(converted.greenComponent),
            blue: Double(converted.blueComponent),
            alpha: Double(converted.alphaComponent)
        )
    }
}

private struct DirectoryRow: View {
    @Bindable var appState: AppState
    let node: FileNode
    let level: Int
    let ancestryHasVertical: [Bool]
    let isLastSibling: Bool

    private var isSelected: Bool {
        appState.selectedFolderPath == node.id
    }

    private var showsActiveDot: Bool {
        isSelected || appState.containsActiveDocument(node)
    }

    private var childDirectories: [FileNode] {
        node.children.filter(\.isDirectory)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                TreeConnectorView(
                    ancestryHasVertical: ancestryHasVertical,
                    showsCurrentBranch: level > 0,
                    isLastSibling: isLastSibling
                )

                Button {
                    appState.setExpanded(!appState.isExpanded(node), for: node)
                } label: {
                    Image(systemName: appState.isExpanded(node) ? "folder.fill.badge.minus" : "folder")
                        .font(.system(size: 12, weight: .regular))
                        .foregroundStyle(.secondary)
                        .frame(width: 15, height: 15)
                }
                .buttonStyle(.plain)

                Button {
                    appState.selectFolder(node)
                } label: {
                    HStack(spacing: 8) {
                        Text(node.name)
                            .lineLimit(1)
                            .font(.system(size: 13))
                            .foregroundStyle(.primary)
                        Spacer(minLength: 8)
                        if showsActiveDot {
                            Circle()
                                .fill(appState.accentColor)
                                .frame(width: 6, height: 6)
                        } else {
                            Text("\(node.documentCount)")
                                .font(.system(size: 12))
                                .foregroundStyle(.secondary)
                        }
                    }
                    .frame(minHeight: 20)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 1)
                    .background(
                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                            .fill(isSelected ? Color.accentColor.opacity(0.16) : Color.clear)
                    )
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            .padding(.vertical, 1)

            if appState.isExpanded(node) {
                ForEach(Array(childDirectories.enumerated()), id: \.element.id) { index, child in
                    DirectoryRow(
                        appState: appState,
                        node: child,
                        level: level + 1,
                        ancestryHasVertical: ancestryHasVertical + [!isLastSibling],
                        isLastSibling: index == childDirectories.count - 1
                    )
                }
            }
        }
        .contextMenu {
            Button("复制文件夹名称") { appState.copyName(for: node) }
            Button("在 Finder 中显示") { appState.showInFinder(node) }
            Button("设为当前根目录") { appState.setRootDirectoryFromNode(node) }
        }
        .listRowBackground(Color.clear)
    }
}

private struct TreeConnectorView: View {
    let ancestryHasVertical: [Bool]
    let showsCurrentBranch: Bool
    let isLastSibling: Bool

    private let columnWidth: CGFloat = 12
    private let lineColor = Color.secondary.opacity(0.18)

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(ancestryHasVertical.enumerated()), id: \.offset) { _, hasLine in
                connectorColumn(showsVertical: hasLine)
            }

            if showsCurrentBranch {
                currentBranchColumn
            }
        }
        .frame(height: 20)
    }

    private func connectorColumn(showsVertical: Bool) -> some View {
        ZStack {
            if showsVertical {
                Path { path in
                    path.move(to: CGPoint(x: columnWidth / 2, y: 0))
                    path.addLine(to: CGPoint(x: columnWidth / 2, y: 20))
                }
                .stroke(lineColor, lineWidth: 1)
            }
        }
        .frame(width: columnWidth, height: 20)
    }

    private var currentBranchColumn: some View {
        ZStack {
            Path { path in
                let midX = columnWidth / 2
                let midY: CGFloat = 10
                path.move(to: CGPoint(x: midX, y: 0))
                path.addLine(to: CGPoint(x: midX, y: isLastSibling ? midY : 20))
                path.move(to: CGPoint(x: midX, y: midY))
                path.addLine(to: CGPoint(x: columnWidth, y: midY))
            }
            .stroke(lineColor, lineWidth: 1)
        }
        .frame(width: columnWidth, height: 20)
    }
}

private struct PreferencesSheet: View {
    @Binding var showHiddenFiles: Bool
    @Binding var ignoredNamesText: String
    @Binding var themeColor: Color
    @Binding var windowOpacity: Double
    let onConfirm: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("外观与扫描设置")
                .font(.title3.weight(.semibold))

            VStack(alignment: .leading, spacing: 10) {
                Text("主题色")
                    .font(.headline)
                ColorPicker("选择强调色", selection: $themeColor, supportsOpacity: false)
                Text("主题色仅影响选中态和强调按钮。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("界面通透感")
                        .font(.headline)
                    Spacer()
                    Text("\(Int(windowOpacity * 100))%")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.secondary)
                }
                Slider(value: $windowOpacity, in: 0.65...1.0, step: 0.01)
                Text("控制材料观感，不会把整个窗口打穿。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Toggle("显示隐藏文件", isOn: $showHiddenFiles)

            VStack(alignment: .leading, spacing: 8) {
                Text("忽略目录或文件名")
                    .font(.headline)
                Text("使用英文逗号分隔，例如：`.git, node_modules, dist`")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextField(".git, node_modules, dist", text: $ignoredNamesText, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(3...5)
            }

            Spacer()

            HStack {
                Spacer()
                Button("取消") { dismiss() }
                Button("保存", action: onConfirm)
                    .keyboardShortcut(.defaultAction)
            }
        }
        .padding(24)
    }
}
