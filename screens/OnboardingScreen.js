import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    key: '1',
    emoji: '🗺️',
    title: 'Find Your Spots',
    body: 'SpotKing maps every skatepark, street spot, surf break, and surf-skate zone near you. Tap any pin to see what the community has found.',
    accent: '#E8C84A',
  },
  {
    key: '2',
    emoji: '🔒',
    title: 'Undiscovered Spots',
    body: 'Grey locked pins are spots no one has claimed yet. Find them in real life, add them to the map, and post the first photo to become King.',
    accent: '#4AC8E8',
  },
  {
    key: '3',
    emoji: '🚨',
    title: 'Heat Level System',
    body: 'Every spot has a 1–5 siren heat rating from the community — how heavy is the authority presence? Know before you show up.',
    accent: '#e84a4a',
  },
  {
    key: '4',
    emoji: '👑',
    title: 'Battle for the Crown',
    body: 'Upload photos and videos to any spot. The community votes. The person with the most votes becomes King or Queen of that spot. Hold your crown or lose it.',
    accent: '#E8C84A',
  },
  {
    key: '5',
    emoji: '📍',
    title: 'Add Your Spots',
    body: 'Know a hidden ledge or a perfect wave? Drop a pin, tag it as Skate, Surf, or Surfskate, and set the heat level. Be the first to claim your local scene.',
    accent: '#E84A8A',
  },
];

export default function OnboardingScreen({ onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);

  async function finish() {
    await AsyncStorage.setItem('onboarding_complete', 'true');
    onDone();
  }

  function next() {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      finish();
    }
  }

  function renderSlide({ item }) {
    return (
      <View style={styles.slide}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={[styles.title, { color: item.accent }]}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip */}
      <TouchableOpacity style={styles.skipButton} onPress={finish}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.button} onPress={next} activeOpacity={0.85}>
        <Text style={styles.buttonText}>
          {currentIndex === SLIDES.length - 1 ? "LET'S GO 🤙" : 'NEXT'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
  },
  skipText: { color: '#444', fontSize: 14 },
  slide: {
    width,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  emoji: { fontSize: 80, marginBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 20,
  },
  body: {
    color: '#888',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: { backgroundColor: '#E8C84A', width: 24 },
  dotInactive: { backgroundColor: '#333' },
  button: {
    backgroundColor: '#E8C84A',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 60,
    marginBottom: 24,
  },
  buttonText: {
    color: '#0a0a0a',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 2,
  },
});
