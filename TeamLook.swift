import SwiftUI
import UIKit
import PhotosUI

// MARK: - Aspetto della squadra: tema colori e logo (uguale alla web app)

struct TeamTheme: Identifiable, Hashable {
    let id: String
    let name: String
    let c1: String
    let c2: String

    static let all: [TeamTheme] = [
        TeamTheme(id: "classico", name: "CoachMate", c1: "#0A173D", c2: "#1F6BFA"),
        TeamTheme(id: "notte", name: "Blu notte", c1: "#050B24", c2: "#2B4BC9"),
        TeamTheme(id: "cielo", name: "Azzurro", c1: "#0B3A5C", c2: "#0DC7F2"),
        TeamTheme(id: "rosso", name: "Rosso fuoco", c1: "#4A0810", c2: "#ED3845"),
        TeamTheme(id: "granata", name: "Granata", c1: "#2E0710", c2: "#9B2338"),
        TeamTheme(id: "arancio", name: "Arancio", c1: "#4A1E03", c2: "#FF8C1F"),
        TeamTheme(id: "verde", name: "Smeraldo", c1: "#043324", c2: "#1FB86E"),
        TeamTheme(id: "viola", name: "Viola", c1: "#220B4D", c2: "#8552FA"),
        TeamTheme(id: "rosa", name: "Rosa", c1: "#4D0828", c2: "#FA4278"),
        TeamTheme(id: "giallo", name: "Giallo-blu", c1: "#0A2466", c2: "#E8B10C"),
        TeamTheme(id: "oro", name: "Nero e oro", c1: "#0D0D0D", c2: "#B8922A"),
        TeamTheme(id: "grafite", name: "Grafite", c1: "#15171C", c2: "#5A6275")
    ]
}

enum Watermark: String, CaseIterable, Identifiable {
    case leggero, medio, forte
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
    var opacity: Double {
        switch self {
        case .leggero: return 0.12
        case .medio: return 0.22
        case .forte: return 0.36
        }
    }
}

extension Team {
    /// Colori della squadra (scuro, vivo) in esadecimale.
    var colorHex: (String, String) {
        if let c = colors, c.count == 2 { return (c[0], c[1]) }
        return (TeamTheme.all[0].c1, TeamTheme.all[0].c2)
    }
    var colorDark: Color { Color(hex: colorHex.0) }
    var colorBright: Color { Color(hex: colorHex.1) }
    var heroGradient: LinearGradient {
        LinearGradient(stops: [.init(color: colorDark, location: 0), .init(color: colorDark, location: 0.3), .init(color: colorBright, location: 1)],
                       startPoint: .topLeading, endPoint: .bottomTrailing)
    }
    var logoImage: UIImage? { logo.flatMap { UIImage(data: $0) } }
    var watermarkLevel: Watermark { Watermark(rawValue: watermark ?? "medio") ?? .medio }
    /// Centro e larghezza del logo in proporzione all'intestazione (come nella web app)
    var logoCX: Double { logoX ?? 0.78 }
    var logoCY: Double { logoY ?? 0.5 }
    var logoScale: Double { logoSize ?? 0.53 }
}

// MARK: Colori

enum ColorTools {
    static func hex(_ r: Double, _ g: Double, _ b: Double) -> String {
        func c(_ v: Double) -> Int { max(0, min(255, Int((v * 255).rounded()))) }
        return String(format: "#%02X%02X%02X", c(r), c(g), c(b))
    }

    static func hex(of color: Color) -> String {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        UIColor(color).getRed(&r, green: &g, blue: &b, alpha: &a)
        return hex(Double(r), Double(g), Double(b))
    }

    static func rgb(_ hex: String) -> (Double, Double, Double) {
        var s = hex
        if s.hasPrefix("#") { s.removeFirst() }
        let v = UInt64(s, radix: 16) ?? 0
        return (Double((v >> 16) & 0xFF) / 255, Double((v >> 8) & 0xFF) / 255, Double(v & 0xFF) / 255)
    }

    static func distance(_ a: String, _ b: String) -> Double {
        let x = rgb(a), y = rgb(b)
        let dr = (x.0 - y.0) * 255, dg = (x.1 - y.1) * 255, db = (x.2 - y.2) * 255
        return (dr * dr + dg * dg + db * db).squareRoot()
    }

