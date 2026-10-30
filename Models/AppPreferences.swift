import Foundation

struct ThemeColorData: Codable, Equatable {
    var red: Double
    var green: Double
    var blue: Double
    var alpha: Double

    static let `default` = ThemeColorData(red: 1.0, green: 0.73, blue: 0.11, alpha: 1.0)
}

struct AppPreferences: Codable, Equatable {
    var showHiddenFiles = false
    var ignoredNames = [".git", "node_modules", ".DS_Store", ".build", "dist"]
    var themeColor = ThemeColorData.default
    var windowOpacity = 0.94
    var usesCustomAppearance = false

    private enum CodingKeys: String, CodingKey {
        case showHiddenFiles
        case ignoredNames
        case themeColor
        case windowOpacity
        case usesCustomAppearance
    }

    init() {}

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        showHiddenFiles = try container.decodeIfPresent(Bool.self, forKey: .showHiddenFiles) ?? false
        ignoredNames = try container.decodeIfPresent([String].self, forKey: .ignoredNames) ?? [".git", "node_modules", ".DS_Store", ".build", "dist"]
        themeColor = try container.decodeIfPresent(ThemeColorData.self, forKey: .themeColor) ?? .default
        windowOpacity = try container.decodeIfPresent(Double.self, forKey: .windowOpacity) ?? 0.94
        usesCustomAppearance = try container.decodeIfPresent(Bool.self, forKey: .usesCustomAppearance) ?? false
    }
}

struct PersistedState: Codable {
    var rootPath: String?
    var selectedFolderPath: String?
    var expandedPaths: [String]
    var openTabPaths: [String]
    var activeTabPath: String?
    var favoritePaths: [String]
    var recentDocumentPaths: [String]
    var preferences: AppPreferences
}
