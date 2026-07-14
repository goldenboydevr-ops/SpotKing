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
import { t } from '../lib/i18n';

const { width } = Dimensions.get('window');

// Bump this version string any time you want all users to see onboarding again
const ONBOARDING_VERSION = 'v2';

export function getOnboardingKey() {
  return `onboarding_complete_${ONBOARDING_VERSION}`;
}

function getSlides() {
  return [
    { key: '1', emoji: '🗺️', title: t('slide1Title'), body: t('slide1Body'), accent: '#E8C84A' },
    { key: '2', emoji: '🔒', title: t('slide2Title'), body: t('slide2Body'), accent: '#4AC8E8' },
    { key: '3', emoji: '🚨', title: t('slide3Title'), body: t('slide3Body'), accent: '#e84a4a' },
    { key: '4', emoji: '👑', title: t('slide4Title'), body: t('slide4Body'), accent: '#E8C84A' },
    { key: '5', emoji: '📍', title: t('slide5Title'), body: t('slide5Body'), accent: '#E84A8A' },
  ];
}

export default function OnboardingScreen({ onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const SLIDES = getSlides();

  async function finish() {
    await AsyncStorage.setItem(getOnboardingKey(), 'true');
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
      <TouchableOpacity style={styles.skipButton} onPress={finish}>
        <Text style={styles.skipText}>{t('skip')}</Text>
      </TouchableOpacity>

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

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={next} activeOpacity={0.85}>
        <Text style={styles.buttonText}>
          {currentIndex === SLIDES.length - 1 ? t('letsGo') : t('next')}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', alignItems: 'center', justifyContent: 'center' },
  skipButton: { position: 'absolute', top: 56, right: 24, zIndex: 10 },
  skipText: { color: '#444', fontSize: 14 },
  slide: { width, paddingHorizontal: 40, alignItems: 'center', justifyContent: 'center', paddingBottom: 60 },
  emoji: { fontSize: 80, marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 'bold', letterSpacing: 1, textAlign: 'center', marginBottom: 20 },
  body: { color: '#888', fontSize: 16, lineHeight: 26, textAlign: 'center' },
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: '#E8C84A', width: 24 },
  dotInactive: { backgroundColor: '#333' },
  button: { backgroundColor: '#E8C84A', borderRadius: 12, paddingVertical: 18, paddingHorizontal: 60, marginBottom: 24 },
  buttonText: { color: '#0a0a0a', fontWeight: 'bold', fontSize: 16, letterSpacing: 2 },
});
