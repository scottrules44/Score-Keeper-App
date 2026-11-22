import ExpoModulesCore
import StoreKit

// StoreKit 2 bridge for the one-time "Pro" unlock (a non-consumable).
// Apple's signed transactions are the source of truth: entitlement is read
// from Transaction.currentEntitlements, so it follows the Apple ID across
// devices and reinstalls, and "Restore" needs no server.
public class ProStoreModule: Module {
  private var updatesTask: Task<Void, Never>?

  public func definition() -> ModuleDefinition {
    Name("ProStore")

    Events("onProChanged")

    OnCreate {
      // Finish transactions that complete outside a purchase() call
      // (Ask to Buy approvals, purchases on another device, refunds).
      self.updatesTask = Task.detached { [weak self] in
        for await update in Transaction.updates {
          if case .verified(let tx) = update {
            await tx.finish()
            let pro = await ProStoreModule.hasEntitlement(tx.productID)
            self?.sendEvent("onProChanged", ["productId": tx.productID, "isPro": pro])
          }
        }
      }
    }

    OnDestroy {
      self.updatesTask?.cancel()
    }

    AsyncFunction("getProduct") { (productId: String) -> [String: Any]? in
      let products = try await Product.products(for: [productId])
      guard let p = products.first else { return nil }
      return [
        "id": p.id,
        "displayName": p.displayName,
        "description": p.description,
        "displayPrice": p.displayPrice,
      ]
    }

    AsyncFunction("isEntitled") { (productId: String) -> Bool in
      return await ProStoreModule.hasEntitlement(productId)
    }

    // Resolves "purchased" | "cancelled" | "pending". Throws on failure.
    AsyncFunction("purchase") { (productId: String) -> String in
      let products = try await Product.products(for: [productId])
      guard let product = products.first else {
        throw Exception(name: "ProductNotFound", description: "Pro isn't available right now. Try again later.")
      }
      let result = try await product.purchase()
      switch result {
      case .success(let verification):
        guard case .verified(let tx) = verification else {
          throw Exception(name: "Unverified", description: "The purchase couldn't be verified.")
        }
        await tx.finish()
        return "purchased"
      case .userCancelled:
        return "cancelled"
      case .pending:
        return "pending"
      @unknown default:
        return "cancelled"
      }
    }

    AsyncFunction("restore") { (productId: String) -> Bool in
      try await AppStore.sync()
      return await ProStoreModule.hasEntitlement(productId)
    }
  }

  static func hasEntitlement(_ productId: String) async -> Bool {
    for await result in Transaction.currentEntitlements {
      if case .verified(let tx) = result, tx.productID == productId, tx.revocationDate == nil {
        return true
      }
    }
    return false
  }
}
