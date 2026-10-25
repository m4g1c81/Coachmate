import SwiftUI

// MARK: - Sesso dei giocatori (squadre miste)

enum Gender: String, CaseIterable, Identifiable, Hashable, Codable {
    case uomo = "M"
    case donna = "F"
    var id: String { rawValue }
    var label: String { self == .uomo ? "Uomo" : "Donna" }
    var short: String { self == .uomo ? "M" : "F" }
    var color: Color { self == .uomo ? Theme.blue : Theme.pink }
}

// MARK: - Regole delle squadre miste

/// Vincoli configurabili: ogni ente/comitato ha i suoi.
struct MixedRules: Hashable, Codable {
    var maxMen: Int = 4              // massimo uomini in campo
    var minWomen: Int = 2            // minimo donne in campo
    var maxMenFront: Int = 0         // massimo uomini in prima linea (0 = nessun limite)
    var noThreeMenInRow: Bool = false // vietati 3 uomini consecutivi nell'ordine di rotazione
    var alternate: Bool = false      // uomo e donna devono alternarsi
    var netHeight: String = "2,35 m"
    var name: String = "Misto 4+2"
    var note: String = ""

    /// CSEN in Volley – Amatori Misto 4+2 (regolamento nazionale 2025/2026, ultimo pubblicato).
    static let csen42 = MixedRules(
        maxMen: 4, minWomen: 2, maxMenFront: 0, noThreeMenInRow: false, alternate: false,
        netHeight: "2,35 m", name: "CSEN Misto 4+2",
        note: "Almeno 2 donne sempre in campo (massimo 4 uomini). Doppio libero ammesso: un libero donna può sostituire un uomo, un uomo non può sostituire una donna. Rete 2,35 m. Partite al meglio dei 3 set (25-25-15). Per il resto valgono le regole FIPAV.")
    static let misto33 = MixedRules(
        maxMen: 3, minWomen: 3, maxMenFront: 0, noThreeMenInRow: false, alternate: false,
        netHeight: "2,35 m", name: "Misto 3+3",
        note: "3 uomini e 3 donne in campo. Molti tornei chiedono anche l'alternanza uomo/donna o vietano 2 uomini su 3 in prima linea: attiva le opzioni se il tuo regolamento le prevede.")
    static let misto24 = MixedRules(
        maxMen: 2, minWomen: 4, maxMenFront: 0, noThreeMenInRow: false, alternate: false,
        netHeight: "2,35 m", name: "Misto 2+4",
        note: "Massimo 2 uomini in campo, almeno 4 donne.")

    var summary: String {
        var parts = ["max \(maxMen) uomini", "min \(minWomen) donne"]
        if maxMenFront > 0 { parts.append("max \(maxMenFront) uomini a rete") }
        if noThreeMenInRow { parts.append("no 3 uomini di fila") }
        if alternate { parts.append("alternanza M/F") }
        return parts.joined(separator: " · ")
    }
}

enum MixedCheck {
    /// Controlla una disposizione in campo: zona (1…6) → sesso. Le zone mancanti sono "sesso non indicato".
    static func violations(_ zones: [Int: Gender], rules: MixedRules) -> [String] {
        var out: [String] = []
        let men = zones.values.filter { $0 == .uomo }.count
        let women = zones.values.filter { $0 == .donna }.count
        let unknown = 6 - zones.count
        if men > rules.maxMen { out.append("Troppi uomini in campo: \(men) (massimo \(rules.maxMen)).") }
        if women + unknown < rules.minWomen { out.append("Poche donne in campo: \(women) (minimo \(rules.minWomen)).") }
        if rules.maxMenFront > 0 {
            let front = [2, 3, 4].filter { zones[$0] == .uomo }.count
            if front > rules.maxMenFront { out.append("Troppi uomini in prima linea: \(front) (massimo \(rules.maxMenFront)).") }
        }
        let order = [1, 2, 3, 4, 5, 6]
        let seq: [Gender?] = order.map { zones[$0] }
        if rules.noThreeMenInRow {
            for i in 0..<6 where seq[i] == .uomo && seq[(i + 1) % 6] == .uomo && seq[(i + 2) % 6] == .uomo {
                out.append("Tre uomini consecutivi (zone \(order[i]), \(order[(i + 1) % 6]), \(order[(i + 2) % 6])).")
                break
            }
        }
        if rules.alternate {
            for i in 0..<6 {
                if let a = seq[i], let b = seq[(i + 1) % 6], a == b {
                    out.append("Manca l'alternanza uomo/donna tra le zone \(order[i]) e \(order[(i + 1) % 6]).")
                    break
                }
            }
        }
        return out
    }

