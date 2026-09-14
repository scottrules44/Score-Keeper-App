import { useEffect, useState } from 'react';
import { kvGet, kvSet } from '../modules/cloud-kv';

// Pro entitlement.
//
// Today: a flag in iCloud KV (set by the purchase flow once in-app purchases
// are wired up; `devSetPro` exists for testing). The durable source of truth
// for a real purchase is the App Store receipt — when you add RevenueCat
// (react-native-purchases), replace `refresh()` with a CustomerInfo lookup for
// the "pro" entitlement and keep the KV flag as a fast local cache:
//
//   const info = await Purchases.getCustomerInfo();
//   const isPro = !!info.entitlements.active.pro;
//
// "Restore Purchases" then works on any device with zero server code.
const KEY = 'sk:pro';

export async function getIsPro() {
  try {
    return (await kvGet(KEY)) === '1';
  } catch {
    return false;
  }
}

export async function devSetPro(on) {
  await kvSet(KEY, on ? '1' : '0');
}

export function useEntitlements() {
  const [state, setState] = useState({ loaded: false, isPro: false });
  useEffect(() => {
    let alive = true;
    getIsPro().then((isPro) => {
      if (alive) setState({ loaded: true, isPro });
    });
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
