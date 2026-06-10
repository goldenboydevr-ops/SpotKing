import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

const TABS = ['Global', 'Skate', 'Surf', 'Surfskate'];

export default function RanksScreen() {
  const [activeTab, setActiveTab] = useState('Global');
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, [activeTab]);

  async function fetchRankings() {
    setLoading(true);
    let query = supabase
      .from('media')
      .select('user_id, vote_count, is_king, spots(type)')
      .eq('is_king', true);

    const { data, error } = await query;

    if (error) {
      console.log('Rankings error:', error);
      setLoading(false);
      return;
    }

    const filtered = activeTab === 'Global'
      ? data
      : data.filter(m => m.spots?.type === activeTab.toLowerCase());

    const userMap = {};
    filtered.forEach(m => {
      if (!userMap[m.user_id]) {
        userMap[m.user_id] = { user_id: m.user_id, crowns: 0, votes: 0 };
      }
      userMap[m.user_id].crowns += 1;
      userMap[m.user_id].votes += m.vote_count;
    });

    const sorted = Object.values(userMap).sort((a, b) => b.crowns - a.crowns);

    const withProfiles = await Promise.all(
      sorted.map(async (u) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', u.user_id)
          .single();
        return { ...u, username: profile?.username || 'Unknown' };
      })
    );

    setRankings(withProfiles);
    setLoading(false);
  }

  function RankRow({ item, index }) {
    const medals = ['🥇', '🥈', '🥉'];
    return (
      <View style={styles.rankRow}>
        <Text style={styles.rankNum}>
          {index < 3 ? medals[index] : `#${index + 1}`}
        </Text>
        <View style={styles.rankInfo}>
          <Text style={styles.rankName}>{item.username}</Text>
          <Text style={styles.rankVotes}>{item.votes} votes</Text>
        </View>
        <View style={styles.crownBadge}>
          <Text style={styles.crownCount}>{item.crowns}</Text>
          <Text style={styles.crownLabel}>CROWNS</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LEADERBOARD</Text>
        <Text style={styles.subtitle}>Kings & Queens of the Spot</Text>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#E8C84A" style={{ marginTop: 40 }} />
      ) : rankings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No kings yet.</Text>
          <Text style={styles.emptyText}>Upload photos and get voted to claim a spot.</Text>
        </View>
      ) : (
        <FlatList
          data={rankings}
          keyExtractor={(item) => item.user_id}
          renderItem={({ item, index }) => <RankRow item={item} index={index} />}
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
  subtitle: { color: '#555', fontSize: 13, marginTop: 4 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  tab: { borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  tabActive: { backgroundColor: '#E8C84A', borderColor: '#E8C84A' },
  tabText: { color: '#555', fontSize: 11, fontWeight: 'bold' },
  tabTextActive: { color: '#0a0a0a' },
  list: { padding: 16, gap: 8 },
  rankRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#222' },
  rankNum: { fontSize: 24, width: 44 },
  rankInfo: { flex: 1 },
  rankName: { color: '#f0f0f0', fontSize: 15, fontWeight: 'bold' },
  rankVotes: { color: '#555', fontSize: 12, marginTop: 2 },
  crownBadge: { backgroundColor: '#1a1500', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E8C84A33' },
  crownCount: { color: '#E8C84A', fontSize: 20, fontWeight: 'bold' },
  crownLabel: { color: '#E8C84A', fontSize: 8, fontWeight: 'bold', letterSpacing: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, padding: 24 },
  emptyTitle: { color: '#444', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  emptyText: { color: '#333', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});