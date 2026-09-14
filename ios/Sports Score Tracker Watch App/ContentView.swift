//
//  ContentView.swift
//  Sports Score Tracker Watch App
//
//  Remote control for the Sports Score Tracker scoreboard.
//  - Gets the session code automatically from the iPhone app (WatchConnectivity)
//  - Manual 4-digit keypad as a fallback (works fully standalone)
//  - Live sync over the Firebase Realtime Database REST/SSE API
//

import SwiftUI
import WatchConnectivity
import WatchKit

let DATABASE_URL = "https://sports-score-keeper-default-rtdb.firebaseio.com"
let LAST_CODE_KEY = "lastCode"

// MARK: - Sport presets (mirror of src/sports.js)

struct SportMeta {
    let label: String
    let emoji: String
    let increments: [Int]
    let periodLabel: String
    let maxPeriods: Int
    let sets: Bool
    let timerEnabled: Bool
}

let SPORTS: [String: SportMeta] = [
    "generic":    SportMeta(label: "Generic",    emoji: "🏆", increments: [1],          periodLabel: "Period",  maxPeriods: 99, sets: false, timerEnabled: true),
    "basketball": SportMeta(label: "Basketball", emoji: "🏀", increments: [1, 2, 3],    periodLabel: "Quarter", maxPeriods: 4,  sets: false, timerEnabled: true),
    "football":   SportMeta(label: "Football",   emoji: "🏈", increments: [1, 2, 3, 6], periodLabel: "Quarter", maxPeriods: 4,  sets: false, timerEnabled: true),
    "soccer":     SportMeta(label: "Soccer",     emoji: "⚽", increments: [1],          periodLabel: "Half",    maxPeriods: 2,  sets: false, timerEnabled: true),
    "hockey":     SportMeta(label: "Hockey",     emoji: "🏒", increments: [1],          periodLabel: "Period",  maxPeriods: 3,  sets: false, timerEnabled: true),
    "volleyball": SportMeta(label: "Volleyball", emoji: "🏐", increments: [1],          periodLabel: "Set",     maxPeriods: 5,  sets: true,  timerEnabled: false),
    "pickleball": SportMeta(label: "Pickleball", emoji: "🥒", increments: [1],          periodLabel: "Game",    maxPeriods: 3,  sets: true,  timerEnabled: false),
    "baseball":   SportMeta(label: "Baseball",   emoji: "⚾", increments: [1],          periodLabel: "Inning",  maxPeriods: 9,  sets: false, timerEnabled: false),
]

func sportMeta(_ key: String) -> SportMeta { SPORTS[key] ?? SPORTS["generic"]! }

// MARK: - Game state decoded from the room JSON

struct TeamState {
    var name = "Team"
    var score = 0
    var sets = 0
    var color = "#FFFFFF"
}

struct GameState {
    var sport = "generic"
    var home = TeamState(name: "Home", color: "#FF10F0")
    var away = TeamState(name: "Away", color: "#00FFFF")
    var period = 1
    var timerRunning = false
    var timerStartAt = 0.0
    var timerRemainMs = 0.0
    var timerDurationMs = 0.0
    var timerCountUp = false
    var horn = 0.0
    var hostOnline = true

    static func from(dict: [String: Any]) -> GameState {
        var g = GameState()
        g.sport = dict["sport"] as? String ?? "generic"
        g.period = intVal(dict["period"]) ?? 1
        g.horn = doubleVal(dict["horn"]) ?? 0
        g.hostOnline = (dict["hostOnline"] as? Bool) ?? true
        if let t = dict["timer"] as? [String: Any] {
            g.timerRunning = (t["running"] as? Bool) ?? false
            g.timerStartAt = doubleVal(t["startAt"]) ?? 0
            g.timerRemainMs = doubleVal(t["remainMs"]) ?? 0
            g.timerDurationMs = doubleVal(t["durationMs"]) ?? 0
            g.timerCountUp = (t["countUp"] as? Bool) ?? false
        }
        g.home = team(dict["home"], fallbackName: "Home", fallbackColor: "#FF10F0")
        g.away = team(dict["away"], fallbackName: "Away", fallbackColor: "#00FFFF")
        return g
    }

    private static func team(_ raw: Any?, fallbackName: String, fallbackColor: String) -> TeamState {
        var t = TeamState(name: fallbackName, color: fallbackColor)
        guard let d = raw as? [String: Any] else { return t }
        t.name = d["name"] as? String ?? fallbackName
        t.score = intVal(d["score"]) ?? 0
        t.sets = intVal(d["sets"]) ?? 0
        t.color = d["color"] as? String ?? fallbackColor
        return t
    }

