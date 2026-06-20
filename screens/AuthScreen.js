import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'reset'
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  }

  async function handleSignup() {
    if (!username.trim()) {
      Alert.alert('Error', 'Please choose a username.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    // Set the session explicitly so RLS auth.uid() works immediately
    if (data.session) {
      await supabase.auth.setSession(data.session);
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: data.user.id,
        username: username.trim(),
        created_at: new Date().toISOString(),
      });
      if (profileError) {
        console.warn('Profile upsert error:', profileError.message);
      }
    }
    setLoading(false);
  }

  async function handleReset() {
    if (!email.trim()) {
      Alert.alert('Error', 'Enter your email address first.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check your email', 'A password reset link has been sent.');
      setMode('login');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>SPOTKING</Text>
        <Text style={styles.tagline}>Find Your Spot. Own It.</Text>

        <View style={styles.form}>
          {mode === 'reset' ? (
            <>
              <Text style={styles.sectionTitle}>RESET PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#555"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Sending...' : 'SEND RESET LINK'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMode('login')}>
                <Text style={styles.switchText}>Back to log in</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {mode === 'signup' && (
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#555"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#555"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#555"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={styles.button}
                onPress={mode === 'login' ? handleLogin : handleSignup}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Loading...' : mode === 'login' ? 'LOG IN' : 'SIGN UP'}
                </Text>
              </TouchableOpacity>

              {mode === 'login' && (
                <TouchableOpacity onPress={() => setMode('reset')} style={styles.forgotWrap}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')}>
                <Text style={styles.switchText}>
                  {mode === 'login'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Log in'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  inner: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#E8C84A',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 13,
    color: '#555',
    letterSpacing: 2,
    marginBottom: 48,
  },
  sectionTitle: {
    color: '#E8C84A',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#E8C84A',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonText: {
    color: '#0a0a0a',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 2,
  },
  forgotWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  forgotText: {
    color: '#E8C84A',
    fontSize: 13,
  },
  switchText: {
    color: '#555',
    textAlign: 'center',
    fontSize: 14,
  },
});
