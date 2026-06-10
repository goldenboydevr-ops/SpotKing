import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { getOfferings, purchasePackage, restorePurchases, ENTITLEMENT_PRO } from '../lib/purchases';

const PERKS = [
  { icon: '📸', text: 'Upload photos & videos to any spot' },
  { icon: '👑', text: 'Compete for King/Queen of every spot' },
  { icon: '🗺️', text: 'Offline maps — no signal needed' },
  { icon: '🔥', text: 'No ads, ever' },
  { icon: '⚡', text: 'Early access to new features' },
];

const PERIOD_LABEL = {
  MONTHLY: 'Monthly',
  ANNUAL: 'Yearly',
  LIFETIME: 'Lifetime',
  WEEKLY: 'Weekly',
  THREE_MONTH: '3 Months',
  SIX_MONTH: '6 Months',
  TWO_MONTH: '2 Months',
};

const PERIOD_BADGE = {
  ANNUAL: 'BEST VALUE',
  LIFETIME: 'ONE-TIME',
};

export default function PaywallScreen({ navigation }) {
  const [offerings, setOfferings] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [useNativePaywall, setUseNativePaywall] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  async function loadOfferings() {
    setLoading(true);
    const result = await getOfferings();
    if (result?.current?.availablePackages?.length > 0) {
      setOfferings(result.current);
      // Default select the annual package if available, else first
      const annual = result.current.availablePackages.find(
        (p) => p.packageType === 'ANNUAL'
      );
      setSelectedPkg(annual ?? result.current.availablePackages[0]);
    }
    setLoading(false);
  }

  // Try RevenueCat's native Paywall UI first (requires paywall configured in dashboard)
  const presentNativePaywall = useCallback(async () => {
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_PRO,
      });
      switch (result) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          navigation.goBack();
          break;
        case PAYWALL_RESULT.NOT_PRESENTED:
          // Already has entitlement
          navigation.goBack();
          break;
        case PAYWALL_RESULT.ERROR:
          // Fall through to manual paywall
          setUseNativePaywall(false);
          break;
        default:
          break;
      }
    } catch {
      setUseNativePaywall(false);
    }
  }, [navigation]);

  async function handlePurchase() {
    if (!selectedPkg) return;
    setPurchasing(true);
    const { success, error } = await purchasePackage(selectedPkg);
    setPurchasing(false);
    if (success) {
      Alert.alert('Welcome to Spot King Pro!', 'Your crown is ready. Go claim some spots.', [
        { text: 'LET\'S GO', onPress: () => navigation.goBack() },
      ]);
    } else if (error) {
      Alert.alert('Purchase failed', error);
    }
    // null error = user cancelled, do nothing
  }

  async function handleRestore() {
    setPurchasing(true);
    const { success, error } = await restorePurchases();
    setPurchasing(false);
    if (success) {
      Alert.alert('Restored!', 'Your Spot King Pro subscription is active.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } else if (error) {
      Alert.alert('Restore failed', error);
    } else {
      Alert.alert('Nothing to restore', 'No active Spot King Pro subscription was found.');
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#E8C84A" size="large" />
      </View>
    );
  }

  if (!offerings || offerings.availablePackages.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Products unavailable.</Text>
        <Text style={styles.errorSub}>Check your connection and try again.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadOfferings}>
          <Text style={styles.retryText}>RETRY</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.crown}>👑</Text>
        <Text style={styles.title}>SPOT KING PRO</Text>
        <Text style={styles.subtitle}>Own your local scene.</Text>
      </View>

      {/* Perks list */}
      <View style={styles.perksCard}>
        {PERKS.map((perk, i) => (
          <View key={i} style={styles.perkRow}>
            <Text style={styles.perkIcon}>{perk.icon}</Text>
            <Text style={styles.perkText}>{perk.text}</Text>
          </View>
        ))}
      </View>

      {/* Package selector */}
      <Text style={styles.sectionLabel}>CHOOSE YOUR PLAN</Text>
      {offerings.availablePackages.map((pkg) => {
        const isSelected = selectedPkg?.identifier === pkg.identifier;
        const badge = PERIOD_BADGE[pkg.packageType];
        const label = PERIOD_LABEL[pkg.packageType] ?? pkg.packageType;
        return (
          <TouchableOpacity
            key={pkg.identifier}
            style={[styles.packageRow, isSelected && styles.packageRowSelected]}
            onPress={() => setSelectedPkg(pkg)}
            activeOpacity={0.8}
          >
            <View style={[styles.radio, isSelected && styles.radioSelected]} />
            <View style={styles.packageInfo}>
              <View style={styles.packageTitleRow}>
                <Text style={[styles.packageLabel, isSelected && styles.packageLabelSelected]}>
                  {label}
                </Text>
                {badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.packagePrice}>
                {pkg.product.priceString}
                {pkg.packageType !== 'LIFETIME' && (
                  <Text style={styles.packagePer}>
                    {pkg.packageType === 'ANNUAL' ? ' / year' : ' / month'}
                  </Text>
                )}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {/* CTA */}
      <TouchableOpacity
        style={[styles.ctaButton, purchasing && styles.ctaButtonDisabled]}
        onPress={handlePurchase}
        disabled={purchasing || !selectedPkg}
        activeOpacity={0.85}
      >
        {purchasing ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text style={styles.ctaText}>
            {selectedPkg?.packageType === 'LIFETIME'
              ? 'GET LIFETIME ACCESS'
              : `START ${PERIOD_LABEL[selectedPkg?.packageType]?.toUpperCase() ?? ''} PLAN`}
          </Text>
        )}
      </TouchableOpacity>

      {/* Restore */}
      <TouchableOpacity onPress={handleRestore} disabled={purchasing} style={styles.restoreButton}>
        <Text style={styles.restoreText}>Restore purchases</Text>
      </TouchableOpacity>

      <Text style={styles.legal}>
        Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date.
        Manage or cancel in Google Play → Subscriptions.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  crown: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#E8C84A', letterSpacing: 3 },
  subtitle: { fontSize: 14, color: '#888', letterSpacing: 2, marginTop: 6 },
  perksCard: { backgroundColor: '#161616', borderRadius: 14, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: '#222' },
  perkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  perkIcon: { fontSize: 20, marginRight: 14, width: 28 },
  perkText: { color: '#ccc', fontSize: 14, flex: 1, lineHeight: 20 },
  sectionLabel: { color: '#555', fontSize: 10, fontWeight: 'bold', letterSpacing: 2, marginBottom: 12 },
  packageRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  packageRowSelected: { borderColor: '#E8C84A', backgroundColor: '#1a1906' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#444', marginRight: 14 },
  radioSelected: { borderColor: '#E8C84A', backgroundColor: '#E8C84A' },
  packageInfo: { flex: 1 },
  packageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  packageLabel: { color: '#888', fontSize: 15, fontWeight: '600' },
  packageLabelSelected: { color: '#f0f0f0' },
  packagePrice: { color: '#E8C84A', fontSize: 17, fontWeight: 'bold' },
  packagePer: { color: '#888', fontSize: 13, fontWeight: 'normal' },
  badge: { backgroundColor: '#E8C84A22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: '#E8C84A44' },
  badgeText: { color: '#E8C84A', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  ctaButton: { backgroundColor: '#E8C84A', borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 20, marginBottom: 12 },
  ctaButtonDisabled: { opacity: 0.6 },
  ctaText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 16, letterSpacing: 2 },
  restoreButton: { alignItems: 'center', paddingVertical: 12 },
  restoreText: { color: '#555', fontSize: 13 },
  legal: { color: '#333', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 16 },
  errorText: { color: '#f0f0f0', fontSize: 16, marginBottom: 8 },
  errorSub: { color: '#555', fontSize: 13, marginBottom: 24 },
  retryButton: { borderWidth: 1, borderColor: '#E8C84A', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: '#E8C84A', fontWeight: 'bold', letterSpacing: 2 },
});
