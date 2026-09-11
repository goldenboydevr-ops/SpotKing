import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCO1zElgBXnn_Sx0mPLlGXFhSuv3DG5Pik';
const SPOT_TYPES = ['skate', 'surf', 'surfskate'];
const HEAT_LEVELS = [1, 2, 3, 4, 5];

export default function AddSpotScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('skate');
  const [heatLevel, setHeatLevel] = useState(1);
  const [loading, setLoading] = useState(false);

  // Location state
  const [locationSearch, setLocationSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null); // { latitude, longitude, label }
  const [locating, setLocating] = useState(false);
  const mapRef = useRef(null);

  async function searchLocation(query) {
    setLocationSearch(query);
    if (query.length < 3) { setSuggestions([]); return; }
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_MAPS_API_KEY}&types=geocode|establishment`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(data.predictions || []);
    } catch (e) {
      console.log('Autocomplete error:', e.message);
    }
  }

  async function selectSuggestion(item) {
    setSuggestions([]);
    setLocationSearch(item.description);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${item.place_id}&fields=geometry,name&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      const loc = data.result?.geometry?.location;
      if (loc) {
        const coords = { latitude: loc.lat, longitude: loc.lng, label: item.description };
        setSelectedLocation(coords);
        mapRef.current?.animateToRegion({
          latitude: loc.lat,
          longitude: loc.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 500);
      }
    } catch (e) {
      console.log('Place details error:', e.message);
    }
  }

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow location access to use your current position.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        label: 'My current location',
      };
      setSelectedLocation(coords);
      setLocationSearch('My current location');
      setSuggestions([]);
      mapRef.current?.animateToRegion({
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    } catch (e) {
      Alert.alert('Error', 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  }

  async function handleSubmit() {
    if (!name.trim()) { Alert.alert('Error', 'Please enter a spot name'); return; }
    if (!selectedLocation) { Alert.alert('Error', 'Please select a location for this spot'); return; }

    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    const { error } = await supabase.from('spots').insert({
      name: name.trim(),
      description: description.trim(),
      type,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      heat_level: heatLevel,
      created_by: user.id,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('🤙 Spot Added!', `${name} has been added to the map.`);
      setName('');
      setDescription('');
      setType('skate');
      setHeatLevel(1);
      setSelectedLocation(null);
      setLocationSearch('');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>SPOT NAME</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Venice Ledges"
        placeholderTextColor="#555"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>LOCATION</Text>
      <View style={styles.locationRow}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Search for a location..."
          placeholderTextColor="#555"
          value={locationSearch}
          onChangeText={searchLocation}
        />
        <TouchableOpacity style={styles.gpsButton} onPress={useCurrentLocation} disabled={locating}>
          {locating ? (
            <ActivityIndicator color="#E8C84A" size="small" />
          ) : (
            <Text style={styles.gpsIcon}>📍</Text>
          )}
        </TouchableOpacity>
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {suggestions.slice(0, 4).map(item => (
            <TouchableOpacity
              key={item.place_id}
              style={styles.suggestionItem}
              onPress={() => selectSuggestion(item)}
            >
              <Text style={styles.suggestionText} numberOfLines={1}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedLocation && (
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            onPress={(e) => setSelectedLocation({ ...selectedLocation, ...e.nativeEvent.coordinate })}
          >
            <Marker coordinate={selectedLocation} pinColor="#E8C84A" />
          </MapView>
          <Text style={styles.mapHint}>Tap the map to adjust the pin</Text>
        </View>
      )}

      <Text style={styles.label}>DESCRIPTION</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="What's the spot like? Best times to go?"
        placeholderTextColor="#555"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>TYPE</Text>
      <View style={styles.row}>
        {SPOT_TYPES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.chip, type === t && styles.chipActive]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.chipText, type === t && styles.chipTextActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>🚔 HEAT LEVEL</Text>
      <Text style={styles.sublabel}>How likely are cops/security to show up?</Text>
      <View style={styles.row}>
        {HEAT_LEVELS.map((h) => (
          <TouchableOpacity
            key={h}
            style={[styles.heatChip, heatLevel >= h && styles.heatChipActive]}
            onPress={() => setHeatLevel(h)}
          >
            <Text style={styles.heatText}>{heatLevel >= h ? '🚨' : '🔵'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text style={styles.buttonText}>DROP THE PIN 📍</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingBottom: 48 },
  label: { color: '#E8C84A', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 8, marginTop: 20 },
  sublabel: { color: '#555', fontSize: 12, marginBottom: 8, marginTop: -4 },
  input: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  locationRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  gpsButton: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsIcon: { fontSize: 22 },
  suggestions: {
    backgroundColor: '#161616',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222',
    marginTop: 4,
    overflow: 'hidden',
  },
  suggestionItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#222' },
  suggestionText: { color: '#ccc', fontSize: 14 },
  mapWrap: { marginTop: 12, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#222' },
  map: { width: '100%', height: 180 },
  mapHint: { backgroundColor: '#111', color: '#444', fontSize: 11, textAlign: 'center', padding: 6 },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: '#E8C84A', borderColor: '#E8C84A' },
  chipText: { color: '#555', fontWeight: 'bold', fontSize: 12 },
  chipTextActive: { color: '#0a0a0a' },
  heatChip: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#333', alignItems: 'center', justifyContent: 'center' },
  heatChipActive: { backgroundColor: '#2a1010', borderColor: '#e84a4a' },
  heatText: { fontSize: 18 },
  button: { backgroundColor: '#E8C84A', borderRadius: 10, padding: 18, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 16, letterSpacing: 2 },
});