    /// Sesso di chi occupa ogni zona nella situazione data (libero incluso).
    static func zoneGenders(_ s: Situation, gender: (Role) -> Gender?) -> [Int: Gender] {
        var out: [Int: Gender] = [:]
        for (z, r) in Engine.courtMap(s) {
            if let g = gender(r) { out[z] = g }
        }
        return out
    }

    /// Controlla tutte le 6 rotazioni (in ricezione, con il libero se usato).
    static func checkAllRotations(system: GameSystem, useLibero: Bool, rules: MixedRules,
                                  gender: (Role) -> Gender?) -> [String] {
        var out: [String] = []
        var incomplete = false
        for r in Rotation.allCases {
            let s = Situation(system: system, phase: .ricezione, rotation: r, useLibero: useLibero)
            let zones = zoneGenders(s, gender: gender)
            if zones.count < 6 { incomplete = true }
            for v in violations(zones, rules: rules) { out.append("\(r.name): \(v)") }
        }
        if incomplete { out.insert("Indica il sesso di tutti i titolari (nella Rosa) per un controllo completo.", at: 0) }
        return out
    }
}

// MARK: - Statistiche partita

enum StatAction: String, CaseIterable, Identifiable, Hashable, Codable {
    case ace, serveIn, serveErr
    case rec3, rec2, rec1, recErr
    case attackPoint, attackIn, attackErr
    case blockPoint
    case error

    var id: String { rawValue }

    var title: String {
        switch self {
        case .ace: return "Ace"
        case .serveIn: return "Battuta in campo"
        case .serveErr: return "Errore battuta"
        case .rec3: return "Ricezione perfetta"
        case .rec2: return "Ricezione buona"
        case .rec1: return "Ricezione scarsa"
        case .recErr: return "Errore ricezione"
        case .attackPoint: return "Punto in attacco"
        case .attackIn: return "Attacco giocato"
        case .attackErr: return "Errore attacco"
        case .blockPoint: return "Muro punto"
        case .error: return "Altro errore"
        }
    }

    var short: String {
        switch self {
        case .ace: return "Ace"
        case .serveIn: return "In"
        case .serveErr: return "Err"
        case .rec3: return "#"
        case .rec2: return "+"
        case .rec1: return "–"
        case .recErr: return "Err"
        case .attackPoint: return "Punto"
        case .attackIn: return "In"
        case .attackErr: return "Err"
        case .blockPoint: return "Muro"
        case .error: return "Fallo"
        }
    }

    /// true = punto a noi, false = punto agli avversari, nil = nessun punto
    var pointForUs: Bool? {
        switch self {
        case .ace, .attackPoint, .blockPoint: return true
        case .serveErr, .recErr, .attackErr, .error: return false
        default: return nil
        }
    }
}

struct PlayerStats: Hashable, Codable {
    var counts: [String: Int] = [:]

    func n(_ a: StatAction) -> Int { counts[a.rawValue] ?? 0 }
    mutating func add(_ a: StatAction) { counts[a.rawValue, default: 0] += 1 }

    var serves: Int { n(.ace) + n(.serveIn) + n(.serveErr) }
    var receptions: Int { n(.rec3) + n(.rec2) + n(.rec1) + n(.recErr) }
    var attacks: Int { n(.attackPoint) + n(.attackIn) + n(.attackErr) }
    var points: Int { n(.ace) + n(.attackPoint) + n(.blockPoint) }
    var errors: Int { n(.serveErr) + n(.recErr) + n(.attackErr) + n(.error) }
    var isEmpty: Bool { counts.values.reduce(0, +) == 0 }

