import Foundation

struct Persistence {
    private let fileManager = FileManager.default

    func load() -> PersistedState {
        guard
            let data = try? Data(contentsOf: stateURL()),
            let state = try? JSONDecoder().decode(PersistedState.self, from: data)
        else {
            return PersistedState(
                rootPath: nil,
                selectedFolderPath: nil,
                expandedPaths: [],
                openTabPaths: [],
                activeTabPath: nil,
                favoritePaths: [],
                recentDocumentPaths: [],
                preferences: AppPreferences()
            )
        }

        return state
    }

    func save(_ state: PersistedState) {
        do {
            let directory = try supportDirectory()
            if !fileManager.fileExists(atPath: directory.path) {
                try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
            }

            let data = try JSONEncoder().encode(state)
            try data.write(to: stateURL(), options: .atomic)
        } catch {
            NSLog("Failed to persist app state: \(error.localizedDescription)")
        }
    }

    private func supportDirectory() throws -> URL {
        let base = try fileManager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        return base.appendingPathComponent("LocalDocBrowser", isDirectory: true)
    }

    private func stateURL() -> URL {
        let base = (try? supportDirectory()) ?? URL(fileURLWithPath: NSTemporaryDirectory())
        return base.appendingPathComponent("state.json")
    }
}
