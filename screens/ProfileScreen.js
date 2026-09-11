import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getProStatus } from '../lib/purchases';
import RevenueCatUI from 'react-native-purchases-ui';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    spotsAdded: 0,
    reviewsPosted: 0,
    crownsHeld: 0,
    totalVotes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    fetchProfile();
    getProStatus().then(setIsPro);
  }, []);

  async function fetchProfile() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session.user.id;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    setProfile(profileData);

    const { count: spotsCount } = await supabase
      .from('spots')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', userId);

    const { count: reviewsCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: crownsCount } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_king', true);

    const { data: mediaData } = await supabase
      .from('media')
      .select('vote_count')
      .eq('user_id', userId);

    const totalVotes = mediaData?.reduce((sum, m) => sum + m.vote_count, 0) || 0;

    setStats({
      spotsAdded: spotsCount || 0,
      reviewsPosted: reviewsCount || 0,
      crownsHeld: crownsCount || 0,
      totalVotes,
    });

    // Sessions
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*, spots(name, type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setSessions(sessionData || []);

    // Follow counts
    const [{ count: frs }, { count: fng }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);
    setFollowerCount(frs || 0);
    setFollowingCount(fng || 0);

    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account, all your spots, reviews, photos, and votes. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              'Your SpotKing account and all data will be gone forever.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await supabase.rpc('delete_user_account');
                      await supabase.auth.signOut();
                    } catch (e) {
                      Alert.alert(
                        'Error',
                        'Could not delete account. Please email support@spotking.app and we\'ll delete it manually within 7 days.'
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  function handleUpgrade() {
    navigation.navigate('Paywall');
  }

  async function handleCustomerCenter() {
    try {
      await RevenueCatUI.presentCustomerCenter();
      // Re-check Pro status after Customer Center closes (user may have cancelled)
      const status = await getProStatus();
      setIsPro(status);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#E8C84A" />
      </View>
    );
  }

  const initials = profile?.username
    ? profile.username.substring(0, 2).toUpperCase()
    : '??';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{profile?.username || 'Unknown'}</Text>
          {isPro ? (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>LOCAL PRO</Text>
            </View>
          ) : (
            <View style={styles.freeBadge}>
              <Text style={styles.freeBadgeText}>FREE</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.spotsAdded}</Text>
          <Text style={styles.statLabel}>SPOTS</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#E8C84A' }]}>{stats.crownsHeld}</Text>
          <Text style={styles.statLabel}>CROWNS</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.totalVotes}</Text>
          <Text style={styles.statLabel}>VOTES</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.reviewsPosted}</Text>
          <Text style={styles.statLabel}>REVIEWS</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{followerCount}</Text>
          <Text style={styles.statLabel}>FOLLOWERS</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{followingCount}</Text>
          <Text style={styles.statLabel}>FOLLOWING</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{sessions.length}</Text>
          <Text style={styles.statLabel}>SESSIONS</Text>
        </View>
      </View>

      {!isPro && (
        <View style={styles.proCard}>
          <Text style={styles.proTitle}>GO SPOT KING PRO</Text>
          <Text style={styles.proDesc}>
            Upload photos and videos, compete for crowns, offline maps, and no ads.
          </Text>
          <TouchableOpacity style={styles.proButton} onPress={handleUpgrade}>
            <Text style={styles.proButtonText}>SEE PLANS</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.menuSection}>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>My Spots</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>My Reviews</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Settings</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Help & Tutorial</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        {isPro && (
          <TouchableOpacity style={styles.menuItem} onPress={handleCustomerCenter}>
            <Text style={styles.menuText}>Manage Subscription</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        )}
      </View>

      {sessions.length > 0 && (
        <View style={styles.sessionsSection}>
          <Text style={styles.sectionTitle}>RECENT SESSIONS</Text>
          {sessions.slice(0, 5).map((s, i) => {
            const spotType = s.spots?.type || 'skate';
            const emoji = { skate: '🛹', surf: '🏄', surfskate: '🛹🌊' }[spotType] || '📍';
            const color = { skate: '#E8C84A', surf: '#4AC8E8', surfskate: '#E84A8A' }[spotType] || '#E8C84A';
            const dur = s.duration_minutes >= 60
              ? `${s.duration_minutes / 60}hr`
              : `${s.duration_minutes}min`;
            return (
              <View key={s.id} style={[styles.sessionRow, i < sessions.length - 1 && styles.sessionRowBorder]}>
                <Text style={styles.sessionEmoji}>{emoji}</Text>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionSpot} numberOfLines={1}>{s.spots?.name || 'Unknown spot'}</Text>
                  <Text style={styles.sessionMeta}>{dur} · {'⭐'.repeat(s.rating)}</Text>
                </View>
                <View style={[styles.sessionTypePill, { borderColor: color + '44' }]}>
                  <Text style={[styles.sessionTypeText, { color }]}>{spotType.toUpperCase()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
        <Text style={styles.deleteButtonText}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24 },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1a1a2a', borderWidth: 2, borderColor: '#E8C84A', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarText: { color: '#E8C84A', fontSize: 22, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  username: { color: '#f0f0f0', fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  freeBadge: { backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#333', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  freeBadgeText: { color: '#555', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  proBadge: { backgroundColor: '#161606', borderWidth: 1, borderColor: '#E8C84A', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  proBadgeText: { color: '#E8C84A', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#161616', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#222' },
  statNum: { color: '#f0f0f0', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 9, fontWeight: 'bold', letterSpacing: 1, marginTop: 2 },
  proCard: { backgroundColor: '#161606', borderRadius: 12, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#E8C84A33' },
  proTitle: { color: '#E8C84A', fontSize: 14, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8 },
  proDesc: { color: '#888', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  proButton: { backgroundColor: '#E8C84A', borderRadius: 8, padding: 14, alignItems: 'center' },
  proButtonText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  menuSection: { backgroundColor: '#161616', borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  menuText: { color: '#ccc', fontSize: 15 },
  menuArrow: { color: '#555', fontSize: 20 },
  signOutButton: { borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 },
  signOutText: { color: '#555', fontWeight: 'bold', letterSpacing: 2, fontSize: 13 },
  deleteButton: { alignItems: 'center', paddingVertical: 12, marginBottom: 32 },
  deleteButtonText: { color: '#333', fontSize: 13 },
  sessionsSection: { backgroundColor: '#161616', borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#222', overflow: 'hidden', padding: 16 },
  sectionTitle: { color: '#E8C84A', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 14 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  sessionRowBorder: { borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  sessionEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  sessionInfo: { flex: 1 },
  sessionSpot: { color: '#ccc', fontSize: 14, fontWeight: '500' },
  sessionMeta: { color: '#555', fontSize: 12, marginTop: 2 },
  sessionTypePill: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  sessionTypeText: { fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
});