    /// Media ricezione da 0 a 3.
    var receptionAverage: Double? {
        guard receptions > 0 else { return nil }
        return Double(n(.rec3) * 3 + n(.rec2) * 2 + n(.rec1)) / Double(receptions)
    }

    /// Ricezioni positive (# e +) in percentuale.
    var receptionPositive: Int? {
        guard receptions > 0 else { return nil }
        return Int((Double(n(.rec3) + n(.rec2)) / Double(receptions) * 100).rounded())
    }

    /// Efficienza d'attacco: (punti − errori) / attacchi.
    var attackEfficiency: Int? {
        guard attacks > 0 else { return nil }
        return Int((Double(n(.attackPoint) - n(.attackErr)) / Double(attacks) * 100).rounded())
    }
}

/// Riga del report salvata nello storico (con il nome "fotografato" al momento della partita).
struct StatRow: Hashable, Codable, Identifiable {
    var id: UUID
    var name: String
    var stats: PlayerStats
}

// MARK: - Calendario e convocazioni

struct Fixture: Identifiable, Hashable, Codable {
    var id = UUID()
    var teamID: UUID
    var date: Date = Date()
    var opponent: String = ""
    var place: String = ""
    var home: Bool = true
    var note: String = ""
    var called: [UUID] = []

    func message(team: Team) -> String {
        let df = DateFormatter()
        df.locale = Locale(identifier: "it_IT")
        df.dateFormat = "EEEE d MMMM 'ore' HH:mm"
        var lines: [String] = []
        lines.append("🏐 CONVOCAZIONE – \(team.name)")
        lines.append(df.string(from: date).capitalized(with: Locale(identifier: "it_IT")))
        lines.append(home ? "\(team.name) – \(opponent.isEmpty ? "avversario da definire" : opponent) (in casa)"
                          : "\(opponent.isEmpty ? "avversario da definire" : opponent) – \(team.name) (in trasferta)")
        if !place.isEmpty { lines.append("📍 \(place)") }
        lines.append("")
        lines.append(team.genderKind == .femminile ? "Convocate:" : "Convocati:")
        let players = called.compactMap { id in team.players.first { $0.id == id } }
            .sorted { ($0.number ?? 999) < ($1.number ?? 999) }
        for (i, p) in players.enumerated() { lines.append("\(i + 1). \(p.listName)") }
        if !note.isEmpty {
            lines.append("")
            lines.append(note)
        }
        return lines.joined(separator: "\n")
    }
}

// MARK: - Presenze

struct AttendanceSession: Identifiable, Hashable, Codable {
    var id = UUID()
    var teamID: UUID
    var date: Date = Date()
    var present: [UUID] = []
    var note: String = ""
}

// MARK: - Esercizi e piani di allenamento

enum DrillCategory: String, CaseIterable, Identifiable, Hashable, Codable {
    case riscaldamento = "Riscaldamento"
    case battuta = "Battuta"
    case ricezione = "Ricezione"
    case palleggio = "Palleggio e alzata"
    case attacco = "Attacco"
    case muro = "Muro"
    case difesa = "Difesa"
    case gioco = "Gioco"
    case fisico = "Preparazione fisica"
    var id: String { rawValue }

    var icon: String {
        switch self {
        case .riscaldamento: return "flame.fill"
        case .battuta: return "figure.volleyball"
        case .ricezione: return "hand.raised.fill"
        case .palleggio: return "hands.sparkles.fill"
        case .attacco: return "bolt.fill"
        case .muro: return "rectangle.portrait.fill"
        case .difesa: return "shield.fill"
        case .gioco: return "sportscourt.fill"
        case .fisico: return "figure.run"
        }
    }

