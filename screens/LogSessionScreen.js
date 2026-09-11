import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const DURATIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '1.5 hr', value: 90 },
  { label: '2 hr', value: 120 },
  { label: '3 hr', value: 180 },
  { label: '4+ hr', value: 240 },
];

const TYPE_EMOJI = { skate: '🛹', surf: '🏄', surfskate: '🛹🌊' };
const TYPE_COLOR = { skate: '#E8C84A', surf: '#4AC8E8', surfskate: '#E84A8A' };

export default function LogSessionScreen() {
  const { params: { spot } } = useRoute();
  const navigation = useNavigation();
  const [duration, setDuration] = useState(60);
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const accentColor = TYPE_COLOR[spot.type] || '#E8C84A';
  const sportEmoji = TYPE_EMOJI[spot.type] || '📍';

  const ratingLabels = ['Terrible', 'Meh', 'Good', 'Sick', 'Perfect'];
  const ratingEmojis = { skate: '🛹', surf: '🌊', surfskate: '🌊' };
  const ratingEmoji = ratingEmojis[spot.type] || '⭐';

  async function submit() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { error } = await supabase.from('sessions').insert({
      user_id: session.user.id,
      spot_id: spot.id,
      duration_minutes: duration,
      rating,
      notes: notes.trim() || null,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        `${sportEmoji} Session logged!`,
        `${duration >= 60 ? `${duration / 60}hr` : `${duration}min`} at ${spot.name}. Keep shredding 🤙`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Spot header */}
      <View style={[styles.spotHeader, { borderColor: accentColor + '44' }]}>
        <Text style={styles.spotEmoji}>{sportEmoji}</Text>
        <View>
          <Text style={[styles.spotName, { color: accentColor }]}>{spot.name}</Text>
          <Text style={styles.spotType}>{spot.type.toUpperCase()}</Text>
        </View>
      </View>

      {/* Duration */}
      <Text style={styles.label}>HOW LONG?</Text>
      <View style={styles.chipGrid}>
        {DURATIONS.map(d => (
          <TouchableOpacity
            key={d.value}
            style={[styles.chip, duration === d.value && { backgroundColor: accentColor, borderColor: accentColor }]}
            onPress={() => setDuration(d.value)}
          >
            <Text style={[styles.chipText, duration === d.value && styles.chipTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Rating */}
      <Text style={styles.label}>HOW WAS IT?</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.ratingChip, rating >= r && { backgroundColor: accentColor + '22', borderColor: accentColor }]}
            onPress={() => setRating(r)}
          >
            <Text style={{ fontSize: 24, opacity: rating >= r ? 1 : 0.25 }}>{ratingEmoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.ratingLabel, { color: accentColor }]}>{ratingLabels[rating - 1]}</Text>

      {/* Notes */}
      <Text style={styles.label}>NOTES (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        placeholder="How were the waves? Best trick? Anything to remember..."
        placeholderTextColor="#444"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
      />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: accentColor }]}
        onPress={submit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#0a0a0a" />
          : <Text style={styles.buttonText}>LOG SESSION 🤙</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 24, paddingBottom: 48 },
  spotHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#111', borderRadius: 12, padding: 16, marginBottom: 28, borderWidth: 1 },
  spotEmoji: { fontSize: 32 },
  spotName: { fontSize: 18, fontWeight: 'bold' },
  spotType: { color: '#555', fontSize: 11, letterSpacing: 1, marginTop: 2 },
  label: { color: '#E8C84A', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 12, marginTop: 24 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#333', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  chipText: { color: '#555', fontWeight: 'bold', fontSize: 13 },
  chipTextActive: { color: '#0a0a0a' },
  ratingRow: { flexDirection: 'row', gap: 10 },
  ratingChip: { width: 52, height: 52, borderRadius: 10, borderWidth: 1, borderColor: '#222', alignItems: 'center', justifyContent: 'center' },
  ratingLabel: { fontSize: 13, fontWeight: 'bold', letterSpacing: 1, marginTop: 10 },
  input: { backgroundColor: '#111', borderWidth: 1, borderColor: '#222', borderRadius: 10, padding: 16, color: '#ccc', fontSize: 15, height: 110, textAlignVertical: 'top' },
  button: { borderRadius: 12, padding: 18, alignItems: 'center', marginTop: 32 },
  buttonText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 15, letterSpacing: 2 },
});
