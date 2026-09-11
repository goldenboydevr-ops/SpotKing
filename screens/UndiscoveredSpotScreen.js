import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { t } from '../lib/i18n';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCO1zElgBXnn_Sx0mPLlGXFhSuv3DG5Pik';

const TYPE_COLOR = { skate: '#E8C84A', surf: '#4AC8E8', surfskate: '#E84A8A' };
const TYPE_EMOJI = { skate: '🛹', surf: '🏄', surfskate: '🛹🌊' };

export default function UndiscoveredSpotScreen() {
  const navigation = useNavigation();
  const { params: { spot } } = useRoute();
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [svOk, setSvOk] = useState(true);

  const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=800x400&location=${spot.latitude},${spot.longitude}&fov=90&key=${GOOGLE_MAPS_API_KEY}`;
  const photoUrl = spot.photoUrl || streetViewUrl;

  useEffect(() => {
    fetchDetails();
  }, []);

  async function fetchDetails() {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${spot.id}&fields=name,rating,user_ratings_total,formatted_address,opening_hours,website,photos&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      setDetails(data.result || null);
    } catch (e) {
      console.log('Place details error:', e.message);
    } finally {
      setLoading(false);
    }
  }

  function claimSpot() {
    navigation.navigate('Add Spot', {
      prefill: {
        name: spot.name,
        latitude: spot.latitude,
        longitude: spot.longitude,
        type: spot.type,
        locationLabel: spot.vicinity || spot.name,
      },
    });
  }

  const accentColor = TYPE_COLOR[spot.type] || '#E8C84A';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero image */}
      {svOk && (
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: photoUrl }}
            style={styles.hero}
            resizeMode="cover"
            onError={() => setSvOk(false)}
          />
          <View style={styles.heroOverlay} />
          <View style={styles.unclaimedBadge}>
            <Text style={styles.unclaimedText}>🔒 UNCLAIMED</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.typeTag, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}>
          <Text style={[styles.typeText, { color: accentColor }]}>
            {TYPE_EMOJI[spot.type]} {spot.type.toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: accentColor }]}>{spot.name}</Text>
        {spot.vicinity && <Text style={styles.address}>{spot.vicinity}</Text>}
      </View>

      {/* Google details */}
      {loading ? (
        <ActivityIndicator color="#E8C84A" style={{ marginVertical: 20 }} />
      ) : details ? (
        <View style={styles.detailsBox}>
          {details.rating && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Google Rating</Text>
              <Text style={styles.detailValue}>⭐ {details.rating} ({details.user_ratings_total} reviews)</Text>
            </View>
          )}
          {details.formatted_address && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{details.formatted_address}</Text>
            </View>
          )}
          {details.opening_hours?.weekday_text?.[0] && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Hours</Text>
              <Text style={styles.detailValue}>{details.opening_hours.open_now ? '✅ Open now' : '🔴 Closed now'}</Text>
            </View>
          )}
          {details.website && (
            <TouchableOpacity onPress={() => Linking.openURL(details.website)}>
              <Text style={styles.websiteLink}>🌐 Visit website</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* What happens when claimed */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>👑 Be the first King</Text>
        <Text style={styles.infoBody}>
          Claim this spot to add it to SpotKing. Upload a photo and get the most votes to wear the crown. No one has claimed it yet — the throne is empty.
        </Text>
      </View>

      {/* CTA */}
      <TouchableOpacity style={[styles.claimButton, { backgroundColor: accentColor }]} onPress={claimSpot} activeOpacity={0.85}>
        <Text style={styles.claimButtonText}>CLAIM THIS SPOT 👑</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.directionsButton} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${spot.latitude},${spot.longitude}`)}>
        <Text style={styles.directionsText}>🗺️ Get Directions</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { paddingBottom: 40 },
  heroWrap: { height: 220, position: 'relative' },
  hero: { width: '100%', height: '100%' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  unclaimedBadge: { position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#333' },
  unclaimedText: { color: '#aaa', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  header: { padding: 20, paddingBottom: 8 },
  typeTag: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  typeText: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  name: { fontSize: 28, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 6 },
  address: { color: '#555', fontSize: 13 },
  detailsBox: { marginHorizontal: 20, marginTop: 8, backgroundColor: '#111', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1e1e1e', gap: 12 },
  detailRow: { gap: 2 },
  detailLabel: { color: '#555', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  detailValue: { color: '#ccc', fontSize: 14 },
  websiteLink: { color: '#4AC8E8', fontSize: 14, marginTop: 4 },
  infoBox: { margin: 20, backgroundColor: '#0f1a0f', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1a2a1a' },
  infoTitle: { color: '#E8C84A', fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  infoBody: { color: '#666', fontSize: 14, lineHeight: 22 },
  claimButton: { marginHorizontal: 20, borderRadius: 12, padding: 18, alignItems: 'center', marginBottom: 12 },
  claimButtonText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 15, letterSpacing: 2 },
  directionsButton: { marginHorizontal: 20, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  directionsText: { color: '#888', fontSize: 14 },
});