    var colors: (Color, Color) {
        switch self {
        case .riscaldamento: return (Theme.orange, Theme.yellow)
        case .battuta: return (Theme.orange, Theme.red)
        case .ricezione: return (Theme.green, Theme.teal)
        case .palleggio: return (Theme.yellow, Theme.orange)
        case .attacco: return (Theme.pink, Theme.orange)
        case .muro: return (Theme.purple, Theme.blue)
        case .difesa: return (Theme.purple, Theme.pink)
        case .gioco: return (Theme.blue, Theme.cyan)
        case .fisico: return (Theme.teal, Theme.green)
        }
    }
}

struct Drill: Identifiable, Hashable, Codable {
    var id = UUID()
    var name: String = "Nuovo esercizio"
    var category: DrillCategory = .gioco
    var minutes: Int = 10
    var players: String = ""
    var description: String = ""
    /// Schema della lavagna collegato (facoltativo)
    var schemeID: UUID? = nil
    var builtIn: Bool = false

    static let library: [Drill] = [
        Drill(name: "Attivazione con palla", category: .riscaldamento, minutes: 10, players: "Tutti, a coppie",
              description: "Corsa leggera, mobilità di spalle e caviglie, poi a coppie: palleggio, bagher e piccoli attacchi controllati aumentando gradualmente la distanza.", builtIn: true),
        Drill(name: "Battuta a bersaglio", category: .battuta, minutes: 10, players: "Tutti",
              description: "Metti 3 cerchi o coni nelle zone 1, 5 e 6 avversarie. Ogni giocatore batte 10 palloni chiamando la zona prima di colpire. Conta i bersagli centrati.", builtIn: true),
        Drill(name: "Ricezione a tre in rotazione", category: .ricezione, minutes: 15, players: "3 ricevitori + 1 palleggiatore + battitori",
              description: "I battitori servono dall'altra metà campo; i tre ricevitori (bande e libero) ricevono verso il palleggiatore a rete. Dopo 5 ricezioni positive si ruota. Valuta ogni ricezione con #, +, – ed errore.", builtIn: true),
        Drill(name: "Palleggio a triangolo", category: .palleggio, minutes: 10, players: "Gruppi da 3",
              description: "Tre giocatori a triangolo: palleggio al compagno, spostamento verso il punto lasciato libero. Variante: alzata alta in posto 4 dopo 10 tocchi.", builtIn: true),
        Drill(name: "Attacco da posto 4 con alzata", category: .attacco, minutes: 15, players: "Attaccanti + palleggiatore",
              description: "L'allenatore lancia al palleggiatore, che alza in posto 4. Gli attaccanti rincorsa a tre passi e attaccano in diagonale, poi lungolinea. Dopo l'attacco rientrano in copertura.", builtIn: true),
        Drill(name: "Muro a due contro attacco", category: .muro, minutes: 10, players: "Centrali + opposto/banda",
              description: "Il centrale si sposta lateralmente per chiudere il muro a due con il laterale. L'allenatore attacca da un rialzo; lavorare su tempo di salto e mani sopra la rete.", builtIn: true),
        Drill(name: "Difesa perimetrale a tre", category: .difesa, minutes: 15, players: "3 difensori + allenatore",
              description: "Difensori in zona 1, 6 e 5. L'allenatore attacca da posto 4 con colpi forti e pallonetti. Ogni difensore copre la sua zona di competenza (vedi lavagna, fase Difesa).", builtIn: true),
        Drill(name: "Free ball e contrattacco", category: .gioco, minutes: 15, players: "6 contro allenatore",
              description: "L'allenatore manda palle facili: la squadra chiama \"free!\", gli attaccanti scendono ai 3 m, il palleggiatore entra a rete e si costruisce il contrattacco.", builtIn: true),
        Drill(name: "Partitella a punteggio speciale", category: .gioco, minutes: 20, players: "6 contro 6",
              description: "Set a 15. Il punto vale doppio se nasce da ricezione perfetta. Usa il segnapunti in modalità Allenamento.", builtIn: true),
        Drill(name: "Scatti e balzi", category: .fisico, minutes: 10, players: "Tutti",
              description: "Circuito: 6 scatti da 6 m, 10 balzi a piedi pari, 10 affondi, 30\" di plank. Due giri con 1' di recupero.", builtIn: true)
    ]
}

