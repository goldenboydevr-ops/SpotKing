import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { sendPushToUser, createNotification } from '../lib/notifications';

const TYPE_COLOR = { skate: '#E8C84A', surf: '#4AC8E8', surfskate: '#E84A8A' };

export default function UserProfileScreen() {
  const { params: { userId, username: initUsername } } = useRoute();
  const navigation = useNavigation();

  const [profile, setProfile] = useState(null);
  const [spots, setSpots] = useState([]);
  const [media, setMedia] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    init();
  }, [userId]);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    const me = session?.user?.id;
    setCurrentUserId(me);

    const [profileRes, spotsRes, mediaRes, followersRes, followingRes, isFollowingRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('spots').select('*').eq('created_by', userId).order('created_at', { ascending: false }),
      supabase.from('media').select('*, spots(name)').eq('user_id', userId).eq('is_king', true).order('vote_count', { ascending: false }).limit(6),
      supabase.from('follows').select('follower_id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact' }).eq('follower_id', userId),
      me ? supabase.from('follows').select('follower_id').eq('follower_id', me).eq('following_id', userId).single() : Promise.resolve({ data: null }),
    ]);

    setProfile(profileRes.data);
    setSpots(spotsRes.data || []);
    setMedia(mediaRes.data || []);
    setFollowerCount(followersRes.count || 0);
    setFollowingCount(followingRes.count || 0);
    setIsFollowing(!!isFollowingRes.data);
    setLoading(false);
  }

  async function toggleFollow() {
    if (!currentUserId || currentUserId === userId) return;
    setFollowLoading(true);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId);
      setIsFollowing(false);
      setFollowerCount(c => c - 1);
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
      // Notify the user
      const { data: me } = await supabase.from('profiles').select('username').eq('id', currentUserId).single();
      await createNotification(userId, 'follow', currentUserId);
      await sendPushToUser(userId, '👤 New follower', `${me?.username || 'Someone'} started following you`);
    }
    setFollowLoading(false);
  }

  if (loading) return <ActivityIndicator color="#E8C84A" style={{ flex: 1 }} />;

  const isOwnProfile = currentUserId === userId;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{(profile?.username || '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.username}>{profile?.username || initUsername}</Text>
        {profile?.is_pro && <Text style={styles.proBadge}>👑 PRO</Text>}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{spots.length}</Text>
            <Text style={styles.statLabel}>SPOTS</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{followerCount}</Text>
            <Text style={styles.statLabel}>FOLLOWERS</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{followingCount}</Text>
            <Text style={styles.statLabel}>FOLLOWING</Text>
          </View>
        </View>

        {!isOwnProfile && (
          <TouchableOpacity
            style={[styles.followButton, isFollowing && styles.followingButton]}
            onPress={toggleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator color={isFollowing ? '#888' : '#0a0a0a'} size="small" />
            ) : (
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* King/Queen crowns */}
      {media.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👑 CROWNS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
            {media.map(item => (
              <TouchableOpacity key={item.id} style={styles.mediaCard} onPress={() => navigation.navigate('SpotDetail', { spot: { id: item.spot_id, name: item.spots?.name, latitude: 0, longitude: 0, type: 'skate', heat_level: 1 } })}>
                <Image source={{ uri: item.url }} style={styles.mediaImage} />
                <View style={styles.mediaLabel}>
                  <Text style={styles.mediaLabelText} numberOfLines={1}>{item.spots?.name}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Their spots */}
      {spots.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 SPOTS ADDED</Text>
          {spots.map(spot => (
            <TouchableOpacity
              key={spot.id}
              style={styles.spotRow}
              onPress={() => navigation.navigate('SpotDetail', { spot })}
            >
              <View style={[styles.typeDot, { backgroundColor: TYPE_COLOR[spot.type] || '#E8C84A' }]} />
              <Text style={styles.spotName} numberOfLines={1}>{spot.name}</Text>
              <Text style={styles.spotType}>{spot.type.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { paddingBottom: 40 },
  header: { alignItems: 'center', padding: 28, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#E8C84A', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#E8C84A', fontSize: 32, fontWeight: 'bold' },
  username: { color: '#f0f0f0', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  proBadge: { color: '#E8C84A', fontSize: 12, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 32, marginVertical: 16 },
  stat: { alignItems: 'center' },
  statNum: { color: '#f0f0f0', fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#555', fontSize: 10, letterSpacing: 1, marginTop: 2 },
  followButton: { backgroundColor: '#E8C84A', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 36, marginTop: 4 },
  followingButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333' },
  followButtonText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 14 },
  followingButtonText: { color: '#555' },
  section: { padding: 20, paddingBottom: 0 },
  sectionTitle: { color: '#E8C84A', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 14 },
  mediaRow: { marginHorizontal: -4 },
  mediaCard: { width: 120, height: 120, marginRight: 10, borderRadius: 10, overflow: 'hidden', backgroundColor: '#111' },
  mediaImage: { width: '100%', height: '100%' },
  mediaLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', padding: 6 },
  mediaLabelText: { color: '#fff', fontSize: 10 },
  spotRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111', gap: 10 },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  spotName: { flex: 1, color: '#ccc', fontSize: 14 },
  spotType: { color: '#444', fontSize: 11, letterSpacing: 1 },
});