    static func intVal(_ v: Any?) -> Int? {
        if let n = v as? Int { return n }
        if let n = v as? Double { return Int(n) }
        if let n = v as? NSNumber { return n.intValue }
        return nil
    }

    static func doubleVal(_ v: Any?) -> Double? {
        if let n = v as? Double { return n }
        if let n = v as? Int { return Double(n) }
        if let n = v as? NSNumber { return n.doubleValue }
        return nil
    }

    var displayClockMs: Double {
        if !timerRunning { return timerRemainMs }
        let now = Date().timeIntervalSince1970 * 1000
        let elapsed = max(0, now - timerStartAt)
        if timerCountUp { return min(timerDurationMs, timerRemainMs + elapsed) }
        return max(0, timerRemainMs - elapsed)
    }
}

func formatClock(_ ms: Double) -> String {
    let total = max(0, Int((ms / 1000).rounded()))
    return "\(total / 60):" + String(format: "%02d", total % 60)
}

// MARK: - iPhone link (receives the session code automatically)

final class PhoneLink: NSObject, WCSessionDelegate, ObservableObject {
    var onCode: ((String?) -> Void)?

    override init() {
        super.init()
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    private func handle(_ context: [String: Any]) {
        let code = context["code"] as? String
        DispatchQueue.main.async {
            self.onCode?((code?.isEmpty ?? true) ? nil : code)
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if activationState == .activated {
            handle(session.receivedApplicationContext)
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        handle(applicationContext)
    }
}

// MARK: - Room client (Firebase REST + SSE live stream)

final class RoomClient: NSObject, ObservableObject, URLSessionDataDelegate {
    enum Status: Equatable {
        case idle, connecting, live
        case error(String)
    }

    @Published var status: Status = .idle
    @Published var game: GameState?
    @Published var code: String?

    private var room: [String: Any] = [:]
    private var streamTask: URLSessionDataTask?
    private var streamBuffer = ""
    private var reconnectAttempts = 0
    private var wantStream = false
    private var lastHorn: Double = 0
    private var lastScores: (Int, Int) = (0, 0)
    private lazy var streamSession = URLSession(configuration: .default, delegate: self, delegateQueue: nil)

    // Stable per-watch id so the board can count connected remotes.
    private var clientId: String {
        if let id = UserDefaults.standard.string(forKey: "clientId") { return id }
        let id = "w" + UUID().uuidString.prefix(8)
        UserDefaults.standard.set(String(id), forKey: "clientId")
        return String(id)
    }

    private func setPresence(code: String, present: Bool) {
        guard let url = URL(string: "\(DATABASE_URL)/rooms/\(code)/clients/\(clientId).json") else { return }
        var req = URLRequest(url: url)
        if present {
            req.httpMethod = "PUT"
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try? JSONSerialization.data(withJSONObject: [".sv": "timestamp"])
        } else {
            req.httpMethod = "DELETE"
        }
        URLSession.shared.dataTask(with: req).resume()
    }

    // ---- connection -------------------------------------------------------

    func connect(code: String) {
        disconnect()
        self.code = code
        status = .connecting
        wantStream = true
        UserDefaults.standard.set(code, forKey: LAST_CODE_KEY)

        guard let url = URL(string: "\(DATABASE_URL)/rooms/\(code).json") else { return }
        URLSession.shared.dataTask(with: url) { [weak self] data, _, error in
            guard let self else { return }
            DispatchQueue.main.async {
                if let error {
                    self.status = .error(error.localizedDescription)
                    return
                }
                guard let data,
                      let json = try? JSONSerialization.jsonObject(with: data),
                      let dict = json as? [String: Any] else {
                    self.status = .error("No game with code \(code)")
                    self.code = nil
                    return
                }
                self.room = dict
                self.publish(initial: true)
                self.status = .live
                self.openStream()
                self.setPresence(code: code, present: true)
                self.logEvent("remote_joined")
                WKInterfaceDevice.current().play(.success)
            }
        }.resume()
    }

    func disconnect() {
        if let code { setPresence(code: code, present: false) }
        wantStream = false
        streamTask?.cancel()
        streamTask = nil
        streamBuffer = ""
        reconnectAttempts = 0
        code = nil
        game = nil
        room = [:]
        status = .idle
    }

    func resumeIfNeeded() {
        if let code, wantStream, streamTask == nil {
            connect(code: code)
        }
    }

    private func openStream() {
        guard wantStream, let code, let url = URL(string: "\(DATABASE_URL)/rooms/\(code).json") else { return }
        var req = URLRequest(url: url)
        req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
        req.timeoutInterval = 3600
        streamBuffer = ""
        streamTask = streamSession.dataTask(with: req)
        streamTask?.resume()
    }

    private func scheduleReconnect() {
        guard wantStream else { return }
        streamTask = nil
        reconnectAttempts += 1
        let delay = min(15.0, pow(2.0, Double(reconnectAttempts)))
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self, self.wantStream, self.streamTask == nil else { return }
            self.openStream()
        }
    }

    // ---- SSE parsing ------------------------------------------------------

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard let chunk = String(data: data, encoding: .utf8) else { return }
        streamBuffer += chunk
        while let sep = streamBuffer.range(of: "\n\n") {
            let block = String(streamBuffer[..<sep.lowerBound])
            streamBuffer.removeSubrange(..<sep.upperBound)
            handleEventBlock(block)
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        DispatchQueue.main.async { self.scheduleReconnect() }
    }

    private func handleEventBlock(_ block: String) {
        var event = ""
        var dataLine = ""
        for line in block.split(separator: "\n") {
            if line.hasPrefix("event:") {
                event = line.dropFirst(6).trimmingCharacters(in: .whitespaces)
            } else if line.hasPrefix("data:") {
                dataLine += line.dropFirst(5).trimmingCharacters(in: .whitespaces)
            }
        }
        guard event == "put" || event == "patch" else { return }
        guard let payload = try? JSONSerialization.jsonObject(with: Data(dataLine.utf8)) as? [String: Any],
              let path = payload["path"] as? String else { return }
        let value = payload["data"]

        DispatchQueue.main.async {
            self.reconnectAttempts = 0
            self.apply(path: path, value: value, isPatch: event == "patch")
            self.publish(initial: false)
        }
    }

    private func apply(path: String, value: Any?, isPatch: Bool) {
        let parts = path.split(separator: "/").map(String.init)
        if parts.isEmpty {
            if isPatch, let patch = value as? [String: Any] {
                for (k, v) in patch { setDeep(keys: k.split(separator: "/").map(String.init), value: v) }
            } else if let dict = value as? [String: Any] {
                room = dict
            } else if value == nil || value is NSNull {
                // Room deleted — host ended the session.
                room = [:]
                status = .error("Session ended by scoreboard")
                wantStream = false
                streamTask?.cancel()
                streamTask = nil
                code = nil
                game = nil
            }
            return
        }
        if isPatch, let patch = value as? [String: Any] {
            for (k, v) in patch { setDeep(keys: parts + k.split(separator: "/").map(String.init), value: v) }
        } else {
            setDeep(keys: parts, value: (value is NSNull) ? nil : value)
        }
    }

    private func setDeep(keys: [String], value: Any?) {
        room = setDeepDict(room, keys: keys, value: value)
    }

    private func setDeepDict(_ dict: [String: Any], keys: [String], value: Any?) -> [String: Any] {
        var d = dict
        guard let first = keys.first else { return d }
        if keys.count == 1 {
            if let value { d[first] = value } else { d.removeValue(forKey: first) }
            return d
        }
        let child = d[first] as? [String: Any] ?? [:]
        d[first] = setDeepDict(child, keys: Array(keys.dropFirst()), value: value)
        return d
    }

    private func publish(initial: Bool) {
        guard !room.isEmpty else { return }
        let g = GameState.from(dict: room)
        if !initial {
            if g.home.score != lastScores.0 || g.away.score != lastScores.1 {
                WKInterfaceDevice.current().play(.click)
            }
            if g.horn > lastHorn && lastHorn > 0 {
                WKInterfaceDevice.current().play(.notification)
            }
        }
        lastScores = (g.home.score, g.away.score)
        lastHorn = g.horn
        game = g
    }

    // ---- writes -----------------------------------------------------------

    private func patchRoom(_ fields: [String: Any]) {
        guard let code, let url = URL(string: "\(DATABASE_URL)/rooms/\(code).json") else { return }
        var all = fields
        all["updatedAt"] = [".sv": "timestamp"]
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: all)
        URLSession.shared.dataTask(with: req).resume()
        WKInterfaceDevice.current().play(.click)
    }

    func bump(_ team: String, _ delta: Int) {
        guard let g = game else { return }
        let current = team == "home" ? g.home.score : g.away.score
        if delta < 0 && current <= 0 { return }
        patchRoom(["\(team)/score": [".sv": ["increment": delta]]])
    }

    func bumpSets(_ team: String, _ delta: Int) {
        guard let g = game else { return }
        let current = team == "home" ? g.home.sets : g.away.sets
        if delta < 0 && current <= 0 { return }
        patchRoom(["\(team)/sets": [".sv": ["increment": delta]]])
    }

    func setPeriod(_ delta: Int) {
        guard let g = game else { return }
        let next = min(sportMeta(g.sport).maxPeriods, max(1, g.period + delta))
        if next == g.period { return }
        patchRoom(["period": next])
    }

    func timerToggle() {
        guard let g = game else { return }
        if g.timerRunning {
            patchRoom(["timer/running": false, "timer/remainMs": g.displayClockMs])
        } else {
            if !g.timerCountUp && g.timerRemainMs <= 0 { return }
            if g.timerCountUp && g.timerRemainMs >= g.timerDurationMs { return }
            patchRoom(["timer/running": true, "timer/startAt": [".sv": "timestamp"]])
        }
    }

    func timerReset() {
        guard let g = game else { return }
        patchRoom(["timer/running": false, "timer/remainMs": g.timerCountUp ? 0 : g.timerDurationMs])
    }

    func horn() {
        patchRoom(["horn": [".sv": "timestamp"]])
        logEvent("horn")
    }

    func resetGame() {
        guard let g = game else { return }
        patchRoom([
            "home/score": 0, "away/score": 0,
            "home/sets": 0, "away/sets": 0,
            "period": 1,
            "timer/running": false,
            "timer/remainMs": g.timerCountUp ? 0 : g.timerDurationMs,
        ])
    }

    func logEvent(_ event: String) {
        let day: String = {
            let f = DateFormatter()
            f.dateFormat = "yyyyMMdd"
            f.timeZone = TimeZone(identifier: "UTC")
            return f.string(from: Date())
        }()
        guard let url = URL(string: "\(DATABASE_URL)/.json") else { return }
        var req = URLRequest(url: url)
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try? JSONSerialization.data(withJSONObject: [
            "analytics/totals/watch/\(event)": [".sv": ["increment": 1]],
            "analytics/daily/\(day)/watch/\(event)": [".sv": ["increment": 1]],
        ])
        URLSession.shared.dataTask(with: req).resume()
    }
}

// MARK: - Views

struct ContentView: View {
    @StateObject private var client = RoomClient()
    @StateObject private var phoneLink = PhoneLink()
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        SwiftUI.Group {
            if client.status == .live, client.game != nil {
                ConnectedView(client: client)
            } else {
                JoinView(client: client)
            }
        }
        .onAppear {
            phoneLink.onCode = { code in
                if let code, code != client.code {
                    client.connect(code: code)
                }
            }
            // Try the last known code right away so the watch works standalone.
            if client.status == .idle,
               let last = UserDefaults.standard.string(forKey: LAST_CODE_KEY) {
                client.connect(code: last)
            }
        }
        .onChange(of: scenePhase) { phase in
            if phase == .active { client.resumeIfNeeded() }
        }
    }
}

