// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "LocalDocBrowser",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "LocalDocBrowser", targets: ["LocalDocBrowser"])
    ],
    dependencies: [
        .package(url: "https://github.com/stackotter/Down-gfm", from: "0.12.0")
    ],
    targets: [
        .executableTarget(
            name: "LocalDocBrowser",
            dependencies: [
                .product(name: "Down", package: "Down-gfm")
            ],
            path: ".",
            exclude: [
                ".codex",
                ".git",
                "Resources",
                "dist",
                "script",
                "desktop",
                "PRODUCT.md",
                "DESIGN.md",
                "README.md"
            ]
        )
    ]
)
