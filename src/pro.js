import { useEffect, useState } from 'react';
import { kvGet, kvSet } from '../modules/cloud-kv';
import * as Store from '../modules/pro-store';
import { setUserProperty } from './analytics';

// Pro entitlement: a one-time, non-consumable App Store purchase.
//
// Source of truth on iOS is StoreKit 2 (Transaction.currentEntitlements via
// modules/pro-store), so Pro follows the Apple ID across devices and
// reinstalls and "Restore Purchases" needs no server. The iCloud KV flag is
// only a fast cache so the board knows instantly at launch.
export const PRO_PRODUCT_ID = 'tech.scotth.scorekeeper.pro';
export const PRO_FALLBACK_PRICE = '$3.99';
export const canPurchasePro = Store.available;

const KEY = 'sk:pro';

let current = { loaded: false, isPro: false };
const listeners = new Set();

function publish(isPro) {
  current = { loaded: true, isPro };
  setUserProperty('is_pro', isPro ? 'true' : 'false');
  listeners.forEach((fn) => fn(current));
}

async function setCached(isPro) {
  publish(isPro);
  try {
    await kvSet(KEY, isPro ? '1' : '0');
  } catch {}
}

async function readCache() {
  try {
    return (await kvGet(KEY)) === '1';
  } catch {
    return false;
  }
}

// Ask StoreKit (when available) and update the cache. Never throws.
export async function refreshPro() {
  if (Store.available) {
    try {
      const pro = await Store.isEntitled(PRO_PRODUCT_ID);
      await setCached(pro);
      return pro;
    } catch {}
  }
  const cached = await readCache();
  publish(cached);
  return cached;
}

export async function getIsPro() {
  if (current.loaded) return current.isPro;
  return refreshPro();
}

// Resolves 'purchased' | 'cancelled' | 'pending'; throws with a readable message.
export async function buyPro() {
  const result = await Store.purchase(PRO_PRODUCT_ID);
  if (result === 'purchased') await setCached(true);
  return result;
}

// Resolves true when a previous purchase was found.
export async function restorePro() {
  const pro = await Store.restore(PRO_PRODUCT_ID);
  await setCached(pro);
  return pro;
}

export async function getProPrice() {
  try {
    const p = await Store.getProduct(PRO_PRODUCT_ID);
    return p?.displayPrice || PRO_FALLBACK_PRICE;
  } catch {
    return PRO_FALLBACK_PRICE;
  }
}

export async function devSetPro(on) {
  await setCached(!!on);
}

// Purchases finished elsewhere (Ask to Buy, another device, refunds).
Store.addProListener(({ productId }) => {
  if (productId === PRO_PRODUCT_ID) refreshPro();
});

export function useEntitlements() {
  const [state, setState] = useState(current);
  useEffect(() => {
    listeners.add(setState);
    if (!current.loaded) refreshPro();
    else setState(current);
    return () => listeners.delete(setState);
  }, []);
  return state;
}

// Price string for the paywall; falls back to the list price until StoreKit answers.
export function useProPrice() {
  const [price, setPrice] = useState(PRO_FALLBACK_PRICE);
  useEffect(() => {
    let alive = true;
    if (canPurchasePro) getProPrice().then((p) => alive && setPrice(p));
    return () => {
      alive = false;
    };
  }, []);
  return price;
}