struct JoinView: View {
    @ObservedObject var client: RoomClient
    @State private var digits = ""

    var body: some View {
        ScrollView {
            VStack(spacing: 6) {
                if case .connecting = client.status {
                    ProgressView().padding(.top, 20)
                    Text("Connecting…").font(.footnote).foregroundColor(.gray)
                } else {
                    Text(digits.isEmpty ? "Enter code" : digits)
                        .font(.title3.monospaced())
                        .foregroundColor(digits.isEmpty ? .gray : .white)

                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 3), spacing: 4) {
                        ForEach(["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"], id: \.self) { key in
                            Button {
                                tap(key)
                            } label: {
                                Text(key)
                                    .font(.headline)
                                    .frame(maxWidth: .infinity, minHeight: 26)
                            }
                            .buttonStyle(.bordered)
                            .tint(key == "✓" ? (digits.count == 4 ? .green : .gray) : .white)
                        }
                    }

                    if case let .error(msg) = client.status {
                        Text(msg).font(.footnote).foregroundColor(.orange)
                            .multilineTextAlignment(.center)
                    }
                    Text("Open the app on iPhone to connect automatically")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.top, 2)
                }
            }
        }
    }

    private func tap(_ key: String) {
        switch key {
        case "⌫": if !digits.isEmpty { digits.removeLast() }
        case "✓": if digits.count == 4 { client.connect(code: digits); digits = "" }
        default: if digits.count < 4 { digits += key }
        }
    }
}

