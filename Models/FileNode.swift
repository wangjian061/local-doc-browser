import Foundation

enum FileNodeKind: String, Codable {
    case folder
    case html
    case markdown
}

struct FileNode: Identifiable, Hashable {
    let url: URL
    let rootURL: URL
    let kind: FileNodeKind
    let children: [FileNode]

    var id: String { url.path }
    var name: String { url.lastPathComponent.isEmpty ? url.path : url.lastPathComponent }
    var isDirectory: Bool { kind == .folder }
    var relativePath: String {
        let path = url.path
        let root = rootURL.path
        guard path != root else { return name }
        return String(path.dropFirst(root.count + 1))
    }

    var documentCount: Int {
        if !isDirectory { return 1 }
        return children.reduce(0) { $0 + $1.documentCount }
    }
}
