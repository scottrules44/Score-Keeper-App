import ExpoModulesCore

// iCloud Key-Value store bridge. Values written here survive app
// deletion/reinstall and sync across the user's devices — which is what makes
// the free-tier usage meter honest.
public class CloudKVModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CloudKV")

    Function("get") { (key: String) -> String? in
      NSUbiquitousKeyValueStore.default.synchronize()
      return NSUbiquitousKeyValueStore.default.string(forKey: key)
    }

    Function("set") { (key: String, value: String) in
      NSUbiquitousKeyValueStore.default.set(value, forKey: key)
      NSUbiquitousKeyValueStore.default.synchronize()
    }

    Function("remove") { (key: String) in
      NSUbiquitousKeyValueStore.default.removeObject(forKey: key)
      NSUbiquitousKeyValueStore.default.synchronize()
    }
  }
}
