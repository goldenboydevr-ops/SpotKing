import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE } from 'react-native-purchases';

const REVENUECAT_ANDROID_KEY = 'test_bbyJOLmapmbpGOnUeTYaaGxzTyQ';

// Must match the entitlement identifier in your RevenueCat dashboard
export const ENTITLEMENT_PRO = 'spot_king_pro';

// Product identifiers — must match Play Console product IDs
export const PRODUCT_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  LIFETIME: 'lifetime',
};

export function initPurchases(userId) {
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR);
  Purchases.configure({
    apiKey: REVENUECAT_ANDROID_KEY,
    appUserID: userId ?? null,
  });
}

// Returns the full CustomerInfo object — use this when you need more than just Pro status
export async function getCustomerInfo() {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn('RevenueCat getCustomerInfo error:', e.message);
    return null;
  }
}

// Quick boolean check — use this for gating features
export async function getProStatus() {
  const info = await getCustomerInfo();
  if (!info) return false;
  return info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
}

// Returns expiry date string or null if not subscribed
export async function getProExpiry() {
  const info = await getCustomerInfo();
  if (!info) return null;
  return info.entitlements.active[ENTITLEMENT_PRO]?.expirationDate ?? null;
}

// Fetch all offerings — returns { current, all } or null on error
export async function getOfferings() {
  try {
    return await Purchases.getOfferings();
  } catch (e) {
    console.warn('RevenueCat getOfferings error:', e.message);
    return null;
  }
}

// Purchase a specific package from an offering
// Returns { success: bool, customerInfo, error }
export async function purchasePackage(pkg) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined;
    return { success: isActive, customerInfo, error: null };
  } catch (e) {
    if (e.userCancelled) {
      return { success: false, customerInfo: null, error: null }; // silent cancel
    }
    if (e.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      return { success: false, customerInfo: null, error: 'Payment is pending approval.' };
    }
    return { success: false, customerInfo: null, error: e.message };
  }
}

// Restore previous purchases (required by App Store / Play Store policies)
export async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isActive = customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined;
    return { success: isActive, customerInfo, error: null };
  } catch (e) {
    return { success: false, customerInfo: null, error: e.message };
  }
}

// Update RevenueCat's user ID when the Supabase auth state changes
export async function identifyUser(userId) {
  try {
    await Purchases.logIn(userId);
  } catch (e) {
    console.warn('RevenueCat logIn error:', e.message);
  }
}

export async function resetUser() {
  try {
    await Purchases.logOut();
  } catch (e) {
    console.warn('RevenueCat logOut error:', e.message);
  }
}