    static func hsl(_ r: Double, _ g: Double, _ b: Double) -> (Double, Double, Double) {
        let mx = max(r, g, b), mn = min(r, g, b), l = (mx + mn) / 2
        if mx == mn { return (0, 0, l) }
        let d = mx - mn
        let s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
        var h: Double
        if mx == r { h = (g - b) / d + (g < b ? 6 : 0) } else if mx == g { h = (b - r) / d + 2 } else { h = (r - g) / d + 4 }
        return (h / 6, s, l)
    }

    static func hexFromHSL(_ h: Double, _ s: Double, _ l: Double) -> String {
        func f(_ n: Double) -> Double {
            let k = (n + h * 12).truncatingRemainder(dividingBy: 12)
            let a = s * min(l, 1 - l)
            return l - a * max(-1, min(k - 3, 9 - k, 1))
        }
        return hex(f(0), f(8), f(4))
    }

    /// Due colori armonici presi dal logo: uno scuro (sfondo) e uno vivo (accento). Stesso calcolo della web app.
    static func palette(from image: UIImage) -> [String] {
        let side = 48
        guard let cg = image.cgImage else { return ["#121418", "#5A6275"] }
        var px = [UInt8](repeating: 0, count: side * side * 4)
        let space = CGColorSpaceCreateDeviceRGB()
        let ok: Bool = px.withUnsafeMutableBytes { buf in
            guard let ctx = CGContext(data: buf.baseAddress, width: side, height: side, bitsPerComponent: 8, bytesPerRow: side * 4,
                                      space: space, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
            ctx.draw(cg, in: CGRect(x: 0, y: 0, width: side, height: side))
            return true
        }
        guard ok else { return ["#121418", "#5A6275"] }

        var w = [Double](repeating: 0, count: 12), sr = w, sg = w, sb = w
        var total = 0.0
        var i = 0
        while i < px.count {
            let a = Double(px[i + 3])
            if a >= 200 {
                let r = Double(px[i]) / 255, g = Double(px[i + 1]) / 255, b = Double(px[i + 2]) / 255
                let (h, s, l) = hsl(r, g, b)
                total += 1
                if s >= 0.28 && l >= 0.12 && l <= 0.9 {
                    let k = Int(h * 12) % 12
                    let wt = s * (1 - abs(l - 0.5))
                    w[k] += wt; sr[k] += r * wt; sg[k] += g * wt; sb[k] += b * wt
                }
            }
            i += 4
        }
        let ranked = (0..<12).filter { w[$0] > 0 }.sorted { w[$0] > w[$1] }
        guard let A = ranked.first, w[A] >= total * 0.01 else { return ["#121418", "#5A6275"] }
        func avg(_ k: Int) -> (Double, Double, Double) { (sr[k] / w[k], sg[k] / w[k], sb[k] / w[k]) }
        let B = ranked.first { k in min(abs(k - A), 12 - abs(k - A)) >= 2 && w[k] > w[A] * 0.18 }
        var dark = avg(A), bright = avg(A)
        if let B {
            let a = avg(A), b = avg(B)
            if hsl(a.0, a.1, a.2).2 <= hsl(b.0, b.1, b.2).2 { dark = a; bright = b } else { dark = b; bright = a }
        }
        let d = hsl(dark.0, dark.1, dark.2), br = hsl(bright.0, bright.1, bright.2)
        return [hexFromHSL(d.0, min(d.1, 0.8), min(d.2 * 0.45, 0.2)),
                hexFromHSL(br.0, max(br.1, 0.55), min(max(br.2, 0.45), 0.6))]
    }

    /// Ridimensiona il logo (max 360 px): PNG se ha trasparenze, altrimenti JPEG.
    static func processLogo(_ image: UIImage) -> Data? {
        let k = min(1, 360 / max(image.size.width, image.size.height))
        let size = CGSize(width: max(1, (image.size.width * k).rounded()), height: max(1, (image.size.height * k).rounded()))
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = false
        let out = UIGraphicsImageRenderer(size: size, format: format).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
        let hasAlpha: Bool = {
            guard let a = image.cgImage?.alphaInfo else { return false }
            return a != .none && a != .noneSkipLast && a != .noneSkipFirst
        }()
        return hasAlpha ? out.pngData() : out.jpegData(compressionQuality: 0.85)
    }
}

// MARK: Viste

/// Avatar della squadra: il logo su fondo bianco, oppure l'iniziale sui colori della squadra.
struct TeamAvatar: View {
    let team: Team
    var size: CGFloat = 40

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: size * 0.3, style: .continuous)
        Group {
            if let img = team.logoImage {
                Image(uiImage: img)
                    .resizable()
                    .scaledToFit()
                    .padding(size * 0.07)
                    .frame(width: size, height: size)
                    .background(Color.white, in: shape)
                    .shadow(color: .black.opacity(0.18), radius: 4, y: 2)
            } else {
                Text(String(team.name.prefix(1)).uppercased())
                    .font(.system(size: size * 0.45, weight: .heavy, design: .rounded))
                    .foregroundStyle(.white)
                    .frame(width: size, height: size)
                    .background(team.heroGradient, in: shape)
            }
        }
    }
}

