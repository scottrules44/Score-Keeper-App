import ExpoModulesCore
import FirebaseCore
import FirebaseAnalytics

// Google Analytics for Firebase. Config comes from GoogleService-Info.plist
// (shipped as a pod resource). Events show up in Firebase console ->
// Analytics (DebugView with -FIRDebugEnabled for live testing).
public class FirebaseAnalyticsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FirebaseAnalytics")

    OnCreate {
      FirebaseAnalyticsModule.ensureConfigured()
    }

    Function("logEvent") { (name: String, params: [String: Any]?) in
      FirebaseAnalyticsModule.ensureConfigured()
      Analytics.logEvent(name, parameters: params)
    }

    Function("setUserProperty") { (name: String, value: String?) in
      FirebaseAnalyticsModule.ensureConfigured()
      Analytics.setUserProperty(value, forName: name)
    }

    Function("logScreenView") { (screen: String) in
      FirebaseAnalyticsModule.ensureConfigured()
      Analytics.logEvent(AnalyticsEventScreenView, parameters: [AnalyticsParameterScreenName: screen])
    }
  }

  private static let lock = NSLock()
  static func ensureConfigured() {
    lock.lock(); defer { lock.unlock() }
    if FirebaseApp.app() == nil { FirebaseApp.configure() }
  }
}
