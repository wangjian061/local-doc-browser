import AppKit
import Foundation

@MainActor
enum FolderPicker {
    static func pickFolder(startingAt currentURL: URL?) -> URL? {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.prompt = "选择目录"
        panel.message = "选择需要浏览的本地文档根目录"
        panel.directoryURL = currentURL
        return panel.runModal() == .OK ? panel.url : nil
    }
}
