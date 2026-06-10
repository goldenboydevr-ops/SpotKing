import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

const SPOT_TYPES = ['skate', 'surf', 'surfskate'];
const HEAT_LEVELS = [1, 2, 3, 4, 5];

export default function AddSpotScreen({ navigation }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('skate');
  const [heatLevel, setHeatLevel] = useState(1);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a spot name');
      return;
    }

    setLoading(true);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Error', 'Location permission needed to add a spot');
      setLoading(false);
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;

    const { data: { session } } = await supabase.auth.getSession();
const user = session?.user;
console.log('User ID:', user?.id);

    const { error } = await supabase.from('spots').insert({
      name: name.trim(),
      description: description.trim(),
      type,
      latitude,
      longitude,
      heat_level: heatLevel,
      created_by: user.id,
    });

    setLoading(false);

    if (error) {
  Alert.alert('Error', JSON.stringify(error));
} else {
      Alert.alert('🤙 Spot Added!', `${name} has been added to the map.`);
      setName('');
      setDescription('');
      setType('skate');
      setHeatLevel(1);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>SPOT NAME</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Venice Ledges"
        placeholderTextColor="#555"
        value={name}
        onChangeText={setName}
      />

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
            <Text style={styles.heatText}>🔴</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={loading}
      >
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
  content: { padding: 24 },
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
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: '#E8C84A', borderColor: '#E8C84A' },
  chipText: { color: '#555', fontWeight: 'bold', fontSize: 12 },
  chipTextActive: { color: '#0a0a0a' },
  heatChip: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatChipActive: { backgroundColor: '#2a1010', borderColor: '#e84a4a' },
  heatText: { fontSize: 18 },
  button: {
    backgroundColor: '#E8C84A',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  buttonText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 16, letterSpacing: 2 },
});