/// Intestazione della squadra: identica in home e nell'anteprima di «Aspetto».
/// Con `onLogoMove` il logo si può trascinare.
struct TeamHeroCard: View {
    let team: Team
    var stats: [String] = ["–", "–", "–", "–"]
    var showPencil = false
    var onLogoMove: ((Double, Double) -> Void)? = nil
    @State private var dragStart: CGPoint? = nil

    init(team: Team, stats: [String] = ["–", "–", "–", "–"], showPencil: Bool = false, onLogoMove: ((Double, Double) -> Void)? = nil) {
        self.team = team
        self.stats = stats
        self.showPencil = showPencil
        self.onLogoMove = onLogoMove
    }

    private var editable: Bool { onLogoMove != nil && team.logo != nil }
    private let shape = RoundedRectangle(cornerRadius: 26, style: .continuous)

    var body: some View {
        content
            .allowsHitTesting(!editable)
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background { watermark }
            .background(team.heroGradient)
            .clipShape(shape)
            .shadow(color: team.colorBright.opacity(0.35), radius: 16, y: 8)
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("COACHMATE VOLLEYBALL")
                    .font(.caption.weight(.heavy))
                    .tracking(2)
                    .foregroundStyle(.white.opacity(0.75))
                Spacer()
                if showPencil {
                    Image(systemName: "pencil.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 12) {
                    if team.logo != nil { TeamAvatar(team: team, size: 52) }
                    Text(team.name.isEmpty ? "Squadra" : team.name)
                        .font(.system(size: 30, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
                if !team.championship.isEmpty {
                    Text(team.championship).font(.subheadline.weight(.medium)).foregroundStyle(.white.opacity(0.8))
                }
            }
            HStack(spacing: 6) {
                pill(team.system.rawValue, icon: "circle.grid.cross.fill")
                pill(team.useLibero ? "Libero" : "No libero", icon: "person.fill.checkmark")
                pill("\(team.players.count) \(team.playerWord)", icon: "person.2.fill")
            }
            if team.genderKind != nil || team.effectiveNet != nil {
                HStack(spacing: 6) {
                    if let g = team.genderKind {
                        pill(team.mixed?.name ?? g.title, icon: "figure.volleyball")
                    }
                    if let net = team.effectiveNet {
                        pill("Rete \(net)", icon: "ruler")
                    }
                }
            }
            HStack(spacing: 0) {
                stat(stats[0], "Vinte", Theme.green)
                Divider().frame(height: 34).overlay(Color.white.opacity(0.25))
                stat(stats[1], "Perse", Theme.pink)
                Divider().frame(height: 34).overlay(Color.white.opacity(0.25))
                stat(stats[2], "Punti", Theme.yellow)
                Divider().frame(height: 34).overlay(Color.white.opacity(0.25))
                stat(stats[3], "Partite", Theme.cyan)
            }
            .padding(.vertical, 10)
            .background(.white.opacity(0.1), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
    }

    private var watermark: some View {
        GeometryReader { g in
            if let img = team.logoImage {
                let w = g.size.width * team.logoScale
                Image(uiImage: img)
                    .resizable()
                    .scaledToFit()
                    .frame(width: w, height: w)
                    .rotationEffect(.degrees(-8))
                    .opacity(team.watermarkLevel.opacity)
                    .overlay {
                        if editable {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(.white.opacity(dragStart == nil ? 0.55 : 1), style: StrokeStyle(lineWidth: 2, dash: [6, 5]))
                                .padding(-4)
                        }
                    }
                    .contentShape(Rectangle())
                    .position(x: team.logoCX * g.size.width, y: team.logoCY * g.size.height)
                    .highPriorityGesture(
                        DragGesture(minimumDistance: 0)
                            .onChanged { v in
                                guard let move = onLogoMove else { return }
                                let start = dragStart ?? CGPoint(x: team.logoCX, y: team.logoCY)
                                if dragStart == nil { dragStart = start }
                                let nx = min(max(Double(start.x) + Double(v.translation.width / max(g.size.width, 1)), -0.2), 1.2)
                                let ny = min(max(Double(start.y) + Double(v.translation.height / max(g.size.height, 1)), -0.2), 1.2)
                                move((nx * 1000).rounded() / 1000, (ny * 1000).rounded() / 1000)
                            }
                            .onEnded { _ in dragStart = nil },
                        including: editable ? .all : .none)
            } else {
                Image(systemName: "volleyball.fill")
                    .font(.system(size: 150))
                    .foregroundStyle(.white.opacity(0.08))
                    .rotationEffect(.degrees(-18))
                    .position(x: g.size.width - 35, y: 55)
                    .allowsHitTesting(false)
            }
        }
    }

    private func pill(_ text: String, icon: String) -> some View {
        Label(text, systemImage: icon)
            .font(.caption.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(.white.opacity(0.15), in: Capsule())
    }

    private func stat(_ value: String, _ label: String, _ color: Color) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 24, weight: .heavy, design: .rounded).monospacedDigit())
                .foregroundStyle(.white)
            Text(label)
                .font(.caption2.weight(.bold))
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity)
    }
}

/// Sezione «Aspetto» della scheda squadra.
struct TeamLookSection: View {
    @Binding var team: Team
    @State private var pick: PhotosPickerItem? = nil
    /// Il logo si sposta solo dopo aver toccato «Modifica logo» (così scorrendo non lo muovi per sbaglio)
    @State private var editingLogo = false
    @State private var backup: (Double?, Double?, Double?) = (nil, nil, nil)