struct ConnectedView: View {
    @ObservedObject var client: RoomClient

    var body: some View {
        TabView {
            ScorePage(client: client)
            GamePage(client: client)
        }
    }
}

struct ScorePage: View {
    @ObservedObject var client: RoomClient

    var body: some View {
        let g = client.game ?? GameState()
        let meta = sportMeta(g.sport)

        HStack(spacing: 8) {
            TeamControls(team: "home", state: g.home, meta: meta, client: client)
            Divider()
            TeamControls(team: "away", state: g.away, meta: meta, client: client)
        }
        .padding(.horizontal, 4)
    }
}

struct TeamControls: View {
    let team: String
    let state: TeamState
    let meta: SportMeta
    @ObservedObject var client: RoomClient

    var body: some View {
        let color = Color(hex: state.color)
        VStack(spacing: 2) {
            Text(state.name)
                .font(.footnote.bold())
                .foregroundColor(color)
                .lineLimit(1)
            Text("\(state.score)")
                .font(.system(size: 30, weight: .bold, design: .rounded))
                .foregroundColor(color)
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .onTapGesture { client.bump(team, 1) }
            if meta.sets {
                Text("Sets \(state.sets)")
                    .font(.system(size: 10))
                    .foregroundColor(.gray)
            }
            if meta.increments.count > 1 {
                HStack(spacing: 2) {
                    ForEach(meta.increments, id: \.self) { inc in
                        Button("+\(inc)") { client.bump(team, inc) }
                            .buttonStyle(.bordered)
                            .tint(color)
                            .font(.system(size: 12, weight: .bold))
                    }
                }
            } else {
                Button {
                    client.bump(team, 1)
                } label: {
                    Image(systemName: "plus.circle.fill").font(.title3)
                }
                .buttonStyle(.plain)
                .foregroundColor(color)
            }
            Button {
                client.bump(team, -1)
            } label: {
                Image(systemName: "minus.circle").font(.title3)
            }
            .buttonStyle(.plain)
            .foregroundColor(color.opacity(0.8))
            if meta.sets {
                Button("Set +") { client.bumpSets(team, 1) }
                    .buttonStyle(.bordered)
                    .tint(color)
                    .font(.system(size: 11))
            }
        }
        .frame(maxWidth: .infinity)
    }
}

