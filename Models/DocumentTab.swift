import Foundation

struct DocumentTab: Identifiable, Hashable, Codable {
    let path: String
    let kind: FileNodeKind
    let title: String

    var id: String { path }
    var url: URL { URL(fileURLWithPath: path) }

    init(url: URL, kind: FileNodeKind) {
        self.path = url.path
        self.kind = kind
        self.title = url.lastPathComponent
    }
}
