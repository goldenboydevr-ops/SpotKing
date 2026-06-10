import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { getProStatus } from '../lib/purchases';

export default function SpotDetailScreen({ route, navigation }) {
  const { spot } = route.params;
  const [reviews, setReviews] = useState([]);
  const [media, setMedia] = useState([]);
  const [newReview, setNewReview] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    fetchReviews();
    fetchMedia();
    getProStatus().then(setIsPro);
  }, []);

  async function fetchReviews() {
    setLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('spot_id', spot.id)
      .order('created_at', { ascending: false });
    if (!error) setReviews(data);
    setLoading(false);
  }

  async function fetchMedia() {
    const { data, error } = await supabase
      .from('media')
      .select('*')
      .eq('spot_id', spot.id)
      .order('vote_count', { ascending: false });
    if (!error) setMedia(data);
  }

  async function submitReview() {
    if (!newReview.trim()) {
      Alert.alert('Error', 'Please write a review');
      return;
    }
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.from('reviews').insert({
      spot_id: spot.id,
      user_id: session.user.id,
      content: newReview.trim(),
      rating,
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNewReview('');
      setRating(5);
      fetchReviews();
    }
    setSubmitting(false);
  }

  async function uploadPhoto() {
    if (!isPro) {
      navigation.navigate('Paywall');
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled) return;

    setUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uri = result.assets[0].uri;
      const fileName = `${session.user.id}/${spot.id}/${Date.now()}.jpg`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('media').insert({
        spot_id: spot.id,
        user_id: session.user.id,
        url: publicUrl,
        type: 'photo',
        vote_count: 0,
        is_king: false,
      });

      if (dbError) throw dbError;

      Alert.alert('Stoked!', 'Photo uploaded successfully');
      fetchMedia();
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  }

async function voteOnMedia(mediaItem) {
    const { data: { session } } = await supabase.auth.getSession();

    const { error: voteError } = await supabase.from('votes').insert({
      media_id: mediaItem.id,
      user_id: session.user.id,
    });

    if (voteError) {
      if (voteError.code === '23505') {
        Alert.alert('Already voted', 'You already voted for this photo');
      } else {
        Alert.alert('Error', voteError.message);
      }
      return;
    }

    const newCount = mediaItem.vote_count + 1;
    const { error: updateError } = await supabase
      .from('media')
      .update({ vote_count: newCount })
      .eq('id', mediaItem.id);

    if (updateError) {
      console.log('Update error:', JSON.stringify(updateError));
      Alert.alert('Vote saved but count failed', updateError.message);
    } else {
      console.log('Vote count updated to:', newCount);
    }

    fetchMedia();
    updateKing();
  }

  async function updateKing() {
    const { data } = await supabase
      .from('media')
      .select('*')
      .eq('spot_id', spot.id)
      .order('vote_count', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      await supabase
        .from('media')
        .update({ is_king: false })
        .eq('spot_id', spot.id);

      await supabase
        .from('media')
        .update({ is_king: true })
        .eq('id', data[0].id);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.name}>{spot.name}</Text>
        <View style={styles.typeRow}>
          <Text style={styles.type}>{spot.type.toUpperCase()}</Text>
        </View>
        {spot.description ? (
          <Text style={styles.description}>{spot.description}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>HEAT LEVEL</Text>
        <View style={styles.heatRow}>
          {Array.from({ length: 5 }, (_, i) => (
            <Text key={i} style={{ fontSize: 28, opacity: i < spot.heat_level ? 1 : 0.15, color: '#e84a4a' }}>
              ★
            </Text>
          ))}
        </View>
        <Text style={styles.heatLabel}>
          {spot.heat_level <= 1 && 'All clear - skate/surf freely'}
          {spot.heat_level === 2 && 'Occasional patrols'}
          {spot.heat_level === 3 && 'Regular security presence'}
          {spot.heat_level === 4 && 'High risk - be quick'}
          {spot.heat_level >= 5 && 'Danger zone - cops always here'}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PHOTOS</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={uploadPhoto}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#0a0a0a" size="small" />
            ) : (
              <Text style={styles.uploadButtonText}>+ ADD PHOTO</Text>
            )}
          </TouchableOpacity>
        </View>

        {media.length === 0 ? (
          <Text style={styles.emptyText}>No photos yet. Be the first to drop one.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {media.map((item) => (
              <View key={item.id} style={styles.mediaCard}>
                {item.is_king && (
                  <View style={styles.crownBadge}>
                    <Text style={styles.crownText}>KING</Text>
                  </View>
                )}
                <Image source={{ uri: item.url }} style={styles.mediaImage} />
                <TouchableOpacity
                  style={styles.voteButton}
                  onPress={() => voteOnMedia(item)}
                >
                  <Text style={styles.voteText}>▲ {item.vote_count}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>REVIEWS</Text>
        <View style={styles.reviewForm}>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRating(r)}
                style={styles.starButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.6}
              >
                <Text style={[styles.starText, r <= rating ? styles.starOn : styles.starOff]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Drop your review..."
            placeholderTextColor="#555"
            value={newReview}
            onChangeText={setNewReview}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={submitReview}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#0a0a0a" />
            ) : (
              <Text style={styles.buttonText}>POST REVIEW</Text>
            )}
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#E8C84A" style={{ marginTop: 20 }} />
        ) : reviews.length === 0 ? (
          <Text style={styles.emptyText}>No reviews yet. Be the first.</Text>
        ) : (
          reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewUser}>Anonymous</Text>
                <Text style={styles.reviewRating}>
                  {'★'.repeat(review.rating)}
                </Text>
              </View>
              <Text style={styles.reviewContent}>{review.content}</Text>
              <Text style={styles.reviewDate}>
                {new Date(review.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { padding: 20 },
  header: { marginBottom: 24 },
  name: { fontSize: 32, fontWeight: 'bold', color: '#E8C84A', letterSpacing: 1, marginBottom: 8 },
  typeRow: { flexDirection: 'row', marginBottom: 8 },
  type: { backgroundColor: '#1a1a0a', color: '#E8C84A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: 'bold', borderWidth: 1, borderColor: '#E8C84A44' },
  description: { color: '#888', fontSize: 14, lineHeight: 20, marginTop: 8 },
  section: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#E8C84A', fontSize: 11, fontWeight: 'bold', letterSpacing: 2, marginBottom: 12 },
  uploadButton: { backgroundColor: '#E8C84A', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12 },
  uploadButtonText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 11 },
  heatRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
  heatLabel: { color: '#888', fontSize: 13 },
  mediaCard: { marginRight: 12, position: 'relative' },
  mediaImage: { width: 160, height: 160, borderRadius: 10, backgroundColor: '#161616' },
  crownBadge: { position: 'absolute', top: 8, left: 8, backgroundColor: '#E8C84A', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, zIndex: 1 },
  crownText: { color: '#0a0a0a', fontSize: 10, fontWeight: 'bold' },
  voteButton: { backgroundColor: '#161616', borderRadius: 6, padding: 8, marginTop: 6, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  voteText: { color: '#E8C84A', fontWeight: 'bold', fontSize: 13 },
  reviewForm: { backgroundColor: '#161616', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#222' },
  ratingRow: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  starButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  starText: { fontSize: 34 },
  starOn: { color: '#E8C84A', opacity: 1 },
  starOff: { color: '#E8C84A', opacity: 0.18 },
  input: { backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: '#333', borderRadius: 8, padding: 12, color: '#fff', fontSize: 14, textAlignVertical: 'top', marginBottom: 12 },
  button: { backgroundColor: '#E8C84A', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  emptyText: { color: '#444', fontSize: 14, textAlign: 'center', marginTop: 12 },
  reviewCard: { backgroundColor: '#161616', borderRadius: 10, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#222' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewUser: { color: '#E8C84A', fontSize: 12, fontWeight: 'bold' },
  reviewRating: { color: '#E8C84A', fontSize: 12 },
  reviewContent: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  reviewDate: { color: '#444', fontSize: 11, marginTop: 6 },
});