import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const TYPE_COLOR = { skate: '#E8C84A', surf: '#4AC8E8', surfskate: '#E84A8A' };

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityFeedScreen() {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setCurrentUserId(session.user.id);

    const { data } = await supabase
      .from('notifications')
      .select('*, from_profile:profiles!notifications_from_user_id_fkey(username), spots(name, type)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications(data || []);
    setLoading(false);
    setRefreshing(false);

    // Mark all as read
    await supabase.from('notifications').update({ read: true }).eq('user_id', session.user.id).eq('read', false);
  }

  function notificationIcon(type) {
    if (type === 'vote') return '▲';
    if (type === 'follow') return '👤';
    if (type === 'new_spot') return '📍';
    return '🔔';
  }

  function notificationText(item) {
    const user = item.from_profile?.username || 'Someone';
    const spot = item.spots?.name;
    if (item.type === 'vote') return `${user} voted on your photo${spot ? ` at ${spot}` : ''}`;
    if (item.type === 'follow') return `${user} started following you`;
    if (item.type === 'new_spot') return `${user} added a new spot${spot ? `: ${spot}` : ''}`;
    return `New activity from ${user}`;
  }

  function handleTap(item) {
    if (item.type === 'follow' && item.from_user_id) {
      navigation.navigate('UserProfile', { userId: item.from_user_id, username: item.from_profile?.username });
    } else if (item.spots && item.spot_id) {
      navigation.navigate('SpotDetail', { spot: { id: item.spot_id, name: item.spots.name, type: item.spots.type, latitude: 0, longitude: 0, heat_level: 1 } });
    }
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={[styles.item, !item.read && styles.itemUnread]}
        onPress={() => handleTap(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{notificationIcon(item.type)}</Text>
        </View>
        <View style={styles.itemBody}>
          <Text style={styles.itemText}>{notificationText(item)}</Text>
          <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ACTIVITY</Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#E8C84A" style={{ marginTop: 40 }} />
      ) : notifications.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔔</Text>
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptyText}>When someone votes on your photos or follows you, it shows up here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#E8C84A" />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { padding: 24, paddingBottom: 16 },
  title: { color: '#E8C84A', fontSize: 28, fontWeight: 'bold', letterSpacing: 3 },
  list: { paddingHorizontal: 16, paddingBottom: 20 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#111', gap: 12 },
  itemUnread: { backgroundColor: '#0f0f0f' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 18 },
  itemBody: { flex: 1 },
  itemText: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  itemTime: { color: '#444', fontSize: 12, marginTop: 3 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E8C84A' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { color: '#444', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: '#333', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