struct PlanItem: Identifiable, Hashable, Codable {
    var id = UUID()
    var title: String
    var minutes: Int
    var drillID: UUID? = nil
}

struct TrainingPlan: Identifiable, Hashable, Codable {
    var id = UUID()
    var name: String = "Allenamento"
    var items: [PlanItem] = []
    var totalMinutes: Int { items.reduce(0) { $0 + $1.minutes } }
}

// MARK: - Categoria della squadra: maschile, femminile, misto (FIPAV 2026/27)

enum TeamGender: String, CaseIterable, Identifiable, Hashable, Codable {
    case maschile = "M"
    case femminile = "F"
    case misto = "X"
    var id: String { rawValue }
    var title: String {
        switch self {
        case .maschile: return "Maschile"
        case .femminile: return "Femminile"
        case .misto: return "Misto"
        }
    }
    var chip: String {
        switch self {
        case .maschile: return "♂ Maschile"
        case .femminile: return "♀ Femminile"
        case .misto: return "⚥ Misto"
        }
    }
}

extension MatchRules {
    /// Under 12: tre set fissi a 25 (cambio campo a 13 nel terzo).
    static let under12 = MatchRules(mode: .fixed, setsToWin: 2, totalSets: 3, pointsPerSet: 25, tieBreak: false,
                                    tieBreakPoints: 15, winByTwo: true, capPoints: 0, maxSubs: 8, timeouts: 2, strictReentry: true)
}

struct TeamCategory: Identifiable, Hashable {
    let id: String
    let gender: TeamGender
    let label: String
    let net: String
    var netHigh: String? = nil
    var note: String = ""
    var rules: MatchRules = .fipav
    var libero: Bool = true

    static let all: [TeamCategory] = [
        TeamCategory(id: "m-serie", gender: .maschile, label: "Serie e Divisioni maschili", net: "2,43 m",
                     note: "Seniores FIPAV: 3 set su 5, tie-break a 15, 8 sostituzioni per set, fino a 14 atleti a referto con 2 liberi."),
        TeamCategory(id: "m-amatori", gender: .maschile, label: "Amatori maschile (CSEN, UISP, PGS…)", net: "2,43 m",
                     note: "Negli enti di promozione la rete maschile è di norma a 2,43 m; formula e numero di set dipendono dall'indizione del torneo.",
                     rules: .bestOfThree),
        TeamCategory(id: "m-u19", gender: .maschile, label: "Under 19 maschile", net: "2,43 m",
                     note: "Nati 2008-2011. Novità 2026/27: il primo tocco in ricezione della battuta deve essere in bagher (il palleggio in ricezione è fallo)."),
        TeamCategory(id: "m-u17", gender: .maschile, label: "Under 17 maschile", net: "2,43 m",
                     note: "Nati 2010-2013 (età minima anticipata dal 2026/27)."),
        TeamCategory(id: "m-u15", gender: .maschile, label: "Under 15 maschile", net: "2,35 m", netHigh: "2,43 m"),
        TeamCategory(id: "m-u14", gender: .maschile, label: "Under 14 maschile", net: "2,24 m", netHigh: "2,35 m",
                     note: "Novità 2026/27: nella fase territoriale la rete è stata abbassata a 2,24 m."),
        TeamCategory(id: "m-u13", gender: .maschile, label: "Under 13 maschile (6 contro 6)", net: "2,15 m",
                     note: "Nati 2014-2016, campo 9×9 m. Dal 2026/27 il libero non è ammesso, il 3×3 è abolito e ogni atleta può giocare solo una formula (4×4 o 6×6).",
                     libero: false),
        TeamCategory(id: "m-u12", gender: .maschile, label: "Under 12 maschile (6 contro 6)", net: "2,10 m",
                     note: "Campo 7×9 m. Tre set a 25 (cambio campo a 13 nel terzo); in classifica 1 punto per set vinto più 1 per la vittoria.",
                     rules: .under12, libero: false),
        TeamCategory(id: "f-serie", gender: .femminile, label: "Serie e Divisioni femminili", net: "2,24 m",
                     note: "Seniores FIPAV: 3 set su 5, tie-break a 15, 8 sostituzioni per set, fino a 14 atlete a referto con 2 libere."),
        TeamCategory(id: "f-amatori", gender: .femminile, label: "Amatori femminile (CSEN, UISP, PGS…)", net: "2,24 m",
                     note: "Negli enti di promozione la rete femminile è di norma a 2,24 m; formula e numero di set dipendono dall'indizione del torneo.",
                     rules: .bestOfThree),
        TeamCategory(id: "f-u19", gender: .femminile, label: "Under 19 femminile", net: "2,24 m",
                     note: "Nate 2008-2011 (età minima anticipata dal 2026/27)."),
        TeamCategory(id: "f-u17", gender: .femminile, label: "Under 17 femminile", net: "2,24 m",
                     note: "Nate 2010-2013 (età minima anticipata dal 2026/27)."),
        TeamCategory(id: "f-u15", gender: .femminile, label: "Under 15 femminile", net: "2,24 m"),
        TeamCategory(id: "f-u14", gender: .femminile, label: "Under 14 femminile", net: "2,15 m", netHigh: "2,24 m"),
        TeamCategory(id: "f-u13", gender: .femminile, label: "Under 13 femminile (6 contro 6)", net: "2,15 m",
                     note: "Nate 2014-2016, campo 9×9 m."),
        TeamCategory(id: "f-u12", gender: .femminile, label: "Under 12 femminile (6 contro 6)", net: "2,10 m",
                     note: "Campo 7×9 m, regole dell'Under 13. Tre set a 25; in classifica 1 punto per set vinto più 1 per la vittoria.",
                     rules: .under12, libero: false),
        TeamCategory(id: "x-amatori", gender: .misto, label: "Amatori misto (CSEN, UISP, PGS…)", net: "2,35 m",
                     note: "Nel misto la rete è a 2,35 m: a metà tra maschile (2,43) e femminile (2,24). Imposta qui sotto il formato (4+2, 3+3, 2+4).",
                     rules: .csenMisto)
    ]

