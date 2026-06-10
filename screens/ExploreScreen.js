import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCO1zElgBXnn_Sx0mPLlGXFhSuv3DG5Pik';
const FILTERS = ['All', 'Skate', 'Surf', 'Surfskate'];

// Google Places keyword → spot type mapping
const PLACE_SEARCHES = [
  { keyword: 'skatepark',   type: 'skate' },
  { keyword: 'skate plaza', type: 'skate' },
  { keyword: 'surf spot',   type: 'surf' },
  { keyword: 'surf break',  type: 'surf' },
];

export default function ExploreScreen() {
  const navigation = useNavigation();
  const [spots, setSpots] = useState([]);           // Supabase spots
  const [googleSpots, setGoogleSpots] = useState([]); // undiscovered
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    fetchSpots();
    fetchNearbyUndiscovered();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [search, activeFilter, spots, googleSpots]);

  async function fetchSpots() {
    setLoading(true);
    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setSpots(data);
    setLoading(false);
  }

  async function fetchNearbyUndiscovered() {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      await fetchGoogleSpots(loc.coords.latitude, loc.coords.longitude);
    } catch (e) {
      console.log('Undiscovered fetch error:', e.message);
    } finally {
      setLocationLoading(false);
    }
  }

  async function fetchGoogleSpots(lat, lng) {
    const results = [];
    for (const { keyword, type } of PLACE_SEARCHES) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=15000&keyword=${encodeURIComponent(keyword)}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results) {
          results.push(...data.results.map(place => ({
            id: place.place_id,
            name: place.name,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            type,
            isGoogle: true,
            vicinity: place.vicinity,
          })));
        }
      } catch (e) {
        console.log('Places fetch error:', e.message);
      }
    }
    // Deduplicate by place_id
    const seen = new Set();
    const unique = results.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    setGoogleSpots(unique);
  }

  function applyFilters() {
    const allSpots = [
      ...spots,
      // Filter out Google spots that are already claimed (same name)
      ...googleSpots.filter(g =>
        !spots.some(s => s.name.toLowerCase() === g.name.toLowerCase())
      ),
    ];

    let results = allSpots;

    if (activeFilter !== 'All') {
      results = results.filter(s => s.type === activeFilter.toLowerCase());
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(s => s.name.toLowerCase().includes(q));
    }

    // Claimed spots first, undiscovered after
    results.sort((a, b) => {
      if (a.isGoogle && !b.isGoogle) return 1;
      if (!a.isGoogle && b.isGoogle) return -1;
      return 0;
    });

    setFiltered(results);
  }

  function handleUndiscoveredTap(spot) {
    Alert.alert(
      '🔒 Undiscovered Spot',
      `"${spot.name}" hasn't been claimed yet.\n\nFind it and be the first to add it — whoever drops the first photo becomes King.`,
      [
        { text: 'Maybe later', style: 'cancel' },
        {
          text: 'Add this spot',
          onPress: () => navigation.navigate('Add Spot'),
        },
      ]
    );
  }

  function HeatDots({ level }) {
    return (
      <View style={styles.heatDots}>
        {Array.from({ length: 5 }, (_, i) => (
          <View key={i} style={[styles.dot, i < level ? styles.dotOn : styles.dotOff]} />
        ))}
      </View>
    );
  }

  function SpotCard({ spot }) {
    if (spot.isGoogle) {
      return (
        <TouchableOpacity
          style={styles.undiscoveredCard}
          onPress={() => handleUndiscoveredTap(spot)}
          activeOpacity={0.7}
        >
          <View style={styles.cardTop}>
            <View style={styles.undiscoveredNameRow}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.undiscoveredName} numberOfLines={1}>
                {spot.name}
              </Text>
            </View>
            <View style={styles.undiscoveredBadge}>
              <Text style={styles.undiscoveredBadgeText}>UNDISCOVERED</Text>
            </View>
          </View>
          <View style={styles.cardBottom}>
            <View style={[styles.typeTag, styles[`tag_${spot.type}`]]}>
              <Text style={[styles.typeTagText, styles[`tagText_${spot.type}`]]}>
                {spot.type.toUpperCase()}
              </Text>
            </View>
            {spot.vicinity ? (
              <Text style={styles.vicinity} numberOfLines={1}>
                {spot.vicinity}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SpotDetail', { spot })}
        activeOpacity={0.75}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardName} numberOfLines={1}>{spot.name}</Text>
          <HeatDots level={spot.heat_level} />
        </View>
        <View style={styles.cardBottom}>
          <View style={[styles.typeTag, styles[`tag_${spot.type}`]]}>
            <Text style={[styles.typeTagText, styles[`tagText_${spot.type}`]]}>
              {spot.type.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.cardArrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const undiscoveredCount = filtered.filter(s => s.isGoogle).length;
  const claimedCount = filtered.filter(s => !s.isGoogle).length;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search spots..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Count row */}
      {!loading && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {claimedCount} spot{claimedCount !== 1 ? 's' : ''}
          </Text>
          {locationLoading ? (
            <View style={styles.countRight}>
              <ActivityIndicator size="small" color="#555" style={{ marginRight: 6 }} />
              <Text style={styles.countTextDim}>finding nearby...</Text>
            </View>
          ) : undiscoveredCount > 0 ? (
            <Text style={styles.countTextDim}>
              + {undiscoveredCount} undiscovered nearby
            </Text>
          ) : null}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="#E8C84A" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No spots found.</Text>
          <Text style={styles.emptySubText}>Be the first to add one.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <SpotCard spot={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  searchBar: { padding: 16, paddingBottom: 8 },
  searchInput: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
  },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  filterChip: { borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  filterChipActive: { backgroundColor: '#E8C84A', borderColor: '#E8C84A' },
  filterText: { color: '#555', fontSize: 11, fontWeight: 'bold' },
  filterTextActive: { color: '#0a0a0a' },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  countRight: { flexDirection: 'row', alignItems: 'center' },
  countText: { color: '#444', fontSize: 12 },
  countTextDim: { color: '#333', fontSize: 12 },
  list: { padding: 16, gap: 10 },

  // Claimed spot card
  card: { backgroundColor: '#161616', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#222' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardName: { color: '#f0f0f0', fontSize: 16, fontWeight: 'bold', flex: 1, marginRight: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardArrow: { color: '#555', fontSize: 20 },

  // Undiscovered spot card
  undiscoveredCard: {
    backgroundColor: '#0f0f0f',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    borderStyle: 'dashed',
  },
  undiscoveredNameRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  lockIcon: { fontSize: 13, marginRight: 6 },
  undiscoveredName: { color: '#444', fontSize: 15, fontWeight: '600', flex: 1 },
  undiscoveredBadge: {
    backgroundColor: '#111',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#222',
  },
  undiscoveredBadgeText: { color: '#333', fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },
  vicinity: { color: '#333', fontSize: 11, flex: 1, textAlign: 'right', marginLeft: 8 },

  // Heat dots
  heatDots: { flexDirection: 'row', gap: 3 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: '#e84a4a' },
  dotOff: { backgroundColor: '#2a2a2a' },

  // Type tags
  typeTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  tag_skate: { backgroundColor: '#2a260e', borderColor: '#E8C84A44' },
  tag_surf: { backgroundColor: '#0e2226', borderColor: '#4AC8E844' },
  tag_surfskate: { backgroundColor: '#2a0e1a', borderColor: '#E84A8A44' },
  typeTagText: { fontSize: 10, fontWeight: 'bold' },
  tagText_skate: { color: '#E8C84A' },
  tagText_surf: { color: '#4AC8E8' },
  tagText_surfskate: { color: '#E84A8A' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: '#444', fontSize: 18, fontWeight: 'bold' },
  emptySubText: { color: '#333', fontSize: 14, marginTop: 8 },
});