    init(team: Binding<Team>) {
        _team = team
    }

    private var logoMover: ((Double, Double) -> Void)? {
        guard editingLogo else { return nil }
        return { x, y in
            team.logoX = x
            team.logoY = y
        }
    }

    private func colorBinding(_ i: Int) -> Binding<Color> {
        Binding(get: { Color(hex: i == 0 ? team.colorHex.0 : team.colorHex.1) },
                set: { c in
                    var cs = [team.colorHex.0, team.colorHex.1]
                    cs[i] = ColorTools.hex(of: c)
                    team.colors = cs
                })
    }

    var body: some View {
        Section {
            // Anteprima (uguale alla home): il logo si trascina solo in modalità modifica
            TeamHeroCard(team: team, onLogoMove: logoMover)
            .listRowInsets(EdgeInsets(top: 12, leading: 12, bottom: 12, trailing: 12))
            .listRowBackground(Color.clear)

            if team.logo != nil {
                if editingLogo {
                    Text("☝️ Trascina il logo nell'anteprima per spostarlo e usa il cursore per la dimensione.")
                        .font(.caption).foregroundStyle(.secondary)
                    HStack {
                        Text("Dimensione logo")
                        Slider(value: Binding(get: { team.logoScale }, set: { team.logoSize = ($0 * 100).rounded() / 100 }), in: 0.2...1.2)
                    }
                    HStack(spacing: 8) {
                        Button {
                            withAnimation {
                                team.logoX = backup.0
                                team.logoY = backup.1
                                team.logoSize = backup.2
                                editingLogo = false
                            }
                        } label: { Label("Annulla", systemImage: "xmark") }
                        .buttonStyle(.bordered)
                        Button {
                            withAnimation {
                                team.logoX = nil
                                team.logoY = nil
                                team.logoSize = nil
                            }
                        } label: { Label("Originale", systemImage: "arrow.uturn.backward") }
                        .buttonStyle(.bordered)
                        Spacer()
                        Button {
                            withAnimation { editingLogo = false }
                        } label: { Label("Fine", systemImage: "checkmark").bold() }
                        .buttonStyle(.borderedProminent)
                        .tint(Theme.green)
                    }
                } else {
                    Button {
                        backup = (team.logoX, team.logoY, team.logoSize)
                        withAnimation { editingLogo = true }
                    } label: {
                        Label("Modifica logo (sposta e ridimensiona)", systemImage: "pencil")
                    }
                }
            }

            // Temi pronti
            VStack(alignment: .leading, spacing: 8) {
                Text("Tema colori").font(.subheadline.weight(.bold))
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 4), spacing: 8) {
                    ForEach(TeamTheme.all) { th in
                        let on = ColorTools.distance(th.c1, team.colorHex.0) < 1 && ColorTools.distance(th.c2, team.colorHex.1) < 1
                        Button {
                            withAnimation { team.colors = [th.c1, th.c2] }
                        } label: {
                            Text(th.name)
                                .font(.system(size: 10, weight: .heavy))
                                .foregroundStyle(.white)
                                .shadow(color: .black.opacity(0.5), radius: 1, y: 1)
                                .lineLimit(1).minimumScaleFactor(0.7)
                                .padding(.horizontal, 6).padding(.bottom, 4)
                                .frame(maxWidth: .infinity, minHeight: 46, alignment: .bottomLeading)
                                .background(LinearGradient(stops: [.init(color: Color(hex: th.c1), location: 0), .init(color: Color(hex: th.c1), location: 0.35),
                                                                   .init(color: Color(hex: th.c2), location: 1)],
                                                           startPoint: .topLeading, endPoint: .bottomTrailing),
                                            in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .stroke(on ? Color.primary : Color.white.opacity(0.15), lineWidth: on ? 3 : 1))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(th.name)
                    }
                }
            }
            .padding(.vertical, 4)

            HStack {
                Text("Colori personalizzati")
                Spacer()
                ColorPicker("Scuro", selection: colorBinding(0), supportsOpacity: false).labelsHidden()
                ColorPicker("Vivo", selection: colorBinding(1), supportsOpacity: false).labelsHidden()
            }

            // Logo
            PhotosPicker(selection: $pick, matching: .images) {
                HStack(spacing: 12) {
                    if let img = team.logoImage {
                        Image(uiImage: img).resizable().scaledToFit()
                            .frame(width: 40, height: 40)
                            .background(Color.white, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    } else {
                        Image(systemName: "photo.badge.plus").font(.title3)
                    }
                    Text(team.logo == nil ? "Aggiungi il logo della squadra" : "Cambia logo")
                }
            }
            .onChange(of: pick) { _, item in
                guard let item else { return }
                Task { @MainActor in
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let img = UIImage(data: data),
                       let logo = ColorTools.processLogo(img) {
                        team.logo = logo
                        if team.colors == nil, let small = UIImage(data: logo) { team.colors = ColorTools.palette(from: small) }
                    }
                    pick = nil
                }
            }

            if let img = team.logoImage {
                Button {
                    withAnimation { team.colors = ColorTools.palette(from: img) }
                } label: {
                    Label("Usa i colori del logo", systemImage: "wand.and.stars")
                }
                Picker("Logo sullo sfondo", selection: Binding(get: { team.watermarkLevel }, set: { team.watermark = $0.rawValue })) {
                    ForEach(Watermark.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                Button(role: .destructive) {
                    withAnimation {
                        team.logo = nil
                        editingLogo = false
                    }
                } label: {
                    Label("Togli il logo", systemImage: "xmark.circle")
                }
            }

            if team.colors != nil || team.logo != nil {
                Button(role: .destructive) {
                    withAnimation {
                        editingLogo = false
                        team.colors = nil
                        team.logo = nil
                        team.watermark = nil
                        team.logoX = nil
                        team.logoY = nil
                        team.logoSize = nil
                    }
                } label: {
                    Label("Torna all'aspetto originale", systemImage: "arrow.uturn.backward")
                }
            }
        } header: {
            Text("Aspetto")
        } footer: {
            Text(team.logo != nil
                 ? "Il logo compare in trasparenza nella home, accanto al nome della squadra e nel segnapunti. Con «Leggero / Medio / Forte» scegli quanto si vede. Meglio un PNG con sfondo trasparente."
                 : "Il tema colora la home, l'elenco squadre e il tabellone del segnapunti; il resto dell'app resta neutro per leggere bene campo e lavagna. Aggiungi il logo (meglio PNG con sfondo trasparente): l'app propone da sola i colori giusti.")
        }
    }
}
