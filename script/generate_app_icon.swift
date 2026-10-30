import AppKit
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let resourcesURL = root.appendingPathComponent("Resources", isDirectory: true)
let iconsetURL = resourcesURL.appendingPathComponent("AppIcon.iconset", isDirectory: true)

try? FileManager.default.removeItem(at: iconsetURL)
try FileManager.default.createDirectory(at: iconsetURL, withIntermediateDirectories: true)

let mappings: [(Int, String)] = [
    (16, "icon_16x16.png"),
    (32, "icon_16x16@2x.png"),
    (32, "icon_32x32.png"),
    (64, "icon_32x32@2x.png"),
    (128, "icon_128x128.png"),
    (256, "icon_128x128@2x.png"),
    (256, "icon_256x256.png"),
    (512, "icon_256x256@2x.png"),
    (512, "icon_512x512.png"),
    (1024, "icon_512x512@2x.png")
]

for (size, name) in mappings {
    let image = drawIcon(size: CGFloat(size))
    let target = iconsetURL.appendingPathComponent(name)
    try writePNG(image: image, to: target)
}

func drawIcon(size: CGFloat) -> NSImage {
    let image = NSImage(size: NSSize(width: size, height: size))
    image.lockFocus()

    let rect = NSRect(x: 0, y: 0, width: size, height: size)
    NSColor.clear.setFill()
    rect.fill()

    let corner = size * 0.225
    let outerPath = NSBezierPath(
        roundedRect: rect.insetBy(dx: size * 0.03, dy: size * 0.03),
        xRadius: corner,
        yRadius: corner
    )

    let background = NSColor(calibratedWhite: 0.06, alpha: 1.0)
    background.setFill()
    outerPath.fill()

    NSColor(calibratedWhite: 1.0, alpha: 0.10).setStroke()
    outerPath.lineWidth = max(1, size * 0.008)
    outerPath.stroke()

    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.16)
    shadow.shadowBlurRadius = size * 0.035
    shadow.shadowOffset = NSSize(width: 0, height: -size * 0.012)
    shadow.set()

    drawAbstractMark(in: rect, size: size)

    image.unlockFocus()
    return image
}

func drawAbstractMark(in rect: NSRect, size: CGFloat) {
    let markColor = NSColor(calibratedWhite: 1.0, alpha: 0.97)
    let accentColor = NSColor(calibratedRed: 0.20, green: 0.83, blue: 0.49, alpha: 1.0)

    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.22)
    shadow.shadowBlurRadius = size * 0.028
    shadow.shadowOffset = NSSize(width: 0, height: -size * 0.008)
    shadow.set()

    let backCard = NSRect(
        x: rect.midX - size * 0.20,
        y: rect.midY - size * 0.12,
        width: size * 0.28,
        height: size * 0.34
    )
    let frontCard = NSRect(
        x: rect.midX - size * 0.03,
        y: rect.midY - size * 0.19,
        width: size * 0.28,
        height: size * 0.34
    )

    drawCard(backCard, size: size, stroke: markColor, fill: .clear, lineWidth: size * 0.028)
    drawCard(frontCard, size: size, stroke: markColor, fill: markColor, lineWidth: size * 0.028)

    let seamRect = NSRect(
        x: frontCard.minX + size * 0.06,
        y: frontCard.minY + size * 0.065,
        width: size * 0.022,
        height: frontCard.height - size * 0.13
    )
    let seamPath = NSBezierPath(
        roundedRect: seamRect,
        xRadius: seamRect.width / 2,
        yRadius: seamRect.width / 2
    )
    NSColor(calibratedWhite: 0.06, alpha: 1.0).setFill()
    seamPath.fill()

    for index in 0..<3 {
        let lineRect = NSRect(
            x: frontCard.minX + size * 0.11,
            y: frontCard.maxY - size * (0.105 + CGFloat(index) * 0.06),
            width: size * (index == 0 ? 0.11 : 0.09),
            height: size * 0.018
        )
        let linePath = NSBezierPath(
            roundedRect: lineRect,
            xRadius: lineRect.height / 2,
            yRadius: lineRect.height / 2
        )
        NSColor(calibratedWhite: 0.06, alpha: 0.92).setFill()
        linePath.fill()
    }

    let dotRect = NSRect(
        x: frontCard.maxX - size * 0.03,
        y: frontCard.minY - size * 0.02,
        width: size * 0.085,
        height: size * 0.085
    )
    let dotPath = NSBezierPath(ovalIn: dotRect)
    accentColor.setFill()
    dotPath.fill()
}

func drawCard(_ rect: NSRect, size: CGFloat, stroke: NSColor, fill: NSColor, lineWidth: CGFloat) {
    let path = NSBezierPath(
        roundedRect: rect,
        xRadius: size * 0.075,
        yRadius: size * 0.075
    )
    fill.setFill()
    path.fill()
    stroke.setStroke()
    path.lineWidth = max(2, lineWidth)
    path.stroke()
}

func writePNG(image: NSImage, to url: URL) throws {
    guard
        let tiff = image.tiffRepresentation,
        let rep = NSBitmapImageRep(data: tiff),
        let data = rep.representation(using: .png, properties: [:])
    else {
        throw NSError(domain: "IconGeneration", code: 1)
    }

    try data.write(to: url)
}
