import { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCO1zElgBXnn_Sx0mPLlGXFhSuv3DG5Pik';

const SPOT_COLORS = {
  skate: '#E8C84A',
  surf: '#4AC8E8',
  surfskate: '#E84A8A',
};

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
      const keywords = ['skatepark', 'surf spot', 'skate plaza'];
      const results = [];
      for (const keyword of keywords) {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&keyword=${encodeURIComponent(keyword)}&key=${GOOGLE_MAPS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.results) {
          results.push(...data.results.map(place => ({
            id: place.place_id,
            name: place.name,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            type: keyword.includes('surf') ? 'surf' : 'skate',
            isGoogle: true,
          })));
        }
      }
      const unique = results.filter((spot, index, self) =>
        index === self.findIndex((s) => s.id === spot.id)
      );
      setGoogleSpots(unique);
    } catch (e) {
      console.log('Places error:', e);
    }
  }

  async function fetchSpots() {
    const { data, error } = await supabase.from('spots').select('*');
    if (!error && data) setSpots(data);
  }

  async function handleRegionChange(newRegion) {
    const { latitude, longitude } = newRegion;
    fetchGoogleSpots(latitude, longitude);
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ latitude: 20, longitude: 0, latitudeDelta: 60, longitudeDelta: 60 }}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton
      >
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            pinColor={SPOT_COLORS[spot.type] || '#E8C84A'}
            title={spot.name}
            description={spot.type.toUpperCase()}
            onPress={() => navigation.navigate('SpotDetail', { spot })}
          />
        ))}
        {googleSpots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            title={spot.name}
            description="Undiscovered spot"
            opacity={0.5}
            pinColor="#aaaaaa"
          />
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
  loadingOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(10,10,10,0.8)',
    borderRadius: 8,
    padding: 10,
  },
});