    static func byID(_ id: String?) -> TeamCategory? {
        guard let id else { return nil }
        return all.first { $0.id == id }
    }
    static func forGender(_ g: TeamGender) -> [TeamCategory] { all.filter { $0.gender == g } }
}

extension Team {
    /// Sesso della squadra: le squadre miste salvate prima di questa versione risultano «Misto».
    var genderKind: TeamGender? { mixed != nil ? .misto : (teamGender == .misto ? nil : teamGender) }

    var categoryInfo: TeamCategory? {
        guard let c = TeamCategory.byID(category), c.gender == genderKind else { return nil }
        return c
    }

    var effectiveNet: String? {
        if let n = netHeight?.trimmingCharacters(in: .whitespaces), !n.isEmpty { return n }
        if let c = categoryInfo { return c.net }
        return mixed?.netHeight
    }

    var categoryLabel: String? { categoryInfo?.label ?? genderKind?.title }

    var playerWord: String { genderKind == .femminile ? "atlete" : "atleti" }

    mutating func applyCategory(_ c: TeamCategory?) {
        category = c?.id
        netHeight = nil
        guard let c else { return }
        rules = c.rules
        useLibero = c.libero
        if !c.libero {
            lineup[.libero] = nil
            libero2 = nil
        }
    }

    mutating func setGender(_ g: TeamGender) {
        teamGender = g
        if g == .misto {
            if mixed == nil { mixed = .csen42 }
        } else {
            mixed = nil
            let pg: Gender = g == .maschile ? .uomo : .donna
            for i in players.indices { players[i].gender = pg }
        }
        applyCategory(TeamCategory.forGender(g).first)
    }
}

// MARK: - Informazioni sull'app (uguali alla web app)

enum AppInfo {
    static let copyright = "© 2026 Marco · CoachMate Volleyball · Tutti i diritti riservati"
    static let version = "1.4"
}