struct GamePage: View {
    @ObservedObject var client: RoomClient
    @State private var showResetAlert = false
    private let ticker = Timer.publish(every: 0.5, on: .main, in: .common).autoconnect()
    @State private var clockText = ""

    var body: some View {
        let g = client.game ?? GameState()
        let meta = sportMeta(g.sport)

        ScrollView {
            VStack(spacing: 6) {
                if !g.hostOnline {
                    Text("Board offline")
                        .font(.footnote)
                        .foregroundColor(.orange)
                }

                HStack {
                    Button { client.setPeriod(-1) } label: { Image(systemName: "minus") }
                        .buttonStyle(.bordered)
                    Text("\(meta.periodLabel) \(g.period)")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                    Button { client.setPeriod(1) } label: { Image(systemName: "plus") }
                        .buttonStyle(.bordered)
                }

                if meta.timerEnabled {
                    HStack {
                        Button {
                            client.timerToggle()
                        } label: {
                            Image(systemName: g.timerRunning ? "pause.fill" : "play.fill")
                        }
                        .buttonStyle(.bordered)
                        .tint(g.timerRunning ? .yellow : .green)

                        Text(clockText.isEmpty ? formatClock(g.displayClockMs) : clockText)
                            .font(.title3.monospacedDigit().bold())
                            .frame(maxWidth: .infinity)

                        Button { client.timerReset() } label: { Image(systemName: "arrow.counterclockwise") }
                            .buttonStyle(.bordered)
                    }
                    .onReceive(ticker) { _ in
                        clockText = formatClock(client.game?.displayClockMs ?? 0)
                    }
                }

                Button {
                    client.horn()
                } label: {
                    Label("HORN", systemImage: "speaker.wave.3.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)

                Button("Reset scores") { showResetAlert = true }
                    .buttonStyle(.bordered)
                    .tint(.red)
                    .alert("Reset the game?", isPresented: $showResetAlert) {
                        Button("Reset", role: .destructive) { client.resetGame() }
                        Button("Cancel", role: .cancel) {}
                    }

                Button("Leave") { client.disconnect() }
                    .buttonStyle(.bordered)
                    .font(.footnote)
            }
            .padding(.horizontal, 2)
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 255, 255, 255)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
