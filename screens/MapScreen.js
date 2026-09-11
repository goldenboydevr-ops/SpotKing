import { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCO1zElgBXnn_Sx0mPLlGXFhSuv3DG5Pik';

const TYPE_COLOR = { skate: '#E8C84A', surf: '#4AC8E8', surfskate: '#E84A8A' };
const TYPE_EMOJI = { skate: '🛹', surf: '🏄', surfskate: '🛹' };

const PLACE_SEARCHES = [
  { keyword: 'skatepark', type: 'skate' },
  { keyword: 'skate plaza', type: 'skate' },
  { keyword: 'surf spot', type: 'surf' },
  { keyword: 'surf break', type: 'surf' },
  { keyword: 'surfskate', type: 'surfskate' },
];

export default function MapScreen() {
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const [spots, setSpots] = useState([]);
  const [googleSpots, setGoogleSpots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSpots();
    getLocation();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSpots();
    }, [])
  );

  async function getLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    }, 800);
    fetchGoogleSpots(latitude, longitude);
  }

  async function fetchGoogleSpots(lat, lng) {
    try {
      const results = [];
      const claimedIds = new Set(spots.map(s => s.google_place_id).filter(Boolean));

      for (const { keyword, type } of PLACE_SEARCHES) {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=15000&keyword=${encodeURIComponent(keyword)}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results) {
          results.push(...data.results
            .filter(p => !claimedIds.has(p.place_id))
            .map(place => {
              const photoRef = place.photos?.[0]?.photo_reference;
              return {
                id: place.place_id,
                name: place.name,
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
                type,
                isGoogle: true,
                vicinity: place.vicinity,
                photoUrl: photoRef
                  ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photoreference=${photoRef}&key=${GOOGLE_MAPS_API_KEY}`
                  : null,
                rating: place.rating || null,
              };
            })
          );
        }
      }
      const seen = new Set();
      const unique = results.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      setGoogleSpots(unique);
    } catch (e) {
      console.log('Places error:', e);
    }
  }

  async function fetchSpots() {
    const { data, error } = await supabase.from('spots').select('*');
    if (!error && data) setSpots(data);
  }

  async function handleRegionChange(region) {
    fetchGoogleSpots(region.latitude, region.longitude);
  }

  function CustomMarker({ type, undiscovered }) {
    const color = TYPE_COLOR[type] || '#E8C84A';
    const emoji = TYPE_EMOJI[type] || '📍';
    return (
      <View style={[
        styles.markerWrap,
        undiscovered ? styles.markerUndiscovered : { backgroundColor: color, borderColor: color + 'aa' }
      ]}>
        <Text style={styles.markerEmoji}>{undiscovered ? '🔒' : emoji}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#E8C84A' }]} /><Text style={styles.legendText}>Skate</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4AC8E8' }]} /><Text style={styles.legendText}>Surf</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#E84A8A' }]} /><Text style={styles.legendText}>Surfskate</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#333' }]} /><Text style={styles.legendText}>Unclaimed</Text></View>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ latitude: 20, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 }}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton
      >
        {/* Claimed spots */}
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            onPress={() => navigation.navigate('SpotDetail', { spot })}
            tracksViewChanges={false}
          >
            <CustomMarker type={spot.type} undiscovered={false} />
          </Marker>
        ))}

        {/* Undiscovered spots */}
        {googleSpots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            onPress={() => navigation.navigate('UndiscoveredSpot', { spot })}
            tracksViewChanges={false}
          >
            <CustomMarker type={spot.type} undiscovered={true} />
          </Marker>
        ))}
      </MapView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color="#E8C84A" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  map: { flex: 1 },
  legend: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    backgroundColor: 'rgba(10,10,10,0.85)',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#222',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#888', fontSize: 11 },
  markerWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#555',
    backgroundColor: '#222',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  markerUndiscovered: { backgroundColor: '#1a1a1a', borderColor: '#333' },
  markerEmoji: { fontSize: 18 },
  loadingOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(10,10,10,0.8)',
    borderRadius: 8,
    padding: 10,
  },
});
